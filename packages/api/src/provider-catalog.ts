import { enumerateArkCatalog, arkCatalogProgress, type ArkCatalogProgress, type CatalogCredentials } from './ark-catalog.js'
import details from './provider-model-details.js'

/** Read-only discovery. A catalog entry never grants permission to run inference. */
export type CatalogDefinition = { access: 'public' | 'key' | 'workspace' | 'control-plane' | 'documents'; url?: string; source: string; note?: string; parser?: string; auth?: string }
export const PROVIDER_CATALOGS: Record<string, CatalogDefinition> = {
  openrouter: { access:'public', url:'https://openrouter.ai/api/v1/models', source:'https://openrouter.ai/docs/api-reference/models/get-models', note:'文本与独立图像目录' },
  tokendance: { access:'public', url:'https://tokendance.space/gateway/v1/models', source:'https://tokendance.space/gateway/v1/models' },
  fal: { access:'public', url:'https://api.fal.ai/v1/models', parser:'fal', source:'https://fal.ai/docs/platform-apis/v1/models' },
  runware: { access:'public', url:'https://runware.ai/docs/models/index.json', parser:'runware', source:'https://runware.ai/docs/models-api/model-schemas', note:'托管模型实时目录；私有与社区模型可用账户目录搜索' },
  novita: { access:'public', url:'https://api.novita.ai/v3/openai/models', source:'https://novita.ai/docs/api-reference/model-apis-llm-list-models', note:'公开 LLM 目录；填写 API Key 可另读图像及私有模型目录' },
  openai: { access:'key', url:'https://api.openai.com/v1/models', source:'https://developers.openai.com/api/reference/resources/models/methods/list' },
  anthropic: { access:'key', url:'https://api.anthropic.com/v1/models', parser:'anthropic', auth:'anthropic', source:'https://platform.claude.com/docs/en/api/models/list' },
  gemini: { access:'key', url:'https://generativelanguage.googleapis.com/v1beta/models', parser:'gemini', auth:'google', source:'https://ai.google.dev/api/models' },
  deepseek: { access:'key', url:'https://api.deepseek.com/models', source:'https://api-docs.deepseek.com/api/list-models' },
  kimi: { access:'key', url:'https://api.moonshot.cn/v1/models', source:'https://platform.kimi.com/docs/api/list-models' },
  siliconflow: { access:'key', url:'https://api.siliconflow.cn/v1/models', source:'https://docs.siliconflow.com/en/api-reference/models/get-model-list' },
  mistral: { access:'key', url:'https://api.mistral.ai/v1/models', source:'https://docs.mistral.ai/api/endpoint/models' },
  together: { access:'key', url:'https://api.together.ai/v1/models', source:'https://docs.together.ai/reference/models' },
  fireworks: { access:'key', url:'https://api.fireworks.ai/v1/accounts/fireworks/models', parser:'fireworks', source:'https://docs.fireworks.ai/api-reference/list-models', note:'默认读取 fireworks 托管模型；填写账户 ID 可读取该账户模型' },
  xai: { access:'key', url:'https://api.x.ai/v1/models', source:'https://docs.x.ai/developers/rest-api-reference/inference/models' },
  minimax: { access:'key', url:'https://api.minimax.io/v1/models', source:'https://platform.minimax.io/docs/api-reference/models/openai/list-models' },
  stepfun: { access:'key', url:'https://api.stepfun.com/v1/models', source:'https://platform.stepfun.com/docs/zh/api-reference/models/list' },
  tokenhub: { access:'key', url:'https://tokenhub.tencentcloudmaas.com/v1/models', source:'https://cloud.tencent.com/document/product/1823/130078' },
  xiaomi: { access:'key', url:'https://api.xiaomimimo.com/v1/models', auth:'xiaomi', source:'https://mimo.mi.com/docs/en-US/api/model/list-models' },
  qianfan: { access:'key', url:'https://qianfan.baidubce.com/v2/models', source:'https://cloud.baidu.com/doc/qianfan-api/s/Dmba8k71y' },
  longcat: { access:'key', url:'https://api.longcat.chat/openai/v1/models', source:'https://longcat.chat/platform/docs/zh/api/models.html' },
  replicate: { access:'key', url:'https://api.replicate.com/v1/models', parser:'replicate', source:'https://replicate.com/docs/reference/http/#models.list' },
  bailian: { access:'workspace', parser:'bailian', source:'https://help.aliyun.com/zh/model-studio/list-models', note:'北京目录需要业务空间 ID；不会把中国区密钥发送到海外区域' },
  ark: { access:'control-plane', source:'https://docs.volcengine.com/docs/ark/list-foundation-models-api?lang=zh', note:'目录管理使用 AccessKey/SecretKey；推理 API Key 不能替代管理凭据' },
  sensenova: { access:'control-plane', url:'https://api.sensenova.cn/v1/llm/models', source:'https://console.sensecore.cn/micro/help/docs/model-as-a-service/nova/overview/Models/GetModelList/', note:'旧版目录需要 SenseCore JWT，不能套用 token.sensenova.cn 的推理密钥' },
  zhipu: { access:'documents', source:'https://docs.bigmodel.cn/llms.txt', note:'官方接口索引未列出模型目录 API，按具体型号文档核查' },
  recraft: { access:'documents', source:'https://www.recraft.ai/docs/llms.txt', note:'官方未提供已确认的模型枚举接口' },
  bfl: { access:'documents', source:'https://docs.bfl.ai/llms.txt', note:'按具体模型的生成与编辑接口核查，未确认目录 API' },
  stability: { access:'key', url:'https://api.stability.ai/v1/engines/list', parser:'engines', source:'https://platform.stability.ai/docs/api-reference#tag/v1generation', note:'此接口仅枚举 v1 引擎；v2 模型按各自文档保留' },
  ideogram: { access:'documents', source:'https://developer.ideogram.ai/api-reference/api-reference', note:'官方未提供已确认的模型枚举接口' },
  iflytek: { access:'documents', source:'https://www.xfyun.cn/doc/spark/Web.html', note:'按模型及独立服务接口核查，未确认统一目录 API' },
  antling: { access:'documents', source:'https://www.tbox.cn/', note:'未找到可用于现有接入凭据的官方模型枚举接口' },
}
export type CatalogContinuation = { ark?:ArkCatalogProgress; cursor?:string; nextUrl?:string; page?:number; offset?:number }
export type CatalogResult = { availabilityScope?:'public-hosted'|'public-llm'; confirmedAbsentIds?:string[]; continuation?:CatalogContinuation; retryAfterSeconds?:number; rawCount?:number; models: any[]; state: 'ready' | 'partial' | 'error' | 'needs-key' | 'needs-configuration' | 'documents'; pages: number; fetchedAt: string; sourceUrls: string[]; message: string }
const validLimit = (v: any) => Number.isSafeInteger(v) && v > 0 ? v : undefined
const list = (v: any) => Array.isArray(v) ? v : undefined
const modalities = (v: any) => list(v)?.filter(x => ['text','image','audio','video','file','document'].includes(x))
const unique = (v: any[]) => [...new Set(v)]
const detailModels: Record<string, any> = details.models
// These are schema fields, not a model-name classifier. Unknown properties keep
// the result partial; output metadata such as request IDs does not imply text output.
export function schemaModalities(schema:any, root:any, direction:'input'|'output'='input'):string[] {
  const found=new Set<string>(),seen=new Set<any>()
  const visit=(node:any,depth=0)=>{
    if(!node || typeof node!=='object' || depth>24 || seen.has(node))return
    seen.add(node)
    if(typeof node.$ref==='string' && node.$ref.startsWith('#/'))visit(node.$ref.slice(2).split('/').reduce((v:any,k:string)=>v?.[k],root),depth+1)
    for(const [key,value] of Object.entries(node.properties || {})){
      if((direction==='input' && /^(prompt|negative_prompt|system_prompt)$/.test(key)) || /^(text|texts|messages|caption|captions|transcript|transcription)$/.test(key))found.add('text')
      if(/^(image|images|image_url|image_urls|input_image|input_images|reference_image|reference_images|mask_url)$/.test(key))found.add('image')
      if(/^(audio|audios|audio_url|audio_urls|input_audio)$/.test(key))found.add('audio')
      if(/^(video|videos|video_url|video_urls|input_video)$/.test(key))found.add('video')
      visit(value,depth+1)
    }
    for(const key of ['allOf','anyOf','oneOf'])for(const value of node[key] || [])visit(value,depth+1)
    if(node.items)visit(node.items,depth+1)
  };visit(schema)
  return ['text','image','audio','video'].filter(v=>found.has(v))
}
/** A JSON Schema string maxLength is characters, never a token window. */
export function schemaPromptLimits(schema:any, root:any, kinds:string[], source:string) {
  const seen=new Set<any>(),limits=new Set<number>();let missing=false
  const visit=(node:any,depth=0)=>{
    if(!node || typeof node!=='object' || depth>24 || seen.has(node))return
    seen.add(node)
    if(typeof node.$ref==='string' && node.$ref.startsWith('#/'))visit(node.$ref.slice(2).split('/').reduce((v:any,k:string)=>v?.[k],root),depth+1)
    const prompt=node.properties?.prompt
    if(prompt){if(validLimit(prompt.maxLength))limits.add(prompt.maxLength);else missing=true}
    for(const key of ['allOf','anyOf','oneOf'])for(const value of node[key] || [])visit(value,depth+1)
  };visit(schema)
  // Conflicting or unbounded alternatives cannot establish one maximum.
  return !missing && limits.size===1 ? kinds.map(kind=>({kind,max:[...limits][0],unit:'characters',field:'prompt',sourceUrls:[source]})) : []
}
export function exactModelDetails(provider: string, id: string) {
  // No family-prefix matching or removal of snapshot/preview/pro suffixes.
  return detailModels[`${provider}/${id}`] || (id.startsWith('openai/') ? detailModels[id] : undefined)
}

