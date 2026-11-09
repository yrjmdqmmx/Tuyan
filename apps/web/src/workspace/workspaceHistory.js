export { historyDraft, mergeAccountHistory } from '../../../../packages/api/src/workspace-history-merge.mjs';
export async function readAccountHistory({baseUrl='',userId,fetcher=fetch,signal,offset=0,jobId}) {
  const path='/api/workspace/history'+(jobId?'/'+encodeURIComponent(jobId):'?offset='+offset);
  const r=await fetcher(baseUrl.replace(/\/$/,'')+path,{credentials:'include',cache:'no-store',headers:{'X-Workspace-Account':userId},signal:signal||AbortSignal.timeout(30000)});
  const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error||'历史任务读取失败'),{status:r.status});return data;
}

export const HISTORY_REFRESH_MS = 300000;
export const HISTORY_RETRY_MS = [15000, 60000, 180000, 300000];
export const historyRetryDelay = failures => HISTORY_RETRY_MS[Math.min(Math.max(failures - 1, 0), HISTORY_RETRY_MS.length - 1)];
export const transientHistoryError = error => !error.status || error.status >= 500 || [408, 429].includes(error.status);
export const savedHistoryCount = state => new Set((state?.tasks || []).flatMap(t => t.runs)
  .map(r => r.history?.jobId || r.execution?.jobId).filter(Boolean)).size;

// Hydration and the history panel share page reads, including a short cooldown
// after failures. A failing history endpoint must not be retried by every 5s
// workspace poll. Caches are account/client scoped and never replace saved data.
export function createHistoryReader(read, now = Date.now) {
  const pages = new Map();
  let generation = 0;
  return {
    clear() { generation++; pages.clear(); },
    read(offset = 0, {force = false} = {}) {
      const previous = pages.get(offset);
      if (previous?.promise) return previous.promise;
      if (!force && previous?.until > now()) return previous.error ? Promise.reject(previous.error) : Promise.resolve(previous.data);
      const entry = {failures:previous?.failures || 0}, epoch = generation;
      pages.set(offset, entry);
      entry.promise = Promise.resolve().then(() => read(offset)).then(data => {
        if (!Array.isArray(data?.jobs) || data.jobs.some(job => !job?.id || !job.source || !Array.isArray(job.results))) {
          throw Object.assign(Error('历史返回格式异常'), {status:422});
        }
        if (generation === epoch) Object.assign(entry, {data,failures:0,until:now()+30000});
        return data;
      }).catch(error => {
        if (generation === epoch) Object.assign(entry, {error,failures:entry.failures+1,until:now()+historyRetryDelay(entry.failures+1)});
        throw error;
      }).finally(() => { entry.promise = null; });
      return entry.promise;
    },
  };
}
