import {
  FeedbackCategory,
  ImageSize,
  InfographicCategory,
  ModelOption,
  ProviderConfig,
  ProviderId,
  QuickStartExample,
  SelectOption,
} from '../models/Types'

export const API_BASE_DEFAULT: string = 'https://yifbnnzrwmxn.sealoshzh.site'
export const PAPERBANANA_API_PATH: string = '/paperbanana-api'
export const AUTH_API_PATH: string = '/api/auth'
export const CLIENT_VERSION: string = 'harmony-0.1.0'
export const PLOT_CATEGORY_ID: string = 'data_stat'

function model(value: string, label: string, group: string): ModelOption {
  return { value, label, group }
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'bailian',
    label: '阿里百炼',
    keyPlaceholder: 'sk-...',
    mainModel: 'qwen3.8-max',
    imageModel: 'wan2.7-image-pro',
    visionModel: 'qwen3.8-max',
    mainModels: [
      model('qwen3.8-max', 'Qwen3.8 Max', '通义千问'),
      model('qwen3.7-plus', 'Qwen3.7 Plus（可直读图）', '通义千问'),
      model('qwen3.7-flash', 'Qwen3.7 Flash', '通义千问'),
      model('deepseek-v4-pro', 'DeepSeek V4 Pro', '百炼第三方'),
      model('deepseek-v4-flash', 'DeepSeek V4 Flash', '百炼第三方'),
      model('kimi/kimi-k3', 'Kimi K3（可直读图）', '百炼第三方'),
      model('glm-5.2', 'GLM 5.2', '百炼第三方'),
      model('MiniMax/MiniMax-M3', 'MiniMax M3', '百炼第三方'),
    ],
    imageModels: [
      model('wan2.7-image-pro', 'Wan 2.7 Image Pro', '通义万相'),
      model('qwen-image-3.0-pro', 'Qwen Image 3.0 Pro', '通义千问 Image'),
      model('qwen-image-3.0', 'Qwen Image 3.0', '通义千问 Image'),
    ],
    visionModels: [
      model('qwen3.8-max', 'Qwen3.8 Max（图像理解）', '通义千问'),
      model('qwen3.7-plus', 'Qwen3.7 Plus（图像理解）', '通义千问'),
      model('qwen3.5-omni-plus', 'Qwen3.5 Omni Plus（全模态）', '通义千问'),
      model('kimi/kimi-k3', 'Kimi K3（图像理解）', '百炼第三方'),
    ],
    guideSteps: ['打开阿里云百炼控制台', '进入 API Key 页面创建密钥', '复制 sk- 开头密钥到应用'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyPlaceholder: 'sk-or-v1-...',
    mainModel: 'openrouter/openai/gpt-5.5',
    imageModel: 'openrouter/openai/gpt-5.4-image-2',
    visionModel: 'openrouter/google/gemini-3.5-flash',
    mainModels: [
      model('openrouter/openai/gpt-5.5', 'GPT-5.5', 'OpenAI'),
      model('openrouter/openai/gpt-5.5-pro', 'GPT-5.5 Pro', 'OpenAI'),
      model('openrouter/openai/gpt-5.4', 'GPT-5.4', 'OpenAI'),
      model('openrouter/openai/gpt-5.4-pro', 'GPT-5.4 Pro', 'OpenAI'),
      model('openrouter/openai/gpt-5.4-mini', 'GPT-5.4 Mini', 'OpenAI'),
      model('openrouter/openai/gpt-5.4-nano', 'GPT-5.4 Nano', 'OpenAI'),
      model('openrouter/openai/gpt-chat-latest', 'GPT Chat Latest', 'OpenAI'),
      model('openrouter/anthropic/claude-opus-4.8', 'Claude Opus 4.8', 'Anthropic'),
      model('openrouter/anthropic/claude-opus-4.8-fast', 'Claude Opus 4.8 Fast', 'Anthropic'),
      model('openrouter/~anthropic/claude-sonnet-latest', 'Claude Sonnet Latest', 'Anthropic'),
      model('openrouter/google/gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview', 'Google'),
      model('openrouter/google/gemini-3.5-flash', 'Gemini 3.5 Flash', 'Google'),
      model('openrouter/google/gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite', 'Google'),
      model('openrouter/qwen/qwen3.7-max', 'Qwen3.7 Max', 'Qwen'),
      model('openrouter/deepseek/deepseek-v4-pro', 'DeepSeek V4 Pro', 'DeepSeek'),
      model('openrouter/moonshotai/kimi-k2.6', 'Kimi K2.6', 'Moonshot'),
      model('openrouter/z-ai/glm-5.1', 'GLM 5.1', 'Z.ai'),
      model('openrouter/minimax/minimax-m2.7', 'MiniMax M2.7', 'MiniMax'),
    ],
    imageModels: [
      model('openrouter/openai/gpt-5.4-image-2', 'GPT-5.4 Image 2', 'OpenAI'),
      model('openrouter/openai/gpt-5-image', 'GPT-5 Image', 'OpenAI'),
      model('openrouter/openai/gpt-5-image-mini', 'GPT-5 Image Mini', 'OpenAI'),
      model('openrouter/google/gemini-3.1-flash-image-preview', 'Nano Banana 2', 'Google'),
      model('openrouter/google/gemini-3-pro-image-preview', 'Nano Banana Pro', 'Google'),
      model('openrouter/google/gemini-2.5-flash-image', 'Nano Banana', 'Google'),
      model('openrouter/recraft/recraft-v4.1-pro', 'Recraft V4.1 Pro', 'Recraft'),
      model('openrouter/black-forest-labs/flux.2-pro', 'FLUX.2 Pro', 'Black Forest Labs'),
      model('openrouter/bytedance-seed/seedream-4.5', 'Seedream 4.5', 'ByteDance Seed'),
    ],
    visionModels: [
      model('openrouter/google/gemini-3.5-flash', 'Gemini 3.5 Flash', 'Google'),
      model('openrouter/google/gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite', 'Google'),
      model('openrouter/openai/gpt-chat-latest', 'GPT Chat Latest', 'OpenAI'),
      model('openrouter/~openai/gpt-mini-latest', 'GPT Mini Latest', 'OpenAI'),
      model('openrouter/~google/gemini-flash-latest', 'Gemini Flash Latest', 'Google'),
      model('openrouter/qwen/qwen3.7-plus', 'Qwen3.7 Plus', 'Qwen'),
      model('openrouter/anthropic/claude-opus-4.8', 'Claude Opus 4.8', 'Anthropic'),
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
      model('gemini-3.7-flash', 'Gemini 3.7 Flash', 'Gemini 3.7'),
      model('gemini-3.6-flash', 'Gemini 3.6 Flash', 'Gemini 3.6'),
      model('gemini-3.5-flash', 'Gemini 3.5 Flash', 'Gemini 3.5'),
      model('gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview', 'Gemini 3.1'),
      model('gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite', 'Gemini 3.1'),
      model('gemini-2.5-pro', 'Gemini 2.5 Pro', 'Gemini 2.5'),
      model('gemini-2.5-flash', 'Gemini 2.5 Flash', 'Gemini 2.5'),
      model('gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', 'Gemini 2.5'),
    ],
    imageModels: [
      model('gemini-3.1-flash-image', 'Nano Banana 2 / Gemini 3.1 Flash Image', 'Nano Banana'),
      model('gemini-3-pro-image', 'Nano Banana Pro / Gemini 3 Pro Image', 'Nano Banana'),
      model('gemini-2.5-flash-image', 'Nano Banana / Gemini 2.5 Flash Image', 'Nano Banana'),
    ],
    visionModels: [
      model('gemini-3.7-flash', 'Gemini 3.7 Flash', 'Gemini 3.7'),
      model('gemini-3.6-flash', 'Gemini 3.6 Flash', 'Gemini 3.6'),
      model('gemini-3.5-flash', 'Gemini 3.5 Flash', 'Gemini 3.5'),
      model('gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview', 'Gemini 3.1'),
      model('gemini-2.5-pro', 'Gemini 2.5 Pro', 'Gemini 2.5'),
      model('gemini-2.5-flash', 'Gemini 2.5 Flash', 'Gemini 2.5'),
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
      model('gpt-5.6-sol', 'GPT-5.6 Sol', 'GPT-5.6'),
      model('gpt-5.6-terra', 'GPT-5.6 Terra', 'GPT-5.6'),
      model('gpt-5.6-luna', 'GPT-5.6 Luna', 'GPT-5.6'),
      model('gpt-5.5', 'GPT-5.5', 'GPT-5.5'),
      model('gpt-5.4', 'GPT-5.4', 'GPT-5.4'),
      model('gpt-5.4-mini', 'GPT-5.4 Mini', 'GPT-5.4'),
      model('gpt-5.4-nano', 'GPT-5.4 Nano', 'GPT-5.4'),
      model('gpt-5-mini', 'GPT-5 Mini', 'GPT-5'),
      model('gpt-4.1', 'GPT-4.1', 'GPT-4.1'),
      model('gpt-4.1-mini', 'GPT-4.1 Mini', 'GPT-4.1'),
    ],
    imageModels: [
      model('gpt-image-2', 'GPT Image 2', 'GPT Image'),
      model('gpt-image-1', 'GPT Image 1', 'GPT Image'),
      model('gpt-image-1-mini', 'GPT Image 1 Mini', 'GPT Image'),
    ],
    visionModels: [
      model('gpt-5.6-sol', 'GPT-5.6 Sol', 'GPT-5.6'),
      model('gpt-5.6-terra', 'GPT-5.6 Terra', 'GPT-5.6'),
      model('gpt-5.6-luna', 'GPT-5.6 Luna', 'GPT-5.6'),
      model('gpt-4.1', 'GPT-4.1', 'GPT-4.1'),
      model('gpt-4.1-mini', 'GPT-4.1 Mini', 'GPT-4.1'),
      model('gpt-5-mini', 'GPT-5 Mini', 'GPT-5'),
    ],
    guideSteps: ['登录 OpenAI Platform', '创建 secret key', '复制 sk- 开头密钥'],
  },
]

