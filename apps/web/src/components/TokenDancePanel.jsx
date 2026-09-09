import { useEffect, useState } from 'react';
import { ArrowUpRight, Link2, RefreshCw, Wallet, History } from 'lucide-react';
import QRCode from 'qrcode';

export function formatTokenDanceMoney(microyuan) {
  return Number.isSafeInteger(microyuan) ? (microyuan / 1_000_000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '—';
}
export function paymentStateLabel(row) {
  const status = row?.session?.status || row?.state;
  return ({ pending: '等待支付', paid: '已确认到账', closed: '订单已关闭', failed: '支付失败', refunded: '已退款', creating: '正在确认订单', unknown: '创建结果待核对' })[status] || '状态待查询';
}
function useMobilePayment() {
  const query = '(max-width: 767px), (pointer: coarse)';
  const [mobile, setMobile] = useState(() => window.matchMedia?.(query).matches ?? true);
  useEffect(() => { const media = window.matchMedia?.(query); const update = () => setMobile(media?.matches ?? true); media?.addEventListener('change', update); return () => media?.removeEventListener('change', update); }, []);
  return mobile;
}
export function TokenDanceStatus({ controller: td, onOpenAccount }) {
  return <div className="td-compact" aria-label="观猹 TokenDance 连接状态">
    <Link2 size={16} /><strong>观猹 TokenDance</strong>
    <span className={td.connection.connected ? 'td-connected' : ''}>{td.connection.connected ? '已连接' : td.userId ? '未连接' : '登录后连接'}</span>
    {td.connection.connected && td.wallet && <span className={td.wallet.balance <= 0 ? 'td-low-balance' : 'td-compact-balance'}>余额 ¥{formatTokenDanceMoney(td.wallet.balance)}</span>}
    <button type="button" className="account-button account-button-quiet" onClick={onOpenAccount}>账户与钱包<ArrowUpRight size={15} /></button>
  </div>;
}
export default function TokenDancePanel({ controller: td }) {
  const mobile = useMobilePayment();
  const [amount, setAmount] = useState('10'), [qr, setQr] = useState(''), [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const session = td.payment?.session;
  const payments = td.payments || [];
  const uncertainOrder = payments.some(row => ['unknown', 'creating'].includes(row.state));
  const pendingOrder = session?.status === 'pending' && session.expired_at * 1000 > Date.now();
  useEffect(() => {
    setConfirmDisconnect(false);
    let cancelled = false;
    if (td.userId && td.connection.connected) {
      // Read-only account entry. Authorizing, creating payments and resuming tasks always require a click.
      void (async () => { const result = await td.balance(); if (!cancelled && result) await td.recoverPayment(); })();
    }
    return () => { cancelled = true; };
  }, [td.userId, td.connection.connected]);
  useEffect(() => {
    setQr(''); let active = true;
    if (!mobile && session?.status === 'pending' && session.payment_url) QRCode.toDataURL(session.payment_url, { width: 240, margin: 4 }).then(url => { if (active) setQr(url); }).catch(() => {});
    return () => { active = false; };
  }, [mobile, session?.payment_url, session?.status]);
  return <div className="account-channel" aria-label="观猹 TokenDance 连接与钱包">
    {td.busy && <p role="status" className="account-feedback">正在处理，请稍候…</p>}
    {td.error && <p role="alert" className="account-feedback account-feedback-error">{td.error}</p>}{td.notice && <p role="status" className="account-feedback">{td.notice}</p>}
    <section className="account-card">
      <div className="account-card-title"><Link2 size={20} /><h3>渠道连接</h3></div>
      <div className="td-heading"><strong>观猹 TokenDance</strong><span className={`account-status ${td.connection.connected ? 'td-connected' : ''}`}>{td.connection.connected ? '已连接' : '未连接'}</span></div>
      <p>使用你自己的观猹 TokenDance 账户额度生成、精修图片和优化输入。</p>
      <div className="td-actions">
        <button type="button" className="account-button account-button-primary" disabled={td.busy || !td.userId || td.connection.available === false} onClick={td.authorize}>{td.connection.connected ? '重新授权' : '连接观猹 TokenDance'}</button>
        {td.connection.connected && <button type="button" className="account-button account-button-quiet" disabled={td.busy} onClick={() => setConfirmDisconnect(true)}>解除连接</button>}
      </div>
      {confirmDisconnect && <div className="account-inline-notice"><p>解除后将删除图研保存的授权，原任务和图片仍保留。</p><div className="td-actions"><button type="button" className="account-button" disabled={td.busy} onClick={async () => { await td.disconnect(); setConfirmDisconnect(false); }}>确认解除连接</button><button type="button" className="account-button account-button-quiet" onClick={() => setConfirmDisconnect(false)}>取消</button></div></div>}
      {!td.userId && <p className="account-muted">请先登录图研。</p>}
      {td.userId && td.connection.available === false && <p className="account-muted">正在确认渠道服务；若持续不可用，请稍后重试。</p>}
      <small>授权 Key 加密保存。解除连接仅删除图研保存的授权，远端 Key 仍可在渠道后台管理。</small>
    </section>
    <section className="account-card">
      <div className="account-card-title"><Wallet size={20} /><h3>钱包与充值</h3>{td.connection.connected && <button type="button" className="account-button account-button-quiet" disabled={td.busy} onClick={td.balance}><RefreshCw size={14} />查询余额</button>}</div>
      <div className="td-wallet"><span>钱包可用余额 · 人民币</span><strong>¥ {td.connection.connected ? formatTokenDanceMoney(td.wallet?.balance) : '—'}</strong></div>
      <div className="td-quota-note"><strong>钱包余额与 Key 额度分别管理</strong><p>Key 额度需在观猹 TokenDance 查看；充值不会调整 Key 的额度限制。余额充足时，Key 仍可能因额度耗尽、到期或禁用而无法调用。</p><a href="https://tokendance.space/" target="_blank" rel="noreferrer">管理渠道额度与密钥<ArrowUpRight size={14} /></a></div>
      {td.connection.connected ? <div className="td-recharge"><label htmlFor="td-recharge-amount">充值金额（人民币元）<input id="td-recharge-amount" aria-label="观猹 TokenDance 充值金额" type="number" inputMode="numeric" min="1" max="100000" step="1" value={amount} onChange={event => setAmount(event.target.value)} /></label><button type="button" className="account-button account-button-primary" disabled={td.busy || uncertainOrder || !/^\d+$/.test(amount) || Number(amount) < 1 || Number(amount) > 100000 || pendingOrder} onClick={() => td.createPayment(Number(amount))}>创建 ¥{amount || '0'} 充值单</button></div> : <p className="account-muted">连接渠道后可查询余额和充值。</p>}
      {uncertainOrder && <p role="status" className="account-inline-notice">有订单创建结果待核对，请先在渠道后台确认，暂不重复创建。</p>}
      {session && <div className="td-payment" aria-live="polite"><strong>¥{session.amount} · {paymentStateLabel(td.payment)}</strong>
        {pendingOrder && (mobile ? <>
          {session.alipay_url ? <a className="account-button account-button-primary" href={session.alipay_url}>支付宝支付 ¥{session.amount}</a> : <p>当前无法唤起支付宝，请改用电脑扫码或稍后重试。</p>}
          <small>请用系统浏览器打开图研，并确认已安装支付宝。返回后查询支付状态确认到账。</small>
        </> : <>{qr && <img src={qr} width="240" height="240" alt="观猹 TokenDance 充值二维码，支持微信和支付宝扫码" />}<small>使用微信或支付宝扫码，金额 ¥{session.amount}。</small></>)}
        {session.status === 'pending' && !pendingOrder && <p>支付会话已过期，请查询最终状态后再操作。</p>}
        <button type="button" className="account-button" disabled={td.busy} onClick={() => td.paymentStatus(td.payment.attemptId)}>查询支付状态</button>
      </div>}
    </section>
    <section className="account-card">
      <div className="account-card-title"><History size={20} /><h3>充值记录</h3><button type="button" className="account-button account-button-quiet" disabled={td.busy || !td.userId} onClick={td.recoverPayment}>刷新记录</button></div>
      <p className="account-muted">最近 10 笔通过图研创建的充值单；到账以支付状态查询为准。</p>
      {payments.length ? <ul className="td-payment-history">{payments.map((row, index) => <li key={row.attemptId || index}>
        <div><strong>¥{row.session?.amount ?? row.amount}</strong><span>{paymentStateLabel(row)}</span>{row.createdAt && <time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString('zh-CN', { hour12: false })}</time>}</div>
        {row.session && <button type="button" className="account-button account-button-quiet" disabled={td.busy} onClick={() => td.paymentStatus(row.attemptId)} aria-label={`查询第 ${index + 1} 笔充值状态`}>查询状态</button>}
      </li>)}</ul> : <div className="account-empty">{td.historyLoaded ? '暂无充值记录' : '登录并连接后可查询充值记录'}</div>}
    </section>
  </div>;
}

export function TokenDanceRecovery({ job, controller: td, onResumed, onOpenAccount }) {
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
  return <section className="tokendance-panel td-recovery" aria-label="任务恢复"><strong>任务已保存，可先处理账户状态</strong><p>{recovery.message}</p>
    <div className="td-actions"><button type="button" className="account-button" onClick={onOpenAccount}>前往账户处理</button>
    {recovery.canResume && <button type="button" className="account-button account-button-primary" disabled={td.busy || (recovery.retryAt && Date.parse(recovery.retryAt) > Math.max(now, Date.now()))} onClick={() => td.perform(async () => { const result = await td.request('tokenDanceResume', { jobId: job.id }); await onResumed(result.jobId); })}>从已完成步骤继续</button>}</div>
    <small>{recovery.canResume ? '恢复原任务会复用已保存的模型结果，不重复执行已完成调用。' : '存在结果不确定的调用，自动重试已停止。请先核对观猹 TokenDance 调用记录。'}</small>
    {td.error && <p role="alert">{td.error}</p>}
  </section>;
}
