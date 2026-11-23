from __future__ import annotations
import argparse, json, os, sqlite3, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone
from typing import Any
from registry import BY_ID
UA='SimplicityGlobal-PluginCensus/0.1'
PUBLIC_HOSTS={'open-vsx.org','packagecontrol.io','melpa.org','pypi.org','deepseekharnessplugins.com','api.claude-plugins.dev','claudepluginhub.com','registry.modelcontextprotocol.io','mcp.casdoor.org','api.wordpress.org','api.github.com','registry.npmjs.org','displaycatalog.mp.microsoft.com','store.playstation.com','mods.factorio.com'}
TOKEN_HOSTS={'api.steampowered.com','apipulse.vodacom.co.za','marketplace-api.takealot.com','seller-api.takealot.com','api.payjustnow.com','marketplace.magento.com','huggingface.co','registry.modelcontextprotocol.io','api.crewai.com','api.apify.com','api.vercel.com'}
MAX_PAGES=100
class HarvestError(RuntimeError): pass
def fetch_json(url, headers=None, max_bytes=5_000_000):
    p=urllib.parse.urlparse(url)
    if p.scheme!='https' or p.hostname not in PUBLIC_HOSTS|TOKEN_HOSTS: raise HarvestError('HTTPS host is not allowlisted')
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/json',**(headers or {})})
    try:
        with urllib.request.urlopen(req,timeout=20) as res:
            raw=res.read(max_bytes+1)
            if len(raw)>max_bytes: raise HarvestError(f'Response exceeds {max_bytes} byte limit')
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

def xbox_gamepass(state):
    """Enumerate Microsoft Store products by market/platform; catalog is not SDK inventory."""
    markets=state.get('markets',['US'])
    platforms=state.get('platforms',['console','pc'])
    if not isinstance(markets,list) or not isinstance(platforms,list):
        raise HarvestError('markets and platforms must be lists')
    for market in markets:
        if not isinstance(market,str) or not market.isalpha() or not 2 <= len(market) <= 3:
            raise HarvestError('Invalid Xbox market code')
        for platform in platforms:
            if platform not in ('console','pc'):
                raise HarvestError('Xbox platform must be console or pc')
            query=urllib.parse.urlencode({'market':market,'platform':platform,'actionFilter':'All'})
            data=fetch_json('https://displaycatalog.mp.microsoft.com/v7.0/products?'+query)
            if not isinstance(data,dict):
                raise HarvestError('Unexpected Microsoft Store catalog response')
            products=data.get('Products') or data.get('products') or []
            if not isinstance(products,list):
                raise HarvestError('Unexpected Microsoft Store Products field')
            for p in products:
                if not isinstance(p,dict): continue
                localized=p.get('LocalizedProperties') or p.get('localizedProperties') or []
                title=None
                if localized and isinstance(localized[0],dict):
                    title=localized[0].get('ProductTitle') or localized[0].get('productTitle')
                title=title or p.get('ProductTitle') or p.get('productTitle')
                product_id=p.get('ProductId') or p.get('productId')
                if not product_id or not title: continue
                yield record('xbox-gamepass',product_id,title,p,
                    author=p.get('PublisherName') or p.get('publisherName'),
                    category='game_catalog:'+platform+':'+market,
                    url='https://www.xbox.com/games/store/'+urllib.parse.quote(str(product_id),safe=''))
            time.sleep(0.25)
    state['markets']=markets
    state['platforms']=platforms

def psn_store(state):
    """Fetch explicitly seeded PlayStation Store containers via an unofficial endpoint."""
    seeds=state.get('seed_containers',['UP1477-CUSA07022_00-FORTNITETESTING1'])
    if not isinstance(seeds,list):
        raise HarvestError('seed_containers must be a list of product/container IDs')
    base='https://store.playstation.com/store/api/chihiro/00_09_000/container/US/en/999'
    for cid in seeds:
        if not isinstance(cid,str) or not cid or len(cid)>160 or not all(ch.isalnum() or ch in '-_' for ch in cid):
            raise HarvestError('Invalid PlayStation container ID')
        data=fetch_json(base+'/'+urllib.parse.quote(cid,safe='-_'))
        if not isinstance(data,dict):
            raise HarvestError('Unexpected PlayStation Store response')
        item_id=data.get('id') or cid
        name=data.get('name') or data.get('title')
        if not name:
            raise HarvestError('PlayStation Store response lacks a product name')
        yield record('psn-store',item_id,name,data,
            author=data.get('provider_name') or data.get('providerName'),
            category=data.get('game_contentType') or data.get('bucket') or 'playstation_store_product',
            url='https://store.playstation.com/en-us/product/'+urllib.parse.quote(cid,safe='-_'))
    state['seed_containers']=seeds


