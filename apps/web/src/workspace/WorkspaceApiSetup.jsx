import MenuSelect from '../components/MenuSelect.jsx';
import {useState} from 'react';
import {UniversalRole} from '../components/UniversalApiSettings.jsx';
import {emptyUniversalDraft,loadUniversalDrafts,updateUniversalDraft,bindUniversalKey,universalDraftRoute,universalDraftFeedback} from '../lib/universalApi.js';
import {normalizeUniversalConnection} from '../lib/universalContract.js';
import {API_BASE_DEFAULT} from '../config.js';
import {ROLE_NAMES} from './workspaceModels.js';

// The old advanced editor operates on a new, unsaved connection. Applying a
// profile or file cannot mutate a connection already used by other tasks/models.
export default function WorkspaceApiSetup({models,health,onSaved,onUse}) {
  const [role,setRole]=useState('main'),[drafts,setDrafts]=useState(()=>Object.fromEntries(['main','image','vision'].map(r=>[r,emptyUniversalDraft(r)]))),[keys,setKeys]=useState({}),[thinking,setThinking]=useState({});
  const [name,setName]=useState(''),[scope,setScope]=useState('browser'),[error,setError]=useState('');
  const draft=drafts[role], credential=keys[role];
  function change(patch){const result=updateUniversalDraft(draft,patch);setDrafts(d=>({...d,[role]:result.draft}));if(result.clearKey)setKeys(k=>({...k,[role]:null}));}
  async function save(useInTask=false){setError('');try{
    if(!name.trim())throw Error('请填写新的连接名称。');
    if(scope==='account'&&!models.userId)throw Error('请先登录图研。');
    const feedback=universalDraftFeedback(draft,role);if(feedback.tone!=='success')throw Error(feedback.message);
    const route=universalDraftRoute(draft), id=crypto.randomUUID(), modelId=crypto.randomUUID();
    const custom={...route.custom,connectionId:id};
    const connection={id,provider:'custom',label:name.trim(),scope,region:'global',disabled:false,custom:normalizeUniversalConnection(custom),...(credential?.expiresAt?{expiresAt:Date.parse(credential.expiresAt)}:{})};
    const model={id:modelId,connectionId:id,modelId:route.modelId,custom,disabled:false};
    if(await models.save({...models.library,connections:[...models.library.connections,connection],models:[...models.library.models,model]}, {id,value:credential?.apiKey||''})) {
      if(useInTask)onUse?.({role,reference:{libraryModelId:modelId,connectionId:id,accessProvider:'custom',modelId:route.modelId},thinking:thinking[role]});
      onSaved();
    }
  }catch(e){setError(e.message);}}
  return <div className="universal-api-settings tw-api-setup"><p>复用旧工作台的模板、命名连接、配置文件和只读目录检查。保存为新连接与型号，现有连接及任务配置保持原样；密钥需由你填写，不读取旧页密钥。</p>
    <label className="tw-field">配置角色<MenuSelect value={role} onChange={e=>setRole(e.target.value)}>{Object.entries(ROLE_NAMES).map(([id,label])=><option value={id} key={id}>{label}</option>)}</MenuSelect></label>
    <button type="button" onClick={()=>{change(loadUniversalDrafts()[role]);setError('已读取旧页的无密钥配置，请核对型号与能力后保存。');}}>读取旧工作台此角色配置（不含密钥）</button>
    <UniversalRole key={role} role={role} draft={draft} credential={credential} onChange={change} onKeyChange={value=>setKeys(k=>({...k,[role]:bindUniversalKey(draft,value)}))} thinking={thinking[role]} onImportThinking={(r,value)=>setThinking(s=>({...s,[r]:value}))} canCopyMain={false} apiBase={API_BASE_DEFAULT} health={health} contractSupported={models.registry?.universalApiContractVersion>=1} />
    <section className="tw-management-section"><h3>保存到模型库</h3><label className="tw-field">新连接名称<input maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><label className="tw-field">密钥保存位置<MenuSelect value={scope} onChange={e=>setScope(e.target.value)}><option value="browser">当前浏览器</option><option value="account" disabled={!models.userId}>绑定图研账号</option></MenuSelect></label><p className="tw-muted">浏览器密钥仅供此浏览器使用，清除网站数据后需重填。账号密钥由当前服务加密保存，可在同一服务的其他设备使用。这里只保存此页新填写的密钥；留空会保留为待配置连接。</p>{thinking[role]&&<p>已读取文件中的思考偏好。选择“保存并用于当前任务”才会写入当前专业模式的此角色；仅保存模型不会改变任何任务。</p>}<div className="tw-action-row"><button type="button" disabled={models.busy||!models.ready} onClick={()=>save(false)}>保存为新连接与模型</button>{onUse&&<button type="button" disabled={models.busy||!models.ready} onClick={()=>save(true)}>保存并用于当前任务的专业模式</button>}</div>{(error||models.error)&&<p role="status">{error||models.error}</p>}</section>
  </div>;
}
