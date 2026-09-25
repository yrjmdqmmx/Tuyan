import { useAppLocale } from './BenchmarkLocale.jsx'
import {useEffect, useRef, useState} from 'react'
import {Check, Copy, Download, Loader2, Search, ShieldCheck} from 'lucide-react'
import {universalApiCheckRequest} from '@paperbanana/api'
import {UNIVERSAL_PROTOCOL_OPTIONS, universalDraftRoute, universalDraftConnection, universalDraftFeedback, universalKeyEnvelope, universalCheckErrorMessage, validateUniversalCatalogResult} from '../lib/universalApi.js'
import {universalDefaultAuth, resolveUniversalCatalogStrategy} from '../lib/universalContract.js'
import UniversalCapabilities from './UniversalCapabilities.jsx'

const roleLabels = {main:['主模型','规划与文字推理'], vision:['识图模型','参考图理解与评审'], image:['图像模型','图片生成与精修']}
const catalogFormats = [['auto','自动识别已核验服务'],['openai','OpenAI /models · data[].id'],['anthropic','Anthropic /models · data[].id'],['gemini','Gemini /models · models[].name'],['none','不获取目录，手动填写']]

function ConnectionOptions({draft, label, onChange}) {
  const { t } = useAppLocale()
  const c = draft.custom
  const custom = patch => onChange({custom:patch})
  return <details className="universal-details">
    <summary>{t("接入地址与兼容选项")}</summary>
    <div className="universal-detail-body">
      <label className="field"><span>{t("Base URL（含版本，不含操作路径）")}</span><input aria-label={`${label} Base URL`} value={c.baseUrl} onChange={e=>custom({baseUrl:e.target.value})} spellCheck={false}/><small>{t("官方地址已预填。第三方服务请按文档填写，例如 https://example.com/v1，不含 /chat/completions 等操作路径。")}</small></label>
      {c.protocol==='dashscope-multimodal'&&<p className="universal-hint">{t("百炼新业务空间需填写对应地域的 Workspace 专属地址；默认值是旧版北京地址。")}</p>}
      <label className="field"><span>{t("认证方式")}</span><select aria-label={t("{v0} 认证方式", {v0: label})} value={c.auth} onChange={e=>custom({auth:e.target.value})}><option value="bearer">Authorization: Bearer</option><option value="x-api-key">x-api-key</option><option value="x-goog-api-key">x-goog-api-key</option></select></label>
      {['openai-chat','openai-images'].includes(c.protocol)&&<label className="field"><span>{t("调用兼容变体")}</span><select aria-label={t("{v0} 兼容变体", {v0: label})} value={c.compatibility} onChange={e=>custom({compatibility:e.target.value})}><option value="standard">{t("标准协议")}</option>{c.protocol==='openai-chat'?<option value="openrouter-image">{t("OpenRouter 图片输出扩展")}</option>:<option value="ark-images">{t("Ark JSON 图片输入")}</option>}</select></label>}
      <label className="field"><span>{t("模型目录接口规则")}</span><select aria-label={t("{v0} 目录接口规则", {v0: label})} value={c.catalogFormat||'auto'} onChange={e=>custom({catalogFormat:e.target.value})}>{catalogFormats.map(([id,title])=><option key={id} value={id}>{t(title)}</option>)}</select><small>{t("未知服务默认不探测接口。仅当服务文档明确兼容所选目录格式及 /models 路径时，才选择对应规则；否则手动填写 ID。")}</small></label>
    </div>
  </details>
}