def factorio(state):
    """Enumerate public Factorio Mod Portal pages; no credentials are sent."""
    page=int(state.get('page',1))
    page_size=int(state.get('page_size',100))
    if page < 1 or not 1 <= page_size <= 100:
        raise HarvestError('Factorio page must be positive and page_size must be 1..100')
    for _ in range(MAX_PAGES):
        query=urllib.parse.urlencode({'page':page,'page_size':page_size})
        data=fetch_json('https://mods.factorio.com/api/mods?'+query)
        if not isinstance(data,dict):
            raise HarvestError('Unexpected Factorio Mod Portal response')
        results=data.get('results') or []
        if not isinstance(results,list):
            raise HarvestError('Unexpected Factorio results field')
        if not results:
            return
        for mod in results:
            if not isinstance(mod,dict): continue
            release=mod.get('latest_release') or {}
            if not isinstance(release,dict): release={}
            name=mod.get('name')
            if not name: continue
            yield record('factorio',name,mod.get('title') or name,mod,
                author=mod.get('owner'),version=release.get('version'),
                downloads=mod.get('downloads_count'),rating=mod.get('score'),
                category=mod.get('category'),updated_at=release.get('released_at'),
                url='https://mods.factorio.com/mod/'+urllib.parse.quote(str(name),safe=''))
        pagination=data.get('pagination') or {}
        if not isinstance(pagination,dict):
            raise HarvestError('Unexpected Factorio pagination field')
        total=pagination.get('page_count') or pagination.get('pages')
        if total is not None:
            try: total=int(total)
            except (TypeError,ValueError): raise HarvestError('Invalid Factorio page count')
            if page >= total: return
        elif len(results) < page_size:
            return
        page+=1
        state['page']=page
        time.sleep(0.25)
    raise HarvestError('Factorio pagination safety stop; resume with saved page state')


def steam_workshop(state):
    """Discover Workshop items only with an explicitly configured publisher key."""
    key=os.environ.get('STEAM_PUBLISHER_KEY')
    if not key:
        raise HarvestError('STEAM_PUBLISHER_KEY is required for Steam Workshop discovery')
    if len(key)>256 or any(ch.isspace() for ch in key):
        raise HarvestError('STEAM_PUBLISHER_KEY has an invalid format')
    try: appid=int(state.get('appid',427520))
    except (TypeError,ValueError): raise HarvestError('Steam appid must be an integer')
    if appid <= 0: raise HarvestError('Steam appid must be positive')
    cursor=state.get('cursor','*')
    for _ in range(MAX_PAGES):
        params={'key':key,'appid':appid,'query_type':0,'numperpage':100,'cursor':cursor,
                'return_short_description':'true'}
        url='https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/?'+urllib.parse.urlencode(params)
        data=fetch_json(url)
        body=data.get('response') or {}
        items=body.get('publishedfiledetails') or []
        if not isinstance(items,list): raise HarvestError('Unexpected Steam Workshop item list')
        if not items: return
        for item in items:
            if not isinstance(item,dict): continue
            pid=item.get('publishedfileid')
            title=item.get('title')
            if pid is None or not title: continue
            vote=item.get('vote_data') if isinstance(item.get('vote_data'),dict) else {}
            yield record('steam-workshop',str(pid),title,item,
                author=str(item.get('creator')) if item.get('creator') is not None else None,
                downloads=item.get('subscriptions'),rating=vote.get('score'),
                category='workshop-app-'+str(appid),updated_at=str(item.get('time_updated')) if item.get('time_updated') is not None else None,
                url=item.get('file_url') or 'https://steamcommunity.com/sharedfiles/filedetails/?id='+str(pid))
        next_cursor=body.get('next_cursor')
        if not next_cursor or next_cursor==cursor: return
        cursor=next_cursor
        state['cursor']=cursor
        state['appid']=appid
        time.sleep(0.25)
    raise HarvestError('Steam Workshop pagination safety stop; resume with saved cursor')

