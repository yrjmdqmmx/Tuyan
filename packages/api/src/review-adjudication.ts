export type VisualIssue = {id:string;kind:'problem'|'uncertainty';version:number;round:number;artifactHash:string;scope:string;observation:any}

/** IDs are assigned only after validating the observer report, for this artifact. */
export function indexVisualObservation(report:any,version:number,artifactHash:string,scope='current',round=1):VisualIssue[] {
 return (['problem','uncertainty'] as const).flatMap(kind=>(report[kind==='problem'?'problems':'uncertainties'] || []).map((observation:any,index:number)=>({
  id:`r${round}:v${version}:${artifactHash.slice(0,16)}:${scope}:${kind}${index+1}`,kind,version,round,artifactHash,scope,observation,
 })))
}

export const VISUAL_ADJUDICATION_REQUIREMENTS = 'When auxiliaryVisualIssues is nonempty, include visualAdjudications:[{id:"copy the server issue ID",decision:"accept|reject|unresolved",reason:"your explicit reasoning",evidence:"specific current-image/source evidence"}] with exactly one entry for EVERY problem AND uncertainty. accept means the reported defect remains in this current version and requires correction; unresolved means evidence is insufficient; either prevents a pass and requires a complete revised plan. reject means you dismiss the observation with concrete counter-evidence (or resolve the uncertainty with evidence about this actual current version), not a promise about a future revision. You may disagree with the observer; never silently omit, merge, duplicate or invent IDs. Do not claim to have seen image pixels that were not supplied.'

export function validateVisualAdjudications(parsed:any,issues?:VisualIssue[]) {
 if(issues===undefined)return true // Historical parser callers retain their contract.
 const decisions=parsed.visualAdjudications
 if(!issues.length && decisions===undefined)return true
 const nonempty=(value:any)=>typeof value==='string' && Boolean(value.trim())
 if(!Array.isArray(decisions) || decisions.length!==issues.length)throw Error('辅助视觉问题和不确定项缺少逐项裁决；未认定为通过。')
 const expected=new Set(issues.map(issue=>issue.id)),seen=new Set<string>()
 for(const item of decisions) {
  if(!item || !expected.has(item.id) || seen.has(item.id) || !['accept','reject','unresolved'].includes(item.decision) || !nonempty(item.reason) || !nonempty(item.evidence))throw Error('辅助视觉裁决缺少当前版本问题编号、理由或证据，或存在重复/过期编号；未认定为通过。')
  seen.add(item.id)
 }
 // Store the server-owned issue bindings alongside the decisions for inspection.
 parsed.auxiliaryVisualIssues=issues
 return decisions.every((item:any)=>item.decision==='reject')
}
