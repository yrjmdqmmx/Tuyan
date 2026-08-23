import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import { authClient } from '../config';
import { formatErrorMessage } from '../utils';

const VERIFIED_URL = 'https://www.paperbanana.asia/account/email-verified.html';
const RESET_URL = 'https://www.paperbanana.asia/account/reset-password.html';

export default function AuthPanel({ onAuthenticated, onCancel }) {
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const isSignUp = mode === 'sign-up';

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function submitAuth(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (mode === 'forgot') {
        const { error: authError } = await authClient.requestPasswordReset({ email, redirectTo: RESET_URL });
        if (authError && authError.status === 429) setCooldown(retryAfter(authError));
        if (authError) throw authError;
        setMode('recovery-sent');
        return;
      }
      const action = isSignUp
        ? authClient.signUp.email({
            email,
            password,
            name: name.trim() || email.split('@')[0] || '图研用户',
            callbackURL: VERIFIED_URL,
          })
        : authClient.signIn.email({ email, password, callbackURL: VERIFIED_URL });
      const { error: authError } = await action;
      if (authError) {
        if (authError.code === 'EMAIL_NOT_VERIFIED') setMode('pending-verification');
        throw authError;
      }
      if (isSignUp) setMode('pending-verification');
      else await onAuthenticated();
    } catch (err) {
      setError(err?.message || '操作失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendVerification() {
    if (cooldown > 0 || !email) return;
    setError('');
    setIsSubmitting(true);
    try {
      const { error: authError } = await authClient.sendVerificationEmail({ email, callbackURL: VERIFIED_URL });
      if (authError) throw authError;
      setCooldown(60);
    } catch (err) {
      if (err?.status === 429) setCooldown(retryAfter(err));
      setError(err?.message || '发送失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (mode === 'pending-verification' || mode === 'recovery-sent') {
    const verification = mode === 'pending-verification';
    return (
      <section className="auth-panel" aria-live="polite">
        <div className="section-head"><MailCheck size={22} /><div><h2>{verification ? '等待验证' : '检查你的邮箱'}</h2><p>{verification ? '验证邮件已发送，请在 1 小时内完成验证后返回登录。' : '如该邮箱存在，我们已发送 1 小时内有效的重置链接。'}</p></div></div>
        {verification ? <button className="secondary-button" type="button" disabled={isSubmitting || cooldown > 0} onClick={resendVerification}>{isSubmitting ? <Loader2 className="spin" size={18} /> : <MailCheck size={18} />}{cooldown > 0 ? `${cooldown} 秒后可重发` : '重发验证邮件'}</button> : null}
        {error ? <div className="error-line"><AlertTriangle size={16} /> {formatErrorMessage(error)}</div> : null}
        <button className="text-button" type="button" onClick={() => { setMode('sign-in'); setError(''); }}>返回登录</button>
      </section>
    );
  }

  const forgot = mode === 'forgot';
  return (
    <section className="auth-panel">
      <div className="section-head"><ShieldCheck size={22} /><div><h2>{forgot ? '忘记密码' : isSignUp ? '注册账号' : '登录账号'}</h2><p>{forgot ? '输入邮箱后，我们会发送密码重置链接。' : '登录后可同步任务记录与账号数据。'}</p></div></div>
      <form className="auth-form" onSubmit={submitAuth}>
        {isSignUp ? <label className="field"><span>昵称</span><input className="auth-name-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="可选" autoComplete="name" maxLength={24} /></label> : null}
        <label className="field"><span>邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
        {!forgot ? <label className="field"><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8–128 位" minLength={8} maxLength={128} autoComplete={isSignUp ? 'new-password' : 'current-password'} required /></label> : null}
        <button className="primary-button" type="submit" disabled={isSubmitting || !email || (!forgot && (password.length < 8 || password.length > 128))}>{isSubmitting ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}{forgot ? '发送重置链接' : isSignUp ? '注册并验证邮箱' : '登录'}</button>
        {error ? <div className="error-line"><AlertTriangle size={16} /> {formatErrorMessage(error)}</div> : null}
      </form>
      {!isSignUp && !forgot ? <button className="text-button" type="button" onClick={() => { setMode('forgot'); setError(''); }}>忘记密码</button> : null}
      <button className="text-button" type="button" onClick={() => { setMode(isSignUp || forgot ? 'sign-in' : 'sign-up'); setError(''); }}>{isSignUp || forgot ? '返回登录' : '没有账号，去注册'}</button>
      {onCancel ? <button className="text-button muted" type="button" onClick={onCancel}>暂不登录</button> : null}
    </section>
  );
}

function retryAfter(error) {
  return Math.max(1, Number(error?.headers?.get?.('x-retry-after') || error?.retryAfter || 60));
}