export const INFOGRAPHIC_CATEGORIES: InfographicCategory[] = [
  { id: 'method_framework', label: '方法框架图', description: '突出模块、智能体、输入输出和整体系统结构。' },
  { id: 'workflow', label: '流程图', description: '突出步骤顺序、决策节点、循环和执行路径。' },
  { id: 'system_architecture', label: '系统架构图', description: '突出前后端、数据层、模型接口和服务调用关系。' },
  { id: 'mechanism', label: '机制示意图', description: '突出核心原理、变量关系、因果链路和作用机制。' },
  { id: 'comparison', label: '对比图', description: '突出不同方法、模块、实验设置或方案之间的差异。' },
  { id: 'timeline', label: '时间线/路线图', description: '突出阶段、里程碑、演进过程和计划安排。' },
  { id: 'data_stat', label: '数据统计图', description: '突出指标、趋势、分布、占比或实验结果。' },
  { id: 'concept_map', label: '概念关系图', description: '突出关键词、层级、类别和概念之间的关系。' },
]

export const OUTPUT_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'png', label: 'PNG 图片' },
  { value: 'svg', label: 'SVG 矢量图' },
]

export const RESOLUTION_OPTIONS: SelectOption[] = [
  { value: '1K', label: '1K 标准' },
  { value: '2K', label: '2K 高清' },
  { value: '4K', label: '4K 超清' },
]

