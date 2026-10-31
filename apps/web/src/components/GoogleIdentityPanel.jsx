import { appPath } from '../appPaths.js';

export default function GoogleIdentityPanel({controller,loggedIn=false}) {
  if(!controller?.status.available)return null;
  const {status,busy,error,start}=controller;
  const resumable=status.pending && !status.pending.newAccount && status.pending.intent!=='delete';
  return <section className="google-identity" aria-label="Google 登录">
    {resumable ? <><button type="button" className="google-login-button" disabled={busy} onClick={()=>controller.complete()}>{loggedIn?'确认绑定 Google':'继续 Google 登录'}</button><button type="button" disabled={busy} onClick={()=>controller.cancel()}>取消</button></> : loggedIn?<><h3>Google</h3>{status.linked?<p role="status">已绑定</p>:<button type="button" className="secondary-button" disabled={busy} onClick={()=>start('link')}>{busy?'等待 Google 确认…':'绑定 Google'}</button>}</>:
      <button type="button" className="google-login-button auth-provider-button" disabled={busy} aria-busy={busy || undefined} aria-label={busy ? '等待 Google 确认…' : undefined} onClick={()=>start('login')}><img src={appPath('/brand/google-g.png')} width="24" height="24" alt="" aria-hidden="true"/><span>{busy?'等待授权':'使用 Google 登录'}</span></button>}
    {error?<p className="error-line" role="alert">{error}</p>:null}
  </section>;
}
