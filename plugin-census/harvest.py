from __future__ import annotations
import argparse, json, os, sqlite3, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone
from typing import Any
from registry import BY_ID
UA='SimplicityGlobal-PluginCensus/0.1'
PUBLIC_HOSTS={'api.wordpress.org','api.github.com','registry.npmjs.org'}
TOKEN_HOSTS={'apipulse.vodacom.co.za','marketplace-api.takealot.com','seller-api.takealot.com','api.payjustnow.com','marketplace.magento.com','huggingface.co','registry.modelcontextprotocol.io','api.crewai.com','api.apify.com','api.vercel.com'}
MAX_PAGES=100
class HarvestError(RuntimeError): pass
def fetch_json(url, headers=None):
    p=urllib.parse.urlparse(url)
    if p.scheme!='https' or p.hostname not in PUBLIC_HOSTS|TOKEN_HOSTS: raise HarvestError('HTTPS host is not allowlisted')
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/json',**(headers or {})})
    try:
        with urllib.request.urlopen(req,timeout=20) as res:
            raw=res.read(5_000_001)
            if len(raw)>5_000_000: raise HarvestError('Response exceeds 5 MB limit')
            return json.loads(raw.decode('utf-8'))
    except urllib.error.HTTPError as e:
        if e.code in (401,403): raise HarvestError(f'Authorization rejected (HTTP {e.code})') from e
        if e.code==429: raise HarvestError('Rate limited; retry later') from e
        raise HarvestError(f'HTTP {e.code}') from e
    except (urllib.error.URLError,TimeoutError,json.JSONDecodeError) as e: raise HarvestError(f'Request failed: {e}') from e
def record(ecosystem,item_id,name,raw,**fields):
    if item_id is None or name is None: raise HarvestError('Source item lacks stable id or name')
    return {'ecosystem':ecosystem,'plugin_id':str(item_id),'name':str(name),'author':fields.get('author'),'version':fields.get('version'),'downloads':fields.get('downloads'),'rating':fields.get('rating'),'category':fields.get('category'),'updated_at':fields.get('updated_at'),'url':fields.get('url'),'raw_json':json.dumps(raw,ensure_ascii=False,sort_keys=True),'harvested_at':datetime.now(timezone.utc).isoformat()}
def shopglu(state):
    url='https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=shopglu-for-woocommerce'
    p=fetch_json(url)
    if not isinstance(p,dict) or p.get('error'): raise HarvestError('WordPress.org did not return ShopGlu information')
    yield record('shopglu',p.get('slug'),p.get('name'),p,author=p.get('author'),version=p.get('version'),downloads=p.get('downloaded'),rating=p.get('rating'),category='regional_za',updated_at=p.get('last_updated'),url=p.get('homepage') or BY_ID['shopglu']['url'])
def n8n(state):
    headers={'Accept':'application/vnd.github+json'}
    if os.environ.get('GITHUB_TOKEN'): headers['Authorization']='Bearer '+os.environ['GITHUB_TOKEN']
    url=BY_ID['n8n']['endpoint']+'?per_page=100'
    data=fetch_json(url,headers)
    if not isinstance(data,list): raise HarvestError('Unexpected GitHub contents response')
    for node in data:
        if node.get('type')=='dir': yield record('n8n',node.get('name'),node.get('name'),node,author='n8n / community',category='automation',url=node.get('html_url'))
def nodered(state):
    start=int(state.get('from',0))
    for _ in range(MAX_PAGES):
        query=urllib.parse.urlencode({'text':'keywords:node-red','size':250,'from':start})
        data=fetch_json('https://registry.npmjs.org/-/v1/search?'+query)
        if not isinstance(data,dict): raise HarvestError('Unexpected npm search response')
        objs=data.get('objects') or []
        if not objs: return
        for item in objs:
            p=item.get('package') or {}; pub=p.get('publisher') or {}; links=p.get('links') or {}
            yield record('nodered',p.get('name'),p.get('name'),item,author=pub.get('username'),version=p.get('version'),category='automation',updated_at=p.get('date'),url=links.get('npm'))
        start+=len(objs); state['from']=start
        if start>=int(data.get('total') or 0): return
        time.sleep(0.25)
    raise HarvestError(f'Pagination safety stop at offset {start}; resume using saved state')
