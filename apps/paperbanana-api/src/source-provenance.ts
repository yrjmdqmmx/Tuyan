import {createHash} from 'node:crypto'
import {getFigureType} from '../../../packages/figure-taxonomy/src/index.js'

export const SOURCE_PROTOCOL_VERSION=2 as const
// Prompt descriptors are durable call identities. Never default an older
// snapshot to this revision: changing prompts must not replay accepted calls.
export const SOURCE_PROMPT_REVISION=1 as const
export type SourceDiagnostic={path:string;expected:string;actualType:string;observedPath?:string}
type Field='methodology'|'visualIntent'|'avoid'
export type SourceEntry={id:string;sourceField:Field;start:number;end:number;text:string;sha256:string}
export type SourceCatalog={protocolVersion:2;catalogVersion:1;scope:string;originalHash:string;catalogHash:string;offsetUnit:'utf16';entries:SourceEntry[]}
export type SourceProtocolSnapshot={protocolVersion:2;catalogVersion:1;promptRevision:typeof SOURCE_PROMPT_REVISION;scope:string;originalHash:string;catalogs:Array<{scope:string;originalHash:string;catalogHash:string}>}
const sha=(s:string)=>createHash('sha256').update(s).digest('hex')
export const sourceProtocolError=(message:string,diagnostic?:SourceDiagnostic)=>Object.assign(new Error('SOURCE_PROTOCOL_INVALID: '+message),diagnostic?{sourceDiagnostic:diagnostic}:{})
const fail=(message:string,diagnostic?:SourceDiagnostic):never=>{throw sourceProtocolError(message,diagnostic)}
export const sourceValueType=(value:unknown)=>value===undefined?'missing':value===null?'null':Array.isArray(value)?'array':typeof value
export const sourceScope=(jobId:string,panelIndex?:number)=>panelIndex===undefined?`job:${jobId}`:`job:${jobId}/panel:${panelIndex}`
export function originalSourceFields(body:Record<string,any>):Record<Field,string>{const b=body.generationContext||body;return {methodology:b.methodContent||'',visualIntent:b.caption||'',avoid:b.negativePrompt||''}}
const catalogDigest=(c:Omit<SourceCatalog,'catalogHash'>)=>sha(JSON.stringify(c))
export function buildSourceCatalog(body:Record<string,any>,scope:string):SourceCatalog {
 const fields=originalSourceFields(body),entries:SourceEntry[]=[]
 if(!scope||Object.values(fields).some(s=>typeof s!=='string'))fail('invalid source fields or scope')
 for(const [field,text] of Object.entries(fields) as Array<[Field,string]>){
  if(!text.trim())continue
  const add=(start:number,end:number)=>{while(start<end&&/\s/u.test(text[start]))start++;while(end>start&&/\s/u.test(text[end-1]))end--;if(start===end||entries.some(e=>e.sourceField===field&&e.start===start&&e.end===end))return;const slice=text.slice(start,end);entries.push({id:`${field}:${start}-${end}`,sourceField:field,start,end,text:slice,sha256:sha(slice)})}
  // Whole-field provenance remains available for clauses whose meaning spans
  // sentences. Smaller exact slices reduce transcription, not semantic work.
  add(0,text.length);let start=0
  for(const m of text.matchAll(/[;；。！？!?\n]|\.(?=\s|$)/gu)){const end=m.index!+m[0].length;add(start,end);start=end}add(start,text.length)
 }
 const base={protocolVersion:2 as const,catalogVersion:1 as const,scope,originalHash:sha(JSON.stringify(fields)),offsetUnit:'utf16' as const,entries}
 if(entries.length>512||Buffer.byteLength(JSON.stringify(base))>256*1024)fail('catalog exceeds supported size; original input was not truncated')
 return {...base,catalogHash:catalogDigest(base)}
}
function assertCatalog(c:SourceCatalog){
 const {catalogHash,...base}=c
 if(c.protocolVersion!==2||c.catalogVersion!==1||c.offsetUnit!=='utf16'||catalogHash!==catalogDigest(base)||new Set(c.entries.map(e=>e.id)).size!==c.entries.length||c.entries.some(e=>e.sha256!==sha(e.text)||e.end-e.start!==e.text.length))fail('catalog integrity mismatch')
}
export function validateSourceCatalog(catalog:SourceCatalog,body:Record<string,any>,scope:string){assertCatalog(catalog);if(JSON.stringify(catalog)!==JSON.stringify(buildSourceCatalog(body,scope)))fail('catalog does not match original snapshot');return catalog}

