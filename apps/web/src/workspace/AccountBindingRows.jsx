import { useEffect, useState } from 'react';
import { usePhoneAuth } from '../hooks/usePhoneAuth.js';
import PhoneCodeForm from '../components/PhoneCodeForm.jsx';
import { accountPageUrl } from '../lib/runtimePolicy.js';
import { authClient } from '../config';

function Row({label,status,linked,children,detail,ariaLabel}) {
  return <div className="tw-account-binding" aria-label={ariaLabel||label} data-binding={label}>
    <div className="tw-account-row"><span>{label}</span><strong className={linked?'':'tw-account-muted'} role="status">{status}</strong><div className="tw-account-row-actions">{children}</div></div>
    {detail?<div className="tw-account-row-detail">{detail}</div>:null}
  </div>;
}
const err=e=>e?<p className="error-line" role="alert">{e}</p>:null;

function PhoneRow({apiBase,userId}) {
  const c=usePhoneAuth(apiBase,userId),[editing,setEditing]=useState(false);
  if(!c.status.available)return null;
  const linked=c.status.linked;
  return <Row label="手机号" ariaLabel="手机号登录" linked={linked} status={linked?(c.status.maskedPhone||'').replace(/^\+86(?=\d)/,'')||'已绑定':'未绑定'}
    detail={!linked&&editing?<PhoneCodeForm controller={c} purpose="link" onVerified={async()=>{await c.refresh();setEditing(false);}}/>:null}>
    {!linked&&<button type="button" aria-expanded={editing} onClick={()=>setEditing(v=>!v)}>{editing?'取消':'绑定'}</button>}
  </Row>;
}

function OAuthRow({label,controller,intent='link'}) {
  if(!controller?.status?.available)return null;
  const {status,busy,error}=controller;
  const resumable=status.pending&&!status.pending.newAccount&&status.pending.intent!=='delete';
  return <Row label={label} ariaLabel={`${label} 登录`} linked={status.linked} status={status.linked?'已绑定':resumable?'授权已完成，待确认':busy?'等待授权…':'未绑定'} detail={err(error)}>
    {resumable?<><button type="button" disabled={busy} onClick={()=>controller.complete()}>确认绑定</button><button type="button" className="tw-account-quiet" disabled={busy} onClick={()=>controller.cancel()}>取消</button></>
      :!status.linked&&<button type="button" disabled={busy} aria-busy={busy||undefined} onClick={()=>controller.start(intent)}>绑定</button>}
  </Row>;
}

function WatchaRow({controller:c,user}) {
  const [unlinking,setUnlinking]=useState(false),[code,setCode]=useState(''),[cooldown,setCooldown]=useState(0),[notice,setNotice]=useState(''),[sending,setSending]=useState(false);
  useEffect(()=>{if(cooldown<=0)return;const t=setTimeout(()=>setCooldown(v=>v-1),1000);return()=>clearTimeout(t);},[cooldown]);
  useEffect(()=>{setUnlinking(false);setCode('');setNotice('');},[user?.id,c?.status?.linked]);
  if(!c?.status)return null;
  const s=c.status;
  if(!s.available&&!c.error)return null;
  if(s.managedExternally)return <Row label="观猹" ariaLabel="观猹账号" linked={s.linked} status={s.linked?'已绑定':'未绑定'} detail={err(c.error)}><a href={s.managementUrl} target="_blank" rel="noopener noreferrer">管理</a></Row>;
  async function verifyEmail(){if(sending||cooldown>0)return;setSending(true);setNotice('');try{const {error}=await authClient.sendVerificationEmail({email:user.email,callbackURL:accountPageUrl('email-verified.html')});setNotice(error?'验证邮件暂时未能发送，请稍后重试。':'验证邮件已发送，确认后刷新状态即可绑定。');setCooldown(60);}catch{setNotice('验证邮件暂时未能发送，请稍后重试。');}finally{setSending(false);}}
  const stale=!s.available||Boolean(c.error);
  const status=!s.available?'状态暂时无法获取':s.linked?(s.hasPassword?'已绑定':'已绑定 · 当前登录方式'):s.pending?'授权已完成，待确认':s.emailVerified?'未绑定':'未绑定 · 需先验证邮箱';
  const detail=<>{unlinking&&<form className="tw-account-inline-form" aria-label="验证邮箱并解绑观猹" onSubmit={async e=>{e.preventDefault();if(await c.unlink(code))setUnlinking(false);}}>
      <p className="tw-muted">解绑后使用图研邮箱和密码登录，请输入当前邮箱收到的验证码。</p>
      <label className="tw-field">邮箱验证码<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}/></label>
      <div className="tw-action-row"><button type="button" disabled={c.busy||cooldown>0} onClick={async()=>{if(await c.requestCode('unlink')){setCooldown(60);setCode('');}}}>{cooldown>0?`${cooldown} 秒后重发`:'发送验证码'}</button><button type="submit" className="tw-primary" disabled={c.busy||!/^\d{6}$/.test(code)}>确认解绑</button></div>
    </form>}
    {s.linked&&!s.hasPassword&&<p className="tw-muted">观猹是当前登录方式，设置图研密码后才能解绑。</p>}
    {c.notice&&<p role="status" className="tw-muted">{c.notice}</p>}{notice&&<p role="status" className="tw-muted">{notice}</p>}{err(c.error)}</>;
  const hasDetail=unlinking||(s.linked&&!s.hasPassword)||c.notice||notice||c.error;
  return <Row label="观猹" ariaLabel="观猹账号" linked={s.linked} status={status} detail={hasDetail?detail:null}>
    {stale?<button type="button" disabled={c.busy} onClick={c.refresh}>刷新状态</button>
      :s.linked?(s.hasPassword&&<button type="button" aria-expanded={unlinking} onClick={()=>setUnlinking(v=>!v)}>{unlinking?'取消':'解绑'}</button>)
      :s.pending?(s.emailVerified?<button type="button" disabled={c.busy} onClick={c.link}>确认绑定</button>:<button type="button" disabled={sending||cooldown>0} onClick={verifyEmail}>{cooldown>0?`${cooldown} 秒后重发`:'验证邮箱'}</button>)
      :s.emailVerified?<button type="button" disabled={c.busy} onClick={()=>c.start('link')}>{c.busy?'等待授权…':'绑定'}</button>
      :<button type="button" disabled={sending||cooldown>0} onClick={verifyEmail}>{cooldown>0?`${cooldown} 秒后重发`:'验证邮箱'}</button>}
    {(s.pending||notice)&&!stale&&<button type="button" className="tw-account-quiet" disabled={c.busy} onClick={c.refresh}>刷新状态</button>}
  </Row>;
}

export default function AccountBindingRows({account,apiBase,userId}) {
  if(!account.user)return null;
  return <div className="tw-account-rows tw-account-rows-continued" aria-label="账号绑定" data-testid="identity-bindings">
    <PhoneRow key={userId} apiBase={apiBase} userId={userId}/>
    <OAuthRow label="GitHub" controller={account.github}/>
    <OAuthRow label="Google" controller={account.google}/>
    <OAuthRow label="微信" controller={account.wechat} intent="login"/>
    {account.watcha&&<WatchaRow controller={account.watcha} user={account.user}/>}
  </div>;
}
