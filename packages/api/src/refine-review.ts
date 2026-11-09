import type {RefineInputs} from '../../types/src/refine.js'

/** User requirements, not requirements inferred from a rewritten drawing plan. */
export function refineReviewRequirements(inputs?:RefineInputs) {
 return [
  ...(inputs?.references||[]).map((ref,index)=>({id:`reference-${index+1}`,kind:'reference',purpose:ref.purpose,note:ref.note||''})),
  ...(inputs?.mask?[{id:'mask',kind:'mask',semantics:'white-edit-black-preserve',requirement:'Check requested changes inside white regions and preservation of black regions against the original. Mask and original share coordinates.'}]:[]),
  ...Object.entries(inputs?.structured||{}).map(([field,value])=>({id:`structured-${field}`,kind:'structured',field,requirement:value})),
 ]
}
export const REFINE_REVIEW_REQUIREMENTS='When editRequirements is nonempty, return editChecks:[{id:"exact requirement ID",status:"passed|issues_found|uncertain",evidence:"specific comparison against current output and supplied original/reference/mask evidence"}], exactly one per requirement. The user requirements override a rewritten plan. Check mask white-edit/black-preserve regions and each structured constraint, including preservation. Missing comparison evidence means uncertain, never passed. Any issues_found or uncertain entry prevents a pass and requires a complete revised plan. Reports from separately observed images are interpretations, not simultaneous pixel comparisons; state unresolved comparison uncertainty explicitly.'
export function validateRefineReviewChecks(parsed:any,requirements?:ReturnType<typeof refineReviewRequirements>) {
 if(requirements===undefined)return true
 if(!requirements.length&&parsed.editChecks===undefined)return true
 const checks=parsed.editChecks,expected=new Set(requirements.map(r=>r.id)),seen=new Set<string>()
 if(!Array.isArray(checks)||checks.length!==requirements.length)throw Error('精修评审缺少用户编辑约束的逐项核对；未认定为通过。')
 for(const check of checks){
  if(!check||!expected.has(check.id)||seen.has(check.id)||!['passed','issues_found','uncertain'].includes(check.status)||typeof check.evidence!=='string'||!check.evidence.trim())throw Error('精修约束核对缺少编号、结论或证据，或编号重复/过期；未认定为通过。')
  seen.add(check.id)
 }
 parsed.editRequirements=requirements
 return checks.every((check:any)=>check.status==='passed')
}
