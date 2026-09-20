import {useState} from 'react'
import {universalApiCheckRequest} from '@paperbanana/api'
import {UNIVERSAL_PROTOCOL_OPTIONS, universalDraftRoute, universalDraftEntry, universalKeyEnvelope} from '../lib/universalApi.js'
import {universalDefaultAuth} from '../lib/universalContract.js'
const names={main:'主模型',vision:'识图模型',image:'图像模型'}
const mib=1024*1024
export default function UniversalApiSettings({drafts,keys,onChange,onKeyChange,onCopy,onSave,apiBase,health,contractSupported}) {
  const [checks,setChecks]=useState({}),[busy,setBusy]=useState(''),[saved,setSaved]=useState('')
  async function check(role,kind) {
    const snapshot=JSON.stringify(drafts[role]),credentialIdentity=kind==='catalog'?keys[role]:undefined;setBusy(role);setChecks(current=>({...current,[role]:null}))
    try {
      const route=universalDraftRoute(drafts[role])
      const result=await universalApiCheckRequest(apiBase,health,{route,check:kind,apiKeys:kind==='catalog'?{custom:universalKeyEnvelope({[role]:drafts[role]},{[role]:keys[role]})}:undefined})
      setChecks(current=>({...current,[role]:{snapshot,credentialIdentity,kind,message:result.message,models:result.models?.map(x=>x.id)||[],warnings:result.warnings?.length||0,state:result.state}}))
    } catch(error) {setChecks(current=>({...current,[role]:{snapshot,credentialIdentity,kind,message:error.message,error:true}}))} finally {setBusy('')}
  }
  return <section className="universal-api-settings" aria-label="通用 API 接入">
    <p>使用自己的模型服务完成现有流程。接入渠道是提供服务的地址；API 协议是报文格式；模型 ID 是该地址下的准确型号。各角色可复制同一份接入配置。</p>
    {!contractSupported&&<p role="alert">当前后端尚未提供通用 API 契约，配置可以保留，暂不能提交。</p>}
    <p className="route-contract-warning">密钥仅保留在当前页面；恢复任务所需密钥在服务端加密保存，完成后删除，最长 7 天。地址或协议改变后需重新填密钥。配置通过、目录可见均不代表真实调用成功。</p>
    {Object.entries(names).map(([role,label])=>{
      const d=drafts[role],c=d.custom,entry=universalDraftEntry(d),state=checks[role]?.snapshot===JSON.stringify(d)&&(checks[role].kind!=='catalog'||checks[role].credentialIdentity===keys[role])?checks[role]:null
      const change=patch=>{onChange(role,patch);setSaved('')}
      const custom=patch=>change({custom:patch})
      const limits=(scope,key,value)=>custom({[scope]:{...c[scope],[key]:value}})
      return <fieldset className="universal-role" key={role}><legend>{label}</legend>
        {role!=='main'&&<button type="button" className="secondary-button" onClick={()=>onCopy(role,'main')}>复制主模型接入与密钥</button>}
        <label className="field"><span>API 协议</span><select aria-label={`${label} API 协议`} value={c.protocol} onChange={e=>{const protocol=e.target.value;custom({protocol,baseUrl:UNIVERSAL_PROTOCOL_OPTIONS.find(x=>x[0]===protocol)[2],auth:universalDefaultAuth(protocol),compatibility:'standard'})}}>{UNIVERSAL_PROTOCOL_OPTIONS.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <label className="field"><span>API Key</span><input aria-label={`${label} API Key`} type="password" autoComplete="off" value={keys[role]?.apiKey||''} onChange={e=>onKeyChange(role,e.target.value)}/></label>
        <label className="field"><span>准确模型 ID</span><input aria-label={`${label} 模型 ID`} value={d.modelId} autoComplete="off" onChange={e=>change({modelId:e.target.value})} placeholder="以服务文档或目录返回的 ID 为准"/></label>
        <details><summary>接入地址与兼容选项</summary>
          <label className="field"><span>Base URL（含版本，不含操作路径）</span><input aria-label={`${label} Base URL`} value={c.baseUrl} onChange={e=>custom({baseUrl:e.target.value})} spellCheck={false}/><small>如 https://api.openai.com/v1。第三方网关保留前缀；不要填写 /chat/completions、/responses 或 /images/generations。</small></label>
          {c.protocol==='dashscope-multimodal'&&<p>百炼新业务空间请填写控制台对应地域的 Workspace 专属地址；默认值是旧版北京地址，不能保证适用于当前账号。</p>}
          <label className="field"><span>认证方式</span><select aria-label={`${label} 认证方式`} value={c.auth} onChange={e=>custom({auth:e.target.value})}><option value="bearer">Authorization: Bearer</option><option value="x-api-key">x-api-key</option><option value="x-goog-api-key">x-goog-api-key</option></select></label>
          {['openai-chat','openai-images'].includes(c.protocol)&&<label className="field"><span>兼容变体</span><select aria-label={`${label} 兼容变体`} value={c.compatibility} onChange={e=>custom({compatibility:e.target.value})}><option value="standard">标准协议</option>{c.protocol==='openai-chat'?<option value="openrouter-image">OpenRouter 图片输出扩展</option>:<option value="ark-images">Ark JSON 图片输入</option>}</select></label>}
        </details>
        <details open={entry.selectable===false&&Boolean(d.modelId)}><summary>能力与限额（未知型号必填）</summary>
          <p>仅精确匹配官方地址、协议与已审计型号时采用已有声明。兼容服务需按其文档填写。下面的初始值是待确认草稿，不是对上游能力的保证。</p>
          <div className="universal-capabilities">{Object.entries({text:'文本生成',vision:'图片理解',imageGeneration:'图片生成',imageEditing:'直接图片编辑'}).map(([key,title])=><label key={key}><input type="checkbox" checked={c.capabilities[key]} onChange={e=>custom({capabilities:{...c.capabilities,[key]:e.target.checked}})}/>{title}</label>)}</div>
          <div className="model-grid">{[['maxCount','输入图片上限',1],['maxBytes','单图 MiB',mib],['maxTotalBytes','图片合计 MiB',mib],['maxDimension','输入单边 px',1],['maxPixels','输入百万像素',1e6],['requestMaxBytes','完整请求 MiB',mib]].map(([key,title,unit])=><label className="field" key={key}><span>{title}</span><input type="number" aria-label={`${label} ${title}`} min={key==='maxCount'?0:1/unit} step="any" value={c.inputLimits[key]/unit} onChange={e=>limits('inputLimits',key,Math.round(Number(e.target.value)*unit))}/></label>)}</div>
          <label className="field"><span>允许的输入格式</span><input aria-label={`${label} 输入格式`} value={c.inputLimits.mimeTypes.join(',')} onChange={e=>limits('inputLimits','mimeTypes',e.target.value.split(',').map(x=>x.trim()))}/><small>逗号分隔 MIME，例如 image/png,image/jpeg,image/webp。</small></label>
          <div className="model-grid">{[['maxBytes','输出单图 MiB',mib],['maxDimension','输出单边 px',1],['maxPixels','输出百万像素',1e6]].map(([key,title,unit])=><label className="field" key={key}><span>{title}</span><input type="number" aria-label={`${label} ${title}`} min={1/unit} step="any" value={c.outputLimits[key]/unit} onChange={e=>limits('outputLimits',key,Math.round(Number(e.target.value)*unit))}/></label>)}</div>
          <label className="field"><span>允许的输出格式</span><input aria-label={`${label} 输出格式`} value={c.outputLimits.mimeTypes.join(',')} onChange={e=>limits('outputLimits','mimeTypes',e.target.value.split(',').map(x=>x.trim()))}/></label>
          {(c.capabilities.imageGeneration||c.capabilities.imageEditing)&&<div><p>输出尺寸映射：每一行表示一个可执行组合。像素协议填写 1024x1024（百炼可为 1024*1024）；Gemini 填 1K/2K 等实际支持的 image size。</p>{c.outputSizes.map((row,index)=><div className="universal-size-row" key={index}>{[['resolution','清晰度'],['aspectRatio','比例'],['value','接口尺寸值']].map(([key,title])=><label key={key}>{title}<input aria-label={`${label} 尺寸 ${index+1} ${title}`} value={row[key]} onChange={e=>custom({outputSizes:c.outputSizes.map((r,i)=>i===index?{...r,[key]:e.target.value}:r)})}/></label>)}<button type="button" onClick={()=>custom({outputSizes:c.outputSizes.filter((_,i)=>i!==index)})}>移除</button></div>)}<button type="button" className="secondary-button" onClick={()=>custom({outputSizes:[...c.outputSizes,{resolution:'1K',aspectRatio:'1:1',value:''}]})}>添加尺寸组合</button></div>}
          <label className="universal-confirm"><input type="checkbox" checked={d.declared} onChange={e=>change({declared:e.target.checked})}/>我已按此地址下的型号文档核对以上能力和限额</label>
        </details>
        <p className={entry.selectable?'':'route-contract-warning'}>{entry.selectable?'配置结构完整，真实调用尚未验证。':entry.disabledReason}</p>
        <div className="td-actions"><button type="button" className="secondary-button" disabled={Boolean(busy)||!contractSupported} onClick={()=>check(role,'config')}>检查配置与地址</button><button type="button" className="secondary-button" disabled={Boolean(busy)||!contractSupported||!keys[role]?.apiKey} onClick={()=>check(role,'catalog')}>只读检查模型目录</button></div>
        {state&&<div role={state.error?'alert':'status'}><p>{state.message}</p>{state.models?.length>0&&<p>{state.models.includes(d.modelId)?'所填 ID 在本次目录中可见。':'本次目录未找到所填 ID，请核对，模型 ID 已保留。'} 有效记录 {state.models.length} 条，异常 {state.warnings} 条。</p>}<small>不触发生成、不证明模型推理可用。目录状态只代表本次读取。</small></div>}
      </fieldset>
    })}
    <button type="button" className="secondary-button" onClick={()=>setSaved(onSave()?'配置已保存，未保存密钥或验证状态。':'浏览器存储不可用，配置仍保留在当前页面。')}>保存非敏感配置</button>{saved&&<p role="status">{saved}</p>}
  </section>
}
