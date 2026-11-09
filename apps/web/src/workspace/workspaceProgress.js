import { generationStageTitle } from './generationProgress.js';

export function elapsedLabel(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}
export function workspaceProgress(job) {
  if (job.status === 'awaiting_provider') return '等待渠道恢复，未重新提交';
  const last = job.stages?.at(-1);
  return last ? `最近进展：${generationStageTitle(last)} · 执行中，可切换任务` : '等待执行服务返回进展，可切换任务';
}
