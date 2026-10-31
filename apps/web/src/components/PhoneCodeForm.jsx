import { useEffect, useId, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function PhoneCodeForm({controller,purpose='login',onVerified,submitLabel,as:Container='form'}) {
  const codeId = useId();
  const [phone,setPhone]=useState(''),[code,setCode]=useState(''),[captcha,setCaptcha]=useState(''),[challenge,setChallenge]=useState(null);
  const [requestId,setRequestId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
  const [resendAt,setResendAt]=useState(0),[clock,setClock]=useState(Date.now());
  const remaining=Math.max(0,Math.ceil((resendAt-clock)/1000));
  const valid=/^1[3-9]\d{9}$/.test(phone);
  useEffect(()=>{if(!remaining)return;const timer=setInterval(()=>setClock(Date.now()),500);return()=>clearInterval(timer);},[remaining]);
  async function action(work){if(busy)return;setBusy(true);setError('');try{await work();}catch(e){setError(e.message || '操作未完成，请重试');if(e.retryAfter){setClock(Date.now());setResendAt(Date.now()+e.retryAfter*1000);}}finally{setBusy(false);}}
  async function getChallenge(){await action(async()=>{setCaptcha('');setChallenge(null);setChallenge(await controller.request('challenge',{phone,purpose}));});}
  async function send(){await action(async()=>{
    const current=challenge;setChallenge(null);setCaptcha('');
    const result=await controller.request('send-code',{phone,purpose,challengeId:current.challengeId,captcha});
    setRequestId(result.requestId);setCode('');setSent(true);setClock(Date.now());setResendAt(Date.now()+result.retryAfter*1000);
  });}
  async function verify(event){event?.preventDefault();if(busy||!requestId||code.length!==6)return;await action(async()=>{
    const result=await controller.request('verify',{phone,purpose,requestId,code});setCode('');setRequestId('');await onVerified(result);
  });}
  const buttonText=submitLabel || (purpose==='link'?'验证并绑定':purpose==='delete'?'验证手机号':'登录 / 注册');
  return <Container className="auth-form phone-code-form" {...(Container==='form'?{onSubmit:verify}:{})}>
    <label className="field"><span>手机号</span><div className="phone-number-input"><span aria-hidden="true">+86</span><input aria-label="手机号" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} maxLength={11} required disabled={busy} onChange={e=>{setPhone(e.target.value.replace(/\D/g,'').slice(0,11));setChallenge(null);setRequestId('');setCode('');setSent(false);setError('');}} /></div></label>
    <div className="field phone-code-field"><label htmlFor={codeId}>短信验证码</label><div className="phone-code-row"><input id={codeId} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} disabled={busy} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required />
      <button type="button" className="phone-code-send" disabled={busy||!valid||remaining>0} onClick={getChallenge}>{remaining>0?`${remaining} 秒后重发`:sent?'重新获取':'获取验证码'}</button></div></div>
    {challenge&&<div className="phone-captcha-row"><label className="field"><span>图形验证码</span><input autoComplete="off" maxLength={5} value={captcha} onChange={e=>setCaptcha(e.target.value.toUpperCase())} disabled={busy}/></label><button type="button" className="phone-captcha-image" aria-label="换一张图形验证码" onClick={getChallenge} disabled={busy}><img src={challenge.image} alt="图形验证码" width="180" height="52"/></button><button className="secondary-button" type="button" onClick={send} disabled={busy||captcha.trim().length!==5}>发送验证码</button></div>}
    {sent&&<p className="phone-status" role="status">验证码已发送，5 分钟内有效</p>}
    {purpose==='login'&&<p className="phone-registration-notice">未注册手机号验证后将自动注册</p>}
    <button className="primary-button" type={Container==='form'?'submit':'button'} onClick={Container==='form'?undefined:verify} disabled={busy||!valid||!requestId||code.length!==6}>{busy&&<Loader2 className="spin" size={18}/>} {buttonText}</button>
    {error&&<p className="error-line" role="alert">{error}</p>}
  </Container>;
}
