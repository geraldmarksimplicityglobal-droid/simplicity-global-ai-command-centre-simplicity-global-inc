import pg from 'pg';
const {Pool} = pg;
export function createStore(connectionString) {
 if (!connectionString) throw new Error('DATABASE_URL is required');
 const pool = new Pool({connectionString,ssl:{rejectUnauthorized:true},max:5,idleTimeoutMillis:30000,connectionTimeoutMillis:10000});
 return {
  async ping() { await pool.query('select 1'); return true; },
  async beginRun(repository) {
   const result = await pool.query("insert into private.sync_runs (owner,repo,ref,status,started_at) values ($1,$2,$3,'running',now()) returning id",[repository.owner,repository.repo,repository.ref]);
   return result.rows[0].id;
  },
  async saveSnapshot(snapshot,runId) {
   const client = await pool.connect();
   try {
    await client.query('begin');
    const result = await client.query('insert into private.source_repositories (owner,repo,ref,last_commit_sha,last_synced_at) values ($1,$2,$3,$4,now()) on conflict (owner,repo,ref) do update set last_commit_sha=excluded.last_commit_sha,last_synced_at=now(),updated_at=now() returning id',[snapshot.owner,snapshot.repo,snapshot.ref,snapshot.commitSha]);
    const repositoryId = result.rows[0].id;
    for (const file of snapshot.files) await client.query("insert into private.source_file_snapshots (repository_id,commit_sha,path,blob_sha,content_sha256,size_bytes,content) values ($1,$2,$3,$4,encode(digest($5,'sha256'),'hex'),$6,$7) on conflict (repository_id,commit_sha,path) do update set blob_sha=excluded.blob_sha,content_sha256=excluded.content_sha256,size_bytes=excluded.size_bytes,content=excluded.content",[repositoryId,snapshot.commitSha,file.path,file.blobSha,file.content,file.sizeBytes,file.content]);
    await client.query("update private.sync_runs set status='succeeded',completed_at=now(),commit_sha=$2,files_saved=$3 where id=$1",[runId,snapshot.commitSha,snapshot.files.length]);
    await client.query("insert into private.watcher_heartbeats (worker_id,last_seen_at,status) values ($1,now(),'healthy') on conflict (worker_id) do update set last_seen_at=now(),status='healthy'",['source-vault-worker']);
    await client.query('commit');
   } catch(error) { await client.query('rollback'); throw error; } finally { client.release(); }
  },
  async failRun(runId,message) { await pool.query("update private.sync_runs set status='failed',completed_at=now(),error_message=$2 where id=$1",[runId,String(message).slice(0,1000)]); },
  async close() { await pool.end(); }
 };
}
