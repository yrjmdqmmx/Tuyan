import { findRegistryModel, type ModelRegistry } from './model-registry'
import { modelAvailableInRegion, normalizeProviderRegions, selectRegionApiKeys, type ProviderRegions } from './provider-regions'
import type { ModelRoute } from './model-routing'

export const OPTIMIZATION_LABELS = { methodContent: '研究方法与流程', caption: '目标图注', negativePrompt: '负向提示词', editInstruction: '精修指令' }
export type OptimizationTarget = keyof typeof OPTIMIZATION_LABELS
export type OptimizationInputs = Partial<Record<OptimizationTarget, string>>
const LIMITS: Record<OptimizationTarget, number> = { methodContent: 12000, caption: 1000, negativePrompt: 1000, editInstruction: 2000 }

export function supportsOptimization(registry: ModelRegistry | null, target: string): boolean {
  return Number(registry?.inputOptimizationContractVersion) >= 1
    && (registry?.inputOptimizationTargets || ['methodContent', 'caption', 'negativePrompt']).includes(target)
}

export function buildOptimizationRequest(input: {
  target: OptimizationTarget; inputs: OptimizationInputs; mainRoute: ModelRoute; providerRegions?: ProviderRegions
  apiKeys: Record<string, string>; tokenDanceConnected?: boolean; registry: ModelRegistry | null
}) {
  if (!supportsOptimization(input.registry, input.target)) throw new Error('当前服务端尚未提供此项输入优化。')
  const { mainRoute, registry } = input
  const model = findRegistryModel(registry, mainRoute?.accessProvider, mainRoute?.modelId)
  if (!model || model.selectable !== true || !model.roles.includes('main') || !modelAvailableInRegion(mainRoute.accessProvider, model, input.providerRegions)) throw new Error('请先在设置中选择可用的主模型。')
  const regions = normalizeProviderRegions(input.providerRegions)
  if (mainRoute.accessProvider === 'minimax' && regions.minimax === 'cn' && !registry?.providerRegionContractVersion) throw new Error('当前服务端尚未支持 MiniMax 国内区域。')
  const apiKey = selectRegionApiKeys(input.apiKeys, regions)[mainRoute.accessProvider]?.trim()
  if (mainRoute.accessProvider === 'tokendance' && !input.tokenDanceConnected) throw new Error('请先到账户页连接观猹 TokenDance。')
  if (mainRoute.accessProvider !== 'tokendance' && !apiKey) throw new Error('请先在设置中填写当前主模型接入渠道的密钥。')
  const inputs: OptimizationInputs = input.target === 'editInstruction'
    ? { editInstruction: String(input.inputs.editInstruction || '') }
    : { methodContent: String(input.inputs.methodContent || ''), caption: String(input.inputs.caption || ''), negativePrompt: String(input.inputs.negativePrompt || '') }
  for (const key of Object.keys(inputs) as OptimizationTarget[]) {
    if (inputs[key]!.length > LIMITS[key]) throw new Error(`${OPTIMIZATION_LABELS[key]}内容过长，请缩短后重试。`)
  }
  if (input.target !== 'negativePrompt' && !inputs[input.target]?.trim()) throw new Error('请先填写需要优化的内容。')
  if (input.target === 'negativePrompt' && !Object.values(inputs).some(value => value.trim())) throw new Error('请先填写方法或图注，再优化负向提示词。')
  return { action: 'optimizeInputs', target: input.target, inputs, mainRoute: { ...mainRoute }, ...(mainRoute.accessProvider === 'tokendance' ? {} : { apiKey }), ...(mainRoute.accessProvider === 'minimax' ? { providerRegions: regions } : {}) }
}

export function validateOptimizationResult(target: OptimizationTarget, original: string, result: { target?: string; optimizedText?: string }): string {
  const candidate = typeof result?.optimizedText === 'string' ? result.optimizedText.trim() : ''
  if (result?.target !== target || !candidate || candidate.length > LIMITS[target]) throw new Error('优化结果无效，原文已保留，请重试。')
  if (candidate === original.trim()) throw new Error('优化结果与原文一致，已保留原文。')
  return candidate
}
