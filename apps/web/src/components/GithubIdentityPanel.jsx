import { appPath } from '../appPaths.js';

export default function GithubIdentityPanel({controller,loggedIn=false}) {
  if(!controller?.status.available)return null;
  const {status,busy,error,start}=controller;
  const resumable=status.pending && !status.pending.newAccount && status.pending.intent!=='delete';
  return <section className="github-identity" aria-label="GitHub 登录">
    {resumable ? <><button type="button" className="github-login-button" disabled={busy} onClick={()=>controller.complete()}>{loggedIn?'确认绑定 GitHub':'继续 GitHub 登录'}</button><button type="button" disabled={busy} onClick={()=>controller.cancel()}>取消</button></> : loggedIn?<><h3>GitHub</h3>{status.linked?<p role="status">已绑定</p>:<button type="button" className="secondary-button" disabled={busy} onClick={()=>start('link')}>{busy?'等待 GitHub 确认…':'绑定 GitHub'}</button>}</>:
      <button type="button" className="github-login-button auth-provider-button" disabled={busy} aria-busy={busy || undefined} aria-label={busy ? '等待 GitHub 确认…' : undefined} onClick={()=>start('login')}><img src={appPath('/brand/github-invertocat.svg')} width="98" height="96" alt="" aria-hidden="true"/><span>{busy?'等待授权':'GitHub 登录'}</span></button>}
    {error?<p className="error-line" role="alert">{error}</p>:null}
  </section>;
}