/** Native JSON syntax validation plus duplicate decoded-key rejection. No
 * overwritten value can disappear before semantic/schema validation. */
export function strictSourceJson(raw:string):any {
 const text=raw.trim().replace(/^```(?:json)?\s*|\s*```$/g,'');let value:any
 try{value=JSON.parse(text)}catch{fail('invalid JSON')}
 const tokens=text.match(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]:,]|true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g)||[];let i=0
 const walk=(depth=0)=>{if(depth>64)fail('JSON nesting exceeds supported depth');const token=tokens[i++];if(token==='{'){const seen=new Set<string>();while(tokens[i]!=='}'){const key=JSON.parse(tokens[i++]);if(seen.has(key))fail('duplicate JSON object key');seen.add(key);i++;walk(depth+1);if(tokens[i]===',')i++;else break}i++}else if(token==='['){while(tokens[i]!==']'){walk(depth+1);if(tokens[i]===',')i++;else break}i++}}
 walk();return value
}
export function sourceEntry(catalog:SourceCatalog,ref:unknown,fields:Field[]=['methodology','visualIntent','avoid']):SourceEntry {
 const e=typeof ref==='string'?catalog.entries.find(e=>e.id===ref):undefined
 if(!e)return fail('unknown sourceRef');if(!fields.includes(e.sourceField))fail('sourceRef is outside allowed original fields');return e
}
export function assertSourceHeader(data:any,catalog:SourceCatalog){assertCatalog(catalog);if(data?.sourceProtocolVersion!==2)fail('sourceProtocolVersion 2 required',{path:'$.sourceProtocolVersion',expected:'literal 2 at the response root, alongside rendererAudit (not inside it)',actualType:sourceValueType(data?.sourceProtocolVersion),...(data?.rendererAudit?.sourceProtocolVersion!==undefined?{observedPath:'$.rendererAudit.sourceProtocolVersion'}:{})});if(data.sourceCatalogHash!==catalog.catalogHash)fail('source catalog hash mismatch',{path:'$.sourceCatalogHash',expected:'current sourceCatalog.catalogHash at the response root',actualType:sourceValueType(data?.sourceCatalogHash),...(data?.rendererAudit?.sourceCatalogHash!==undefined?{observedPath:'$.rendererAudit.sourceCatalogHash'}:{})})}
export const sourceReferencePrompt=()=>`\nSOURCE REFERENCE PROTOCOL v2: copy sourceProtocolVersion:2 and sourceCatalogHash from sourceCatalog into the root response. In each provenance item choose exactly one sourceRef ID from the current sourceCatalog. Do NOT reproduce sourceQuote or sourceField in v2 items. Only original methodology, visualIntent and avoid are indexed; renderer/spec/plan metadata is not original evidence. A ref proves exact provenance only: independently interpret the FULL original input and inspect the actual output. Never invent an ID, quote, source field, instance or requirement. Never use a different task/panel catalog. Findings and uncertainties remain mandatory and must not be erased to fit this protocol.`
export const sourceReferenceReviewPrompt=sourceReferencePrompt

