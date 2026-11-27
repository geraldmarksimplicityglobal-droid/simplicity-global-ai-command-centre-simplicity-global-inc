import {fetchRepositorySnapshot} from '../providers/github-source.mjs';
export function createSyncService({store,token,fetchImpl}) {
 return {
  async syncRepository(repository) {
   const runId = await store.beginRun(repository);
   try {
    const snapshot = await fetchRepositorySnapshot(repository,{token,fetchImpl});
    await store.saveSnapshot(snapshot,runId);
    return {owner:snapshot.owner,repo:snapshot.repo,ref:snapshot.ref,commitSha:snapshot.commitSha,filesSaved:snapshot.files.length,truncatedByLimits:snapshot.truncatedByLimits};
   } catch(error) { await store.failRun(runId,error.message); throw error; }
  },
  async syncAll(repositories) {
   const results=[];
   for (const repository of repositories) results.push(await this.syncRepository(repository));
   return results;
  }
 };
}
