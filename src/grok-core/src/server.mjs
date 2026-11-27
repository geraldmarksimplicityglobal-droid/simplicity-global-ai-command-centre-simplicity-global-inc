import http from 'node:http';
import {createStore} from './store/postgres-store.mjs';
import {createSyncService} from './sync/sync-service.mjs';
import {parseIntervalMs,runTimeWatcher} from './timewatch/schedule.mjs';
const port = Number(process.env.PORT ?? '8080');
const store = createStore(process.env.DATABASE_URL);
const sync = createSyncService({store,token:process.env.GITHUB_TOKEN});
const intervalMs = parseIntervalMs(process.env.SOURCE_SYNC_INTERVAL_SECONDS ?? '300');
const repositories = JSON.parse(process.env.SOURCE_REPOSITORIES ?? '[]');
if (!Array.isArray(repositories)) throw new Error('SOURCE_REPOSITORIES must be a JSON array');
const server = http.createServer(async (req,res) => {
 res.setHeader('Cache-Control','no-store');
 if (req.method==='GET' && req.url==='/healthz') { res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify({status:'ok',service:'sg-source-vault'})); }
 if (req.method==='GET' && req.url==='/readyz') {
  try { await store.ping(); res.writeHead(200,{'content-type':'application/json'}); return res.end('{"status":"ready"}'); }
  catch { res.writeHead(503,{'content-type':'application/json'}); return res.end('{"status":"not_ready"}'); }
 }
 if (req.method==='POST' && req.url==='/internal/sync') {
  if (!process.env.WATCHER_API_TOKEN || req.headers.authorization!=='Bearer '+process.env.WATCHER_API_TOKEN) { res.writeHead(401); return res.end(); }
  try { const result=await sync.syncAll(repositories); res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify({results:result})); }
  catch { res.writeHead(502,{'content-type':'application/json'}); return res.end('{"error":"sync_failed"}'); }
 }
 res.writeHead(404); res.end();
});
await store.ping();
server.listen(port,'0.0.0.0');
const controller=new AbortController();
process.on('SIGTERM',()=>controller.abort()); process.on('SIGINT',()=>controller.abort());
if (repositories.length) runTimeWatcher({intervalMs,signal:controller.signal,run:()=>sync.syncAll(repositories),onError:()=>{}});
