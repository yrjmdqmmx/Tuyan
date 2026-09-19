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
  return !error?.uncertain && (error?.name === 'ReferenceUploadValidationError'
    || error?.name === 'TokenDanceError' && error?.requestState === 'not_sent' && error?.status === 400)
}
export function publicExecutionFailure(error: any, completedCalls = 0, hasUnknownCall = false) {
  const status = Number(error?.status || error?.statusCode || 0)
  const local = isLocalInputFailure(error)
  const action = error?.recoveryAction
  const category = local || status === 400 || status === 413 || status === 422 ? 'input'
    : action === 'top_up_balance' || status === 402 ? 'balance'
    : action === 'api_key_quota' ? 'quota'
    : status === 401 || status === 403 || action === 'reauthorize_api_key' ? 'permission'
    : status === 429 || action === 'rate_limit' ? 'rate_limit'
    : status === 408 || status === 504 || error?.name === 'AbortError' || error?.name === 'TimeoutError' || /timeout|timed out|ETIMEDOUT|超时/i.test(String(error?.message || '')) ? 'timeout'
    : /fetch failed|ECONN|ENOTFOUND|network|无法连接|连接.*(?:失败|中断)/i.test(String(error?.message || '')) ? 'network' : 'provider'
  const copy = {
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
    : local || error?.requestState === 'not_sent' ? 'not_sent'
    : error?.requestState === 'rejected' || status >= 400 && status < 500 ? 'rejected' : 'unknown'
  const catalogPreflight = error?.name === 'TokenDanceError' && error?.catalogFailure === true && action === 'retry_request' && requestState === 'not_sent'
  const reason = catalogPreflight
    ? String(error.message).replace(/https?:\/\/\S+|\bBearer\s+\S+|(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, '[已隐藏]').slice(0, 700)
    : action === 'retry_request' && requestState === 'not_sent' ? '模型目录暂时无法读取，尚未发起本步骤的模型请求。' : local && /[\u4e00-\u9fff]/u.test(error?.message || '')
    ? String(error.message).replace(/https?:\/\/\S+|\bBearer\s+\S+|(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, '[已隐藏]').slice(0, 500) : copy[0]
  const billingStatus = requestState === 'unknown' ? 'unknown' : completedCalls > 0 ? 'prior_calls' : requestState === 'not_sent' ? 'not_called' : 'unconfirmed'
  const billingMessage = billingStatus === 'not_called' ? '失败步骤在模型请求发出前停止；该步骤未发起模型调用。此前费用请结合调用记录核对。'
    : billingStatus === 'prior_calls' ? '此前已有成功调用，已保存成功步骤；费用以渠道账单为准。'
    : billingStatus === 'unknown' ? '请求结果及费用尚未确认，自动重试已停止；请核对渠道账单。'
    : '渠道已拒绝本次请求；实际费用以渠道账单为准。'
  const suggestion = catalogPreflight ? '目录恢复后可继续原任务，已成功的步骤会复用；也可主动选择其他模型。' : copy[1]
  return { stage, stageLabel: JOB_FAILURE_STAGES[stage], category, code: 'MODEL_' + category.toUpperCase(),
    reason, suggestion, requestState, billingStatus, billingMessage,
    message: `${JOB_FAILURE_STAGES[stage]}失败：${reason} ${suggestion}` }
}
