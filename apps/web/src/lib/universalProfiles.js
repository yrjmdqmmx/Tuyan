import {normalizeUniversalConnection, normalizeUniversalLimitPolicy, migrateUniversalLimitPolicy} from './universalContract.js'
import {serializeUniversalDrafts, loadUniversalDrafts, updateUniversalDraft} from './universalApi.js'
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
export function readConnectionLibrary(storage) {
  try {const x=JSON.parse((storage ?? globalThis.localStorage)?.getItem(CONNECTION_LIBRARY_KEY)||'null');if(x?.version!==1||!Array.isArray(x.profiles)||x.profiles.length>50)return [];return x.profiles.flatMap(p=>{try{return [cleanConnectionProfile(p)]}catch{return []}})}catch{return []}
}
export function saveConnectionLibrary(profiles,storage=globalThis.localStorage) {
  if(!Array.isArray(profiles)||profiles.length>50)fail('最多保存 50 个连接。')
  const clean=profiles.map(cleanConnectionProfile)
  if(new Set(clean.map(p=>p.id)).size!==clean.length)fail('连接标识重复。')
  try {storage.setItem(CONNECTION_LIBRARY_KEY,JSON.stringify({version:1,profiles:clean}))}catch{fail('浏览器存储不可用，连接未保存。')}
  return clean
}
// A Web Lock serializes cooperating tabs; expected records detect edits made
// while this role was open. Unrelated entries always come from current storage.
export async function mutateConnectionLibrary(change, storage=globalThis.localStorage, locks=globalThis.navigator?.locks) {
  if (!locks?.request) fail('此浏览器无法安全协调连接保存；当前草稿仍保留，可导出配置或使用支持 Web Locks 的浏览器。')
  return locks.request(CONNECTION_LIBRARY_KEY, () => {
    const raw=storage.getItem(CONNECTION_LIBRARY_KEY)
    if(raw) {
      let saved; try {saved=JSON.parse(raw)} catch {fail('连接库数据无法读取，未覆盖原数据。请先导出或备份浏览器数据。')}
      if(saved?.version!==1 || !Array.isArray(saved.profiles) || saved.profiles.length>50) fail('连接库版本或结构异常，未覆盖原数据。')
      saved.profiles.forEach(cleanConnectionProfile)
    }
    let current=readConnectionLibrary(storage)
    if(change.type==='add') {
      const additions=change.profiles.map(cleanConnectionProfile)
      if(additions.some(p=>current.some(x=>x.id===p.id))) fail('连接标识已存在，请重新另存。')
      current=[...current,...additions]
    } else if(['update','delete'].includes(change.type)) {
      const actual=current.find(p=>p.id===change.id)
      if(!actual || JSON.stringify(actual)!==JSON.stringify(change.expected)) fail('此连接已在其他页面修改或删除。请重新载入已保存连接并核对；当前草稿未改变。')
      current=change.type==='delete'?current.filter(p=>p.id!==change.id):current.map(p=>p.id===change.id?cleanConnectionProfile({...change.profile,id:change.id}):p)
    } else fail('未知连接操作。')
    return saveConnectionLibrary(current,storage)
  })
}
export function universalImportDiff(current, imported, thinking) {
  const before=JSON.parse(serializeUniversalDrafts({main:current})).roles.main, after=imported.draft
  const changes=[]
  const add=(label,a,b,display=x=>String(x??'未填写'))=>{
    if(JSON.stringify(a)!==JSON.stringify(b)) changes.push({label,before:display(a),after:display(b)})
  }
  for(const [key,label] of [['baseUrl','接口地址'],['protocol','协议'],['auth','鉴权方式'],['catalogFormat','目录规则'],['compatibility','兼容选项']]) add(label,before.custom[key],after.custom[key])
  add('型号',before.modelId,after.modelId)
  for(const [key,label] of [['text','文字输出'],['vision','图片理解'],['imageGeneration','图片生成'],['imageEditing','直接编辑图片']]) add(label,before.custom.capabilities[key],after.custom.capabilities[key],x=>x?'声明支持':'未声明支持')
  const policy=d=>{try{return migrateUniversalLimitPolicy(d.custom)}catch{return d.custom.limitPolicy||{service:{},user:{input:d.custom.inputLimits,output:d.custom.outputLimits}}}}
  const from=policy(before),to=policy(after),mib=1024*1024
  const numeric=[['maxCount','图片数量',1,'张'],['maxBytes','单图大小',mib,'MiB'],['maxTotalBytes','图片合计',mib,'MiB'],['maxDimension','单边尺寸',1,'px'],['maxPixels','像素数',1e6,'百万像素'],['requestMaxBytes','完整请求',mib,'MiB']]
  for(const [layer,layerName] of [['service','服务方声明'],['user','用户限制']]) for(const [part,partName] of [['input','输入'],['output','输出']]) {
    const old=from[layer]?.[part]||{},next=to[layer]?.[part]||{},unknown=layer==='service'?'未知':'不额外限制'
    for(const [key,label,scale,unit] of numeric) add(`${layerName} · ${partName}${label}`,old[key]??null,next[key]??null,x=>x==null?unknown:`${Number((x/scale).toFixed(6))} ${unit}`)
    add(`${layerName} · ${partName}格式`,old.mimeTypes??null,next.mimeTypes??null,x=>x?.length?x.map(type=>({'image/png':'PNG','image/jpeg':'JPEG','image/webp':'WebP'}[type]||type)).join('、'):unknown)
  }
  add('输出尺寸组合',before.custom.outputSizes,after.custom.outputSizes,rows=>rows?.length?rows.map(row=>`${row.resolution} / ${row.aspectRatio} → ${row.value}`).join('；'):'未配置')
  if(imported.thinking) for(const key of new Set([...Object.keys(thinking?.options||{}),...Object.keys(imported.thinking.options)])) {
    const names={mode:'思考模式',effort:'思考强度',budget:'思考预算'},labels={true:'开启',false:'关闭',enabled:'开启',disabled:'关闭',adaptive:'自适应',low:'低',medium:'中',high:'高',minimal:'极低'}
    add(names[key]||key,thinking?.options?.[key],imported.thinking.options[key],x=>x===undefined?'服务商默认':labels[String(x)]||String(x))
  }
  return {changes,clearKey:updateUniversalDraft(current,after).clearKey,
    thinking:imported.thinking?'将采用文件中的思考偏好，并按目标身份保存。':'文件未包含思考偏好：沿用目标身份的历史偏好或服务商默认，不会清除历史偏好。'}
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
