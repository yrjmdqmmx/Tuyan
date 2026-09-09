import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function formatTokenDanceMoney(microyuan) {
  return Number.isSafeInteger(microyuan) ? (microyuan / 1_000_000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '—';
}
function useMobilePayment() {
  const query = '(max-width: 767px), (pointer: coarse)';
  const [mobile, setMobile] = useState(() => window.matchMedia?.(query).matches ?? true);
  useEffect(() => { const media = window.matchMedia?.(query); const update = () => setMobile(media?.matches ?? true); media?.addEventListener('change', update); return () => media?.removeEventListener('change', update); }, []);
  return mobile;
}
export default function TokenDancePanel({ controller }) {
  const td = controller, mobile = useMobilePayment();
  const [amount, setAmount] = useState('10'), [qr, setQr] = useState('');
  const session = td.payment?.session;
  useEffect(() => {
    setQr(''); let active = true;
    if (!mobile && session?.status === 'pending' && session.payment_url) QRCode.toDataURL(session.payment_url, { width: 240, margin: 4 }).then(url => { if (active) setQr(url); }).catch(() => {});
    return () => { active = false; };
  }, [mobile, session?.payment_url, session?.status]);
  return <section className="tokendance-panel" aria-label="TokenDance 连接与钱包">
    <div className="td-heading"><strong>TokenDance</strong><span>{td.connection.connected ? '已连接' : '未连接'}</span></div>
    <p>授权后可使用自己的 TokenDance 账户额度生成和精修图片。</p>
    <div className="td-actions">
      <button type="button" disabled={td.busy || !td.userId} onClick={td.authorize}>{td.connection.connected ? '重新授权' : '连接 TokenDance'}</button>
      {td.connection.connected && <><button type="button" disabled={td.busy} onClick={td.balance}>查询余额</button><button type="button" disabled={td.busy} onClick={td.disconnect}>解除连接</button></>}
    </div>
    {!td.userId && <p>请先登录图研。</p>}
    {td.wallet && <div className="td-wallet"><span>钱包可用余额</span><strong>¥ {formatTokenDanceMoney(td.wallet.balance)}</strong><small>Key 额度需在 TokenDance 查看；充值不会调整 Key 的额度限制。</small></div>}
    {td.connection.connected && <>
      <div className="td-recharge"><label>充值金额（人民币元）<input aria-label="TokenDance 充值金额" type="number" inputMode="numeric" min="1" max="100000" step="1" value={amount} onChange={event => setAmount(event.target.value)} /></label><button type="button" disabled={td.busy || !/^\d+$/.test(amount) || Number(amount) < 1 || Number(amount) > 100000 || (session?.status === 'pending' && session.expired_at * 1000 > Date.now())} onClick={() => td.createPayment(Number(amount))}>创建 ¥{amount || '0'} 充值单</button></div>
      <button type="button" className="td-link" disabled={td.busy} onClick={td.recoverPayment}>查看最近充值记录</button>
    </>}
    {session && <div className="td-payment" aria-live="polite"><p>¥{session.amount} · {({ pending: '等待支付', paid: '已确认到账', closed: '订单已关闭', failed: '支付失败', refunded: '已退款' })[session.status] || session.status}</p>
      {session.status === 'pending' && session.expired_at * 1000 > Date.now() && (mobile ? <>
        {session.alipay_url ? <a className="td-pay-link" href={session.alipay_url}>支付宝支付 ¥{session.amount}</a> : <p>当前无法唤起支付宝，请改用电脑扫码或稍后重试。</p>}
        <small>移动端使用支付宝。若未能打开，请确认已安装支付宝，并用系统浏览器打开图研。返回页面后仍需查询支付状态。</small>
      </> : <>{qr && <img src={qr} width="240" height="240" alt="TokenDance 充值二维码，支持微信和支付宝扫码" />}<small>使用微信或支付宝扫码，金额 ¥{session.amount}。</small></>)}
      <button type="button" disabled={td.busy} onClick={() => td.perform(async () => { await td.request('tokenDancePaymentStatus', { attemptId: td.payment.attemptId }); await td.recoverPayment(); })}>查询支付状态</button>
    </div>}
    {td.error && <p role="alert">{td.error}</p>}{td.notice && <p role="status">{td.notice}</p>}
    <small>授权 Key 加密保存在图研服务端。解除连接仅删除图研保存的授权。</small>
    <a href="https://tokendance.space" target="_blank" rel="noreferrer">前往 TokenDance 管理额度与密钥</a>
  </section>;
}

export function TokenDanceRecovery({ job, controller: td, onResumed }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const retryAt = Date.parse(job?.recovery?.retryAt || '');
    if (!(retryAt > Date.now())) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(retryAt - Date.now() + 50, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [job?.recovery?.retryAt]);
  if (!job?.recovery) return null;
  if (job.status === 'running' || job.status === 'queued') return <p role="status">原任务已恢复，正在复用已保存结果并继续生成。</p>;
  const recovery = job.recovery;
  return <section className="tokendance-panel" aria-label="任务恢复"><strong>任务已保存，可先处理账户状态</strong><p>{recovery.message}</p>
    {recovery.canResume && <button type="button" disabled={td.busy || (recovery.retryAt && Date.parse(recovery.retryAt) > Math.max(now, Date.now()))} onClick={() => td.perform(async () => { const result = await td.request('tokenDanceResume', { jobId: job.id }); await onResumed(result.jobId); })}>从已完成步骤继续</button>}
    <small>{recovery.canResume ? '恢复原任务会复用已保存的模型结果，不重复执行已完成调用。' : '存在结果不确定的调用，自动重试已停止。请先核对 TokenDance 调用记录。'}</small>
    <TokenDancePanel controller={td} />
  </section>;
}
