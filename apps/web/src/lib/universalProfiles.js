import {normalizeUniversalConnection, normalizeUniversalLimitPolicy} from './universalContract.js'
import {serializeUniversalDrafts, loadUniversalDrafts} from './universalApi.js'
import {universalThinkingIdentity, selectionThinkingProfile, validateThinkingOptions, sameThinkingConnection} from './thinking.js'

export const CONNECTION_LIBRARY_KEY='tuyan.universal-connections.v1'
export const UNIVERSAL_FILE_MAX_BYTES=128*1024
const roles=['main','vision','image']
const record=x=>x&&typeof x==='object'&&!Array.isArray(x)
const fail=message=>{throw new Error(message)}
const text=(x,n)=>typeof x==='string'&&x.trim()&&x.length<=n&&!/[\x00-\x1f\x7f]/.test(x)
export function connectionFacts(custom) {
  const c=normalizeUniversalConnection({...custom,connectionId:'profile',version:1})
  const compatibility=custom.compatibility||'standard'
  if(!['standard','openrouter-image','ark-images'].includes(compatibility))fail('连接兼容选项无效。')
  const {protocol,baseUrl,auth,catalogFormat}=c
  return {protocol,baseUrl,auth,catalogFormat,compatibility}
}
export function cleanConnectionProfile(value) {
  if(!record(value)||!text(value.id,80)||!text(value.name,80))fail('连接名称或标识无效（最多 80 字）。')
  return {id:value.id,name:value.name.trim(),connection:connectionFacts(value.connection)}
}
export function readConnectionLibrary(storage=globalThis.localStorage) {
  try {const x=JSON.parse(storage?.getItem(CONNECTION_LIBRARY_KEY)||'null');if(x?.version!==1||!Array.isArray(x.profiles)||x.profiles.length>50)return [];return x.profiles.flatMap(p=>{try{return [cleanConnectionProfile(p)]}catch{return []}})}catch{return []}
}
export function saveConnectionLibrary(profiles,storage=globalThis.localStorage) {
  if(!Array.isArray(profiles)||profiles.length>50)fail('最多保存 50 个连接。')
  const clean=profiles.map(cleanConnectionProfile)
  if(new Set(clean.map(p=>p.id)).size!==clean.length)fail('连接标识重复。')
  try {storage.setItem(CONNECTION_LIBRARY_KEY,JSON.stringify({version:1,profiles:clean}))}catch{fail('浏览器存储不可用，连接未保存。')}
  return clean
}
export function profilePatch(profile) {
  return {custom:connectionFacts(profile.connection),ui:{baseUrlSource:'user',connectionMode:'custom'},declared:false}
}
function cleanThinking(selection,role,draft) {
  if(!selection)return undefined
  const identity=universalThinkingIdentity({accessProvider:'custom',modelId:draft.modelId,custom:draft.custom})
  if(selection.provider!=='custom'||selection.modelId!==identity.modelId||selection.protocol!==identity.protocol||!sameThinkingConnection(selection.connection,identity.connection))fail('导入的思考偏好与当前文件连接、型号不匹配。')
  const options=validateThinkingOptions(selectionThinkingProfile(identity,role),selection.options)
  return {...identity,options}
}
export function exportUniversalConfiguration(role,draft,profiles,thinking) {
  if(!roles.includes(role))fail('配置角色无效。')
  const clean=JSON.parse(serializeUniversalDrafts({[role]:draft})).roles[role]
  const data={schema:'tuyan.universal',version:2,role,draft:clean,profiles:profiles.map(cleanConnectionProfile)}
  if(thinking?.provider==='custom')data.thinking=cleanThinking(thinking,role,clean)
  const output=JSON.stringify(data,null,2)
  if(new TextEncoder().encode(output).length>UNIVERSAL_FILE_MAX_BYTES)fail('导出超过 128 KiB，请减少连接条目后重试。')
  return output
}
const forbidden=new Set(['apiKey','api_key','apiKeys','authorization','headers','credentials','cookie','cookies','session','sessionId','accessToken','refreshToken','thinkingSnapshot','wire','verified','inferenceVerified','recoveryToken'])
function rejectSecrets(value,depth=0) {
  if(depth>15)fail('配置嵌套过深。')
  if(Array.isArray(value)){if(value.length>256)fail('配置列表过长。');value.forEach(x=>rejectSecrets(x,depth+1));return}
  if(!record(value))return
  for(const [k,v] of Object.entries(value)){if(forbidden.has(k)||['__proto__','constructor','prototype'].includes(k))fail(`文件包含不允许的字段「${k}」，请使用无密钥配置文件。`);rejectSecrets(v,depth+1)}
}
export function importUniversalConfiguration(source,targetRole) {
  if(typeof source!=='string'||new TextEncoder().encode(source).length>UNIVERSAL_FILE_MAX_BYTES)fail('配置文件超过 128 KiB。')
  let data;try{data=JSON.parse(source)}catch{fail('文件不是有效 JSON；当前配置未改变。')}
  rejectSecrets(data)
  if(!roles.includes(targetRole))fail('目标角色无效。')
  let draft,sourceRole,profiles=[],thinking
  if(data?.schema==='tuyan.universal'&&[1,2].includes(data.version)) {
    if(!roles.includes(data.role)||!record(data.draft))fail('文件缺少角色配置。')
    sourceRole=data.role;draft=data.draft
    if(!Array.isArray(data.profiles)||data.profiles.length>50)fail('连接列表无效。')
    profiles=data.profiles.map(cleanConnectionProfile)
    if(new Set(profiles.map(p=>p.id)).size!==profiles.length)fail('连接标识重复。')
    thinking=data.thinking
  } else if(data?.version===1&&record(data.roles)&&record(data.roles[targetRole])) {sourceRole=targetRole;draft=data.roles[targetRole]}
  else fail('不支持此配置版本；可导入图研通用配置 v1/v2。')
  if(typeof draft.modelId!=='string'||draft.modelId.length>256||!record(draft.custom))fail('型号或连接字段缺失。')
  connectionFacts(draft.custom)
  if(draft.custom.limitPolicy)normalizeUniversalLimitPolicy(draft.custom.limitPolicy)
  // Use the same bounded legacy repair path as browser restoration. Claims are drafts, not trust.
  const restored=loadUniversalDrafts({getItem:()=>JSON.stringify({version:1,roles:{[targetRole]:draft}})})[targetRole]
  const importedThinking=thinking?cleanThinking(thinking,sourceRole,restored):undefined
  if(importedThinking&&sourceRole!==targetRole)validateThinkingOptions(selectionThinkingProfile(importedThinking,targetRole),importedThinking.options)
  restored.declared=false
  restored.ui={...restored.ui,capabilityMode:'manual',baseUrlSource:'user',manualDraftPresent:true,connectionMode:'custom'}
  if(restored.evidence)restored.evidence={...restored.evidence,review:'imported'}
  return {draft:restored,profiles,thinking:importedThinking,sourceRole,targetRole,message:`仅替换${{main:'主模型',vision:'视觉模型',image:'图像模型'}[targetRole]}的当前页草稿；其他角色与密钥不复制。能力声明需重新核对，思考参数已按目标身份重新校验。连接列表需另行保存。`}
}