export function resolveReviewSourceRefs(raw:string,catalog:SourceCatalog,topology?:{nodes:Array<{id:string;label:string}>}) {
 const data=strictSourceJson(raw)
 const items=[...(Array.isArray(data?.topologyAudit?.originalRequiredNodes)?data.topologyAudit.originalRequiredNodes:[]),...(Array.isArray(data?.topologyAudit?.originalRequiredRelations)?data.topologyAudit.originalRequiredRelations:[]),...(Array.isArray(data?.rendererAudit?.originalRequirements)?data.rendererAudit.originalRequirements:[])]
 if(data?.sourceProtocolVersion===undefined&&data?.sourceCatalogHash===undefined&&!items.some(r=>r&&Object.hasOwn(r,'sourceRef')))return {resolvedRaw:raw,mode:'legacy_quote' as const,trace:[]}
 assertSourceHeader(data,catalog)
 const resolved=structuredClone(data),trace:Array<{path:string;sourceRef:string;sourceField:Field;start:number;end:number;sha256:string}>=[]
 const map=(rows:any,kind:'node'|'relation'|'renderer',path:string)=>{if(!Array.isArray(rows))return rows;return rows.map((row:any,index:number)=>{
  const allowed=kind==='node'?['nodeId','label','sourceRef']:kind==='relation'?['source','target','label','sourceRef']:['sourceRef','requirement','verdict','evidence']
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!allowed.includes(k)))fail('mixed or unknown provenance fields')
  const e=sourceEntry(catalog,row.sourceRef,kind==='renderer'?undefined:['methodology','visualIntent'])
  if(kind==='node'&&typeof row.label==='string'&&row.label&&!e.text.includes(row.label))fail('node reference does not contain exact label')
  // Unknown required node IDs still reach the existing strict audit and remain
  // in raw evidence; source indexing cannot manufacture a missing graph node.
  const {sourceRef,...rest}=row;trace.push({path:`${path}[${index}]`,sourceRef,sourceField:e.sourceField,start:e.start,end:e.end,sha256:e.sha256})
  return {...rest,...(kind==='renderer'?{sourceField:e.sourceField}:{}),sourceQuote:e.text}
 })}
 if(resolved.topologyAudit){resolved.topologyAudit.originalRequiredNodes=map(resolved.topologyAudit.originalRequiredNodes,'node','topologyAudit.originalRequiredNodes');resolved.topologyAudit.originalRequiredRelations=map(resolved.topologyAudit.originalRequiredRelations,'relation','topologyAudit.originalRequiredRelations')}
 if(resolved.rendererAudit)resolved.rendererAudit.originalRequirements=map(resolved.rendererAudit.originalRequirements,'renderer','rendererAudit.originalRequirements')
 return {resolvedRaw:JSON.stringify(resolved),mode:'source_ref' as const,trace}
}

// Version-pinned native exceptions match the current selectable SVG registry;
// the registry parity test must change together with any future route migration.
export function usesSourceProtocol(body:Record<string,any>){if(body.generationPath==='model-v1')return false;const type=getFigureType(body.figureTypeId),image=body.modelRoutes?.image,native=image?.accessProvider==='recraft'&&['recraftv2_vector','recraftv3_vector','recraftv4_vector','recraftv4_pro_vector','recraftv4_1_vector','recraftv4_1_pro_vector','recraftv4_1_utility_vector','recraftv4_1_utility_pro_vector'].includes(image.modelId);return type?.kind==='data'||type?.kind==='composite'||body.outputFormat==='svg'&&['workflow','state_transition'].includes(body.figureTypeId)&&!native}
export function sourcePanelBody(body:Record<string,any>,panel:Record<string,any>){return {...body,...panel,generationContext:undefined,figurePanels:undefined,methodContent:panel.methodContent||body.methodContent,caption:panel.caption||body.caption}}
export function buildSourceProtocolSnapshot(body:Record<string,any>,jobId:string):SourceProtocolSnapshot|undefined {
 if(!usesSourceProtocol(body))return
 const root=buildSourceCatalog(body,sourceScope(jobId)),catalogs=[root,...(body.figurePanels||[]).map((p:any,i:number)=>buildSourceCatalog(sourcePanelBody(body,p),sourceScope(jobId,i+1)))].map(({scope,originalHash,catalogHash})=>({scope,originalHash,catalogHash}))
 return {protocolVersion:2,catalogVersion:1,promptRevision:SOURCE_PROMPT_REVISION,scope:sourceScope(jobId),originalHash:sha(JSON.stringify(catalogs)),catalogs}
}
export function sourceProtocolMismatch(task:{kind:string;body:any;jobId:string;sourceProtocol?:SourceProtocolSnapshot}) {
 if(task.kind!=='create'||!usesSourceProtocol(task.body))return false
 return JSON.stringify(task.sourceProtocol)!==JSON.stringify(buildSourceProtocolSnapshot(task.body,task.jobId))
}

export function assertSourceProtocolTask(task:{kind:string;body:any;jobId:string;sourceProtocol?:SourceProtocolSnapshot}) { if(sourceProtocolMismatch(task))throw Object.assign(new Error('原任务来源协议版本或原文快照不匹配，成功调用已保留；为避免重复付费，未发起新的模型请求，不能自动跨版本恢复。'),{name:'SourceProtocolVersionError',localInputFailure:true,requestState:'not_sent',recoveryAction:'review_request'}) }
