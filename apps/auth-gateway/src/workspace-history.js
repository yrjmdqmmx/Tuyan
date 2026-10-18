import { historyJob, historyId } from '../../../packages/api/src/workspace-history.mjs';
const fail = (status,message) => Object.assign(Error(message), {status});
// Called only behind createWorkspaceRouter's origin, session and account guards.
export function createWorkspaceHistory({ backend, auth }) {
  return async (req, id) => {
    if (id && !historyId(id)) throw fail(400,'INVALID_HISTORY_ID');
    if (auth.readWorkspaceHistory) return auth.readWorkspaceHistory(req, id);
    const offset = Number(req.query.offset || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw fail(400,'INVALID_HISTORY_CURSOR');
    const body = id ? {action:'getJob',jobId:id} : {action:'userJobs',userId:req.workspaceUserId,limit:25,offset};
    const result = await backend.call(body, {}, {authUserId:req.workspaceUserId});
    if (result.status !== 200 || result.data?.code) throw fail(result.status || 503,'历史任务暂时不可用');
    if (id) return {job:historyJob(result.data.job,'server',req.workspaceUserId,true)};
    const jobs = (result.data.jobs || []).map(j => historyJob(j,'server',req.workspaceUserId));
    return { jobs, nextOffset:result.data.nextOffset ?? null, truncated:result.data.nextOffset === undefined && jobs.length >= 25 };
  };
}