export function normalizeCatalogModel(provider: string, row: any, source: string) {
  const def = PROVIDER_CATALOGS[provider]
  let id = row.id || row.endpoint_id || row.air || row.model || row.model_id || row.name
  if (provider === 'gemini') id = String(row.name || '').replace(/^models\//,'')
  if (provider === 'replicate') id = row.owner && row.name ? `${row.owner}/${row.name}` : ''
  if (provider === 'novita' && new URL(source).pathname === '/v3/model') id = row.sd_name_in_api || row.sd_name || (Number.isSafeInteger(row.id) ? `novita-model:${row.id}` : row.name)
  if (!id || typeof id !== 'string' || id.length > 512) return null
  const exact = exactModelDetails(provider, id)
  if (provider === 'runware' && exact?.apiIdentifier) id = exact.apiIdentifier
  const facts: any = { version:1, checkedAt:new Date().toISOString().slice(0,10), sourceUrls:[source] }
  if(provider==='novita' && new URL(source).pathname==='/v3/model')facts.sourceUrls.push('https://docs.novita.ai/api-reference/model-apis-get-model')
  let input = modalities(row.architecture?.input_modalities || row.input_modalities || row.inputModalities)
  let output = modalities(row.architecture?.output_modalities || row.output_modalities || row.outputModalities)
  let context = validLimit(row.context_length ?? row.contextLength ?? row.max_context_length ?? row.context_size)
  if (provider === 'anthropic') {
    facts.maxInputTokens = validLimit(row.max_input_tokens)
    facts.maxOutputTokens = validLimit(row.max_output_tokens)
    const vision = row.capabilities?.image_input?.supported ?? row.capabilities?.vision?.supported
    if (typeof vision === 'boolean') { input = vision ? ['text','image'] : ['text']; output = ['text'] }
  }
  if (provider === 'gemini') { facts.maxInputTokens=validLimit(row.inputTokenLimit); facts.maxOutputTokens=validLimit(row.outputTokenLimit) }
  if (provider === 'mistral' && row.capabilities) {
    if (row.capabilities.completion_chat === true) { input=row.capabilities.vision ? ['text','image'] : ['text']; output=['text'] }
  }
  if (provider === 'fireworks' && typeof row.supportsImageInput === 'boolean') { input=row.supportsImageInput ? ['text','image'] : ['text']; output=['text'] }
  if (provider === 'runware') {
    const caps=list(row.capabilities) || []
    input=exact?.specifications?.officialInputModalities || unique(caps.flatMap(x => /^(text|image|audio|video)-to-/.test(x) ? [x.split('-to-')[0]] : []))
    output=exact?.specifications?.officialOutputModalities || unique(caps.flatMap(x => /-to-(text|image|audio|video)$/.test(x) ? [x.split('-to-')[1]] : []))
    if (/^https:\/\/runware\.ai\/docs\/models\/[a-z0-9-]+\/schema\.json$/.test(row.schema || '')) facts.sourceUrls.push(row.schema)
  }
  if (provider === 'fal') {
    const category=String(row.metadata?.category || '')
    const match=/^(text|image|audio|video)-to-(text|image|audio|video)$/.exec(category)
    // A category is a lower bound, not an exhaustive list of accepted modalities.
    if (match) { input=[match[1]];output=[match[2]];facts.modalitiesComplete=false }
    const schema=row.openapi
    if(schema?.info?.['x-fal-metadata']?.endpointId===id){
      const inputSchema=schema.paths?.[`/${id}`]?.post?.requestBody?.content?.['application/json']?.schema
      const outputSchema=schema.paths?.[`/${id}/requests/{request_id}`]?.get?.responses?.['200']?.content?.['application/json']?.schema
      input=unique([...(input || []),...schemaModalities(inputSchema,schema)])
      output=unique([...(output || []),...schemaModalities(outputSchema,schema,'output')])
      const kinds=category==='text-to-image'?['generation']:category==='image-to-image'?['editing']:[]
      const promptLimits=schemaPromptLimits(inputSchema,schema,kinds,`https://fal.ai/models/${id}/api`)
      if(promptLimits.length)facts.promptLimits=promptLimits
    }
    facts.sourceUrls.push(`https://fal.ai/models/${id}/api`)
  }
  if(provider==='replicate' && row.latest_version?.openapi_schema){
    const schema=row.latest_version.openapi_schema
    input=unique([...(input || []),...schemaModalities(schema.components?.schemas?.Input,schema)])
    output=unique([...(output || []),...schemaModalities(schema.components?.schemas?.Output,schema,'output')])
    facts.modalitiesComplete=false
    facts.sourceUrls.push(`https://replicate.com/${id}/api/schema`)
  }
  if (provider === 'bailian') {
    const meta = row.inference_metadata || {}
    context=validLimit(row.model_info?.context_window ?? meta.context_length ?? row.context_length)
    facts.maxInputTokens=validLimit(row.model_info?.max_input_tokens)
    facts.maxOutputTokens=validLimit(row.model_info?.max_output_tokens)
    input=modalities(meta.request_modality?.map((x:string)=>x.toLowerCase()) || row.input_modalities)
    output=modalities(meta.response_modality?.map((x:string)=>x.toLowerCase()) || row.output_modalities)
  }
  if (input?.length) facts.officialInputModalities=input
  if (output?.length) facts.officialOutputModalities=output
  if (context) facts.contextWindowTokens=context
  // Live channel limits take precedence over a previously reviewed channel page.
  const specifications={...exact?.specifications,...facts,sourceUrls:unique([...(exact?.specifications?.sourceUrls || []),...facts.sourceUrls])}
  const shutdown = provider === 'openai' && typeof row.shutdown_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.shutdown_date) && Number.isFinite(Date.parse(row.shutdown_date)) ? row.shutdown_date : undefined
  return { id, ...(shutdown ? {expirationDate:shutdown,lifecycleSourceUrl:source} : {}), catalogAliases:unique([row.id,row.air,row.endpoint_id,...(Array.isArray(row.aliases)?row.aliases:[])].filter(Boolean)), label:row.display_name || row.displayName || row.metadata?.display_name || row.title || exact?.label || row.name || id,
    vendor:exact?.vendor || row.organization || row.owned_by || row.owner || row.provider || provider,
    vendorId:exact?.vendorId || row.organization || row.owned_by || row.owner || row.provider || provider,
    specifications, inputModalities:specifications.officialInputModalities || [], outputModalities:specifications.officialOutputModalities || [],
    catalogSourceUrl:source, officialSourceUrl:exact?.specifications?.sourceUrls?.[0] || def.source, catalogDiscovered:true }
}

