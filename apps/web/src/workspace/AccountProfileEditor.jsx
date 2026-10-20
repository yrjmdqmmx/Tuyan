import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { logoUrl } from '../config.js';

export default function AccountProfileEditor({account,request,saveNickname,view="legacy"}) {
  const user=account.user, fileInput=useRef(null);
  const [name,setName]=useState(user.name||''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [changing,setChanging]=useState(false),[newEmail,setNewEmail]=useState(''),[challenge,setChallenge]=useState(null),[oldCode,setOldCode]=useState(''),[newCode,setNewCode]=useState(''),[cooldown,setCooldown]=useState(0);
  const [editingName,setEditingName]=useState(false);
  const previousName=useRef(user.name||'');
  useEffect(()=>{const previous=previousName.current,next=user.name||'';setName(current=>current===previous?next:current);previousName.current=next;},[user.name]);
  useEffect(()=>{if(cooldown<=0)return;const timer=setTimeout(()=>setCooldown(v=>v-1),1000);return()=>clearTimeout(timer);},[cooldown]);
  async function action(work){if(busy)return;setBusy(true);setError('');setMessage('');try{await work();}catch(e){setError(e.message||'操作未完成，请重试');}finally{setBusy(false);}}
  async function avatar(file){
    if(!file)return;
    if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('请选择不超过 2 MB 的 PNG、JPEG 或 WebP 图片');return;}
    await action(async()=>{const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('头像文件读取失败'));reader.readAsDataURL(file);});await request('/avatar',{base64});await account.refreshAccount();setMessage('头像已更新');});
  }
  async function start(e){e.preventDefault();await action(async()=>{const value=await request('/email/start',{newEmail:newEmail.trim()});setChallenge(value);setOldCode('');setNewCode('');setCooldown(60);setMessage('验证码已分别发送至当前邮箱和新邮箱，10 分钟内有效。');});}
  async function confirm(e){e.preventDefault();await action(async()=>{await account.beforeEmailChange?.();await request('/email/confirm',{requestId:challenge.requestId,oldCode,newCode});setOldCode('');setNewCode('');setChallenge(null);setMessage('邮箱已更换，请使用新邮箱重新登录。');if(account.onEmailChanged)await account.onEmailChanged();else await account.refreshAccount();});}
  const fileControl=<input ref={fileInput} type="file" hidden aria-label="上传头像" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value='';void avatar(file);}}/>;
  const avatarButton=<button type="button" className="tw-avatar-edit" aria-label="更换头像" disabled={busy} onClick={()=>fileInput.current?.click()}><img src={user.image||logoUrl} alt="当前头像"/><span><Camera size={17}/></span></button>;
  const avatarActions=<div className="tw-profile-avatar-actions"><button type="button" onClick={()=>fileInput.current?.click()} disabled={busy}>更换头像</button>{user.image&&<button type="button" disabled={busy} onClick={()=>action(async()=>{await request('/avatar',{base64:null});await account.refreshAccount();setMessage('已恢复默认头像');})}>恢复默认</button>}</div>;
  const nameForm=<form className="tw-profile-form" onSubmit={e=>{e.preventDefault();void action(async()=>{await saveNickname(name.trim());await account.refreshAccount();setEditingName(false);setMessage('账号昵称已更新');});}}><label>账号昵称<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label><button type="submit" className="tw-primary" disabled={busy||!name.trim()||name.trim()===user.name}>保存昵称</button></form>;
  return <section className="tw-profile-editor" aria-label={view==='account'?'账户资料':'个人资料'}>
    {fileControl}
    {view!=='account'&&<div className="tw-profile-hero">{avatarButton}<h2>{user.name||'图研用户'}</h2><p>{user.email}</p>{avatarActions}<small>PNG、JPEG 或 WebP · 最大 2 MB</small></div>}
    {view==='account'?<div className="tw-account-rows">
      <div className="tw-account-row"><span>昵称</span><div>{editingName?nameForm:<strong>{user.name||'图研用户'}</strong>}</div><button type="button" disabled={busy} onClick={()=>setEditingName(v=>!v)}>{editingName?'取消编辑':'编辑昵称'}</button></div>
      <div className="tw-account-row"><span>头像</span><div className="tw-account-avatar-row">{avatarButton}<small>PNG、JPEG 或 WebP<br/>最大 2 MB</small></div>{avatarActions}</div>
      <div className="tw-account-row"><span>登录邮箱</span><strong>{user.email}</strong><button type="button" disabled={busy} aria-expanded={changing} onClick={()=>setChanging(v=>!v)}>更换登录邮箱</button></div>
    </div>:view==='legacy'&&<div className="tw-profile-edit-row">{nameForm}<button className="tw-profile-email-toggle" type="button" disabled={busy} aria-expanded={changing} onClick={()=>setChanging(v=>!v)}>更换登录邮箱</button></div>}
    {changing&&view!=='profile'&&<div className="tw-email-change"><h3>更换登录邮箱</h3><p>验证当前邮箱和新邮箱后生效。任务、图片和模型配置仍属于同一账号；更换后所有设备需重新登录。</p><form onSubmit={start}><label className="tw-field">新邮箱<input type="email" autoComplete="email" maxLength={254} required disabled={busy||Boolean(challenge)} value={newEmail} onChange={e=>setNewEmail(e.target.value)}/></label><div className="tw-action-row"><button type="submit" disabled={busy||cooldown>0||!newEmail.trim()}>{cooldown>0?`${cooldown} 秒后可重发`:challenge?'重新发送验证码':'发送两个邮箱的验证码'}</button>{challenge&&<button type="button" disabled={busy} onClick={()=>{setChallenge(null);setOldCode('');setNewCode('');}}>修改新邮箱</button>}</div></form>{challenge&&<form onSubmit={confirm} className="tw-email-confirm"><label className="tw-field">当前邮箱验证码<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={oldCode} disabled={busy} onChange={e=>setOldCode(e.target.value.replace(/\D/g,'').slice(0,6))}/></label><label className="tw-field">新邮箱验证码<input inputMode="numeric" autoComplete="off" maxLength={6} pattern="[0-9]{6}" required value={newCode} disabled={busy} onChange={e=>setNewCode(e.target.value.replace(/\D/g,'').slice(0,6))}/></label><button type="submit" className="tw-primary" disabled={busy||oldCode.length!==6||newCode.length!==6}>确认更换并重新登录</button></form>}</div>}
    {busy&&<p role="status">正在处理…</p>}{message&&<p role="status" className="tw-profile-success">{message}</p>}{error&&<p role="alert" className="tw-profile-error">{error}</p>}
  </section>;
}
