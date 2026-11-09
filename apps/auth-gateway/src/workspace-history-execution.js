import { bailianRouteFields } from './bailian-workspace.js';
import { createHash } from 'node:crypto';
import { normalizeUniversalRoute } from './universal-contract.js';

const fail = message => Object.assign(Error(message), {status:409});
// Reads the authoritative Core on this deployment. A local production-history
// bridge is deliberately not a path to execute a remote production job.
export async function readHistoricalExecution(backend, userId, jobId) {
  if (!backend) throw fail('此服务尚未接入原任务执行器，原记录保持不变。');
  const result = await backend.call({action:'getJob',jobId}, {}, {authUserId:userId});
  const job = result.data?.job;
  if (result.status !== 200 || result.data?.code || !job || job.id !== jobId) throw fail('当前执行服务找不到原任务；不会在其他服务重新生成。');
  if (String(job.userId || job.user_id || '') !== userId) throw Object.assign(Error('HISTORY_OWNER_MISMATCH'),{status:403});
  const routes = {};
  for (const role of ['main','image','vision']) {
    const route = (job.modelRoutes || job.model_routes)?.[role];
    if (!route) continue;
    if (typeof route.modelId !== 'string' || !route.modelId || route.modelId.length>500 || !/^[\w-]{1,80}$/.test(route.accessProvider)) throw fail('原模型身份不完整，未接管历史执行。');
    routes[role] = route.accessProvider === 'custom' ? normalizeUniversalRoute(route) : {accessProvider:route.accessProvider,modelId:route.modelId,...bailianRouteFields(route.accessProvider,route.modelId,route.bailian)};
  }
  if (!Object.keys(routes).length) throw fail('原模型身份不完整，未接管历史执行。');
  // Only non-secret immutable identity; the original encrypted Core checkpoint
  // remains authoritative for inputs, parameters, credentials and finished steps.
  const identity = {jobId, routes, format:job.outputFormat || job.output_format || 'png', kind:job.jobType || job.job_type || 'generate'};
  return {job,routes,fingerprint:createHash('sha256').update(JSON.stringify(identity)).digest('hex')};
}

export function requireHistoricalPause(job) {
  if (job.status !== 'awaiting_provider' || job.recovery?.canResume !== true || job.recovery?.requestState === 'unknown') {
    throw fail('原任务不可自动恢复或调用结果尚不确定，已保存步骤和结果保持不变。');
  }
}
