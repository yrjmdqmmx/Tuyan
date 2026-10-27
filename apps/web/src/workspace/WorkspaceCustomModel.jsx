import MenuSelect from '../components/MenuSelect.jsx';
import {customBindingChanged} from './workspaceModels.js';
import { useState } from 'react';
import UniversalCapabilities from '../components/UniversalCapabilities.jsx';
import UniversalExtensions from '../components/UniversalExtensions.jsx';
import { emptyUniversalDraft, updateUniversalDraft, universalDraftRoute, UNIVERSAL_PROTOCOL_OPTIONS } from '../lib/universalApi.js';
import { normalizeUniversalConnection, universalDefaultAuth } from '../lib/universalContract.js';
export function CustomConnectionFields({ value, onChange }) {
  const c=value.custom||{version:1,connectionId:value.id,protocol:'openai-chat',baseUrl:'',auth:'bearer',catalogFormat:'none'};
  const change=patch=>onChange({...value,custom:{...c,...patch}});
  return <><label>API 基础地址<input type="url" required placeholder="https://服务地址/v1" value={c.baseUrl} onChange={e=>change({baseUrl:e.target.value})}/></label><label>接口协议<MenuSelect value={c.protocol} onChange={e=>change({protocol:e.target.value,auth:universalDefaultAuth(e.target.value)})}>{UNIVERSAL_PROTOCOL_OPTIONS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</MenuSelect></label><label>鉴权方式<MenuSelect value={c.auth} onChange={e=>change({auth:e.target.value})}>{['bearer','x-api-key','x-goog-api-key','api-key','bearer-expiring'].map(id=><option key={id}>{id}</option>)}</MenuSelect></label>{c.auth==='bearer-expiring'&&<label>令牌到期时间<input type="datetime-local" required value={value.expiresAt?new Date(value.expiresAt-new Date(value.expiresAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''} onChange={e=>onChange({...value,expiresAt:new Date(e.target.value).getTime()})}/></label>}<p className="tw-muted">沿用现有协议和地址安全校验。填写基础地址，不填写完整操作端点。修改地址、协议或鉴权需重新保存密钥。</p></>;
}
export function cleanCustomConnection(form) { return form.provider==='custom'?{...form,custom:normalizeUniversalConnection({...form.custom,connectionId:form.id})}:form; }
export default function WorkspaceCustomModel({ connection, role, models, entry, onSaved }) {
  const [draft,setDraft]=useState(()=>({...emptyUniversalDraft(role),...(entry?{modelId:entry.modelId,declared:!customBindingChanged(entry,connection),ui:{capabilityMode:'manual'}}:{}),custom:{...emptyUniversalDraft(role).custom,...entry?.custom,...connection.custom}})),[error,setError]=useState('');
  const change=patch=>setDraft(d=>updateUniversalDraft(d,patch).draft);
  async function add(e){e.preventDefault();setError('');try{const route=universalDraftRoute(draft);if(models.library.models.some(m=>m.connectionId===connection.id&&m.modelId===route.modelId&&m.id!==entry?.id))throw Error('此连接已添加该型号。');if(await models.save({...models.library,models:[...models.library.models.filter(m=>m.id!==entry?.id),{id:entry?.id||crypto.randomUUID(),connectionId:connection.id,modelId:route.modelId,custom:route.custom,disabled:false}]}))onSaved?.();}catch(e){setError(e.message);}}
  return <form className="tw-custom-model" onSubmit={add}><label className="tw-field">精确模型 ID<input required value={draft.modelId} onChange={e=>change({modelId:e.target.value,declared:false})}/></label><UniversalExtensions draft={draft} role={role} onChange={change}/><UniversalCapabilities draft={draft} role={role} label="自定义模型" onChange={change}/>{error&&<p role="alert">{error}</p>}<button className="tw-primary" disabled={models.busy}>{entry?'校验并保存型号能力':'校验配置并添加模型'}</button><p className="tw-muted">只校验并保存声明，不请求服务商或验证真实调用。</p></form>;
}
