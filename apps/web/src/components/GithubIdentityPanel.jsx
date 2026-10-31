import { appPath } from '../appPaths.js';
import { Check } from 'lucide-react';

export default function GithubIdentityPanel({controller,loggedIn=false}) {
  if(!controller?.status.available)return null;
  const {status,busy,error,start}=controller;
  const resumable=status.pending && !status.pending.newAccount && status.pending.intent!=='delete';
  if (loggedIn) return <section className="github-identity social-identity-account" aria-label="GitHub 登录">
    <div className="social-identity-brand">
      <img src={appPath('/brand/github-invertocat.svg')} width="98" height="96" alt="" aria-hidden="true"/>
      <h3>GitHub</h3>
    </div>
    <div className="social-identity-actions">
      {resumable ? <>
        <button type="button" className="social-identity-action" disabled={busy} onClick={()=>controller.complete()}>确认绑定 GitHub</button>
        <button type="button" className="social-identity-cancel" disabled={busy} onClick={()=>controller.cancel()}>取消</button>
      </> : status.linked ? <p className="social-identity-linked" role="status"><Check size={16} aria-hidden="true"/>已绑定</p> :
        <button type="button" className="social-identity-action" disabled={busy} aria-busy={busy || undefined} onClick={()=>start('link')}>{busy?'等待 GitHub 确认…':'绑定 GitHub'}</button>}
    </div>
    {error?<p className="error-line" role="alert">{error}</p>:null}
  </section>;
  return <section className="github-identity" aria-label="GitHub 登录">
    {resumable ? <><button type="button" className="github-login-button" disabled={busy} onClick={()=>controller.complete()}>继续 GitHub 登录</button><button type="button" disabled={busy} onClick={()=>controller.cancel()}>取消</button></> :
      <button type="button" className="github-login-button auth-provider-button" disabled={busy} aria-busy={busy || undefined} aria-label={busy ? '等待 GitHub 确认…' : undefined} onClick={()=>start('login')}><img src={appPath('/brand/github-invertocat.svg')} width="98" height="96" alt="" aria-hidden="true"/><span>{busy?'等待授权':'GitHub 登录'}</span></button>}
    {error?<p className="error-line" role="alert">{error}</p>:null}
  </section>;
}
