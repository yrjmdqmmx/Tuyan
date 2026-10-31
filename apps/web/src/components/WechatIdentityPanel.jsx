export default function WechatIdentityPanel({controller,loggedIn=false}) {
  if(!controller?.status.available)return null;
  const {status,busy,error,start}=controller;
  const resumable=status.pending && !status.pending.newAccount && status.pending.intent!=='delete';
  return <section className="wechat-identity" aria-label="微信登录">
    {resumable ? <><button type="button" className="wechat-login-button" disabled={busy} onClick={()=>controller.complete()}>{loggedIn?'确认绑定微信':'继续微信登录'}</button><button type="button" disabled={busy} onClick={()=>controller.cancel()}>取消</button></> : loggedIn?<><h3>微信</h3>{status.linked?<p role="status">已绑定</p>:<button type="button" className="secondary-button" disabled={busy} onClick={()=>start('link')}>{busy?'等待微信确认…':'绑定微信'}</button>}</>:
      <button type="button" className="wechat-login-button" disabled={busy} onClick={()=>start('login')}><img src="/brand/wechat-mark.svg" alt=""/>{busy?'等待微信确认…':'微信扫码登录'}</button>}
    {error?<p className="error-line" role="alert">{error}</p>:null}
  </section>;
}