def vodacom(state):
    if not os.environ.get('VODACOM_API_TOKEN'): raise HarvestError('VODACOM_API_TOKEN is required after API Pulse registration')
    raise HarvestError('The supplied /api/products route is illustrative and unverified. Confirm the catalog route in the authenticated API Pulse portal; no request was sent.')
def takealot(state):
    if not os.environ.get('TAKEALOT_API_KEY'): raise HarvestError('TAKEALOT_API_KEY is required from Seller Portal → Settings → API Access')
    raise HarvestError('The supplied /offers route and continuation contract are illustrative and unverified. Confirm the exact seller resource in current Swagger docs; no request was sent.')
def payjustnow(state):
    if not os.environ.get('PAYJUSTNOW_MERCHANT_ID') or not os.environ.get('PAYJUSTNOW_SECRET_KEY'): raise HarvestError('Merchant ID and secret are required')
    raise HarvestError('A transaction-list read endpoint is not established by the supplied source. Confirm a merchant-approved read endpoint; no request was sent.')
ADAPTERS={'shopglu':shopglu,'n8n':n8n,'nodered':nodered,'vodacom':vodacom,'takealot':takealot,'payjustnow':payjustnow}
def init_db(path):
    with sqlite3.connect(path) as db:
        db.execute('CREATE TABLE IF NOT EXISTS harvested_items (ecosystem TEXT NOT NULL, plugin_id TEXT NOT NULL, name TEXT NOT NULL, author TEXT, version TEXT, downloads INTEGER, rating REAL, category TEXT, updated_at TEXT, url TEXT, raw_json TEXT NOT NULL, harvested_at TEXT NOT NULL, PRIMARY KEY(ecosystem,plugin_id))')
        db.execute('CREATE TABLE IF NOT EXISTS harvest_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, ecosystem TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, records INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, error TEXT)')
def run_one(ecosystem,db_path):
    if ecosystem not in BY_ID: raise HarvestError('Unknown ecosystem: '+ecosystem)
    if ecosystem not in ADAPTERS: raise HarvestError(ecosystem+' is catalog-only')
    init_db(db_path); count=0; started=datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(db_path) as db:
        run_id=db.execute('INSERT INTO harvest_runs(ecosystem,started_at,status) VALUES(?,?,?)',(ecosystem,started,'running')).lastrowid
        try:
            for row in ADAPTERS[ecosystem]({}):
                cols=list(row); marks=','.join('?' for _ in cols); column_sql=','.join(cols)
                updates=','.join(f'{c}=excluded.{c}' for c in cols if c not in ('ecosystem','plugin_id'))
                sql=f"INSERT INTO harvested_items ({column_sql}) VALUES ({marks}) ON CONFLICT(ecosystem,plugin_id) DO UPDATE SET {updates}"
                db.execute(sql,[row[c] for c in cols]); count+=1
            db.execute('UPDATE harvest_runs SET finished_at=?,records=?,status=? WHERE id=?',(datetime.now(timezone.utc).isoformat(),count,'complete',run_id))
        except Exception as e:
            db.execute('UPDATE harvest_runs SET finished_at=?,records=?,status=?,error=? WHERE id=?',(datetime.now(timezone.utc).isoformat(),count,'failed',str(e),run_id)); raise
    return count
def main(argv=None):
    parser=argparse.ArgumentParser(description='SG Plugin Census harvester')
    parser.add_argument('--db',default='census.db'); parser.add_argument('--only',nargs='+',required=True,choices=sorted(BY_ID)); parser.add_argument('--execute',action='store_true')
    args=parser.parse_args(argv)
    if not args.execute:
        for key in args.only:
            item=BY_ID[key]; print(f"{key}: {item['api_status']} / {'adapter-ready' if key in ADAPTERS else 'catalog-only'} / {item['verification']}")
        print('Dry run only. Add --execute to perform network requests.'); return 0
    failures=0
    for key in args.only:
        try: print(f'{key}: stored {run_one(key,args.db)} records')
        except HarvestError as e: failures+=1; print(f'{key}: BLOCKED — {e}',file=sys.stderr)
    return 1 if failures else 0
if __name__=='__main__': raise SystemExit(main())
