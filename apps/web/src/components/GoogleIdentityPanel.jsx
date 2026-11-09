import { appPath } from '../appPaths.js';
import { Check } from 'lucide-react';

export default function GoogleIdentityPanel({controller,loggedIn=false}) {
  if(!controller?.status.available)return null;
  const {status,busy,error,start}=controller;
  const resumable=status.pending && !status.pending.newAccount && status.pending.intent!=='delete';
  if (loggedIn) return <section className="google-identity social-identity-account" aria-label="Google 登录">
    <div className="social-identity-brand">
      <img src={appPath('/brand/google-g.png')} width="28" height="28" alt="" aria-hidden="true"/>
      <h3>Google</h3>
    </div>
    <div className="social-identity-actions">
      {resumable ? <>
        <button type="button" className="social-identity-action" disabled={busy} onClick={()=>controller.complete()}>确认绑定 Google</button>
        <button type="button" className="social-identity-cancel" disabled={busy} onClick={()=>controller.cancel()}>取消</button>
      </> : status.linked ? <p className="social-identity-linked" role="status"><Check size={16} aria-hidden="true"/>已绑定</p> :
        <button type="button" className="social-identity-action" disabled={busy} aria-busy={busy || undefined} onClick={()=>start('link')}>{busy?'等待 Google 确认…':'绑定 Google'}</button>}
    </div>
    {error?<p className="error-line" role="alert">{error}</p>:null}
  </section>;
  return <section className="google-identity" aria-label="Google 登录">
    {resumable ? <><button type="button" className="google-login-button" disabled={busy} onClick={()=>controller.complete()}>继续 Google 登录</button><button type="button" disabled={busy} onClick={()=>controller.cancel()}>取消</button></> :
      <button type="button" className="google-login-button auth-provider-button" disabled={busy} aria-busy={busy || undefined} aria-label={busy ? '等待 Google 确认…' : undefined} onClick={()=>start('login')}><img src={appPath('/brand/google-g.png')} width="24" height="24" alt="" aria-hidden="true"/><span>{busy?'等待授权':'使用 Google 登录'}</span></button>}
    {error?<p className="error-line" role="alert">{error}</p>:null}
  </section>;
}
