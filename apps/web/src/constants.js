export function mainModelCanReadImages(provider, model) {
  const m = String(model || '').toLowerCase()
  if (provider === 'bailian') return /qwen3\.8-max|qwen3\.7-plus|qwen3\.5-omni|omni|kimi[\/-]kimi-k3|qwen-?vl|qwen3-?vl|-vl-|qvq/.test(m)
  if (provider === 'gemini') return true
  if (provider === 'openai') return /gpt-4|gpt-5|o4|gpt-4o|gpt-4.1/.test(m)
  if (provider === 'openrouter') return true
  if (provider === 'ark') return true
  return false
}

export const PROVIDERS = {
  openrouter: {
    label: 'OpenRouter',
    keyName: 'openrouter',
    keyPlaceholder: 'sk-or-v1-...',
    mainModel: 'openai/gpt-5.6-sol',
    imageModel: 'sourceful/riverflow-v2.5-pro',
    visionModel: 'google/gemini-3.7-flash',
    mainModels: [
      ['openai/gpt-5.6-sol', 'GPT-5.6 Sol', 'OpenAI'],
      ['openrouter/openai/gpt-5.5', 'GPT-5.5', 'OpenAI'],
      ['openrouter/openai/gpt-5.5-pro', 'GPT-5.5 Pro', 'OpenAI'],
      ['openrouter/openai/gpt-5.4', 'GPT-5.4', 'OpenAI'],
      ['openrouter/openai/gpt-5.4-pro', 'GPT-5.4 Pro', 'OpenAI'],
      ['openrouter/openai/gpt-5.4-mini', 'GPT-5.4 Mini', 'OpenAI'],
      ['openrouter/openai/gpt-5.4-nano', 'GPT-5.4 Nano', 'OpenAI'],
      ['openrouter/openai/gpt-chat-latest', 'GPT Chat Latest', 'OpenAI'],
      ['openrouter/~openai/gpt-latest', 'GPT Latest', 'OpenAI'],
      ['openrouter/~openai/gpt-mini-latest', 'GPT Mini Latest', 'OpenAI'],
      ['openrouter/anthropic/claude-opus-4.8', 'Claude Opus 4.8', 'Anthropic'],
      ['openrouter/anthropic/claude-opus-4.8-fast', 'Claude Opus 4.8 Fast', 'Anthropic'],
      ['openrouter/anthropic/claude-opus-4.7', 'Claude Opus 4.7', 'Anthropic'],
      ['openrouter/anthropic/claude-opus-4.7-fast', 'Claude Opus 4.7 Fast', 'Anthropic'],
      ['openrouter/~anthropic/claude-opus-latest', 'Claude Opus Latest', 'Anthropic'],
      ['openrouter/~anthropic/claude-sonnet-latest', 'Claude Sonnet Latest', 'Anthropic'],
      ['openrouter/google/gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview', 'Google'],
      ['openrouter/google/gemini-3.5-flash', 'Gemini 3.5 Flash', 'Google'],
      ['openrouter/google/gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite', 'Google'],
      ['openrouter/google/gemini-3.1-flash-lite-preview', 'Gemini 3.1 Flash Lite Preview', 'Google'],
      ['openrouter/~google/gemini-pro-latest', 'Gemini Pro Latest', 'Google'],
      ['openrouter/~google/gemini-flash-latest', 'Gemini Flash Latest', 'Google'],
      ['openrouter/qwen/qwen3.7-max', 'Qwen3.7 Max', 'Qwen'],
      ['openrouter/qwen/qwen3.6-plus', 'Qwen3.6 Plus', 'Qwen'],
      ['openrouter/qwen/qwen3.6-flash', 'Qwen3.6 Flash', 'Qwen'],
      ['openrouter/qwen/qwen3.6-max-preview', 'Qwen3.6 Max Preview', 'Qwen'],
      ['openrouter/qwen/qwen3.5-plus-20260420', 'Qwen3.5 Plus 2026-04-20', 'Qwen'],
      ['openrouter/deepseek/deepseek-v4-pro', 'DeepSeek V4 Pro', 'DeepSeek'],
      ['openrouter/deepseek/deepseek-v4-flash', 'DeepSeek V4 Flash', 'DeepSeek'],
      ['openrouter/x-ai/grok-4.3', 'Grok 4.3', 'xAI'],
      ['openrouter/x-ai/grok-4.20', 'Grok 4.20', 'xAI'],
      ['openrouter/x-ai/grok-4.20-multi-agent', 'Grok 4.20 Multi-Agent', 'xAI'],
      ['openrouter/x-ai/grok-build-0.1', 'Grok Build 0.1', 'xAI'],
      ['openrouter/moonshotai/kimi-k2.6', 'Kimi K2.6', 'Moonshot'],
      ['openrouter/z-ai/glm-5.1', 'GLM 5.1', 'Z.ai'],
      ['openrouter/minimax/minimax-m2.7', 'MiniMax M2.7', 'MiniMax'],
      ['openrouter/stepfun/step-3.7-flash', 'Step 3.7 Flash', 'StepFun'],
    ],
    imageModels: [
      ['sourceful/riverflow-v2.5-pro', 'Riverflow 2.5 Pro', 'Sourceful'],
      ['openrouter/openai/gpt-5.4-image-2', 'GPT-5.4 Image 2', 'OpenAI'],
      ['openrouter/openai/gpt-5-image', 'GPT-5 Image', 'OpenAI'],
      ['openrouter/openai/gpt-5-image-mini', 'GPT-5 Image Mini', 'OpenAI'],
      ['openrouter/google/gemini-3.1-flash-image-preview', 'Nano Banana 2 / Gemini 3.1 Flash Image Preview', 'Google'],
      ['openrouter/google/gemini-3-pro-image-preview', 'Nano Banana Pro / Gemini 3 Pro Image Preview', 'Google'],
      ['openrouter/google/gemini-2.5-flash-image', 'Nano Banana / Gemini 2.5 Flash Image', 'Google'],
      ['openrouter/x-ai/grok-imagine-image-quality', 'Grok Imagine Image Quality', 'xAI'],
      ['openrouter/recraft/recraft-v4.1-pro', 'Recraft V4.1 Pro', 'Recraft'],
      ['openrouter/recraft/recraft-v4.1', 'Recraft V4.1', 'Recraft'],
      ['openrouter/recraft/recraft-v4.1-pro-vector', 'Recraft V4.1 Pro Vector', 'Recraft'],
      ['openrouter/black-forest-labs/flux.2-pro', 'FLUX.2 Pro', 'Black Forest Labs'],
      ['openrouter/black-forest-labs/flux.2-flex', 'FLUX.2 Flex', 'Black Forest Labs'],
      ['openrouter/black-forest-labs/flux.2-max', 'FLUX.2 Max', 'Black Forest Labs'],
      ['openrouter/bytedance-seed/seedream-4.5', 'Seedream 4.5', 'ByteDance Seed'],
      ['openrouter/sourceful/riverflow-v2-pro', 'Riverflow V2 Pro', 'Sourceful'],
      ['openrouter/sourceful/riverflow-v2-fast', 'Riverflow V2 Fast', 'Sourceful'],
    ],
    visionModels: [
      ['google/gemini-3.7-flash', 'Gemini 3.7 Flash', 'Google'],
      ['openrouter/google/gemini-3.5-flash', 'Gemini 3.5 Flash', 'Google'],
      ['openrouter/google/gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite', 'Google'],
      ['openrouter/openai/gpt-chat-latest', 'GPT Chat Latest', 'OpenAI'],
      ['openrouter/~openai/gpt-mini-latest', 'GPT Mini Latest', 'OpenAI'],
      ['openrouter/~google/gemini-flash-latest', 'Gemini Flash Latest', 'Google'],
      ['openrouter/qwen/qwen3.7-plus', 'Qwen3.7 Plus', 'Qwen'],
      ['openrouter/anthropic/claude-opus-4.8', 'Claude Opus 4.8', 'Anthropic'],
      ['openrouter/anthropic/claude-opus-4.8-fast', 'Claude Opus 4.8 Fast', 'Anthropic'],
    ],
    guideUrl: 'https://openrouter.ai/settings/keys',
    guideSteps: [
      '登录 OpenRouter，进入 Keys 页面。',
      '点击 Create Key，创建一个新的 API Key。',
      '复制 sk-or-v1- 开头的密钥，粘贴到上方输入框。',
    ],
  },
  gemini: {
    label: 'Google Gemini API',
    keyName: 'gemini',
    keyPlaceholder: 'AIza...',
    mainModel: 'gemini-3.7-flash',
    imageModel: 'gemini-3.1-flash-image',
    visionModel: 'gemini-3.7-flash',
    mainModels: [
      ['gemini-3.7-flash', 'Gemini 3.7 Flash', 'Gemini 3.7'],
      ['gemini-3.6-flash', 'Gemini 3.6 Flash', 'Gemini 3.6'],
      ['gemini-3.5-flash', 'Gemini 3.5 Flash', 'Gemini 3.5'],
      ['gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview', 'Gemini 3.1'],
      ['gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite', 'Gemini 3.1'],
      ['gemini-3-flash-preview', 'Gemini 3 Flash Preview', 'Gemini 3'],
      ['gemini-2.5-pro', 'Gemini 2.5 Pro', 'Gemini 2.5'],
      ['gemini-2.5-flash', 'Gemini 2.5 Flash', 'Gemini 2.5'],
      ['gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', 'Gemini 2.5'],
    ],
    imageModels: [
      ['gemini-3.1-flash-image', 'Nano Banana 2 / Gemini 3.1 Flash Image', 'Nano Banana'],
      ['gemini-3-pro-image', 'Nano Banana Pro / Gemini 3 Pro Image', 'Nano Banana'],
      ['gemini-2.5-flash-image', 'Nano Banana / Gemini 2.5 Flash Image', 'Nano Banana'],
    ],
    visionModels: [
      ['gemini-3.7-flash', 'Gemini 3.7 Flash', 'Gemini 3.7'],
      ['gemini-3.6-flash', 'Gemini 3.6 Flash', 'Gemini 3.6'],
      ['gemini-3.5-flash', 'Gemini 3.5 Flash', 'Gemini 3.5'],
      ['gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview', 'Gemini 3.1'],
      ['gemini-2.5-pro', 'Gemini 2.5 Pro', 'Gemini 2.5'],
      ['gemini-2.5-flash', 'Gemini 2.5 Flash', 'Gemini 2.5'],
      ['gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', 'Gemini 2.5'],
    ],
    guideUrl: 'https://aistudio.google.com/app/apikey',
    guideSteps: [
      '登录 Google AI Studio，进入 API Keys 页面。',
      '点击 Create API key，选择或创建项目。',
      '复制生成的 AIza 开头密钥，粘贴到上方输入框。',
    ],
  },
  openai: {
    label: 'OpenAI',
    keyName: 'openai',
    keyPlaceholder: 'sk-...',
    mainModel: 'gpt-5.6-sol',
    imageModel: 'gpt-image-2',
    visionModel: 'gpt-5.6-sol',
    mainModels: [
      ['gpt-5.6-sol', 'GPT-5.6 Sol', 'GPT-5.6'],
      ['gpt-5.6-terra', 'GPT-5.6 Terra', 'GPT-5.6'],
      ['gpt-5.6-luna', 'GPT-5.6 Luna', 'GPT-5.6'],
      ['gpt-5.5', 'GPT-5.5', 'GPT-5.5'],
      ['gpt-5.4', 'GPT-5.4', 'GPT-5.4'],
      ['gpt-5.4-mini', 'GPT-5.4 Mini', 'GPT-5.4'],
      ['gpt-5.4-nano', 'GPT-5.4 Nano', 'GPT-5.4'],
      ['gpt-5-mini', 'GPT-5 Mini', 'GPT-5'],
      ['gpt-4.1', 'GPT-4.1', 'GPT-4.1'],
      ['gpt-4.1-mini', 'GPT-4.1 Mini', 'GPT-4.1'],
    ],
    imageModels: [
      ['gpt-image-2', 'GPT Image 2', 'GPT Image'],
      ['gpt-image-1', 'GPT Image 1', 'GPT Image'],
      ['gpt-image-1-mini', 'GPT Image 1 Mini', 'GPT Image'],
    ],
    visionModels: [
      ['gpt-5.6-sol', 'GPT-5.6 Sol', 'GPT-5.6'],
      ['gpt-5.6-terra', 'GPT-5.6 Terra', 'GPT-5.6'],
      ['gpt-5.6-luna', 'GPT-5.6 Luna', 'GPT-5.6'],
      ['gpt-4.1', 'GPT-4.1', 'GPT-4.1'],
      ['gpt-4.1-mini', 'GPT-4.1 Mini', 'GPT-4.1'],
      ['gpt-5-mini', 'GPT-5 Mini', 'GPT-5'],
    ],
    guideUrl: 'https://platform.openai.com/api-keys',
    guideSteps: [
      '登录 OpenAI Platform，进入 API keys 页面。',
      '点击 Create new secret key，创建密钥。',
      '复制 sk- 开头的密钥，粘贴到上方输入框。',
    ],
  },
  bailian: {
    label: '阿里百炼',
    keyName: 'bailian',
    keyPlaceholder: 'sk-...',
    mainModel: 'qwen3.8-max',
    imageModel: 'wan2.7-image-pro',
    visionModel: 'qwen3.7-plus',
    mainModels: [
      ['qwen3.8-max', 'Qwen3.8 Max（可直读图）', '通义千问'],
      ['qwen3.7-plus', 'Qwen3.7 Plus（可直读图）', '通义千问'],
      ['qwen3.7-flash', 'Qwen3.7 Flash', '通义千问'],
      ['deepseek-v4-pro', 'DeepSeek V4 Pro', '百炼第三方'],
      ['deepseek-v4-flash', 'DeepSeek V4 Flash', '百炼第三方'],
      ['kimi/kimi-k3', 'Kimi K3（可直读图）', '百炼第三方'],
      ['glm-5.2', 'GLM 5.2', '百炼第三方'],
      ['MiniMax/MiniMax-M3', 'MiniMax M3', '百炼第三方'],
    ],
    imageModels: [
      ['wan2.7-image-pro', 'Wan 2.7 Image Pro', '通义万相'],
      ['qwen-image-3.0-pro', 'Qwen Image 3.0 Pro', '通义千问 Image'],
      ['qwen-image-3.0', 'Qwen Image 3.0', '通义千问 Image'],
    ],
    visionModels: [
      ['qwen3.8-max', 'Qwen3.8 Max（图像理解）', '通义千问'],
      ['qwen3.7-plus', 'Qwen3.7 Plus（图像理解）', '通义千问'],
      ['qwen3.5-omni-plus', 'Qwen3.5 Omni Plus（全模态）', '通义千问'],
      ['kimi/kimi-k3', 'Kimi K3（图像理解）', '百炼第三方'],
    ],
    guideUrl: 'https://help.aliyun.com/zh/model-studio/get-api-key',
    guideSteps: [
      '登录阿里云百炼控制台，确认已开通百炼模型服务。',
      '进入 API Key 页面，点击创建 API Key。',
      '建议选择默认业务空间和全部权限，复制 sk- 开头密钥。',
    ],
  },
  ark: {
    label: '火山方舟',
    keyName: 'ark',
    keyPlaceholder: 'Ark Inference API Key',
    mainModel: 'doubao-seed-2-0-mini-260428',
    imageModel: 'doubao-seedream-4-0-250828',
    visionModel: 'doubao-seed-2-0-mini-260428',
    mainModels: [
      ['doubao-seed-2-0-mini-260428', 'Doubao Seed 2.0 Mini', 'ByteDance Doubao'],
      ['doubao-seed-2-0-lite-260428', 'Doubao Seed 2.0 Lite', 'ByteDance Doubao'],
    ],
    imageModels: [
      ['doubao-seedream-4-0-250828', 'Doubao Seedream 4.0', 'ByteDance Seedream'],
    ],
    visionModels: [
      ['doubao-seed-2-0-mini-260428', 'Doubao Seed 2.0 Mini', 'ByteDance Doubao'],
      ['doubao-seed-2-0-lite-260428', 'Doubao Seed 2.0 Lite', 'ByteDance Doubao'],
    ],
    guideUrl: 'https://console.volcengine.com/ark/',
    guideSteps: [
      '登录火山方舟控制台，开通所需模型的推理服务。',
      '创建推理 API Key；该 Key 不能读取需要 AK/SK 的完整激活目录。',
      '粘贴 Key 后手动点击“验证所选模型”，图片验证会产生一次 1K 调用费用。',
    ],
  },
};

