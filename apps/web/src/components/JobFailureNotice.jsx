import { AlertTriangle } from 'lucide-react';
import { formatErrorMessage } from '../utils';

export default function JobFailureNotice({ job }) {
  if (!job?.error) return null;
  const failure = job.failure;
  const diagnostic = failure?.diagnostic;
  return <div className="error-line job-failure-notice" role="alert"><AlertTriangle size={16} /><div>
    <p>{failure?.message || formatErrorMessage(job.error)}</p>
    {(failure?.billingMessage || job.recovery?.billingMessage) && <p>{failure?.billingMessage || job.recovery.billingMessage}</p>}
    {job.recovery?.message && job.recovery.message !== failure?.message && <p>{job.recovery.message}</p>}
    {diagnostic?.channel === 'tokendance' && <details>
      <summary>调用诊断</summary>
      <p>渠道：观猹 TokenDance{diagnostic.requestedModel ? ` · 请求型号：${diagnostic.requestedModel}` : ''}</p>
      {diagnostic.actualModel && diagnostic.actualModel !== diagnostic.requestedModel && <p>响应型号：{diagnostic.actualModel}</p>}
      <p>中断位置：{diagnostic.phase === 'response_headers' ? '等待响应头' : '读取响应内容'}</p>
      {['first_response', 'stream_idle', 'total'].includes(diagnostic.timeoutKind) && <p>超时原因：{{first_response: '未等到首个有效模型事件', stream_idle: '模型输出连续停顿', total: '达到单次请求总时限'}[diagnostic.timeoutKind]}{Number.isFinite(diagnostic.timeoutMs) ? `（上限 ${diagnostic.timeoutMs / 1000} 秒）` : ''}</p>}
      {Number.isFinite(diagnostic.elapsedMs) && <p>等待时长：{(diagnostic.elapsedMs / 1000).toFixed(1)} 秒</p>}
      {diagnostic.requestId && <p>请求编号：<code>{diagnostic.requestId}</code></p>}
      <p>这些记录用于核对渠道调用，不代表已生成结果或已确认费用。</p>
    </details>}
  </div></div>;
}
