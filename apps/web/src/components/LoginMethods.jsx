import { useEffect, useState } from 'react';
import { Link2, Mail, ShieldCheck, Unlink2 } from 'lucide-react';
import IdentityProviderIcon from './IdentityProviderIcon';
import { identityMessage, identityRequest, isIdentityError, startOAuth } from '../lib/identity';

export default function LoginMethods({ apiBase, onState, onChanged, oauthResult }) {
  const [data, setData] = useState(null), [capabilities, setCapabilities] = useState(null), [error, setError] = useState(isIdentityError(oauthResult) ? identityMessage(oauthResult) : '');
  const [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [pendingUnlink, setPendingUnlink] = useState('');
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [newPassword, setNewPassword] = useState(''), [challenge, setChallenge] = useState(''), [cooldown, setCooldown] = useState(0);
  async function refresh() {
    const [methods, caps] = await Promise.all([identityRequest('methods', undefined, apiBase), identityRequest('capabilities', undefined, apiBase)]);
    if (!Array.isArray(methods.methods) || !methods.grants || !caps.providers) throw new Error('Unsupported identity response');
    setData(methods); setCapabilities(caps);
    onState?.({ hasCredential: methods.methods.some((m) => m.provider === 'email'), deleteVerified: Date.parse(methods.grants.delete || '') > Date.now() });
  }
  useEffect(() => { void refresh().catch(() => setError('登录方式管理暂不可用，请稍后重新打开账号设置。')); }, [apiBase]);
  useEffect(() => { const timer = setInterval(() => { setCooldown((v) => Math.max(0, v - 1)); setData((v) => v ? { ...v } : v); }, 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (data) onState?.({ hasCredential: data.methods.some((m) => m.provider === 'email'), deleteVerified: Date.parse(data.grants.delete || '') > Date.now() }); }, [data, onState]);
  const hasEmail = data?.methods.some((m) => m.provider === 'email');
  const verified = Date.parse(data?.grants.manage || '') > Date.now();
  async function run(action, message = '') {
    setBusy(true); setError(''); setNotice('');
    try { await action(); await refresh(); if (message) setNotice(message); }
    catch (e) { setError(identityMessage(e)); if (e?.code === 'IDENTITY_RATE_LIMITED') setCooldown(e.retryAfterSeconds || 60); }
    finally { setBusy(false); }
  }
  async function reauth(purpose) {
    await identityRequest('reauth/password', { password, purpose }, apiBase); setPassword('');
  }
  return <section className="login-methods" aria-labelledby="login-methods-title"><h3 id="login-methods-title">登录方式</h3><p className="identity-note">绑定的方式共享此账号及任务记录。邮箱验证与第三方授权分别记录。</p>
    {!data ? !error && <p role="status">正在读取登录方式…</p> : <>
      <div className="identity-list">{['email', 'github', 'google'].map((provider) => {
        const method = data.methods.find((m) => m.provider === provider), title = { email: '邮箱与密码', github: 'GitHub', google: 'Google' }[provider];
        return <div key={provider} className="identity-method"><div className="identity-method-label"><span className="identity-method-icon">{provider === 'email' ? <Mail size={20} /> : <IdentityProviderIcon provider={provider} />}</span><div><strong>{title}</strong><small>{method ? `${method.label} · ${provider === 'email' ? method.verified ? '邮箱已验证' : '邮箱待验证' : '已授权'}` : '未绑定'}</small>{method && !method.available && <small>此方式当前不可用</small>}</div></div>
          {method ? <button type="button" className="text-button identity-unlink-button" aria-label={`解绑${title}`} disabled={busy || !verified} onClick={() => setPendingUnlink(provider)}><Unlink2 size={14} aria-hidden="true" />解绑</button>
            : provider !== 'email' && <button type="button" className="secondary-button identity-bind-button" aria-label={capabilities?.providers[provider] ? `绑定 ${title}` : `${title} 暂未开放`} disabled={busy || !verified || !capabilities?.providers[provider]} onClick={() => run(() => startOAuth(provider, 'bind', undefined, apiBase))}><Link2 size={15} aria-hidden="true" />{capabilities?.providers[provider] ? '绑定' : '暂未开放'}</button>}
        </div>;
      })}</div>
      {pendingUnlink && <div className="identity-confirm" role="alert"><p>确认解绑{pendingUnlink === 'email' ? '邮箱与密码' : pendingUnlink}？其他设备的登录状态将失效，至少需保留一种可用方式。</p><button type="button" className="secondary-button" disabled={busy} onClick={() => run(async () => { await identityRequest('unlink', { provider: pendingUnlink }, apiBase); setPendingUnlink(''); await onChanged?.(); }, '已解绑。')}>确认解绑</button><button type="button" className="text-button" onClick={() => setPendingUnlink('')}>取消</button></div>}
      <div className="identity-reauth"><h4><ShieldCheck size={16} />验证当前账号身份</h4><p className="identity-note">管理登录方式或注销前需重新验证；验证在 5 分钟内使用一次。</p>
        {hasEmail && <><label className="field"><span>身份验证密码</span><input type="password" autoComplete="current-password" value={password} maxLength={128} onChange={(e) => setPassword(e.target.value)} /></label><button type="button" className="secondary-button" disabled={busy || !password} onClick={() => run(() => reauth('manage'), '身份已验证，可以管理登录方式。')}>验证以管理登录方式</button></>}
        {data.methods.filter((m) => m.provider !== 'email' && m.available).map((m) => <div className="identity-reauth-actions" key={m.provider}><button type="button" className="secondary-button" disabled={busy} onClick={() => run(() => startOAuth(m.provider, 'reauth', 'manage', apiBase))}><IdentityProviderIcon provider={m.provider} size={18} />用 {m.provider === 'github' ? 'GitHub' : 'Google'} 验证以管理</button><button type="button" className="text-button identity-delete-verification" disabled={busy} onClick={() => run(() => startOAuth(m.provider, 'reauth', 'delete', apiBase))}>验证以注销账号</button></div>)}
        {verified && <p role="status" className="success-line">管理身份验证有效。</p>}
      </div>
      {!hasEmail && <form className="identity-email-form" onSubmit={(event) => { event.preventDefault(); void run(async () => { await identityRequest('email/verify', { challenge, code, password: newPassword }, apiBase); setChallenge(''); setCode(''); setNewPassword(''); await onChanged?.(); }, '邮箱已验证并绑定，可以使用邮箱与密码登录。'); }}><h4>绑定邮箱与密码</h4><label className="field"><span>待绑定邮箱</span><input type="email" required value={email} autoComplete="email" onChange={(e) => { setEmail(e.target.value); setChallenge(''); }} /></label><button type="button" className="secondary-button" disabled={busy || !verified || !email || cooldown > 0 || !capabilities?.emailBinding} onClick={() => run(async () => { const result = await identityRequest('email/request', { email }, apiBase); setChallenge(result.challenge); setCooldown(result.retryAfterSeconds); }, '验证码已发送，5 分钟内有效。')}>{cooldown > 0 ? `${cooldown} 秒后可重发` : '发送邮箱验证码'}</button>
        {!capabilities?.emailBinding && <p className="identity-note">邮箱绑定服务暂不可用。</p>}
        {challenge && <><label className="field"><span>邮箱验证码</span><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required /></label><label className="field"><span>设置邮箱登录密码</span><input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label><button type="submit" className="primary-button" disabled={busy || code.length !== 6 || newPassword.length < 8}>确认绑定邮箱</button></>}
      </form>}
    </>}
    {notice && <p role="status" className="success-line">{notice}</p>}{error && <p role="alert" className="error-line">{error}</p>}
  </section>;
}