export function mergeCatalogRows(rows:any[]) {
  const merged=new Map<string,any>()
  for(const row of rows){
    const previous=merged.get(row.id)
    if(!previous){merged.set(row.id,row);continue}
    const a=previous.specifications || {},b=row.specifications || {}
    const contextConflict=a.contextWindowTokens && b.contextWindowTokens && a.contextWindowTokens!==b.contextWindowTokens
    merged.set(row.id,{...previous,...row,catalogAliases:unique([...(previous.catalogAliases || []),...(row.catalogAliases || [])]),specifications:{...a,...b,
      sourceUrls:unique([...(a.sourceUrls || []),...(b.sourceUrls || [])]),
      officialInputModalities:unique([...(a.officialInputModalities || []),...(b.officialInputModalities || [])]),
      officialOutputModalities:unique([...(a.officialOutputModalities || []),...(b.officialOutputModalities || [])]),
      ...(contextConflict?{contextWindowTokens:undefined,contextWindowStatus:undefined,notes:['同一调用 ID 的目录规格存在冲突，待核对']}:{}),
    }})
  }
  return [...merged.values()]
}

/** Search cursors are positions, not snapshots. Confirm missing fal IDs using
 * the documented exact-ID lookup before treating a completed browse as absence. */
export async function verifyPublicCatalogOmissions(provider:string, catalog:CatalogResult, knownIds:string[], fetcher:typeof fetch = fetch):Promise<CatalogResult> {
  if(provider !== 'fal' || catalog.state !== 'ready' || catalog.continuation || !catalog.models.length)return catalog
  const present=new Set(catalog.models.flatMap(row=>[row.id,...(row.catalogAliases || [])]))
  const missing=unique(knownIds).filter(id=>!present.has(id))
  if(!missing.length)return {...catalog,confirmedAbsentIds:[]}
  const recovered:any[]=[],absent:string[]=[],sources=[...catalog.sourceUrls]
  const signal=AbortSignal.timeout(25_000)
  try {
    for(let i=0;i<missing.length;i+=50){
      const ids=missing.slice(i,i+50),url=new URL(PROVIDER_CATALOGS.fal.url!)
      for(const id of ids)url.searchParams.append('endpoint_id',id)
      sources.push(String(url))
      const data=await readJson(fetcher,String(url),{method:'GET',headers:{Accept:'application/json'}},signal)
      if(!Array.isArray(data.models) || data.has_more || data.next_cursor)throw new Error('精确型号查询未完整')
      const rows=data.models.map((row:any)=>normalizeCatalogModel('fal',row,String(url)))
      if(rows.some((row:any)=>!row || !ids.includes(row.id)))throw new Error('精确型号查询不匹配')
      const found=new Set(rows.map((row:any)=>row.id));recovered.push(...rows)
      absent.push(...ids.filter(id=>!found.has(id)))
    }
    return {...catalog,models:mergeCatalogRows([...catalog.models,...recovered]),confirmedAbsentIds:absent,sourceUrls:unique(sources)}
  }catch(error){
    // A failed lookup, including 401/404/429, never proves every requested ID gone.
    return {...catalog,state:'partial',retryAfterSeconds:(error as CatalogReadError)?.retryAfterSeconds,models:mergeCatalogRows([...catalog.models,...recovered]),confirmedAbsentIds:[],sourceUrls:unique(sources),message:'列表已读取，缺项的单型号核查未完成；保留原可选状态，稍后重试'}
  }
}

