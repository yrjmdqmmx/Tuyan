import { useEffect, useState } from 'react';
import { Link2, ShieldCheck } from 'lucide-react';
import { authClient } from '../config';

export default function WatchaIdentityPanel({ controller, user, onSignIn }) {
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [cooldown, setCooldown] = useState(0);
  const [unlinking, setUnlinking] = useState(false), [emailNotice, setEmailNotice] = useState('');
  const [sendingVerification, setSendingVerification] = useState(false);
  useEffect(() => { if (cooldown <= 0) return; const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000); return () => window.clearTimeout(timer); }, [cooldown]);
  useEffect(() => { setCode(''); setUnlinking(false); setEmailNotice(''); }, [user?.id, controller?.status?.linked]);
  if (!controller?.status?.available && !controller?.error) return null;
  const c = controller, pending = c.status.pending, linked = c.status.linked;
  async function sendCode(purpose) { if (await c.requestCode(purpose, purpose === 'signup' ? email.trim() : undefined)) { setCooldown(60); setCode(''); } }
  async function sendLocalVerification() {
    if (cooldown > 0 || sendingVerification) return;
    setEmailNotice(''); setSendingVerification(true);
    try {
      const { error } = await authClient.sendVerificationEmail({ email: user.email, callbackURL: 'https://www.paperbanana.asia/account/email-verified.html' });
      setEmailNotice(error ? '验证邮件暂时未能发送，请稍后重试。' : '请在邮件中确认验证，然后刷新账户状态。');
      setCooldown(60);
    } catch { setEmailNotice('验证邮件暂时未能发送，请稍后重试。'); }
    finally { setSendingVerification(false); }
  }
  const verifyEmailButton = <button className="account-button" type="button" onClick={sendLocalVerification} disabled={c.busy || sendingVerification || cooldown > 0}>{cooldown > 0 ? `${cooldown} 秒后重发` : '发送图研邮箱验证邮件'}</button>;
  return <section className="watcha-identity" aria-label="观猹身份登录">
    <div className="watcha-heading"><ShieldCheck size={19} /><strong>{linked ? '已绑定观猹' : pending ? '观猹授权已完成' : '观猹登录'}</strong></div>
    {!c.status.available ? <p>观猹登录状态暂时无法获取，可继续使用邮箱登录。</p> : linked ? <><p>使用观猹登录同一个图研账号，继续访问已有任务和图片。</p>
      {c.status.hasPassword ? <>{!unlinking ? <button className="text-button" type="button" onClick={() => setUnlinking(true)}>解绑观猹</button> : <form aria-label="验证邮箱并解绑观猹" onSubmit={async event => { event.preventDefault(); if (await c.unlink(code)) setUnlinking(false); }}>
        <p>解绑后使用图研邮箱和密码登录。请用当前图研邮箱的验证码确认。</p>
        <CodeInput code={code} setCode={setCode} />
        <div className="watcha-actions"><button type="button" className="account-button" onClick={() => sendCode('unlink')} disabled={c.busy || cooldown > 0}>{cooldown ? `${cooldown} 秒后重发` : '发送验证码'}</button><button className="account-button" type="submit" disabled={c.busy || !/^\d{6}$/.test(code)}>确认解绑</button><button type="button" className="text-button" onClick={() => setUnlinking(false)}>取消</button></div>
      </form>}</> : <p>观猹是你当前的登录方式，设置密码后才能解绑。可通过登录页的“忘记密码”邮件设置图研密码。</p>}
    </> : pending ? <>
      {user ? <><p>将观猹绑定到当前图研账号。你的已有任务和渠道连接保持归属不变。</p>
        {c.status.emailVerified ? <button className="account-button" type="button" disabled={c.busy} onClick={c.link}><Link2 size={17} />确认绑定当前图研账号</button> : <><p>请先验证当前图研邮箱，然后确认绑定。</p>{verifyEmailButton}</>}
      </> : <>
        <p>首次使用时，可验证邮箱创建图研账号，也可以绑定已有账号。</p>
        <form aria-label="验证邮箱并创建图研账号" onSubmit={async event => { event.preventDefault(); if (await c.complete(email.trim(), code)) setCode(''); }}>
          <label className="field"><span>接收验证的邮箱</span><input type="email" autoComplete="email" required value={email} onChange={event => { setEmail(event.target.value); setCode(''); }} maxLength={254} /></label>
          <CodeInput code={code} setCode={setCode} />
          <div className="watcha-actions"><button className="account-button" type="button" onClick={() => sendCode('signup')} disabled={c.busy || cooldown > 0 || !email.trim()}>{cooldown ? `${cooldown} 秒后重发` : '发送验证码'}</button><button className="primary-button" type="submit" disabled={c.busy || !email.trim() || !/^\d{6}$/.test(code)}>验证邮箱并创建账号</button></div>
        </form>
        <button className="text-button" type="button" onClick={onSignIn}>登录已有图研账号并绑定</button>
      </>}
    </> : user && !c.status.emailVerified ? <><p>绑定观猹前，请先验证当前图研邮箱。</p>{verifyEmailButton}</> : <><p>{user ? '绑定后可使用观猹登录当前图研账号。' : '使用观猹账号登录，保留当前工作台内容。'}</p><button className="account-button watcha-login-button" type="button" disabled={c.busy} onClick={() => c.start(user ? 'link' : 'login')}><Link2 size={17} />{c.busy ? '等待完成授权…' : user ? '绑定观猹账号' : '使用观猹登录'}</button></>}
    {c.notice ? <p role="status">{c.notice}</p> : null}
    {emailNotice ? <p role="status">{emailNotice}</p> : null}
    {c.error ? <p className="error-line" role="alert">{c.error}</p> : null}
    {(pending || linked || user || c.error) && <button className="text-button" type="button" onClick={c.refresh} disabled={c.busy}>刷新登录状态</button>}
  </section>;
}

function CodeInput({ code, setCode }) {
  return <label className="field"><span>邮箱验证码</span><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 位验证码" required /></label>;
}
