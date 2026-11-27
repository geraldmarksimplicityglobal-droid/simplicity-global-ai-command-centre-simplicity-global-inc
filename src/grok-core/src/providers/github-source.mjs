const API = 'https://api.github.com';
const EXTENSIONS = new Set(['.c','.cc','.cpp','.cs','.css','.go','.h','.hpp','.html','.java','.js','.jsx','.mjs','.php','.py','.rb','.rs','.sh','.sql','.swift','.ts','.tsx','.vue','.yaml','.yml']);
const EXCLUDED = new Set(['.git','node_modules','vendor','dist','build','coverage','.next']);
export function validateRepository(input) {
 const {owner, repo, ref = 'main'} = input ?? {};
 const safe = /^[A-Za-z0-9_.-]+$/;
 if (!owner || !repo || !ref || !safe.test(owner) || !safe.test(repo) || !safe.test(ref)) throw new Error('Repository owner, repo and ref must be simple Git reference components');
 return {owner, repo, ref};
}
export function isSourcePath(path) {
 const parts = String(path).split('/');
 if (parts.some(part => EXCLUDED.has(part))) return false;
 const name = parts.at(-1) ?? '';
 const dot = name.lastIndexOf('.');
 return dot > 0 && EXTENSIONS.has(name.slice(dot).toLowerCase());
}
async function githubGet(url, token, fetchImpl) {
 const headers = {'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'SimplicityGlobal-SourceVault/0.1'};
 if (token) headers.Authorization = 'Bearer ' + token;
 const response = await fetchImpl(url, {headers, signal:AbortSignal.timeout(30000)});
 if (!response.ok) throw new Error('GitHub API returned HTTP ' + response.status);
 return response.json();
}
export async function fetchRepositorySnapshot(input, options = {}) {
 const {owner,repo,ref} = validateRepository(input);
 const token = options.token, fetchImpl = options.fetchImpl ?? fetch;
 const maxFiles = options.maxFiles ?? 500, maxFileBytes = options.maxFileBytes ?? 1048576, maxTotalBytes = options.maxTotalBytes ?? 10485760;
 const base = API + '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo);
 const commit = await githubGet(base + '/commits/' + encodeURIComponent(ref), token, fetchImpl);
 const treeSha = commit.commit?.tree?.sha;
 if (!commit.sha || !treeSha) throw new Error('GitHub commit response omitted required SHAs');
 const tree = await githubGet(base + '/git/trees/' + treeSha + '?recursive=1', token, fetchImpl);
 if (tree.truncated) throw new Error('GitHub tree was truncated; refusing incomplete snapshot');
 const entries = (tree.tree ?? []).filter(entry => entry.type === 'blob' && entry.size <= maxFileBytes && isSourcePath(entry.path)).slice(0,maxFiles);
 const files = []; let totalBytes = 0;
 for (const entry of entries) {
  if (totalBytes + entry.size > maxTotalBytes) break;
  const blob = await githubGet(base + '/git/blobs/' + entry.sha, token, fetchImpl);
  if (blob.encoding !== 'base64' || typeof blob.content !== 'string') continue;
  const content = Buffer.from(blob.content.replace(/\n/g,''),'base64').toString('utf8');
  const bytes = Buffer.byteLength(content,'utf8');
  if (bytes > maxFileBytes || totalBytes + bytes > maxTotalBytes) continue;
  totalBytes += bytes;
  files.push({path:entry.path,blobSha:entry.sha,sizeBytes:bytes,content});
 }
 return {owner,repo,ref,commitSha:commit.sha,treeSha,committedAt:commit.commit?.committer?.date ?? null,files,truncatedByLimits:entries.length >= maxFiles || totalBytes >= maxTotalBytes};
}