/** Only complete PUBLIC scopes can quarantine absent selections. An account,
 * region, private-model search or v1-only index cannot retire a whole channel. */
export function catalogAbsenceReason(provider:string, model:{id:string;protocol?:string}, catalog:CatalogResult):string | undefined {
  if(catalog.state!=='ready' || catalog.continuation || !catalog.models.length || !catalog.availabilityScope)return
  const present=catalog.models.some(row=>row.id===model.id || row.catalogAliases?.includes(model.id))
  if(present)return
  const covered=provider==='fal' ? catalog.confirmedAbsentIds?.includes(model.id)
    : provider==='runware' ? catalog.availabilityScope==='public-hosted'
    : provider==='novita' && model.protocol==='openai-chat-completions' && catalog.sourceUrls.includes(PROVIDER_CATALOGS.novita.source)
  if(covered)return '当前渠道的完整公开目录已不再提供此精确型号，已暂停选择与调用；原配置保留，请选择其他型号。'
}
class CatalogReadError extends Error { retryAfterSeconds?:number }
async function readJson(fetcher: typeof fetch, url: string, init: RequestInit, signal: AbortSignal) {
  const response=await fetcher(url,{...init,signal,redirect:'error'})
  if (!response.ok) {const error=new CatalogReadError([401,403].includes(response.status) ? '目录认证失败，请检查所选渠道的凭据和权限' : `目录接口返回 HTTP ${response.status}`);if(response.status===429)error.retryAfterSeconds=Math.min(600,Math.max(1,Number(response.headers.get('retry-after')) || 60));throw error}
  // Bound before parsing; neither credentials nor upstream error bodies are returned.
  const reader=response.body?.getReader()
  if (!reader) return await response.json()
  let size=0;const chunks:Uint8Array[]=[]
  try { while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16_000_000)throw new Error('目录响应超过读取上限');chunks.push(part.value)} }
  finally {await reader.cancel().catch(()=>{});reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  return JSON.parse(new TextDecoder().decode(bytes))
}

