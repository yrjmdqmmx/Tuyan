import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTH_BASE_DEFAULT, AUTH_ENABLED, AUTH_REQUIRED, LOCAL_CONSUMPTION_TEST, authClient } from '../config.js';
import { useAuthSession } from '../hooks/useAuthSession.js';
import { useWatcha } from '../hooks/useWatcha.js';
import AuthPanel from '../components/AuthPanel.jsx';
import AccountSettingsDialog from '../components/AccountSettingsDialog.jsx';
import AccessibleDialog from '../components/AccessibleDialog.jsx';
import { X } from 'lucide-react';
import WorkspaceLogin from './WorkspaceLogin.jsx';

// UI adapter only: the host uses the existing Better Auth client and account components.
// Session data never enters task drafts, snapshots, exports or browser task storage.
export default function WorkspaceAccount({ children, beforeSignOut, loginRequested = false, client = authClient, enabled = AUTH_ENABLED, apiBase = AUTH_BASE_DEFAULT, productionPreview = LOCAL_CONSUMPTION_TEST, requireLogin = AUTH_REQUIRED }) {
  const auth = useAuthSession({ client, enabled });
  const [panel, setPanel] = useState(null), [signingOut, setSigningOut] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (loginRequested) setPanel('login'); }, [loginRequested]);
  const action = useRef(0), logoutLock = useRef(false), afterLogin = useRef(null);
  const user = auth.session?.user || null;
  const authenticated = useCallback(async () => {
    const operation = ++action.current;
    const session = await auth.refresh();
    if (operation !== action.current) return;
    if (!session?.user) throw new Error('登录状态尚未确认，请重试。当前任务内容已保留。');
    setError('');
    setPanel(afterLogin.current === 'settings' ? 'settings' : null);
    afterLogin.current = null;
  }, [auth.refresh]);
  const watcha = useWatcha(apiBase, user?.id, enabled, authenticated);
  function login(destination = null) { setError(''); afterLogin.current = destination; setPanel('login'); }
  const closeSettings = useCallback(() => setPanel(null), []);
  async function signOut() {
    if (logoutLock.current) return;
    logoutLock.current = true; const operation = ++action.current;
    setSigningOut(true); setError('');
    try {
      await beforeSignOut?.();
      const result = await client.signOut();
      if (operation !== action.current) return;
      if (result?.error) {
        if (result.error.code === 'REMOTE_SIGNOUT_UNCERTAIN') {
          auth.clear(); setPanel(null);
          setError('本地已退出，服务器退出状态暂时无法确认。');
          return;
        }
        throw result.error;
      }
      auth.clear(); setPanel(null); afterLogin.current = null;
    } catch {
      if (operation === action.current) setError('退出登录失败，当前账号状态已保留，请重试。');
    } finally { logoutLock.current = false; setSigningOut(false); }
  }
  const authStatus = Number(auth.error?.status || auth.error?.statusCode);
  const message = error || (auth.error ? authStatus >= 500 || auth.error.code === 'PRODUCTION_AUTH_UNAVAILABLE'
    ? '账号服务暂时不可用，尚未确认登录状态。任务与草稿已保留，请稍后重新检查。'
    : authStatus === 429 ? '账号检查过于频繁，请稍后重试。任务与草稿已保留。'
      : '暂时无法检查登录状态，任务与草稿已保留。请确认连接后重试。' : '');
  return <>
    {requireLogin && !user ? <WorkspaceLogin pending={auth.isPending} client={client} watcha={watcha} onAuthenticated={authenticated} /> : children({ user, watcha, onSignIn: () => login(), onSignOut: signOut, onAccountSettings: () => user ? setPanel('settings') : login('settings'), refreshAccount: auth.refresh, beforeEmailChange: beforeSignOut,
      onEmailChanged: async () => { action.current++; auth.clear(); afterLogin.current=null; setError('登录邮箱已更换，请使用新邮箱重新登录。'); setPanel('login'); },
      accountPending: auth.isPending || signingOut })}
    {message && <div className="tw-auth-message" role="alert"><span>{message}</span>{!signingOut && <button type="button" disabled={auth.isPending} onClick={async () => { setError(''); await auth.refresh(); }}>{auth.isPending ? '正在检查…' : '重新检查'}</button>}</div>}
    {panel === 'login' && !user && !requireLogin && <AccessibleDialog open onClose={() => setPanel(null)} labelledBy="tw-login-title" backdropClassName="tw-auth-backdrop" className="tw-auth-dialog">
      <h2 className="tw-sr" id="tw-login-title">登录图研</h2>
      <button type="button" className="tw-auth-close" aria-label="关闭登录" onClick={() => setPanel(null)}><X size={20} /></button>
      {enabled ? <AuthPanel client={client} watcha={watcha} onAuthenticated={authenticated} onCancel={() => setPanel(null)} /> : <section className="auth-panel"><h2>账号服务尚未连接</h2><p>请使用已配置现有图研账号服务的本地入口。当前任务仍保留在浏览器。</p></section>}
    </AccessibleDialog>}
    {panel === 'settings' && user && <div className="tw-account-settings-host"><AccountSettingsDialog apiBase={apiBase} email={user.email || ''} watcha={watcha} productionPreview={productionPreview} onClose={closeSettings} onDeleted={() => { action.current++; auth.clear(); setPanel(null); }} /></div>}
  </>;
}
