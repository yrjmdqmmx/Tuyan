/** Eligibility only. These helpers never repair data or certify a review. Call
 * only after a complete model response failed local protocol validation. */
import type {SourceDiagnostic} from './source-provenance.js'
export type ProtocolCorrection={kind:'topology_schema'|'review_schema';code:string;error:string;diagnostic?:SourceDiagnostic}
const diagnostic=(error:unknown)=>error instanceof Error&&(error as any).sourceDiagnostic?{diagnostic:(error as any).sourceDiagnostic as SourceDiagnostic}:{}
const parse=(raw:string)=>{try{return JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g,''))}catch{return undefined}}
const message=(error:unknown)=>error instanceof Error?error.message:String(error)
const reported=(value:any)=>Array.isArray(value)?value.length>0:typeof value==='string'?Boolean(value.trim()):value&&typeof value==='object'?Object.keys(value).length>0:Boolean(value)
export function topologyProtocolCorrection(raw:string,error:unknown):ProtocolCorrection|undefined {
 const data=parse(raw),detail=message(error),prefix='DIAGRAM_TOPOLOGY_INVALID: '
 if(!detail.startsWith(prefix)&&!detail.startsWith('SOURCE_PROTOCOL_INVALID: '))return
 // An explicitly reported uncertainty is never a formatting invitation.
 if(data?.uncertainties && (!Array.isArray(data.uncertainties)||data.uncertainties.length))return
 const sourceReason=detail.replace(/^SOURCE_PROTOCOL_INVALID: /,''),sourceCodes:Record<string,string>={'invalid JSON':'source_json','topology schemaVersion 2 required':'source_envelope','sourceProtocolVersion 2 required':'source_envelope','invalid topology v2 envelope':'source_envelope','invalid named node fields; distinct same-name instances require explicit disambiguated source names':'source_node_fields','invalid anonymous initial fields':'source_initial_fields','unknown or invalid named endpoint':'source_endpoint','invalid edge provenance fields':'source_edge_fields','unknown sourceRef':'source_ref'}
 if(detail.startsWith('SOURCE_PROTOCOL_INVALID: '))return sourceCodes[sourceReason]?{kind:'topology_schema',code:sourceCodes[sourceReason],error:detail,...diagnostic(error)}:undefined
 const reason=detail.slice(prefix.length),allowed:Record<string,string>={
  'expected topology JSON; no freehand SVG fallback':'json',
  'schemaVersion, nodes, edges and uncertainties required':'envelope',
  'invalid node':'node_fields',
  'terminal shape and role must agree':'node_shape_role',
  'initial pseudostate must have initial role and empty label':'initial_fields',
  'anonymous initial marker needs explicit original source and marker evidence; preserve named starts':'initial_evidence',
  'initialEvidence applies only to explicitly unnamed initial marker':'initial_evidence_scope',
  'duplicate node IDs':'duplicate_node_ids',
  'duplicate named nodes require explicit disambiguation in original input':'duplicate_named_nodes',
  'invalid edge or sourceQuote absent from original input':'edge_fields_or_quote',
  'duplicate edge IDs':'duplicate_edge_ids',
  'duplicate identical relations':'duplicate_relations',
 }
 // Capacity, invented names, unconnected nodes and terminal/initial relation
 // conflicts are intentionally absent. Compile/layout errors are not parse errors.
 return allowed[reason]?{kind:'topology_schema',code:allowed[reason],error:detail}:undefined
}

