import type { OutputFormat } from './job-assets'
import type { ReferenceImageMode } from './reference-mode'

export type ProviderId = 'bailian' | 'openrouter' | 'gemini' | 'openai'
export type ConfigurationMode = 'simple' | 'advanced'
export type FeedbackCategory = 'bug' | 'feature' | 'experience' | 'other'
export type ImageSize = '1K' | '2K' | '4K'
export type RetrievalSetting = 'none' | 'auto' | 'random' | 'manual'

export interface ModelOption {
  label: string
  value: string
}

export interface ProviderConfig {
  id: ProviderId
  label: string
  keyPlaceholder: string
  mainModel: string
  imageModel: string
  visionModel: string
  mainModels: ModelOption[]
  imageModels: ModelOption[]
  visionModels: ModelOption[]
  guideSteps: string[]
}

export interface QuickStartExample {
  id: string
  label: string
  title: string
  category: string
  caption: string
  methodContent: string
  hint: string
}

export interface InfographicCategory {
  id: string
  label: string
  description: string
}

export interface FeedbackCategoryOption {
  label: string
  value: FeedbackCategory
}

// 模型常量与 apps/web/src/constants.js 保持同步（SYNC.md 2026-06-08 起 bailian 为官方真实模型）。
export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'bailian',
    label: '阿里百炼',
    keyPlaceholder: 'sk-...',
    mainModel: 'qwen3.8-max',
    imageModel: 'wan2.7-image-pro',
    visionModel: 'qwen3.8-max',
    mainModels: [
      { label: '通义千问 / Qwen3.8 Max', value: 'qwen3.8-max' },
      { label: '通义千问 / Qwen3.7 Plus（可直读图）', value: 'qwen3.7-plus' },
      { label: '通义千问 / Qwen3.7 Flash', value: 'qwen3.7-flash' },
      { label: '百炼第三方 / DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
      { label: '百炼第三方 / DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
      { label: '百炼第三方 / Kimi K3（可直读图）', value: 'kimi/kimi-k3' },
      { label: '百炼第三方 / GLM 5.2', value: 'glm-5.2' },
      { label: '百炼第三方 / MiniMax M3', value: 'MiniMax/MiniMax-M3' },
    ],
    imageModels: [
      { label: '通义万相 / Wan 2.7 Image Pro', value: 'wan2.7-image-pro' },
      { label: '通义千问 Image / Qwen Image 3.0 Pro', value: 'qwen-image-3.0-pro' },
      { label: '通义千问 Image / Qwen Image 3.0', value: 'qwen-image-3.0' },
    ],
    visionModels: [
      { label: '通义千问 / Qwen3.8 Max（图像理解）', value: 'qwen3.8-max' },
      { label: '通义千问 / Qwen3.7 Plus（图像理解）', value: 'qwen3.7-plus' },
      { label: '通义千问 / Qwen3.5 Omni Plus（全模态）', value: 'qwen3.5-omni-plus' },
      { label: '百炼第三方 / Kimi K3（图像理解）', value: 'kimi/kimi-k3' },
    ],
    guideSteps: ['打开阿里云百炼控制台', '进入 API Key 页面创建密钥', '复制 sk- 开头密钥到小程序'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyPlaceholder: 'sk-or-v1-...',
    mainModel: 'openrouter/openai/gpt-5.5',
    imageModel: 'openrouter/openai/gpt-5.4-image-2',
    visionModel: 'openrouter/google/gemini-3.5-flash',
    mainModels: [
      { label: 'OpenAI / GPT-5.5', value: 'openrouter/openai/gpt-5.5' },
      { label: 'OpenAI / GPT-5.5 Pro', value: 'openrouter/openai/gpt-5.5-pro' },
      { label: 'OpenAI / GPT-5.4', value: 'openrouter/openai/gpt-5.4' },
      { label: 'OpenAI / GPT-5.4 Pro', value: 'openrouter/openai/gpt-5.4-pro' },
      { label: 'OpenAI / GPT-5.4 Mini', value: 'openrouter/openai/gpt-5.4-mini' },
      { label: 'OpenAI / GPT-5.4 Nano', value: 'openrouter/openai/gpt-5.4-nano' },
      { label: 'OpenAI / GPT Chat Latest', value: 'openrouter/openai/gpt-chat-latest' },
      { label: 'OpenAI / GPT Latest', value: 'openrouter/~openai/gpt-latest' },
      { label: 'OpenAI / GPT Mini Latest', value: 'openrouter/~openai/gpt-mini-latest' },
      { label: 'Anthropic / Claude Opus 4.8', value: 'openrouter/anthropic/claude-opus-4.8' },
      { label: 'Anthropic / Claude Opus 4.8 Fast', value: 'openrouter/anthropic/claude-opus-4.8-fast' },
      { label: 'Anthropic / Claude Opus 4.7', value: 'openrouter/anthropic/claude-opus-4.7' },
      { label: 'Anthropic / Claude Opus 4.7 Fast', value: 'openrouter/anthropic/claude-opus-4.7-fast' },
      { label: 'Anthropic / Claude Opus Latest', value: 'openrouter/~anthropic/claude-opus-latest' },
      { label: 'Anthropic / Claude Sonnet Latest', value: 'openrouter/~anthropic/claude-sonnet-latest' },
      { label: 'Google / Gemini 3.1 Pro Preview', value: 'openrouter/google/gemini-3.1-pro-preview' },
      { label: 'Google / Gemini 3.5 Flash', value: 'openrouter/google/gemini-3.5-flash' },
      { label: 'Google / Gemini 3.1 Flash Lite', value: 'openrouter/google/gemini-3.1-flash-lite' },
      { label: 'Google / Gemini 3.1 Flash Lite Preview', value: 'openrouter/google/gemini-3.1-flash-lite-preview' },
      { label: 'Google / Gemini Pro Latest', value: 'openrouter/~google/gemini-pro-latest' },
      { label: 'Google / Gemini Flash Latest', value: 'openrouter/~google/gemini-flash-latest' },
      { label: 'Qwen / Qwen3.7 Max', value: 'openrouter/qwen/qwen3.7-max' },
      { label: 'Qwen / Qwen3.6 Plus', value: 'openrouter/qwen/qwen3.6-plus' },
      { label: 'Qwen / Qwen3.6 Flash', value: 'openrouter/qwen/qwen3.6-flash' },
      { label: 'Qwen / Qwen3.6 Max Preview', value: 'openrouter/qwen/qwen3.6-max-preview' },
      { label: 'Qwen / Qwen3.5 Plus 2026-04-20', value: 'openrouter/qwen/qwen3.5-plus-20260420' },
      { label: 'DeepSeek / DeepSeek V4 Pro', value: 'openrouter/deepseek/deepseek-v4-pro' },
      { label: 'DeepSeek / DeepSeek V4 Flash', value: 'openrouter/deepseek/deepseek-v4-flash' },
      { label: 'xAI / Grok 4.3', value: 'openrouter/x-ai/grok-4.3' },
      { label: 'xAI / Grok 4.20', value: 'openrouter/x-ai/grok-4.20' },
      { label: 'xAI / Grok 4.20 Multi-Agent', value: 'openrouter/x-ai/grok-4.20-multi-agent' },
      { label: 'xAI / Grok Build 0.1', value: 'openrouter/x-ai/grok-build-0.1' },
      { label: 'Moonshot / Kimi K2.6', value: 'openrouter/moonshotai/kimi-k2.6' },
      { label: 'Z.ai / GLM 5.1', value: 'openrouter/z-ai/glm-5.1' },
      { label: 'MiniMax / MiniMax M2.7', value: 'openrouter/minimax/minimax-m2.7' },
      { label: 'StepFun / Step 3.7 Flash', value: 'openrouter/stepfun/step-3.7-flash' },
    ],
    imageModels: [
      { label: 'OpenAI / GPT-5.4 Image 2', value: 'openrouter/openai/gpt-5.4-image-2' },
      { label: 'OpenAI / GPT-5 Image', value: 'openrouter/openai/gpt-5-image' },
      { label: 'OpenAI / GPT-5 Image Mini', value: 'openrouter/openai/gpt-5-image-mini' },
      { label: 'Google / Nano Banana 2', value: 'openrouter/google/gemini-3.1-flash-image-preview' },
      { label: 'Google / Nano Banana Pro', value: 'openrouter/google/gemini-3-pro-image-preview' },
      { label: 'Google / Nano Banana', value: 'openrouter/google/gemini-2.5-flash-image' },
      { label: 'xAI / Grok Imagine Image Quality', value: 'openrouter/x-ai/grok-imagine-image-quality' },
      { label: 'Recraft / Recraft V4.1 Pro', value: 'openrouter/recraft/recraft-v4.1-pro' },
      { label: 'Recraft / Recraft V4.1', value: 'openrouter/recraft/recraft-v4.1' },
      { label: 'Recraft / Recraft V4.1 Pro Vector', value: 'openrouter/recraft/recraft-v4.1-pro-vector' },
      { label: 'Black Forest Labs / FLUX.2 Pro', value: 'openrouter/black-forest-labs/flux.2-pro' },
      { label: 'Black Forest Labs / FLUX.2 Flex', value: 'openrouter/black-forest-labs/flux.2-flex' },
      { label: 'Black Forest Labs / FLUX.2 Max', value: 'openrouter/black-forest-labs/flux.2-max' },
      { label: 'ByteDance Seed / Seedream 4.5', value: 'openrouter/bytedance-seed/seedream-4.5' },
      { label: 'Sourceful / Riverflow V2 Pro', value: 'openrouter/sourceful/riverflow-v2-pro' },
      { label: 'Sourceful / Riverflow V2 Fast', value: 'openrouter/sourceful/riverflow-v2-fast' },
    ],
    visionModels: [
      { label: 'Google / Gemini 3.5 Flash', value: 'openrouter/google/gemini-3.5-flash' },
      { label: 'Google / Gemini 3.1 Flash Lite', value: 'openrouter/google/gemini-3.1-flash-lite' },
      { label: 'OpenAI / GPT Chat Latest', value: 'openrouter/openai/gpt-chat-latest' },
      { label: 'OpenAI / GPT Mini Latest', value: 'openrouter/~openai/gpt-mini-latest' },
      { label: 'Google / Gemini Flash Latest', value: 'openrouter/~google/gemini-flash-latest' },
      { label: 'Qwen / Qwen3.7 Plus', value: 'openrouter/qwen/qwen3.7-plus' },
      { label: 'Anthropic / Claude Opus 4.8', value: 'openrouter/anthropic/claude-opus-4.8' },
      { label: 'Anthropic / Claude Opus 4.8 Fast', value: 'openrouter/anthropic/claude-opus-4.8-fast' },
    ],
    guideSteps: ['登录 OpenRouter', '进入 Keys 页面创建 API Key', '复制 sk-or-v1- 开头密钥'],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    keyPlaceholder: 'AIza...',
    mainModel: 'gemini-3.7-flash',
    imageModel: 'gemini-3.1-flash-image',
    visionModel: 'gemini-3.7-flash',
    mainModels: [
      { label: 'Gemini 3.7 / Flash', value: 'gemini-3.7-flash' },
      { label: 'Gemini 3.6 / Flash', value: 'gemini-3.6-flash' },
      { label: 'Gemini 3.5 / Flash', value: 'gemini-3.5-flash' },
      { label: 'Gemini 3.1 / Pro Preview', value: 'gemini-3.1-pro-preview' },
      { label: 'Gemini 3.1 / Flash Lite', value: 'gemini-3.1-flash-lite' },
      { label: 'Gemini 3 / Flash Preview', value: 'gemini-3-flash-preview' },
      { label: 'Gemini 2.5 / Pro', value: 'gemini-2.5-pro' },
      { label: 'Gemini 2.5 / Flash', value: 'gemini-2.5-flash' },
      { label: 'Gemini 2.5 / Flash-Lite', value: 'gemini-2.5-flash-lite' },
    ],
    imageModels: [
      { label: 'Nano Banana 2 / Gemini 3.1 Flash Image', value: 'gemini-3.1-flash-image' },
      { label: 'Nano Banana Pro / Gemini 3 Pro Image', value: 'gemini-3-pro-image' },
      { label: 'Nano Banana / Gemini 2.5 Flash Image', value: 'gemini-2.5-flash-image' },
    ],
    visionModels: [
      { label: 'Gemini 3.7 / Flash', value: 'gemini-3.7-flash' },
      { label: 'Gemini 3.6 / Flash', value: 'gemini-3.6-flash' },
      { label: 'Gemini 3.5 / Flash', value: 'gemini-3.5-flash' },
      { label: 'Gemini 3.1 / Pro Preview', value: 'gemini-3.1-pro-preview' },
      { label: 'Gemini 2.5 / Pro', value: 'gemini-2.5-pro' },
      { label: 'Gemini 2.5 / Flash', value: 'gemini-2.5-flash' },
      { label: 'Gemini 2.5 / Flash-Lite', value: 'gemini-2.5-flash-lite' },
    ],
    guideSteps: ['登录 Google AI Studio', '创建 API key', '复制 AIza 开头密钥'],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keyPlaceholder: 'sk-...',
    mainModel: 'gpt-5.6-sol',
    imageModel: 'gpt-image-2',
    visionModel: 'gpt-5.6-sol',
    mainModels: [
      { label: 'GPT-5.6 / Sol', value: 'gpt-5.6-sol' },
      { label: 'GPT-5.6 / Terra', value: 'gpt-5.6-terra' },
      { label: 'GPT-5.6 / Luna', value: 'gpt-5.6-luna' },
      { label: 'GPT-5.5 / GPT-5.5', value: 'gpt-5.5' },
      { label: 'GPT-5.4 / GPT-5.4', value: 'gpt-5.4' },
      { label: 'GPT-5.4 / GPT-5.4 Mini', value: 'gpt-5.4-mini' },
      { label: 'GPT-5.4 / GPT-5.4 Nano', value: 'gpt-5.4-nano' },
      { label: 'GPT-5 / GPT-5 Mini', value: 'gpt-5-mini' },
      { label: 'GPT-4.1 / GPT-4.1', value: 'gpt-4.1' },
      { label: 'GPT-4.1 / GPT-4.1 Mini', value: 'gpt-4.1-mini' },
    ],
    imageModels: [
      { label: 'GPT Image / GPT Image 2', value: 'gpt-image-2' },
      { label: 'GPT Image / GPT Image 1', value: 'gpt-image-1' },
      { label: 'GPT Image / GPT Image 1 Mini', value: 'gpt-image-1-mini' },
    ],
    visionModels: [
      { label: 'GPT-5.6 / Sol', value: 'gpt-5.6-sol' },
      { label: 'GPT-5.6 / Terra', value: 'gpt-5.6-terra' },
      { label: 'GPT-5.6 / Luna', value: 'gpt-5.6-luna' },
      { label: 'GPT-4.1 / GPT-4.1', value: 'gpt-4.1' },
      { label: 'GPT-4.1 / GPT-4.1 Mini', value: 'gpt-4.1-mini' },
      { label: 'GPT-5 / GPT-5 Mini', value: 'gpt-5-mini' },
    ],
    guideSteps: ['登录 OpenAI Platform', '创建 secret key', '复制 sk- 开头密钥'],
  },
]

// 主模型能否直读参考图按模型固定判定，与 apps/web/src/constants.js 的 mainModelCanReadImages 同步。
export function mainModelCanReadImages(provider: string, model: string): boolean {
  const m = String(model || '').toLowerCase()
  if (provider === 'bailian') return /qwen3\.8-max|qwen3\.7-plus|qwen3\.5-omni|omni|kimi[\/-]kimi-k3|qwen-?vl|qwen3-?vl|-vl-|qvq/.test(m)
  if (provider === 'gemini') return true
  if (provider === 'openai') return /gpt-4|gpt-5|o4|gpt-4o|gpt-4.1/.test(m)
  if (provider === 'openrouter') return true
  return false
}

export const PIPELINE_OPTIONS = [
  { label: '规划器 + 评审器', value: 'planner_critic' },
  { label: '完整流程', value: 'full' },
  { label: '基础生成', value: 'vanilla' },
] as const

export const ASPECT_RATIO_OPTIONS = [
  { label: '16:9', value: '16:9' },
  { label: '21:9', value: '21:9' },
  { label: '3:2', value: '3:2' },
  { label: '1:1', value: '1:1' },
] as const

export const CANDIDATE_OPTIONS = [
  { label: '1 张', value: 1 },
  { label: '2 张', value: 2 },
  { label: '3 张', value: 3 },
] as const

export const CRITIC_ROUND_OPTIONS = [
  { label: '0 轮', value: 0 },
  { label: '1 轮', value: 1 },
  { label: '2 轮', value: 2 },
] as const

export const OUTPUT_FORMATS: { label: string; value: OutputFormat }[] = [
  { label: 'PNG 图片', value: 'png' },
  { label: 'SVG 矢量图', value: 'svg' },
]

// 输出清晰度：1K 仅基础渲染；2K/4K 出图后自动触发"精修放大"阶段（后端按档位驱动）。
export const RESOLUTION_OPTIONS: { label: string; value: ImageSize }[] = [
  { label: '1K（标准）', value: '1K' },
  { label: '2K（高清）', value: '2K' },
  { label: '4K（超清）', value: '4K' },
]

// 不同图像生成模型支持的清晰度子集，与 apps/web/src/constants.js 的 supportedResolutions 同步。
export function supportedResolutions(provider: string, _imageModel: string): ImageSize[] {
  if (provider === 'bailian') return ['1K', '2K']
  if (provider === 'gemini') return ['1K', '2K']
  if (provider === 'openai') return ['1K', '2K', '4K']
  if (provider === 'openrouter') return ['1K', '2K', '4K']
  return ['1K', '2K']
}

export const RETRIEVAL_OPTIONS: { label: string; value: RetrievalSetting }[] = [
  { label: '不使用检索', value: 'none' },
  { label: '自动检索', value: 'auto' },
  { label: '随机参考', value: 'random' },
  { label: '手动参考', value: 'manual' },
]

export const MANUAL_REFERENCE_LIMIT = 10

// "自动选择"已移除：缺省按 mainModelCanReadImages 固定派生（SYNC.md 2026-06-08）。
export const REFERENCE_IMAGE_MODES: { label: string; value: ReferenceImageMode }[] = [
  { label: '主模型直读', value: 'main_model' },
  { label: '独立识别模型', value: 'vision_model' },
]

export const REFERENCE_IMAGE_LIMITS = {
  maxCount: 3,
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
}

export const FEEDBACK_CATEGORIES: FeedbackCategoryOption[] = [
  { label: '问题反馈', value: 'bug' },
  { label: '功能建议', value: 'feature' },
  { label: '体验问题', value: 'experience' },
  { label: '其他', value: 'other' },
]

export const INFOGRAPHIC_CATEGORIES: InfographicCategory[] = [
  { id: 'method_framework', label: '方法框架图', description: '突出模块、智能体、输入输出和整体系统结构。' },
  { id: 'workflow', label: '流程图', description: '突出步骤顺序、决策节点、循环和执行路径。' },
  { id: 'system_architecture', label: '系统架构图', description: '突出前后端、数据层、模型接口和服务调用关系。' },
  { id: 'mechanism', label: '机制示意图', description: '突出核心原理、变量关系、因果链路和作用机制。' },
  { id: 'comparison', label: '对比图', description: '突出方法、模块、实验设置或方案之间的差异。' },
  { id: 'timeline', label: '时间线/路线图', description: '突出阶段、里程碑、演进过程和计划安排。' },
  { id: 'data_stat', label: '数据统计图', description: '突出指标、趋势、分布、占比或实验结果。' },
  { id: 'concept_map', label: '概念关系图', description: '突出关键词、层级、类别和概念之间的关系。' },
]

export const PLOT_CATEGORY_ID = 'data_stat'
export const PLOT_NOTE = '统计图由独立渲染服务生成，可能稍慢。'

export const QUICK_START_EXAMPLES: QuickStartExample[] = [
  {
    id: 'paper-framework',
    label: '论文框架',
    title: '检索增强多智能体框架',
    category: 'method_framework',
    caption: '图 1：检索增强多智能体学术图示生成框架总览。',
    methodContent: '我们提出一个用于学术图示生成的检索增强多智能体框架。用户输入论文方法内容和目标图注后，系统先由检索器从参考图例库中选取相似案例。规划器将论文文本拆解为模块、箭头关系和视觉层级，风格智能体补充论文发表所需的版式与配色建议。生成器依据视觉规格渲染多张候选图，评审器再检查语义一致性、结构完整性和可读性，并把修改意见反馈给生成器迭代优化。',
    hint: '把方法模块、输入输出、评价环节替换成自己的研究内容。',
  },
  {
    id: 'workflow-service',
    label: '流程说明',
    title: '资料整理与报告生成流程',
    category: 'workflow',
    caption: '图 1：面向资料整理与报告生成的智能工作流。',
    methodContent: '我们构建一个面向资料整理与报告生成的智能工作流。用户先上传课程资料、访谈记录或业务文档，并填写希望得到的报告主题。系统对输入材料进行解析、去重和分段，随后根据主题检索相关片段并生成报告提纲。内容生成模块按照提纲撰写初稿，人工审核节点负责补充事实、修改表达和确认结构。确认后的内容会进入排版与导出模块，最终生成可分享的图文报告或演示材料。',
    hint: '把资料来源、处理步骤、审核节点、交付物换成自己的业务场景。',
  },
]

export const STATUS_LABELS: Record<string, string> = {
  queued: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败',
}

export function getModelIndex(options: ModelOption[], value: string): number {
  const index = options.findIndex((option) => option.value === value)
  return index >= 0 ? index : 0
}

export function getModelLabel(options: ModelOption[], value: string): string {
  const option = options.find((item) => item.value === value)
  return option ? option.label : value
}

export function readPickerIndex(value: unknown, optionCount: number): number {
  const rawValue = Array.isArray(value) ? value[0] : value
  const index = Number(rawValue || 0)
  if (!Number.isFinite(index) || index < 0 || index >= optionCount) return 0
  return index
}

export function readDatasetBoolean(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return fallback
}
