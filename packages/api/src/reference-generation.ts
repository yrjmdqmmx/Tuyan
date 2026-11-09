import { IMAGE_CHANNEL_ROUTES } from './image-channel-routes.js'
import { auditedChannelContract } from './audited-channel-contracts.js'
import { refineControlsFor, refineInputIssue } from './refine-controls.js'

export interface ReferenceGenerationSupport {
  status: 'supported' | 'unsupported' | 'unknown'
  reason: string
  evidence?: 'adapter-contract' | 'user-declared'
}

/** Source-image transport, not mask support. Size combinations are checked separately by Core. */
export function referenceGenerationSupport(route: any, entry: any, ratio?: string, resolution?: string): ReferenceGenerationSupport {
  const provider = route?.accessProvider, model = route?.modelId
  const unavailable = (reason: string, status: ReferenceGenerationSupport['status'] = 'unsupported') => ({status, reason})
  if (!entry || entry.selectable === false) return unavailable('当前型号的参考图输入能力尚未确认。', 'unknown')
  if (!entry.roles?.includes('image') || entry.capabilities?.imageGeneration !== true || entry.capabilities?.requiresSourceImage) return unavailable('该型号未接入从文字生成首张图片的完整流程。')
  if (provider === 'custom') {
    if (!route.custom?.capabilities?.imageEditing) return unavailable('当前通用接口未声明参考图片输入能力。', 'unknown')
    return {status:'supported', evidence:'user-declared', reason:'按用户声明和当前适配器传入上一张图；真实接口能力与账户权益尚未验证。'}
  }
  if (entry.capabilities?.imageEditMode !== 'direct-edit') return unavailable('当前型号及渠道不支持已接入的参考图片输入。')
  if (provider === 'openrouter') return unavailable('聚合渠道的参考图片能力尚未核实到具体执行接口，本轮保持所选型号并仅按文字重画。', 'unknown')
  const wire = IMAGE_CHANNEL_ROUTES[provider+'/'+model]?.editing
  const audited = auditedChannelContract(provider, model)
  const native = ['tokendance', 'ark', 'openai', 'gemini', 'bailian', 'recraft', 'xai', 'stability', 'sensenova', 'stepfun'].includes(provider)
  const explicitWire = Boolean(wire?.sourceField || audited?.editing && (audited.sourceField || audited.taskType))
  if (!native && !explicitWire) return unavailable('未确认该型号及渠道如何传入参考图片；本轮仅按文字重画。', 'unknown')
  const controls = refineControlsFor(provider, model)
  // Even before a size is selected, mandatory masks/multiple images exclude this operation.
  const issue = refineInputIssue(controls, {version:1}, ratio || 'auto', resolution || 'auto')
  if (issue) return unavailable(issue)
  return {status:'supported', evidence:'adapter-contract', reason:'支持单张参考图片与完整方案输入，不要求遮罩；按当前尺寸组合再次校验。'}
}
