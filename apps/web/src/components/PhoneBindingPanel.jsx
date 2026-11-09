import { useState } from 'react';
import { usePhoneAuth } from '../hooks/usePhoneAuth.js';
import PhoneCodeForm from './PhoneCodeForm.jsx';

export default function PhoneBindingPanel({apiBase,userId}) {
  const controller=usePhoneAuth(apiBase,userId),[editing,setEditing]=useState(false);
  if(!controller.status.available)return null;
  return <section className="tw-management-section phone-binding-panel" aria-label="手机号登录"><h3>手机号</h3>
    {controller.status.linked?<p role="status">{controller.status.maskedPhone} · 已绑定</p>:editing?<>
      <PhoneCodeForm controller={controller} purpose="link" onVerified={async()=>{await controller.refresh();setEditing(false);}}/>
      <button type="button" className="text-button" onClick={()=>setEditing(false)}>取消</button>
    </>:<button type="button" className="secondary-button" onClick={()=>setEditing(true)}>绑定手机号</button>}
  </section>;
}