def openvsx(state):
    offset=int(state.get('offset',0)); size=100
    for _ in range(MAX_PAGES):
        params=urllib.parse.urlencode({'query':'','size':size,'offset':offset,'sortBy':'downloadCount','sortOrder':'desc'})
        data=fetch_json('https://open-vsx.org/api/-/search?'+params)
        items=data.get('extensions') or []
        if not isinstance(items,list): raise HarvestError('Unexpected Open VSX extensions field')
        if not items: return
        for e in items:
            ns=e.get('namespace',''); name=e.get('name','')
            if not ns or not name: continue
            yield record('openvsx',ns+'.'+name,e.get('displayName') or name,e,
                author=ns,version=e.get('version'),downloads=e.get('downloadCount'),rating=e.get('averageRating'),
                category=(e.get('categories') or [None])[0],updated_at=e.get('timestamp'),
                url='https://open-vsx.org/extension/'+urllib.parse.quote(ns,safe='')+'/'+urllib.parse.quote(name,safe=''))
        offset+=len(items); state['offset']=offset
        total=int(data.get('totalSize') or 0)
        if offset>=total or len(items)<size: return
        time.sleep(0.25)
    raise HarvestError('Open VSX pagination safety stop; resume with saved offset')

def sublime_package_control(state):
    data=fetch_json('https://packagecontrol.io/channel_v3.json')
    cache=data.get('packages_cache') or {}
    packages=cache.get('packages') or []
    if not isinstance(packages,list): raise HarvestError('Unexpected Sublime packages field')
    for p in packages:
        if not isinstance(p,dict) or not p.get('name'): continue
        releases=p.get('releases') or []
        latest=releases[-1] if releases else {}
        authors=p.get('authors')
        author=(authors[0] if authors else None) if isinstance(authors,list) else p.get('author')
        yield record('sublime-package-control',p['name'],p['name'],p,
            author=author,version=latest.get('version'),category=(p.get('labels') or [None])[0],
            updated_at=latest.get('date'),url=p.get('homepage') or 'https://packagecontrol.io/packages/'+urllib.parse.quote(p['name'],safe=''))

def melpa(state):
    archive=fetch_json('https://melpa.org/archive.json')
    counts=fetch_json('https://melpa.org/download_counts.json')
    if not isinstance(archive,dict) or not isinstance(counts,dict): raise HarvestError('Unexpected MELPA JSON shape')
    for name,versions in archive.items():
        latest=versions[-1] if isinstance(versions,list) and versions else {}
        if not isinstance(latest,dict): latest={}
        raw={'archive':latest,'downloads':counts.get(name)}
        yield record('melpa',name,name,raw,version=latest.get('version'),downloads=counts.get(name),
            url='https://melpa.org/#/'+urllib.parse.quote(name,safe=''))

def pypi_simple(state):
    import re
    patterns=state.get('patterns',[r'-plugin'xbox-gamepass':xbox_gamepass,'psn-store':psn_store,'shopglu':shopglu,'n8n':n8n,'nodered':nodered,'vodacom':vodacom,'takealot':takealot,'payjustnow':payjustnow}
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
,r'^pytest-',r'^flask-',r'^django-'])
    if not isinstance(patterns,list) or len(patterns)>100: raise HarvestError('PyPI patterns must be a list of at most 100 regexes')
    try: regexes=[re.compile(p,re.IGNORECASE) for p in patterns]
    except re.error as e: raise HarvestError('Invalid PyPI filter regex: '+str(e))
    data=fetch_json('https://pypi.org/simple/',headers={'Accept':'application/vnd.pypi.simple.v1+json'},max_bytes=100_000_000)
    projects=data.get('projects') or []
    for project in projects:
        name=project.get('name') if isinstance(project,dict) else None
        if not name or not any(r.search(name) for r in regexes): continue
        yield record('pypi-simple',name,name,project,category='pypi-plugin',url='https://pypi.org/project/'+urllib.parse.quote(name,safe='')+'/')
    state['patterns']=patterns

def dsh_plugins(state):
    page=int(state.get('page',1)); page_size=50
    for _ in range(MAX_PAGES):
        url='https://deepseekharnessplugins.com/api/v1/plugins?'+urllib.parse.urlencode({'page':page,'pageSize':page_size,'sort':'stars'})
        data=fetch_json(url); body=data.get('data') or {}; items=body.get('items') or []
        if not items: return
        for p in items:
            full=p.get('full_name') or ''
            yield record('dsh-plugins',p.get('id') or full,p.get('name') or full,p,
                author=full.split('/')[0] if full else None,rating=p.get('stars'),
                category=(p.get('categories') or [None])[0],updated_at=p.get('pushed_at'),url=p.get('url'))
        total=int(body.get('total') or 0)
        if page*page_size>=total: return
        page+=1; state['page']=page; time.sleep(0.25)
    raise HarvestError('DeepSeek Harness pagination safety stop')