function UniversalRole({renderThinkingSettings,role, draft, credential, onChange, onKeyChange, onCopy, apiBase, health, contractSupported}) {
  const { t } = useAppLocale()
  const [label,description] = roleLabels[role].map(text => t(text)), c = draft.custom
  const [feedbackReady,setFeedbackReady] = useState(false), [editing,setEditing] = useState(false)
  const [catalog,setCatalog] = useState(null), [config,setConfig] = useState(null), [pending,setPending] = useState(null), [query,setQuery] = useState('')
  const mounted = useRef(true), sequence = useRef(0), identity = useRef({})
  const binding = JSON.stringify(universalDraftConnection(draft)), snapshot = JSON.stringify(draft)
  // Invalidate even A → B → A transitions and older requests for the same connection.
  if (identity.current.binding !== binding || identity.current.credential !== credential) identity.current = {binding,credential,epoch:(identity.current.epoch||0)+1}
  const epoch = identity.current.epoch
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
  let strategy
  try {strategy=resolveUniversalCatalogStrategy(universalDraftConnection(draft))} catch {strategy={supported:false,message:'请填写有效的协议与公网 HTTPS Base URL 后获取目录。'}}
  const visibleCatalog = catalog?.epoch===epoch ? catalog : null
  const visibleConfig = config?.snapshot===snapshot ? config : null
  const busy = pending?.epoch===epoch ? pending.kind : null
  const feedback = universalDraftFeedback(draft,role)
  const change = patch => {setFeedbackReady(false);onChange(patch)}
  async function check(kind) {
    const requestId=++sequence.current, requestEpoch=epoch, requestSnapshot=snapshot
    setPending({epoch,kind});if(kind==='config'){setConfig(null);setFeedbackReady(true);setEditing(false)}
    const isCurrent = () => mounted.current && sequence.current===requestId && identity.current.epoch===requestEpoch
    try {
      let payload
      if(kind==='catalog') payload={connection:universalDraftConnection(draft),selectedModelId:draft.modelId||undefined,check:kind,apiKeys:{custom:universalKeyEnvelope({[role]:draft},{[role]:credential})}}
      else {
        if(feedback.tone!=='success') throw Object.assign(new Error(feedback.message),{localValidation:true})
        payload={route:universalDraftRoute(draft),check:kind}
      }
      const result=await universalApiCheckRequest(apiBase,health,payload)
      if(!isCurrent()) return
      if(kind==='catalog'){validateUniversalCatalogResult(result);setCatalog({...result,epoch,models:result.models,partialError:result.error,error:false})}
      else {
        if(result.state!=='configuration-valid'||result.inferenceVerified!==false) throw Object.assign(new Error('配置检查返回格式异常，请稍后重试；尚未验证地址或真实调用。'),{localValidation:true})
        setConfig({snapshot:requestSnapshot,error:false,message:'配置与地址校验通过；尚未验证模型权限或真实调用。'})
      }
    } catch(error) {
      if(!isCurrent()) return
      const result={message:universalCheckErrorMessage(error,kind),error:true}
      if(kind==='catalog') setCatalog({...result,epoch,models:[]})
      else setConfig({...result,snapshot:requestSnapshot})
    } finally {if(isCurrent())setPending(null)}
  }
  const matches = visibleCatalog?.models.filter(({id})=>id.toLowerCase().includes(query.trim().toLowerCase()))||[]
  const selectedMissing = draft.modelId && visibleCatalog && !visibleCatalog.error && !visibleCatalog.models.some(({id})=>id===draft.modelId)
  return <fieldset className="universal-role" aria-label={t(label)}>
    <legend>{t(label)}</legend>
    <div className="universal-role-heading"><p>{t(description)}</p>{role!=='main'&&<button type="button" className="universal-button universal-copy" onClick={()=>{setFeedbackReady(false);onCopy()}}><Copy size={14}/>{t("复制主模型接入与密钥")}</button>}</div>
    <label className="field"><span>{t("API 协议")}</span><select aria-label={t("{v0} API 协议", {v0: label})} value={c.protocol} onChange={e=>{const protocol=e.target.value;change({custom:{protocol,baseUrl:UNIVERSAL_PROTOCOL_OPTIONS.find(x=>x[0]===protocol)[2],auth:universalDefaultAuth(protocol),compatibility:'standard',catalogFormat:'auto'}})}}>{UNIVERSAL_PROTOCOL_OPTIONS.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    <label className="field"><span>API Key</span><input aria-label={`${label} API Key`} type="password" autoComplete="off" value={credential?.apiKey||''} onChange={e=>onKeyChange(e.target.value)}/></label>
    <ConnectionOptions draft={draft} label={t(label)} onChange={change}/>
    <div className="universal-catalog-toolbar"><button type="button" className="universal-button" disabled={Boolean(busy)||!contractSupported||!strategy.supported||!credential?.apiKey?.trim()} onClick={()=>check('catalog')}>{busy==='catalog'?<Loader2 className="universal-spinner" size={16}/>:<Download size={16}/>} {t(busy==='catalog'?'正在获取模型…':visibleCatalog&&!visibleCatalog.error?'重新获取模型':'获取模型')}</button><span>{t("只读目录 · 不触发生成")}</span></div>
    <p className="universal-hint">{t(!strategy.supported?t(strategy.message):!credential?.apiKey?.trim()?'填写当前服务的 API Key 后可获取模型，无需先填模型 ID。':strategy.message)}</p>
    {visibleCatalog&&<div className={`universal-status ${visibleCatalog.error?'error':visibleCatalog.warnings?.length?'warning':'neutral'}`} role={visibleCatalog.error?'alert':'status'}>
      <p>{visibleCatalog.message}</p>
      {visibleCatalog.partialError&&<p>{universalCheckErrorMessage({details:{catalogError:visibleCatalog.partialError}},'catalog')}</p>}
      {!visibleCatalog.error&&<small>{t("本次获取 ")}{visibleCatalog.models.length}{t(" 个有效 ID")}{visibleCatalog.warnings?.length?`，已隔离 ${visibleCatalog.warnings.length} 条异常`:''}。{visibleCatalog.fetchedAt?`读取时间：${new Date(visibleCatalog.fetchedAt).toLocaleTimeString('zh-CN')}。`:''}{t("目录可见不代表能力、权限或真实调用验证成功。")}</small>}
      {selectedMissing&&<p>{t("当前 ID「")}{draft.modelId}{t("」未出现在本次目录中，已保留。可核对文档后继续手动配置；目录可能不完整。")}</p>}
    </div>}
    {visibleCatalog?.models.length>0&&<div className="universal-catalog-picker">
      <label className="universal-search"><Search size={16}/><input aria-label={t("{v0} 搜索模型", {v0: label})} placeholder={t("搜索准确模型 ID")} value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <div className="universal-model-list" role="group" aria-label={t("{v0} 目录模型", {v0: label})}>
        {matches.map(({id})=><button type="button" key={id} aria-pressed={id===draft.modelId} className={id===draft.modelId?'selected':''} onClick={()=>{onChange({modelId:id});setFeedbackReady(true);setEditing(false)}}><span>{id}</span>{id===draft.modelId?<Check size={16}/>:<small>{t("选择")}</small>}</button>)}
        {!matches.length&&<p className="universal-hint">{t("没有匹配项，可修改搜索或手动填写。")}</p>}
      </div>
    </div>}
    <label className="field"><span>{t("准确模型 ID ")}<small>{t("支持手动填写")}</small></span><input aria-label={t("{v0} 模型 ID", {v0: label})} value={draft.modelId} autoComplete="off" spellCheck={false} onFocus={()=>setEditing(true)} onBlur={()=>{setEditing(false);setFeedbackReady(true)}} onChange={e=>change({modelId:e.target.value})} placeholder={t("从目录选择，或粘贴服务提供的准确 ID")}/></label>
    {renderThinkingSettings?.(role)}
    {!draft.modelId.trim()?<p className="universal-hint">{t(feedback.message)}</p>:feedbackReady&&!editing&&<p className={`universal-status ${feedback.tone}`} role={feedback.tone==='error'?'alert':'status'}>{t(feedback.message)}</p>}
    <details className="universal-details"><summary>{t("能力与限额")}</summary><UniversalCapabilities draft={draft} label={t(label)} onChange={change}/></details>
    <button type="button" className="universal-button" disabled={Boolean(busy)||!contractSupported} onClick={()=>check('config')}>{busy==='config'?<Loader2 className="universal-spinner" size={16}/>:<ShieldCheck size={16}/>}{t("检查配置与地址")}</button>
    {visibleConfig&&<p className={`universal-status ${visibleConfig.error?'error':'success'}`} role={visibleConfig.error?'alert':'status'}>{visibleConfig.message}</p>}
  </fieldset>
}

export default function UniversalApiSettings({renderThinkingSettings,drafts,keys,onChange,onKeyChange,onCopy,onSave,apiBase,health,contractSupported, roles = ['main','vision','image']}) {
  const { t } = useAppLocale()
  const [saved,setSaved]=useState('')
  return <section className="universal-api-settings" aria-label={t("通用 API 接入")}>
    <p className="universal-intro">{t("接入地址决定服务渠道，API 协议决定请求格式，模型 ID 决定实际型号。各角色可复用接入信息。")}</p>
    {!contractSupported&&<p className="universal-status error" role="alert">{t("当前后端暂不支持通用 API，配置已保留，请稍后重试。")}</p>}
    <details className="universal-privacy"><summary><ShieldCheck size={15}/>{t("密钥与验证说明")}</summary><p>{t("密钥仅留在当前页面；恢复任务所需密钥在服务端加密保存，完成后删除，最长 7 天。地址或协议改变后需重新填密钥。保存配置不会保存密钥。")}</p><p>{t("配置校验、目录获取、真实调用是三个不同状态。本页检查不会触发付费生成。")}</p></details>
    {roles.filter(role=>Object.hasOwn(roleLabels,role)).map(role=><UniversalRole renderThinkingSettings={renderThinkingSettings} key={role} role={role} draft={drafts[role]} credential={keys[role]} onChange={patch=>{onChange(role,patch);setSaved('')}} onKeyChange={value=>onKeyChange(role,value)} onCopy={()=>onCopy(role,'main')} apiBase={apiBase} health={health} contractSupported={contractSupported}/>)}
    <button type="button" className="universal-button universal-save" onClick={()=>setSaved(onSave()?'配置已保存，未保存密钥或验证状态。':'浏览器存储不可用，配置仍保留在当前页面。')}>{t("保存非敏感配置")}</button>{saved&&<p className="universal-status neutral" role="status">{t(saved)}</p>}
  </section>
}