export const REFERENCE_IMAGE_LIMITS = {
  maxCount: 3,
  maxBytes: 5 * 1024 * 1024,
  accept: 'image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg',
  mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
};

export const SAMPLE_METHOD = `我们提出一个用于学术图示生成的检索增强多智能体框架。检索器会先从参考库中选择相关图例，规划器再把论文方法部分和目标图注转换为详细的视觉规格。风格智能体会补充适合论文发表的版式与配色建议，生成器据此渲染多张候选图，评审器则迭代检查语义一致性与可读性。`;

export const INFOGRAPHIC_CATEGORIES = [
  ['method_framework', '方法框架图', '突出模块、智能体、输入输出和整体系统结构。'],
  ['workflow', '流程图', '突出步骤顺序、决策节点、循环和执行路径。'],
  ['system_architecture', '系统架构图', '突出前后端、数据层、模型接口和服务调用关系。'],
  ['mechanism', '机制示意图', '突出核心原理、变量关系、因果链路和作用机制。'],
  ['comparison', '对比图', '突出不同方法、模块、实验设置或方案之间的差异。'],
  ['timeline', '时间线/路线图', '突出阶段、里程碑、演进过程和计划安排。'],
  ['data_stat', '数据统计图', '突出指标、趋势、分布、占比或实验结果。'],
  ['concept_map', '概念关系图', '突出关键词、层级、类别和概念之间的关系。'],
];

