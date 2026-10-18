export function elapsedLabel(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}
export function workspaceProgress(job) {
  if (job.status === 'awaiting_provider') return '等待渠道恢复，未重新提交';
  const last = job.stages?.at(-1);
  return last ? `最近进展：${last.title || last.type} · 执行中，可切换任务` : '正在读取材料与准备参考，可切换任务';
}