def claude_plugins_dev(state):
    offset=int(state.get('offset',0)); limit=100
    for _ in range(MAX_PAGES):
        params=urllib.parse.urlencode({'q':'','limit':limit,'offset':offset})
        data=fetch_json('https://api.claude-plugins.dev/api/search?'+params)
        items=data.get('results') or data.get('plugins') or []
        if not items: return
        for p in items:
            pid=p.get('id') or p.get('name')
            if not pid: continue
            yield record('claude-plugins-dev',pid,p.get('name') or pid,p,
                author=p.get('author'),version=p.get('version'),downloads=p.get('downloads'),
                rating=p.get('stars'),category=p.get('category'),updated_at=p.get('updatedAt'),url=p.get('gitUrl'))
        offset+=len(items); state['offset']=offset
        total=int(data.get('total') or 0)
        if offset>=total or len(items)<limit: return
        time.sleep(0.25)
    raise HarvestError('Claude Plugins API pagination safety stop')

def claude_plugin_hub(state):
    page=int(state.get('page',1))
    for _ in range(MAX_PAGES):
        data=fetch_json('https://claudepluginhub.com/api/plugins?'+urllib.parse.urlencode({'q':'','page':page}))
        items=data.get('plugins') or data.get('data') or []
        if not items: return
        for p in items:
            pid=p.get('slug') or p.get('id')
            if not pid: continue
            current=p.get('currentVersion') if isinstance(p.get('currentVersion'),dict) else {}
            yield record('claude-plugin-hub',pid,p.get('name') or pid,p,
                version=current.get('version'),downloads=p.get('installCount'),rating=p.get('starCount'),
                updated_at=p.get('lastCommitDate'),url=p.get('repositoryUrl'))
        total_pages=int(data.get('totalPages') or 0)
        if total_pages and page>=total_pages: return
        if not total_pages and len(items)<36: return
        page+=1; state['page']=page; time.sleep(0.25)
    raise HarvestError('Claude Plugin Hub pagination safety stop')

def mcp_official(state):
    cursor=state.get('cursor')
    for _ in range(MAX_PAGES):
        params={'limit':100}
        if cursor: params['cursor']=cursor
        data=fetch_json('https://registry.modelcontextprotocol.io/v0/servers?'+urllib.parse.urlencode(params))
        servers=data.get('servers') or []
        if not servers: return
        for s in servers:
            name=s.get('name')
            if not name: continue
            yield record('mcp-official',name,s.get('title') or name,s,
                author=name.split('/')[0] if '/' in name else None,version=s.get('version'),
                category='mcp-server',updated_at=s.get('updatedAt') or s.get('publishedAt'),
                url=s.get('repository') or 'https://registry.modelcontextprotocol.io/')
        next_cursor=data.get('nextCursor')
        if not next_cursor or next_cursor==cursor: return
        cursor=next_cursor; state['cursor']=cursor; time.sleep(0.25)
    raise HarvestError('Official MCP Registry pagination safety stop')

def mcp_casdoor(state):
    data=fetch_json('https://mcp.casdoor.org/registry.json')
    if not isinstance(data,list): raise HarvestError('Unexpected Casdoor registry JSON; expected array')
    for entry in data:
        pid=entry.get('id'); name=entry.get('name')
        if not pid or not name: continue
        yield record('mcp-casdoor',pid,name,entry,category=entry.get('category') or 'mcp-server',
            url=entry.get('website') or 'https://mcp.casdoor.org')


ADAPTERS={'steam-workshop':steam_workshop,'openvsx':openvsx,'sublime-package-control':sublime_package_control,'melpa':melpa,'pypi-simple':pypi_simple,'dsh-plugins':dsh_plugins,'claude-plugins-dev':claude_plugins_dev,'claude-plugin-hub':claude_plugin_hub,'mcp-official':mcp_official,'mcp-casdoor':mcp_casdoor,'factorio':factorio,'xbox-gamepass':xbox_gamepass,'psn-store':psn_store,'shopglu':shopglu,'n8n':n8n,'nodered':nodered,'vodacom':vodacom,'takealot':takealot,'payjustnow':payjustnow}
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
