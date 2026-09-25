import { useEffect, useState } from 'react';
import JobFailureNotice from '../components/JobFailureNotice.jsx';
import { operationPending, routeIdentity } from './operations.js';

const statusLabels = { queued: '排队中', running: '正在处理', succeeded: '结果已保存', blocked: '已暂停', unconfirmed: '结果待查询' };
const callStatusLabels = { succeeded: '调用完成', completed: '调用完成', running: '调用中', queued: '等待调用', not_sent: '尚未发送', rejected: '渠道已拒绝', unknown: '调用结果待核对', failed: '调用失败' };
export default function OperationPanel({ rows, onQuery, onLoad, onResume, onAcknowledge, currentRouteIdentity }) {
  const [open, setOpen] = useState(false);
  const pending = rows.filter(operationPending).length;
  useEffect(() => { if (rows.length) setOpen(true); }, [rows[0]?.requestId]);
  return <div className="fs-panel-content">
    <button type="button" className="generation-settings-trigger" aria-expanded={open} onClick={() => setOpen(!open)}>AI 操作与调用记录{rows.length ? `（${rows.length}）` : ''}</button>
    {pending > 0 && <p className="fs-note" role="status">有 {pending} 项操作尚未确认。先查询原操作；不会自动重新调用模型。</p>}
    {open && <section aria-label="AI 操作与调用记录">
      <p className="fs-micro">源稿仅保存在此浏览器。提交 AI 操作后，输入、结果与恢复所需凭据会在服务器加密暂存，最长 7 天；操作记录按账号隔离。本机仅保存请求标识，不保存密钥或模型结果。</p>
      {!rows.length && <p className="fs-muted">此浏览器尚无当前账号的 AI 操作记录。</p>}
      {rows.map(row => {
        const canResume = !row.bindingMismatch && row.status === 'blocked' && row.recovery?.canResume === true && row.recovery.requestState !== 'unknown';
        const retryLater = row.recovery?.retryAt && Date.parse(row.recovery.retryAt) > Date.now();
        const sameRoute = currentRouteIdentity && currentRouteIdentity === (row.mainRoute ? routeIdentity(row) : row.routeIdentity);
        return <article className="fs-plan-review" key={row.requestId}>
          <h4>{row.kind === 'plan' ? '结构规划' : '语言编辑'} · {statusLabels[row.status] || '状态待查询'}</h4>
          <p className="fs-micro">图稿版本 {row.documentContext.revision} · {row.documentContext.sha256.slice(0, 10)}<br />请求 ID：{row.requestId}</p>
          {row.mainRoute && <p className="fs-micro">{row.mainRoute.accessProvider} / {row.mainRoute.modelId}</p>}
          <JobFailureNotice job={{ ...row, error: row.failure?.message || row.recovery?.message }} />
          {row.bindingMismatch && <p className="fs-error" role="status">服务端记录的图稿或生成规则与原请求不同。仅显示原操作状态、方案和调用记录，不能载入或恢复；结果与费用仍以渠道记录核对，未重新调用模型。</p>}
          {row.queryError && <p className="fs-error" role="status">{row.queryError}</p>}
          <div className="fs-button-row"><button type="button" disabled={row.checking} onClick={() => onQuery(row)}>{row.checking ? '正在查询…' : '查询原操作'}</button>
            {row.status === 'succeeded' && !row.bindingMismatch && <button type="button" onClick={() => onLoad(row)}>载入待确认方案</button>}
            {canResume && <button type="button" disabled={retryLater} onClick={() => onResume(row, false)}>恢复原操作</button>}
            {canResume && sameRoute && row.mainRoute?.accessProvider === 'custom' && <button type="button" disabled={retryLater} onClick={() => onResume(row, true)}>使用当前配置密钥恢复</button>}
          </div>
          {retryLater && <p className="fs-micro">渠道要求等待至 {new Date(row.recovery.retryAt).toLocaleString('zh-CN')}，请届时查询后恢复。</p>}
          {canResume && <p className="fs-micro">仅恢复明确允许继续的原操作，保留已完成步骤。原生渠道使用原操作保存的凭据；通用 API 可使用同一渠道、型号、地址与协议的当前密钥。</p>}
          {(row.status === 'unconfirmed' || row.recovery?.requestState === 'unknown') && !row.acknowledged && <details><summary>已自行核对渠道记录</summary><p className="fs-micro">结果不明时再次提交可能重复计费。只有你已核对渠道记录并决定另建操作，才解除新提交保护；此按钮不会重发旧请求。</p><button type="button" onClick={() => onAcknowledge(row)}>已核对，允许另建操作</button></details>}
          <details><summary>模型调用记录（{row.providerCalls?.length || 0}）</summary>{row.providerCalls?.length ? <ul>{row.providerCalls.map((call, index) => <li key={index}><p>{call.channel || '渠道未返回'} · {call.requestedModel || call.model || '型号未返回'} → {call.actualModel || '实际型号未返回'}</p><p className="fs-micro">请求：{call.requestId || '未返回'} · {callStatusLabels[call.status] || call.status || '已保存渠道响应记录'}<br />费用：{call.billingStatus === 'not_called' ? '未调用' : '以渠道账单核对'}{call.protocol ? ` · ${call.protocol}` : ''}</p></li>)}</ul> : <p className="fs-micro">尚无服务端调用记录。记录为空不代表费用为零。</p>}</details>
          {row.result && <details><summary>查看保存的方案内容</summary><div className="fs-command-list"><pre>{JSON.stringify(row.result, null, 2)}</pre></div><p className="fs-micro">仅查看。载入与确认应用都要核对当前图稿的完整内容。</p></details>}
        </article>;
      })}
    </section>}
  </div>;
}
