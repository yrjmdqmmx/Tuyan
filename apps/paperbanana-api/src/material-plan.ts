/** A returned model response is known, even when local contract validation fails. */
export function modelPlanError(message: string) {
  return Object.assign(new Error(message), {name:'ModelPlanValidationError',localInputFailure:true,requestState:'not_sent',modelResponded:true,failureStage:'planning'})
}

export function parseMaterialPlan(raw: string, stage:'planning'|'styling'='planning'): string {
 try{return parsePlan(raw)}catch(error){if(error instanceof Error)Object.assign(error,{failureStage:stage});throw error}
}
function parsePlan(raw:string):string {
  let decision: any
  try { decision=JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g,'')) }
  catch { throw modelPlanError('主模型已返回响应，但材料规划不是有效 JSON；原文已保存，尚未开始绘图。') }
  if (!decision || !['ready','needs_input'].includes(decision.status) || !Array.isArray(decision.missingInputs) || decision.missingInputs.some((v:any)=>typeof v!=='string'))
    throw modelPlanError('主模型已返回响应，但材料规划状态或缺失项格式不完整；尚未开始绘图。')
  if (decision.status==='needs_input' || decision.missingInputs.length)
    throw Object.assign(new Error('需要补充材料：'+(decision.missingInputs.join('；')||'请明确图中要表达的内容')), {name:'MaterialInputRequiredError',localInputFailure:true,requestState:'not_sent',modelResponded:true,failureStage:'planning'})
  // Keep all nested facts and numbers. This is data serialization, never code execution.
  const plan=typeof decision.plan==='string' ? decision.plan : decision.plan && !Array.isArray(decision.plan) && typeof decision.plan==='object' && Object.keys(decision.plan).length ? JSON.stringify(decision.plan) : ''
  if (!plan.trim()) throw modelPlanError('绘图方案为空或格式不受支持，未开始绘图。')
  if(/^(no changes? needed\.?|无需修改)$/i.test(plan.trim()))throw modelPlanError('方案只有无需修改标记，缺少完整绘图内容；未开始绘图。')
  if ([...plan].length>80000) throw modelPlanError('绘图方案超过 80,000 字符，未截断或开始绘图。')
  return plan
}
