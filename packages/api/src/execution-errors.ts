// Public failures contain controlled copy, never upstream response bodies.
export type RequestState = 'not_sent' | 'rejected' | 'unknown'
export const JOB_FAILURE_STAGES = {
  reference_selection: '参考图检索', reference_preparation: '参考图准备', reference_analysis: '参考图识别',
  planning: '图示规划', styling: '风格设计', rendering: '图像生成', review: '图示评审', execution: '任务执行',
} as const
export async function atJobStage<T>(stage: keyof typeof JOB_FAILURE_STAGES, operation: () => Promise<T>): Promise<T> {
  try { return await operation() } catch (error: any) {
    if (error && typeof error === 'object' && !error.failureStage) error.failureStage = stage
    throw error
  }
}
export function isLocalInputFailure(error: any) {
  return !error?.uncertain && (['MaterialInputRequiredError','ModelPlanValidationError','SvgRenderValidationError'].includes(error?.name) && error?.requestState === 'not_sent'
    || error?.name === 'ReferenceUploadValidationError'
    || error?.name === 'ThinkingConfigValidationError' && error?.localInputFailure === true && error?.requestState === 'not_sent'
    || ['TokenDanceError', 'UniversalApiError'].includes(error?.name) && error?.requestState === 'not_sent' && error?.status === 400)
}
export function publicExecutionFailure(error: any, completedCalls = 0, hasUnknownCall = false) {
  const status = Number(error?.status || error?.statusCode || 0)
  const local = isLocalInputFailure(error)
  const topology = error?.name === 'DiagramTopologyValidationError'
  const material = error?.name === 'MaterialError'
  const materialModelResponded = material && error?.materialModelResponded === true
  const planInvalid = error?.name === 'ModelPlanValidationError'
  const planResponded = planInvalid || error?.name === 'MaterialInputRequiredError' && error?.modelResponded === true
  const svgRender = error?.name === 'SvgRenderValidationError'
  const internal = error?.name === 'ReferenceError'
  const action = error?.recoveryAction
  const category = topology ? 'input' : internal ? 'internal' : local || status === 400 || status === 413 || status === 422 ? 'input'
    : action === 'top_up_balance' || status === 402 ? 'balance'
    : action === 'api_key_quota' ? 'quota'
    : status === 401 || status === 403 || action === 'reauthorize_api_key' ? 'permission'
    : status === 429 || action === 'rate_limit' ? 'rate_limit'
    : status === 408 || status === 504 || error?.name === 'AbortError' || error?.name === 'TimeoutError' || /timeout|timed out|ETIMEDOUT|超时/i.test(String(error?.message || '')) ? 'timeout'
    : /fetch failed|ECONN|ENOTFOUND|network|无法连接|连接.*(?:失败|中断)/i.test(String(error?.message || '')) ? 'network' : 'provider'
  const copy = {
    internal: ['工作流内部执行错误，本步骤未能继续。', '请保留任务记录并修复工作流后再继续；这不是模型能力或渠道权限问题。'],
    input: ['图片或文字输入不符合当前渠道、模型的要求。', '请减少图片、裁剪过大的图片或缩短文字，也可更换支持该输入的模型。'],
    balance: ['模型渠道余额不足。', '请补充该渠道余额后恢复原任务，已成功的步骤会复用。'],
    quota: ['当前授权的调用额度已用尽。', '请调整授权额度或重新授权；充值钱包不一定改变授权额度。'],
    permission: ['当前账号或授权无权使用所选模型。', '请检查渠道授权、模型权限及地区限制，必要时重新授权。'],
    rate_limit: ['模型渠道请求频率受限。', '请按等待时间稍后恢复原任务，避免连续提交。'],
    timeout: ['等待模型响应超时。', '请先核对渠道调用记录；结果未知时不要重复提交，以免重复扣费。'],
    network: ['连接模型渠道失败或连接中断。', '请检查网络或渠道状态；请求结果未知时先核对调用记录。'],
    provider: ['模型渠道返回异常或未提供完整结果。', '请核对渠道状态和调用记录，再决定是否恢复；不要盲目重复提交。'],
  }[category]
  const stage = Object.hasOwn(JOB_FAILURE_STAGES, error?.failureStage) ? error.failureStage as keyof typeof JOB_FAILURE_STAGES : 'execution'
  const requestState: RequestState = hasUnknownCall || error?.uncertain ? 'unknown'
    : internal || local || error?.requestState === 'not_sent' ? 'not_sent'
    : error?.requestState === 'rejected' || status >= 400 && status < 500 ? 'rejected' : 'unknown'
  const catalogPreflight = error?.name === 'TokenDanceError' && error?.catalogFailure === true && action === 'retry_request' && requestState === 'not_sent'
  const universal = error?.name === 'UniversalApiError'
  const topologyKind=error?.topologyFailureKind
  const topologyCorrection=error?.topologyCorrectionUsed?'已使用一次额外主模型结构格式纠正。':'未使用额外主模型结构格式纠正。'
  const topologyReason=topologyKind==='model_structure'?'模型结构化输出仍不符合格式合同，未接受该图。':topologyKind==='ambiguous'?'结构化关系提取报告原始需求有不确定项，未猜测缺失关系。':topologyKind==='layout'?'关系已提取，但本地布局未通过可读性或几何校验。':'结构化关系或本地布局未通过校验；未回退到未经检查的自由绘图。'
  const reason = material ? String(error.message || '材料读取未完成。').replace(/https?:\/\/\S+|\bBearer\s+\S+|(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, '[已隐藏]').slice(0,500) : topology ? topologyReason : svgRender ? 'SVG 已生成，但未通过本地格式或渲染检查；尚未完成画面评审。' : universal ? String(error.reason || copy[0]) : catalogPreflight
    ? String(error.message).replace(/https?:\/\/\S+|\bBearer\s+\S+|(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, '[已隐藏]').slice(0, 700)
    : action === 'retry_request' && requestState === 'not_sent' ? '模型目录暂时无法读取，尚未发起本步骤的模型请求。' : local && /[\u4e00-\u9fff]/u.test(error?.message || '')
    ? String(error.message).replace(/https?:\/\/\S+|\bBearer\s+\S+|(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, '[已隐藏]').slice(0, 500) : copy[0]
  const billingStatus = requestState === 'unknown' ? 'unknown' : completedCalls > 0 || svgRender || materialModelResponded || planResponded ? 'prior_calls' : requestState === 'not_sent' ? 'not_called' : 'unconfirmed'
  const billingMessage = planResponded ? '规划模型已返回响应；本次在本地核对后停止，尚未发起绘图调用，已发生费用以渠道账单为准。' : materialModelResponded ? '材料读取阶段已有模型调用；请结合读取记录与渠道账单核对费用。' : svgRender ? '此前已有成功的 SVG 生成调用；本次本地渲染失败未追加模型调用，费用以渠道账单为准。' : billingStatus === 'not_called' ? '失败步骤在模型请求发出前停止；该步骤未发起模型调用。此前费用请结合调用记录核对。'
    : billingStatus === 'prior_calls' ? '此前已有成功调用，已保存成功步骤；费用以渠道账单为准。'
    : billingStatus === 'unknown' ? '请求结果及费用尚未确认，自动重试已停止；请核对渠道账单。'
    : '渠道已拒绝本次请求；实际费用以渠道账单为准。'
  const suggestion = planInvalid ? '请查看已保存的规划原文及格式错误；这不是请求状态未知，绘图尚未开始。' : material ? '请查看材料读取记录中的具体失败原因；未读取的内容不会当作已理解，原件仍可从当前浏览器再次使用。' : error?.name==='MaterialInputRequiredError' ? '请补充上述材料后创建新任务；本次规划已保存，尚未调用绘图模型。' : topology ? (topologyKind==='model_structure'?'请查看已保留的模型原文和格式错误；系统未接受连续失败的输出，也未追加第二次结构纠正。':topologyKind==='ambiguous'?'请查看并澄清提取记录中的具体不确定项。':topologyKind==='layout'?'请查看具体布局记录，调整面板分配或画幅。':'请查看提取记录中的关系约束或规模限制。')+' '+topologyCorrection+' 已发生调用以阶段记录和渠道账单为准。' : svgRender ? '请查看渲染阶段的错误记录，调整生成方案后再生成；系统未追加模型调用。' : universal ? String(error.suggestion || copy[1]) : catalogPreflight ? '目录恢复后可继续原任务，已成功的步骤会复用；也可主动选择其他模型。' : copy[1]
  return { stage, stageLabel: JOB_FAILURE_STAGES[stage], category, code: planInvalid ? 'MODEL_PLAN_INVALID' : material ? 'MATERIAL_READ_FAILED' : error?.name==='MaterialInputRequiredError' ? 'MATERIAL_INPUT_REQUIRED' : topology ? 'DIAGRAM_TOPOLOGY_INVALID' : svgRender ? 'SVG_RENDER_FAILED' : internal ? 'WORKFLOW_INTERNAL_ERROR' : 'MODEL_' + category.toUpperCase(),
    reason, suggestion, requestState, billingStatus, billingMessage,
    message: `${JOB_FAILURE_STAGES[stage]}失败：${reason} ${suggestion}` }
}