/** Credentials are scoped to a single fixed official origin; no account cache. */
export async function readProviderCatalog(provider: string, options: { fetcher?: typeof fetch; apiKey?: string; region?: string; workspaceId?: string; privateModels?: boolean; catalogCredentials?: CatalogCredentials; continuation?:CatalogContinuation; maxPages?: number; timeoutMs?: number } = {}): Promise<CatalogResult> {
  const def=PROVIDER_CATALOGS[provider]
  if (!def) throw new Error('Unknown catalog provider')
  const availabilityScope = !options.privateModels && ['fal','runware'].includes(provider) ? 'public-hosted' as const : provider==='novita' && !options.privateModels ? 'public-llm' as const : undefined
  const base:CatalogResult={availabilityScope,models:[],state:'ready',pages:0,fetchedAt:new Date().toISOString(),sourceUrls:[def.source],message:''}
  if (def.access==='documents') return {...base,state:'documents',message:def.note || '请查阅具体模型文档'}
  if (provider==='ark') {
    const credentials=options.catalogCredentials || {}
    if(!credentials.accessKeyId || !credentials.secretAccessKey)return {...base,state:'needs-configuration',message:def.note || '需要管理凭据'}
    const found=new Map<string,any>();const signal=AbortSignal.timeout(options.timeoutMs || 45_000)
    let progress:ArkCatalogProgress
    try{progress=arkCatalogProgress(options.continuation?.ark)}catch{return {...base,state:'error',message:'无效的 Ark 目录分页位置'}}
    try {
      await enumerateArkCatalog(credentials,(url,init)=>readJson(options.fetcher || fetch,url,init,signal),(row,source)=>{
        const model=normalizeCatalogModel(provider,row,source);if(model)found.set(model.id,model)
      },progress,()=>{base.pages++})
      return {...base,models:[...found.values()],state:progress.phase==='done'?'ready':'partial',...(progress.phase!=='done'?{continuation:{ark:progress}}:{}),message:`已读取 ${found.size} 个基础型号、版本或接入点${progress.phase==='done'?'':'，继续读取剩余分页'}`}
    }catch{return {...base,state:found.size?'partial':'error',continuation:{ark:progress},models:[...found.values()],message:signal.aborted?'Ark 目录读取超时，结果未完整':'Ark 目录读取失败，请检查管理凭据和只读权限'}}
  }
  if (provider==='sensenova' && !options.catalogCredentials?.token) return {...base,state:'needs-configuration',message:def.note || '需要目录凭据'}
  const apiKey=String(provider==='sensenova' ? options.catalogCredentials?.token || '' : options.apiKey || '').trim()
  if ((def.access==='key' || def.access==='workspace' || options.privateModels) && !apiKey) return {...base,state:'needs-key',message:'填写此渠道的 API Key 后读取账户目录'}
  let endpoint=def.url || ''
  if(provider==='minimax' && options.region==='cn') {endpoint='https://api.minimax.cn/v1/models';base.sourceUrls=['https://platform.minimaxi.com/docs/api-reference/models/openai/list-models']}
  if(provider==='bailian') {
    // Current Tuyan Bailian inference route is Beijing; do not cross regions.
    if(!/^[a-zA-Z0-9-]{1,64}$/.test(options.workspaceId || ''))return {...base,state:'needs-configuration',message:'请输入北京业务空间 ID 以读取百炼目录'}
    endpoint=`https://${options.workspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/models`
  }
  if(provider==='fireworks' && options.workspaceId){
    if(!/^[a-zA-Z0-9-]{1,64}$/.test(options.workspaceId))return {...base,state:'needs-configuration',message:'请输入有效的 Fireworks 账户 ID'}
    endpoint=`https://api.fireworks.ai/v1/accounts/${options.workspaceId}/models`
  }
  const privateRunware=provider==='runware' && options.privateModels===true
  const privateNovita=provider==='novita' && options.privateModels===true
  if(privateRunware)endpoint='https://api.runware.ai/v1'
  if(privateNovita){endpoint='https://api.novita.ai/v3/model';base.sourceUrls=['https://docs.novita.ai/api-reference/model-apis-get-model']}
  const origin=new URL(endpoint).origin
  const headers:Record<string,string>={Accept:'application/json'}
  if(apiKey){
    if(def.auth==='anthropic'){headers['x-api-key']=apiKey;headers['anthropic-version']='2023-06-01'}
    else if(def.auth==='google')headers['x-goog-api-key']=apiKey
    else if(def.auth==='xiaomi')headers['api-key']=apiKey
    else headers.Authorization=`${provider==='fal'?'Key':'Bearer'} ${apiKey}`
  }
  const signal=AbortSignal.timeout(options.timeoutMs || 25_000)
  const seenPages=new Set<string>();const found=new Map<string,any>()
  let cursor=String(options.continuation?.cursor || '');let page=Number(options.continuation?.page || 1);let offset=Number(options.continuation?.offset || 0);let next=String(options.continuation?.nextUrl || '');let more=false
  if(cursor.length>8192 || next.length>8192 || !Number.isSafeInteger(page) || page<1 || !Number.isSafeInteger(offset) || offset<0)return {...base,state:'error',message:'无效目录分页位置'}
  try {
    do {
      if(base.pages >= (options.maxPages || 100))throw new Error('目录分页尚未全部读取，请重试')
      const url=new URL(provider==='xai' ? `https://api.x.ai/v1/${['models','language-models','image-generation-models','video-generation-models'][page-1] || 'models'}` : next || endpoint)
      // Never follow a provider-controlled redirect/cursor to another credential destination.
      if(url.origin!==origin || url.username || url.password || (next && url.pathname!==new URL(endpoint).pathname))throw new Error('目录分页地址不合法')
      if(provider==='fal'){url.searchParams.set('limit','10');url.searchParams.set('expand','openapi-3.0');if(cursor)url.searchParams.set('cursor',cursor)}
      if(provider==='anthropic'){url.searchParams.set('limit','100');if(cursor)url.searchParams.set('after_id',cursor)}
      if(provider==='gemini'){url.searchParams.set('pageSize','1000');if(cursor)url.searchParams.set('pageToken',cursor)}
      if(provider==='fireworks'){url.searchParams.set('pageSize','200');if(cursor)url.searchParams.set('pageToken',cursor)}
      if(provider==='bailian'){url.searchParams.set('page_no',String(page));url.searchParams.set('page_size','20')}
      if(privateNovita){url.searchParams.set('pagination.limit','100');if(cursor)url.searchParams.set('pagination.cursor',cursor);headers['Content-Type']='application/json'}
      const pageIdentity=privateRunware?`${url}#${offset}`:String(url)
      if(seenPages.has(pageIdentity))throw new Error('目录分页游标重复，未将不完整结果标为完整')
      seenPages.add(pageIdentity)
      const init:RequestInit={method:'GET',headers}
      if(privateRunware){init.method='POST';headers['Content-Type']='application/json';init.body=JSON.stringify([{taskType:'modelSearch',taskUUID:crypto.randomUUID(),limit:100,offset}])}
      const data=await readJson(options.fetcher || fetch,String(url),init,signal)
      const rows=privateRunware?data.data?.[0]?.results:provider==='runware'?data:privateNovita||provider==='fal'?data.models:provider==='replicate'?data.results:provider==='bailian'?data.output?.models:provider==='gemini'||provider==='fireworks'||(provider==='xai' && page>1)?data.models:Array.isArray(data)?data:data.data
      if(!Array.isArray(rows))throw new Error('目录返回格式不符合官方接口契约')
      base.pages++
      for(const row of rows){const normalized=normalizeCatalogModel(provider,row,String(url).split('?')[0]);if(!normalized)throw new Error('目录包含缺少有效 ID 的条目，未将结果标为完整');found.set(normalized.id,mergeCatalogRows([...(found.has(normalized.id)?[found.get(normalized.id)]:[]),normalized])[0])}
      cursor=String((privateNovita?data.pagination?.next_cursor:'') || data.next_cursor || data.nextPageToken || (data.has_more ? data.last_id : '') || '')
      next=provider==='replicate' && typeof data.next==='string'?data.next:''
      offset+=rows.length;page++
      more=provider==='xai'?page<=4:privateRunware?offset<Number(data.data?.[0]?.totalResults || 0):provider==='bailian'?offset<Number(data.output?.total || 0):Boolean(next || cursor || data.has_more)
      if(more && (!rows.length || (!privateRunware && provider!=='bailian' && provider!=='xai' && !next && !cursor)))throw new Error('目录分页缺少后续游标')
    } while(more)
    base.models=[...found.values()];base.rawCount=offset;base.message=`在线目录已读取 ${base.models.length} 个型号（${base.pages} 页）`
    return base
  }catch(error:any){return {...base,models:[...found.values()],rawCount:offset,continuation:{cursor,nextUrl:next,page,offset},retryAfterSeconds:error instanceof CatalogReadError?error.retryAfterSeconds:undefined,state:base.pages?'partial':'error',message:signal.aborted?'目录读取超时，结果未完整':error instanceof SyntaxError?'目录响应不是有效 JSON':String(error?.message || '目录读取失败').replace(/https?:\/\/\S+/g,'[目录地址]').slice(0,160)}}
}