export function reviewProtocolCorrection(raw:string,error:unknown,topology?:{nodes:Array<{id:string;label:string}>;edges?:Array<{id:string;source:string;target:string;label:string}>}):ProtocolCorrection|undefined {
 const data=parse(raw),detail=message(error),audit=data?.topologyAudit
 if(data){
  if(reported(data.uncertainties)||reported(data.problems))return
  if(['visual','code'].some(k=>data[k]?.status==='issues_found'||reported(data[k]?.findings)))return
  if(['missingRelations','extraRelations','wrongRelations','nodeIssues'].some(k=>reported(audit?.[k])))return
  if(reported(data.critic_suggestions)&&(typeof data.revised_description!=='string'||!/^(no changes needed\.?|无需修改)$/i.test(data.revised_description.trim())))return
  if(Array.isArray(data.rendererAudit?.originalRequirements)&&data.rendererAudit.originalRequirements.some((r:any)=>['unmet','unsupported','uncertain'].includes(r?.verdict)))return
  // Do not explain away a missing/renamed required node as malformed provenance.
  if(topology&&Array.isArray(audit?.originalRequiredNodes)&&(audit.originalRequiredNodes.length!==topology.nodes.length||new Set(audit.originalRequiredNodes.map((n:any)=>n?.nodeId)).size!==topology.nodes.length||audit.originalRequiredNodes.some((n:any)=>!topology.nodes.some(t=>t.id===n?.nodeId&&t.label===n?.label))))return
  if(topology?.edges){
   const key=(r:any)=>JSON.stringify([r?.source,r?.target,r?.label]),expected=topology.edges.map(key)
   if(Array.isArray(audit?.originalRequiredRelations)&&(audit.originalRequiredRelations.length!==expected.length||new Set(audit.originalRequiredRelations.map(key)).size!==expected.length||audit.originalRequiredRelations.some((r:any)=>!expected.includes(key(r)))))return
   if(Array.isArray(audit?.observedRelations)&&(audit.observedRelations.length!==expected.length||new Set(audit.observedRelations.map((r:any)=>r?.edgeId)).size!==expected.length||audit.observedRelations.some((r:any)=>!topology.edges!.some(e=>e.id===r?.edgeId&&key(e)===key(r)))))return
  }
 }
 const allowed:Record<string,string>={
  'SOURCE_PROTOCOL_INVALID: invalid JSON':'source_json',
  'SOURCE_PROTOCOL_INVALID: sourceProtocolVersion 2 required':'source_envelope',
  'SOURCE_PROTOCOL_INVALID: unknown sourceRef':'source_ref',
  'SOURCE_PROTOCOL_INVALID: mixed or unknown provenance fields':'source_fields',
  'SVG 评审没有返回有效 JSON；未认定为通过。':'json',
  'SVG 评审必须同时包含画面和代码结论。':'decision_fields',
  'SVG 评审问题缺少位置、证据或修改建议。':'finding_fields',
  'SVG 评审缺少不确定项或完整决策。':'decision_fields',
  'SVG 辅助视觉观察报告不是有效 JSON；未认定为通过。':'observation_json',
  'SVG 辅助视觉观察报告不完整；未认定为通过。':'observation_fields',
  'SVG 辅助视觉问题缺少位置、证据或修改建议。':'observation_finding_fields',
  '主模型评审未返回完整决策，未认定为评审通过，也未追加评审。':'program_decision_fields',
  'DIAGRAM_REVIEW_INVALID: required node lacks stable ID or original evidence':'node_provenance',
  'DIAGRAM_REVIEW_INVALID: required relation lacks original evidence':'relation_provenance',
  'RENDERER_REVIEW_INVALID: original renderer requirements must be enumerated':'renderer_fields',
  'RENDERER_REVIEW_INVALID: requirement lacks original provenance, verdict or current evidence':'renderer_provenance',
 }
 const code=allowed[detail]||(/^DIAGRAM_REVIEW_INVALID: (originalRequiredNodes|originalRequiredRelations|observedRelations|missingRelations|extraRelations|wrongRelations|nodeIssues) must be enumerated$/.test(detail)?'topology_fields':undefined)
 // Exact hash/version mismatches, observed-graph conflicts and contradictory
 // conclusions are excluded rather than being laundered through another review.
 return code?{kind:'review_schema',code,error:detail,...diagnostic(error)}:undefined
}
