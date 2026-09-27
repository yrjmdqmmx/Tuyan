import { UNIVERSAL_PROTOCOL_OPTIONS, updateUniversalDraft } from './universalApi.js'
import { universalDefaultAuth, effectiveUniversalLimits, UNIVERSAL_PLATFORM_LIMITS } from './universalContract.js'

// Web-only form macros. No model capability, credential, or runtime contract fields.
// Official sources reviewed 2026-09-27; OpenRouter /images is NOT a v1 template.
export const CONNECTION_TEMPLATES = [
  {id:'openai', label:'OpenAI 官方连接', protocols:['openai-chat','openai-responses','openai-images'], baseUrl:'https://api.openai.com/v1', auth:'bearer', docs:'https://developers.openai.com/api/reference/resources/models/methods/list'},
  {id:'anthropic', label:'Anthropic 官方连接', protocols:['anthropic-messages'], baseUrl:'https://api.anthropic.com/v1', auth:'x-api-key', docs:'https://platform.claude.com/docs/en/api/models/list'},
  {id:'gemini', label:'Gemini 官方连接', protocols:['gemini-generate-content'], baseUrl:'https://generativelanguage.googleapis.com/v1beta', auth:'x-goog-api-key', docs:'https://ai.google.dev/api'},
  {id:'openrouter', label:'OpenRouter 文字 / 识图连接', protocols:['openai-chat'], baseUrl:'https://openrouter.ai/api/v1', auth:'bearer', docs:'https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties'},
]
export function connectionTemplate(draft) {
  const c=draft.custom
  if(draft.ui?.connectionMode==='custom')return undefined
  return CONNECTION_TEMPLATES.find(x=>x.baseUrl===c.baseUrl&&x.protocols.includes(c.protocol)&&x.auth===c.auth&&c.compatibility==='standard'&&c.catalogFormat==='auto')
}
export function templatePatch(template, role) {
  const protocol=template.id==='openai'&&role==='image'?'openai-images':template.protocols[0]
  return {ui:{baseUrlSource:'system',connectionMode:'template'}, custom:{protocol,baseUrl:template.baseUrl,auth:template.auth,compatibility:'standard',catalogFormat:'auto'}}
}
export function protocolPatch(draft, protocol) {
  const patch={protocol,auth:universalDefaultAuth(protocol)}
  // Equality alone is insufficient: a user may intentionally type the official URL.
  if(draft.ui?.baseUrlSource==='system') patch.baseUrl=UNIVERSAL_PROTOCOL_OPTIONS.find(x=>x[0]===protocol)[2]
  return {ui:{baseUrlSource:draft.ui?.baseUrlSource==='system'?'system':'user'},custom:patch}
}
export function restoreProtocolPatch(protocol) {
  return {ui:{baseUrlSource:'system',connectionMode:'template'},custom:{protocol,baseUrl:UNIVERSAL_PROTOCOL_OPTIONS.find(x=>x[0]===protocol)[2],auth:universalDefaultAuth(protocol),compatibility:'standard',catalogFormat:'auto'}}
}
export const capabilityLabels={text:'生成文字',vision:'接收图片并理解内容',imageGeneration:'生成图片',imageEditing:'直接编辑图片'}
export function allowedCapability(custom,key) {
  const textOnly=['openai-responses','anthropic-messages'].includes(custom.protocol)||custom.protocol==='openai-chat'&&custom.compatibility!=='openrouter-image'
  return ['text','vision'].includes(key)?custom.protocol!=='openai-images':!textOnly
}
export function incompatibleCapabilities(custom) {return Object.keys(capabilityLabels).filter(k=>custom.capabilities[k]&&!allowedCapability(custom,k))}
export function copyUniversalConnection(target, source, credential, includeKey=false) {
  const {protocol,baseUrl,auth,compatibility,catalogFormat}=source.custom
  const update=updateUniversalDraft(target,{declared:false,ui:{baseUrlSource:'user',connectionMode:source.ui?.connectionMode||'template'},custom:{protocol,baseUrl,auth,compatibility,catalogFormat}})
  const validKey=credential&&['protocol','baseUrl','auth'].every(k=>credential[k]===source.custom[k])
  return {...update, copiedKey:includeKey&&validKey?{...credential}:undefined}
}
export function catalogState(catalog,busy) {
  if(busy==='catalog') return '正在获取模型…'
  if(!catalog) return '尚未获取模型'
  if(catalog.error) return '获取失败'
  return {'catalog-visible':'模型目录已获取','catalog-partial':'目录不完整：已保留有效 ID','catalog-empty':'目录为空：未返回 ID，不代表型号不可用','catalog-invalid':'目录格式异常','unsupported':'当前连接未启用目录'}[catalog.state]||'获取失败'
}
export function catalogRecovery(error) {
  const code=error?.details?.catalogError?.code||error?.details?.failure?.code||(error?.name==='UniversalApiError'?error.code:undefined)
  const status=Number(error?.code)>=400&&Number(error?.code)<=599?Number(error.code):Number(error?.status)
  if(code==='CATALOG_AUTH_FAILED') return ['key','manual']
  if(code==='CATALOG_PERMISSION_DENIED') return ['manual','key']
  if(['CATALOG_ENDPOINT_NOT_FOUND','CATALOG_CONFIG_INVALID','CATALOG_UNSUPPORTED'].includes(code)||status===404) return ['address','catalog','manual']
  if(code==='CATALOG_RESPONSE_INVALID') return ['catalog','manual']
  if(code==='CATALOG_RATE_LIMITED'||status===429) return ['retry','manual']
  if(['CATALOG_TIMEOUT','CATALOG_NETWORK_ERROR','ENDPOINT_UNSAFE','DNS_RESOLUTION_FAILED'].includes(code)||[408,504].includes(status)||error?.name==='AbortError') return ['address','retry','manual']
  if(status===401&&!code) return ['login','manual']
  return ['address','manual']
}

// Read-only explanation of the exact shared effective limits; never relaxes them.
export function effectiveLimitSummary(policy, {inputImages, outputImages}) {
  const effective=effectiveUniversalLimits(policy)
  const mib=1024*1024
  const fields=[...(inputImages?[
    ['input','maxCount','输入图片','张',1],['input','maxBytes','输入单图','MiB',mib],
    ['input','maxTotalBytes','输入图片合计','MiB',mib],['input','maxDimension','输入单边','px',1],['input','maxPixels','输入像素','百万像素',1e6],
  ]:[]),['input','requestMaxBytes','完整请求','MiB',mib],...(outputImages?[
    ['output','maxBytes','输出单图','MiB',mib],['output','maxDimension','输出单边','px',1],['output','maxPixels','输出像素','百万像素',1e6],
  ]:[])]
  const rows=fields.map(([part,key,label,unit,divisor])=>{
    const value=effective[part==='input'?'inputLimits':'outputLimits'][key]
    const constraints=[['平台',UNIVERSAL_PLATFORM_LIMITS[key]],['服务方声明',policy.service?.[part]?.[key]],['用户',policy.user?.[part]?.[key]]]
    return {label,value:`${Number((value/divisor).toFixed(6))} ${unit}`,source:constraints.filter(([,limit])=>limit!=null&&limit===value).map(([name])=>name).join('、')}
  })
  for(const part of ['input','output']) if(part==='input'?inputImages:outputImages) {
    rows.push({label:part==='input'?'输入格式':'输出格式',value:effective[part==='input'?'inputLimits':'outputLimits'].mimeTypes.join('、'),source:'平台与各层已声明格式的交集'})
  }
  return rows
}
