import { useState } from 'react';
import { Check, Smartphone } from 'lucide-react';
import { usePhoneAuth } from '../hooks/usePhoneAuth.js';
import PhoneCodeForm from './PhoneCodeForm.jsx';

export default function PhoneBindingPanel({apiBase,userId}) {
  const controller=usePhoneAuth(apiBase,userId),[editing,setEditing]=useState(false);
  if(!controller.status.available)return null;
  const linked=controller.status.linked;
  return <section className="social-identity-account phone-binding-panel" aria-label="手机号登录">
    <div className="social-identity-brand">
      <Smartphone className="social-identity-icon" size={26} aria-hidden="true"/>
      <h3>手机号</h3>
      {linked&&controller.status.maskedPhone?<span className="social-identity-detail">{controller.status.maskedPhone.replace(/^\+86(?=\d)/,'')}</span>:null}
    </div>
    <div className="social-identity-actions">
      {linked?<p className="social-identity-linked" role="status"><Check size={16} aria-hidden="true"/>已绑定</p>
        :editing?<button type="button" className="social-identity-cancel" onClick={()=>setEditing(false)}>取消</button>
        :<button type="button" className="social-identity-action" onClick={()=>setEditing(true)}>绑定手机号</button>}
    </div>
    {!linked&&editing?<div className="social-identity-form"><PhoneCodeForm controller={controller} purpose="link" onVerified={async()=>{await controller.refresh();setEditing(false);}}/></div>:null}
  </section>;
}