export const PIPELINE_OPTIONS: SelectOption[] = [
  { value: 'planner_critic', label: '规划器 + 评审器' },
  { value: 'full', label: '完整流程' },
  { value: 'vanilla', label: '基础生成' },
]

export const RETRIEVAL_OPTIONS: SelectOption[] = [
  { value: 'none', label: '不使用检索' },
  { value: 'auto', label: '自动检索' },
  { value: 'random', label: '随机参考' },
  { value: 'manual', label: '手动参考' },
]

export const ASPECT_RATIO_OPTIONS: SelectOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '21:9', label: '21:9' },
  { value: '3:2', label: '3:2' },
  { value: '1:1', label: '1:1' },
]

export const CANDIDATE_OPTIONS: SelectOption[] = [
  { value: '1', label: '1 张' },
  { value: '2', label: '2 张' },
  { value: '3', label: '3 张' },
  { value: '4', label: '4 张' },
]

export const CRITIC_ROUND_OPTIONS: SelectOption[] = [
  { value: '0', label: '0 轮' },
  { value: '1', label: '1 轮' },
  { value: '2', label: '2 轮' },
  { value: '3', label: '3 轮' },
]

export const FEEDBACK_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'experience', label: '体验问题' },
  { value: 'bug', label: '错误反馈' },
  { value: 'feature', label: '功能建议' },
  { value: 'other', label: '其他' },
]

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

interface StatusLabels {
  queued: string
  running: string
  succeeded: string
  failed: string
}

export const STATUS_LABELS: StatusLabels = {
  queued: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败',
}

interface ReferenceImageLimits {
  maxCount: number
  maxBytes: number
}

export const REFERENCE_IMAGE_LIMITS: ReferenceImageLimits = {
  maxCount: 3,
  maxBytes: 5 * 1024 * 1024,
}

export function providerById(id: string): ProviderConfig {
  return PROVIDERS.find((item: ProviderConfig) => item.id === id) || PROVIDERS[0]
}

export function categoryById(id: string): InfographicCategory {
  return INFOGRAPHIC_CATEGORIES.find((item: InfographicCategory) => item.id === id) || INFOGRAPHIC_CATEGORIES[0]
}

export function feedbackCategory(value: string): FeedbackCategory {
  if (value === 'bug' || value === 'feature' || value === 'experience' || value === 'other') return value
  return 'experience'
}

export function mainModelCanReadImages(provider: string, modelName: string): boolean {
  const m = String(modelName || '').toLowerCase()
  if (provider === 'bailian') return /qwen3\.8-max|qwen3\.7-plus|qwen3\.5-omni|omni|kimi[\/-]kimi-k3|qwen-?vl|qwen3-?vl|-vl-|qvq/.test(m)
  if (provider === 'gemini') return true
  if (provider === 'openai') return /gpt-4|gpt-5|o4|gpt-4o|gpt-4.1/.test(m)
  if (provider === 'openrouter') return true
  return false
}

export function supportedResolutions(provider: string, _imageModel: string): ImageSize[] {
  if (provider === 'bailian') return ['1K', '2K']
  if (provider === 'gemini') return ['1K', '2K']
  if (provider === 'openai') return ['1K', '2K', '4K']
  if (provider === 'openrouter') return ['1K', '2K', '4K']
  return ['1K', '2K']
}
