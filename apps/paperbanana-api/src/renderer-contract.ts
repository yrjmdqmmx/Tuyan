import {sourceReferenceReviewPrompt} from './source-provenance.js'
import {workflowContext} from '../../../packages/api/src/workflow-prompts.js'

export const RENDERER_REQUIREMENT_POLICY = 'Original methodology, caption/visualIntent and avoidance constraints are authoritative. advisoryPlan and model/reference styling suggestions are not user requirements or proof of applied changes. Renderer limits do not cancel explicit user requirements: an unmet, unsupported or uncertain original requirement prevents a pass. Check actual current pixels/code for readability, clipping, overlap and ambiguous connections even when no original style was specified. Do not invent universal color, orientation or branch-position conventions.'

export function rendererContext(body:Record<string,any>,advisoryPlan:string,rendererContract:Record<string,any>,evidence:Record<string,any>={}) {
 return workflowContext(body,'',{completePlan:undefined,advisoryPlan,rendererContract,requirementsAuthority:RENDERER_REQUIREMENT_POLICY,...evidence})
}

export function rendererPlanningPrompt(kind:'topology'|'program',stage:'planning'|'styling') {
 return `You are the ${stage==='planning'?'planner':'style planner'} for a fixed ${kind==='topology'?'topology diagram compiler':'deterministic numeric program renderer'}. Read rendererContract BEFORE proposing any appearance. ${RENDERER_REQUIREMENT_POLICY}
Preserve every original named element and relationship/data value. References remain attached to planning as evidence; obey the original scope of reference use, especially structural-design-only requests. Borrow only supported design lessons. Never promise unsupported colors, fonts, curves, orientation, node placement, annotations, grid or title. List explicit original requirements that the renderer cannot satisfy or whose compatibility is uncertain; do not silently weaken them. Distinguish these from your own optional suggestions. Do not claim anything has rendered or passed review yet.
${kind==='program'?'Return JSON {"plan":"advisory description of original data mapping and supported appearance", "plotStyle":{"width":9,"height":6,"fontSize":12},"unsupportedRequirements":[]}. Only plotStyle fields named in rendererContract can affect code; viewport/aspect-ratio overrides are authoritative. Original data/options remain immutable.':'Return a concise advisory plan enumerating named nodes, any explicitly requested anonymous initial marker, and exact source/target/event relationships. Fixed palette/fonts/shape vocabulary and orthogonal arrows are compiler-owned. Layout direction is only an adaptable hint; actualLayout records the delivered orientation. A cycle does not promise the initial state is leftmost. There is no universal rule requiring a yes branch to go down/right or a no branch to go left.'}`
}

function rendererScopePrompt(){return `
FIXED RENDERER REQUIREMENT AUDIT. ${RENDERER_REQUIREMENT_POLICY}
Use rendererContract (or each childOriginals[].rendererScope in a composite) and actualLayout/current code to distinguish applied output from advisoryPlan. Do not report a plan-only styling deviation as an unmet user demand. Original explicit requirements always remain binding even when unsupported. For layout/clarity concerns cite actual visible crowding, overlap, clipping, tiny text or ambiguous routing, not an invented convention. Preserve correct source/target/event mappings regardless of left/right/up/down placement. Never recommend swapping condition labels to satisfy a preferred direction.`}

export function rendererObservationPrompt(){return rendererScopePrompt()+'\nKeep the existing observer response schema. Describe current visible evidence and uncertainty only; the main reviewer owns rendererAudit and final pass/non-pass. Do not produce the main reviewer response or a revision plan.'}

export function rendererReviewPrompt(mode:'extension'|'program'='extension'){return `
${mode==='program'?'You are the main reviewer of the current deterministic numeric program output. Independently inspect the original request, immutable supplied data, actual current code/image and rendererContract. Auxiliary observations are evidence, not a decision. Decide whether the current candidate needs modification. Return ONLY one complete JSON root matching the program_review_v2_template below. Its five root fields are critic_suggestions, revised_description, sourceProtocolVersion, sourceCatalogHash and rendererAudit. Both source headers are siblings of rendererAudit; never nest them inside rendererAudit. critic_suggestions is the specific current assessment; revised_description is a complete supported revision plan, or "No changes needed.". Never claim a future regenerated image passed.':'RENDERER AUDIT JSON CONTRACT v2. Add rendererAudit to the usual review response; keep all existing response keys, version/hash, visual/code or critic_suggestions fields.'}
Each originalRequirements item has exactly sourceRef, requirement, verdict, evidence. Select sourceRef from the current sourceCatalog; only actual original methodology, visualIntent or avoid are eligible. Do not output sourceField or sourceQuote. Verdict is exactly one of ["satisfied","unmet","unsupported","uncertain"]; requirement and current-output evidence are non-empty strings.
rendererContract, svgRenderingConstraints, figureContract, referenceRequirements, advisoryPlan, references and code are NOT original evidence. Check them in existing visual/code findings or critic_suggestions. Never assign them an original ref unless the original text itself states that requirement. Composite overall audits use the root catalogue; child audits, when requested, use that child's catalogue.
The wire shape below is structural only. Substitute the CURRENT catalogue hash and actual sourceRef IDs; never copy placeholder refs or satisfied verdicts without independent review:
<${mode==='program'?'program_review_v2_template':'renderer_audit_v2_template'}>
{${mode==='program'?'"critic_suggestions":"Specific assessment of the current candidate", "revised_description":"Complete supported revision plan, or No changes needed.",':''}"sourceProtocolVersion":2,"sourceCatalogHash":"CURRENT_CATALOG_HASH","rendererAudit":{"originalRequirements":[{"sourceRef":"CURRENT_ORIGINAL_REF","requirement":"An explicit original requirement","verdict":"satisfied","evidence":"Concrete current output evidence"}]}}
</${mode==='program'?'program_review_v2_template':'renderer_audit_v2_template'}>
Enumerate ALL explicit original visual/style/layout requirements including prohibitions. Use originalRequirements:[] only when none were requested. Model-created styling is not an original requirement. Unknown compatibility is uncertain. Any unmet/unsupported/uncertain requirement prevents a pass even when no executable repair exists. An unchanged suggestion is not a performed repair.
`+rendererScopePrompt()+sourceReferenceReviewPrompt()}

export const programRendererReviewPrompt=()=>rendererReviewPrompt('program')

export function validateRendererAudit(raw:string,body:Record<string,any>) {
 const data=JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g,'')),audit=data.rendererAudit,original=body.generationContext||body
 if(!audit||!Array.isArray(audit.originalRequirements))throw new Error('RENDERER_REVIEW_INVALID: original renderer requirements must be enumerated')
 const sources:Record<string,string>={methodology:original.methodContent||'',visualIntent:original.caption||'',avoid:original.negativePrompt||''}
 for(const r of audit.originalRequirements){
  if(!r||!Object.hasOwn(sources,r.sourceField)||typeof r.sourceQuote!=='string'||!r.sourceQuote.trim()||!sources[r.sourceField].includes(r.sourceQuote)||typeof r.requirement!=='string'||!r.requirement.trim()||typeof r.evidence!=='string'||!r.evidence.trim()||!['satisfied','unmet','unsupported','uncertain'].includes(r.verdict))throw new Error('RENDERER_REVIEW_INVALID: requirement lacks original provenance, verdict or current evidence')
 }
 return {passed:audit.originalRequirements.every((r:any)=>r.verdict==='satisfied'),audit}
}