export const OUTPUT_FORMATS = [
  ['png', 'PNG 图片'],
  ['svg', 'SVG 矢量图'],
];

export const RESOLUTION_OPTIONS = [['1K', '1K（标准）'], ['2K', '2K（高清）'], ['4K', '4K（超清）']];

// 不同图像生成模型支持的清晰度子集（自动精修由清晰度档位驱动）。
export function supportedResolutions(provider, imageModel) {
  if (provider === 'bailian') return ['1K', '2K'];
  if (provider === 'gemini') return ['1K', '2K'];
  if (provider === 'openai') return ['1K', '2K', '4K'];
  if (provider === 'openrouter') return ['1K', '2K', '4K'];
  if (provider === 'ark') return ['1K', '2K', '4K'];
  return ['1K', '2K'];
}

export const REFERENCE_IMAGE_MODES = [
  ['main_model', '主模型直读'],
  ['vision_model', '独立识别模型'],
];

export const QUICK_START_EXAMPLES = [
  {
    id: 'paper-framework',
    label: '论文框架',
    title: '检索增强多智能体框架',
    category: 'method_framework',
    caption: '图 1：检索增强多智能体学术图示生成框架总览。',
    methodContent: `我们提出一个用于学术图示生成的检索增强多智能体框架。用户输入论文方法内容和目标图注后，系统先由检索器从参考图例库中选取相似案例。规划器将论文文本拆解为模块、箭头关系和视觉层级，风格智能体补充论文发表所需的版式与配色建议。生成器依据视觉规格渲染多张候选图，评审器再检查语义一致性、结构完整性和可读性，并把修改意见反馈给生成器迭代优化。`,
    hint: '把方法模块、输入输出、评价环节替换成自己的研究内容。',
  },
  {
    id: 'workflow-service',
    label: '流程说明',
    title: '资料整理与报告生成流程',
    category: 'workflow',
    caption: '图 1：面向资料整理与报告生成的智能工作流。',
    methodContent: `我们构建一个面向资料整理与报告生成的智能工作流。用户先上传课程资料、访谈记录或业务文档，并填写希望得到的报告主题。系统对输入材料进行解析、去重和分段，随后根据主题检索相关片段并生成报告提纲。内容生成模块按照提纲撰写初稿，人工审核节点负责补充事实、修改表达和确认结构。确认后的内容会进入排版与导出模块，最终生成可分享的图文报告或演示材料。`,
    hint: '把资料来源、处理步骤、审核节点、交付物换成自己的业务场景。',
  },
];

export const STATUS_LABELS = {
  queued: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败',
};
