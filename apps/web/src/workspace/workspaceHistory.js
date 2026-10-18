export { historyDraft, mergeAccountHistory } from '../../../../packages/api/src/workspace-history-merge.mjs';
export async function readAccountHistory({baseUrl='',userId,fetcher=fetch,signal,offset=0,jobId}) {
  const path='/api/workspace/history'+(jobId?'/'+encodeURIComponent(jobId):'?offset='+offset);
  const r=await fetcher(baseUrl.replace(/\/$/,'')+path,{credentials:'include',cache:'no-store',headers:{'X-Workspace-Account':userId},signal:signal||AbortSignal.timeout(30000)});
  const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error||'历史任务读取失败'),{status:r.status});return data;
}
