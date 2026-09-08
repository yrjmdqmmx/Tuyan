import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import IdentityProviderIcon from './IdentityProviderIcon';
import { identityMessage, identityRequest, startOAuth } from '../lib/identity';

export default function SocialLogin() {
  const [capabilities, setCapabilities] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState('');
  useEffect(() => { let active = true; identityRequest('capabilities').then((data) => { if (active) setCapabilities(data); }).catch(() => { if (active) setError('第三方登录暂不可用，仍可使用邮箱登录。'); }); return () => { active = false; }; }, []);
  async function login(provider) {
    setBusy(provider); setError('');
    try { await startOAuth(provider, 'login'); } catch (e) { setError(identityMessage(e)); setBusy(''); }
  }
  return <div className="social-login"><div className="auth-divider">或使用第三方账号</div><div className="social-buttons">
    {['github', 'google'].map((provider) => <button key={provider} type="button" className={`secondary-button social-button social-button-${provider}`} disabled={!capabilities?.providers?.[provider] || Boolean(busy)} onClick={() => login(provider)}>
      {busy === provider ? <Loader2 className="spin" size={20} /> : <IdentityProviderIcon provider={provider} />}
      <span>{provider === 'github' ? 'GitHub' : 'Google'}{capabilities && !capabilities.providers?.[provider] ? '（暂未开放）' : ' 登录'}</span>
    </button>)}
  </div>{error && <p role="status" className="identity-note">{error}</p>}<p className="identity-note">首次授权将创建账号；已有账号请先登录，再到账号设置中绑定。</p></div>;
}
