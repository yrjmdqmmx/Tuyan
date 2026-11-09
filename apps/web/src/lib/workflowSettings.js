import { normalizeVisionMode, validateWorkflowCounts, workflowVisionError } from './workflow.js'
import { registryReadinessMessage } from './modelRouting.js'

export const VISION_ASSIST_NOTICE = '当前主模型已支持图片理解。保留独立视觉模型后，将由视觉模型分析图片，再由主模型制定方案，可能增加调用次数和等待时间。'
const STORAGE_KEY = 'tuyan.workflow-settings.v1'
const DEFAULTS = Object.freeze({numCandidates: 1, maxCriticRounds: 1, visionMode: 'none'})
export const normalizeGenerationPipeline = mode => mode === 'planner_critic' || mode === 'demo_planner_critic' ? 'planner_critic' : 'full'
export function loadGenerationPipeline(storage) {
  try {
    storage ??= globalThis.localStorage ?? globalThis.window?.localStorage
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null')
    // Earlier settings used planner_critic as the implicit default. Start the new choices at full.
    return normalizeGenerationPipeline(saved?.version === 2 ? saved.pipelineMode : undefined)
  } catch { return 'full' }
}

export function loadWorkflowSettings(storage) {
  try {
    storage ??= globalThis.localStorage ?? globalThis.window?.localStorage
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null')
    if (![1, 2].includes(saved?.version)) return {...DEFAULTS}
    let counts = DEFAULTS
    try { counts = validateWorkflowCounts(saved) } catch { /* Invalid persisted counts cannot enter a new task. */ }
    return {...counts, visionMode: normalizeVisionMode(saved.visionMode ?? DEFAULTS.visionMode)}
  } catch { return {...DEFAULTS} }
}

export function saveWorkflowSettings(settings, storage) {
  try { storage ??= globalThis.localStorage ?? globalThis.window?.localStorage } catch { return false }
  // Keep editable numeric drafts on screen; save only valid integers without truncation.
  let counts
  try { counts = validateWorkflowCounts(settings) } catch {
    const previous = loadWorkflowSettings(storage)
    counts = {numCandidates: previous.numCandidates, maxCriticRounds: previous.maxCriticRounds}
  }
  try {
    if (!storage) return false
    storage.setItem(STORAGE_KEY, JSON.stringify({version: 2, ...counts, visionMode: normalizeVisionMode(settings.visionMode ?? DEFAULTS.visionMode),
      pipelineMode: settings.pipelineMode === undefined ? loadGenerationPipeline(storage) : normalizeGenerationPipeline(settings.pipelineMode)}))
    return true
  } catch { return false }
}

export function workflowPreflight(body, registry, registryStatus, mainStatus, visionStatus) {
  const readiness = registryReadinessMessage(registryStatus)
  if (readiness) return readiness
  if (!(Number(registry?.workflowContractVersion) >= 2)) return '当前后端尚未支持新版生成工作流，请更新后端后重试；已保留所有输入与设置，不会提交模型调用。'
  if (body.action !== 'refineImage') {
    try { validateWorkflowCounts(body, registry?.workflowLimits) } catch (error) { return error.message }
  }
  const imageRoute=body.modelRoutes?.image
  if (body.generationPath!=='model-v1' && body.outputFormat==='svg' && body.taskName!=='plot' && /recraft.*vector/i.test(imageRoute?.modelId || '') && (imageRoute.accessProvider!=='recraft' || !/^recraftv(?:[23]|4(?:_1)?)(?:_utility)?(?:_pro)?_vector$/.test(imageRoute.modelId))) return '所选 Recraft SVG 型号或渠道尚未适配，请明确选择已支持的原生矢量型号；不会自动切换。'
  return workflowVisionError(body, mainStatus, visionStatus)
}

export function reviewStatusText(review, t = value => value) {
  const labels = {
    not_requested: '未评审', passed: '已通过评审', modified_unreviewed: '已修改，尚未复审', issues_found: '已检查，仍有问题',
    review_failed: '评审失败', text_reviewed: '已完成文本评审（未检查最终画面）',
  }
  if (!review) return ''
  return `${t(labels[review.status] || '评审状态待确认')} · ${t(review.mode === 'visual_code' ? '画面与代码' : review.mode === 'text' ? '文本' : '视觉')} ${review.roundsUsed ?? 0}/${review.limit ?? 0} ${t('轮')}${review.deliveredVersion ? ` · ${review.mode === 'visual_code' ? 'SVG' : 'PNG'} v${review.deliveredVersion}` : ''}`
}