/** Local read-only server uses the same closed set of metadata destinations. */
export function isCatalogRequestAllowed(value: string, init: RequestInit = {}) {
  let url:URL
  try {url=new URL(value)}catch{return false}
  if(url.username || url.password || url.protocol!=='https:')return false
  const method=String(init.method || 'GET').toUpperCase()
  if(method==='POST') {
    if(url.origin==='https://ark.cn-beijing.volcengineapi.com' && url.pathname==='/' && ['ListFoundationModels','ListFoundationModelVersions','ListEndpoints'].includes(url.searchParams.get('Action') || '') && url.searchParams.get('Version')==='2024-01-01' && [...url.searchParams.keys()].every(key=>['Action','Version'].includes(key))) {
      try {const body=JSON.parse(String(init.body));return Object.keys(body).every(key=>['PageNumber','PageSize','FoundationModelName'].includes(key))}catch{return false}
    }
    if(url.href!=='https://api.runware.ai/v1')return false
    try {const body=JSON.parse(String(init.body));return Array.isArray(body) && body.length===1 && body[0].taskType==='modelSearch' && Object.keys(body[0]).every(key=>['taskType','taskUUID','limit','offset'].includes(key))}catch{return false}
  }
  if(method!=='GET')return false
  const allowed=Object.values(PROVIDER_CATALOGS).some(def=>def.url && new URL(def.url).origin===url.origin && new URL(def.url).pathname===url.pathname)
    || (url.origin==='https://api.x.ai' && ['/v1/language-models','/v1/image-generation-models','/v1/video-generation-models'].includes(url.pathname))
    || (url.origin==='https://api.minimax.cn' && url.pathname==='/v1/models')
    || (url.origin==='https://api.novita.ai' && url.pathname==='/v3/model')
    || (url.origin==='https://api.fireworks.ai' && /^\/v1\/accounts\/[a-zA-Z0-9-]{1,64}\/models$/.test(url.pathname))
    || (/^[a-zA-Z0-9-]{1,64}\.cn-beijing\.maas\.aliyuncs\.com$/.test(url.hostname) && url.pathname==='/api/v1/models')
  return allowed && [...url.searchParams.keys()].every(key=>['limit','cursor','expand','after_id','pageSize','pageToken','page_no','page_size','pagination.limit','pagination.cursor',...(url.origin==='https://api.fal.ai'?['endpoint_id']:[])].includes(key))
}
