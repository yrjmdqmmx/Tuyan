import { MODEL_CHANNEL_LABELS } from './lib/modelPresentation.js'
import { EXTENDED_MODEL_CHANNELS, STATIC_MODEL_REGISTRY } from './lib/staticModelCatalog.js'
export function mainModelCanReadImages(provider, model) {
  const known = STATIC_MODEL_REGISTRY[provider]?.models.find((entry) => entry.id === model)
  if (known) return known.roles.includes('main') && known.inputModalities.includes('image')
  const m = String(model || '').toLowerCase()
  if (provider === 'bailian') return /qwen3\.8-(?:max|flash|27b)|zhipu\/glm-5\.3-flash|qwen3\.7-plus|qwen3\.5-omni|omni|(?:kimi\/)?kimi-k3|qwen-?vl|qwen3-?vl|-vl-|qvq/.test(m)
  if (provider === 'gemini') return true
  if (provider === 'openai') return /gpt-6-astra|gpt-4|gpt-5|o4|gpt-4o|gpt-4.1/.test(m)
  if (provider === 'openrouter') return true
  if (provider === 'ark') return true
  return Boolean(PROVIDERS[provider]?.visionModels.some(([id]) => id === model))
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
      ['openrouter/openai/gpt-6-astra', 'GPT-6 Astra', 'OpenAI'],
      ['openrouter/openai/gpt-6-astra-pro', 'GPT-6 Astra Pro', 'OpenAI'],
      ['openrouter/google/gemini-3.8-flash', 'Gemini 3.8 Flash', 'Google'],
      ['openrouter/qwen/qwen3.8-max-0902', 'Qwen3.8 Max 0902', 'Qwen'],
      ['openrouter/qwen/qwen3.8-flash', 'Qwen3.8 Flash', 'Qwen'],
      ['openrouter/anthropic/claude-fable-5.1', 'Claude Fable 5.1', 'Anthropic'],
      ['openrouter/z-ai/glm-5.3-flash', 'GLM 5.3 Flash', 'Z.ai'],
      ['openrouter/deepseek/deepseek-v4-flash-vision-exp', 'DeepSeek V4 Flash Vision Experimental', '深度求索'],
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
      ['openrouter/deepseek/deepseek-v4-pro', 'DeepSeek V4 Pro', '深度求索'],
      ['openrouter/deepseek/deepseek-v4-flash', 'DeepSeek V4 Flash', '深度求索'],
      ['openrouter/x-ai/grok-4.3', 'Grok 4.3', 'SpaceXAI'],
      ['openrouter/x-ai/grok-4.20', 'Grok 4.20', 'SpaceXAI'],
      ['openrouter/x-ai/grok-4.20-multi-agent', 'Grok 4.20 Multi-Agent', 'SpaceXAI'],
      ['openrouter/x-ai/grok-build-0.1', 'Grok Build 0.1', 'SpaceXAI'],
      ['openrouter/moonshotai/kimi-k2.6', 'Kimi K2.6', 'Moonshot'],
      ['openrouter/z-ai/glm-5.1', 'GLM 5.1', 'Z.ai'],
      ['openrouter/minimax/minimax-m2.7', 'MiniMax M2.7', 'MiniMax'],
      ['openrouter/stepfun/step-3.7-flash', 'Step 3.7 Flash', 'StepFun'],
    ],
    imageModels: [
      ['openrouter/microsoft/mai-image-2.6', 'MAI Image 2.6', 'Microsoft'],
      ['openrouter/microsoft/mai-image-2.6-flash', 'MAI Image 2.6 Flash', 'Microsoft'],
      ['sourceful/riverflow-v2.5-pro', 'Riverflow 2.5 Pro', 'Sourceful'],
      ['openrouter/openai/gpt-5.4-image-2', 'GPT-5.4 Image 2', 'OpenAI'],
      ['openrouter/openai/gpt-5-image', 'GPT-5 Image', 'OpenAI'],
      ['openrouter/openai/gpt-5-image-mini', 'GPT-5 Image Mini', 'OpenAI'],
      ['openrouter/google/gemini-3.1-flash-image-preview', 'Nano Banana 2 / Gemini 3.1 Flash Image Preview', 'Google'],
      ['openrouter/google/gemini-3-pro-image-preview', 'Nano Banana Pro / Gemini 3 Pro Image Preview', 'Google'],
      ['openrouter/google/gemini-2.5-flash-image', 'Nano Banana / Gemini 2.5 Flash Image', 'Google'],
      ['openrouter/x-ai/grok-imagine-image-quality', 'Grok Imagine Image Quality', 'SpaceXAI'],
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
      ['openrouter/openai/gpt-6-astra', 'GPT-6 Astra', 'OpenAI'],
      ['openrouter/openai/gpt-6-astra-pro', 'GPT-6 Astra Pro', 'OpenAI'],
      ['openrouter/google/gemini-3.8-flash', 'Gemini 3.8 Flash', 'Google'],
      ['openrouter/qwen/qwen3.8-max-0902', 'Qwen3.8 Max 0902', 'Qwen'],
      ['openrouter/qwen/qwen3.8-flash', 'Qwen3.8 Flash', 'Qwen'],
      ['openrouter/anthropic/claude-fable-5.1', 'Claude Fable 5.1', 'Anthropic'],
      ['openrouter/z-ai/glm-5.3-flash', 'GLM 5.3 Flash', 'Z.ai'],
      ['openrouter/deepseek/deepseek-v4-flash-vision-exp', 'DeepSeek V4 Flash Vision Experimental', '深度求索'],
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
    label: 'Google',
    keyName: 'gemini',
    keyPlaceholder: 'AIza...',
    mainModel: 'gemini-3.7-flash',
    imageModel: 'gemini-3.1-flash-image',
    visionModel: 'gemini-3.7-flash',
    mainModels: [
      ['gemini-3.8-flash', 'Gemini 3.8 Flash', 'Google'],
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
      ['gemini-3.8-flash', 'Gemini 3.8 Flash', 'Google'],
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
      ['gpt-6-astra', 'GPT-6 Astra', 'OpenAI'],
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
      ['gpt-6-astra', 'GPT-6 Astra', 'OpenAI'],
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
      ['qwen3.8-max-0902', 'Qwen3.8 Max 0902', 'Alibaba Qwen'],
      ['qwen3.8-flash', 'Qwen3.8 Flash', 'Alibaba Qwen'],
      ['qwen3.8-27b', 'Qwen3.8 27B', 'Alibaba Qwen'],
      ['qwen3.8-2.4t-a95b', 'Qwen3.8 2.4T A95B', 'Alibaba Qwen'],
      ['deepseek-v4-pro-0813', 'DeepSeek V4 Pro 0813', '深度求索'],
      ['deepseek-v4-flash-0731', 'DeepSeek V4 Flash 0731', '深度求索'],
      ['ZHIPU/GLM-5.3', 'GLM 5.3', 'Zhipu'],
      ['ZHIPU/GLM-5.3-Flash', 'GLM 5.3 Flash', 'Zhipu'],
      ['kimi-k3', 'Kimi K3 (Bailian hosted)', 'Moonshot AI'],
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
      ['qwen3.8-max-0902', 'Qwen3.8 Max 0902', 'Alibaba Qwen'],
      ['qwen3.8-flash', 'Qwen3.8 Flash', 'Alibaba Qwen'],
      ['qwen3.8-27b', 'Qwen3.8 27B', 'Alibaba Qwen'],
      ['ZHIPU/GLM-5.3-Flash', 'GLM 5.3 Flash', 'Zhipu'],
      ['kimi-k3', 'Kimi K3 (Bailian hosted)', 'Moonshot AI'],
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
    mainModel: 'doubao-seed-2-1-pro-260628',
    imageModel: 'doubao-seedream-5-0-pro-260628',
    visionModel: 'doubao-seed-2-1-pro-260628',
    mainModels: [
      ['doubao-seed-2-1-pro-260628', 'Doubao Seed 2.1 Pro', 'ByteDance Doubao'],
      ['doubao-seed-2-1-turbo-260628', 'Doubao Seed 2.1 Turbo', 'ByteDance Doubao'],
      ['doubao-seed-evolving', 'Doubao Seed Evolving', 'ByteDance Doubao'],
      ['doubao-seed-2-0-lite-260428', 'Doubao Seed 2.0 Lite', 'ByteDance Doubao'],
      ['doubao-seed-2-0-mini-260428', 'Doubao Seed 2.0 Mini', 'ByteDance Doubao'],
      ['doubao-seed-2-0-pro-260215', 'Doubao Seed 2.0 Pro', 'ByteDance Doubao'],
      ['doubao-seed-2-0-lite-260215', 'Doubao Seed 2.0 Lite (2026-02)', 'ByteDance Doubao'],
      ['doubao-seed-2-0-mini-260215', 'Doubao Seed 2.0 Mini (2026-02)', 'ByteDance Doubao'],
      ['doubao-seed-2-0-code-preview-260215', 'Doubao Seed 2.0 Code Preview', 'ByteDance Doubao'],
      ['glm-5-2-260617', 'GLM 5.2', 'Zhipu'],
      ['deepseek-v4-pro-ga-260813', 'DeepSeek V4 Pro GA', '深度求索'],
      ['deepseek-v4-flash-ga-260731', 'DeepSeek V4 Flash GA', '深度求索'],
      ['deepseek-v4-pro-260425', 'DeepSeek V4 Pro', '深度求索'],
      ['deepseek-v4-flash-260425', 'DeepSeek V4 Flash', '深度求索'],
    ],
    imageModels: [
      ['doubao-seedream-5-0-pro-260628', 'Doubao Seedream 5.0 Pro', 'ByteDance Seedream'],
      ['doubao-seedream-5-0-260128', 'Doubao Seedream 5.0', 'ByteDance Seedream'],
      ['doubao-seedream-4-5-251128', 'Doubao Seedream 4.5', 'ByteDance Seedream'],
      ['doubao-seedream-4-0-250828', 'Doubao Seedream 4.0', 'ByteDance Seedream'],
    ],
    visionModels: [
      ['doubao-seed-2-1-pro-260628', 'Doubao Seed 2.1 Pro', 'ByteDance Doubao'],
      ['doubao-seed-2-1-turbo-260628', 'Doubao Seed 2.1 Turbo', 'ByteDance Doubao'],
      ['doubao-seed-evolving', 'Doubao Seed Evolving', 'ByteDance Doubao'],
      ['doubao-seed-2-0-lite-260428', 'Doubao Seed 2.0 Lite', 'ByteDance Doubao'],
      ['doubao-seed-2-0-mini-260428', 'Doubao Seed 2.0 Mini', 'ByteDance Doubao'],
      ['doubao-seed-2-0-pro-260215', 'Doubao Seed 2.0 Pro', 'ByteDance Doubao'],
      ['doubao-seed-2-0-lite-260215', 'Doubao Seed 2.0 Lite (2026-02)', 'ByteDance Doubao'],
      ['doubao-seed-2-0-mini-260215', 'Doubao Seed 2.0 Mini (2026-02)', 'ByteDance Doubao'],
      ['doubao-seed-2-0-code-preview-260215', 'Doubao Seed 2.0 Code Preview', 'ByteDance Doubao'],
    ],
    guideUrl: 'https://console.volcengine.com/ark/',
    guideSteps: [
      '登录火山方舟控制台，开通所需模型的推理服务。',
      '创建推理 API Key；该 Key 不能读取需要 AK/SK 的完整激活目录。',
      '如需提前确认账号可用性，可手动点击“验证所选模型”；图片验证会按该模型的最低支持分辨率产生一次调用费用。',
    ],
  },
  deepseek: {
    "label": "深度求索",
    "keyName": "deepseek",
    "keyPlaceholder": "sk-...",
    "mainModel": "deepseek-v4-pro",
    "imageModel": "",
    "visionModel": "deepseek-v4-flash-vision-exp",
    "mainModels": [
      [
        "deepseek-v4-pro",
        "DeepSeek V4 Pro",
        "深度求索"
      ],
      [
        "deepseek-v4-flash",
        "DeepSeek V4 Flash",
        "深度求索"
      ],
      [
        "deepseek-v4-flash-vision-exp",
        "DeepSeek V4 Flash Vision Experimental",
        "深度求索"
      ]
    ],
    "imageModels": [],
    "visionModels": [
      [
        "deepseek-v4-flash-vision-exp",
        "DeepSeek V4 Flash Vision Experimental",
        "深度求索"
      ]
    ],
    "guideUrl": "https://platform.deepseek.com/api_keys",
    "guideSteps": [
      "登录深度求索官方开放平台，进入 API Key 管理页面。",
      "创建 API Key，并确认账户已开通所选模型。",
      "复制密钥并粘贴到对应渠道的输入框。"
    ]
  },
  kimi: {
    "label": "Kimi（月之暗面）",
    "keyName": "kimi",
    "keyPlaceholder": "sk-...",
    "mainModel": "kimi-k3",
    "imageModel": "",
    "visionModel": "kimi-k3",
    "mainModels": [
      [
        "kimi-k3",
        "Kimi K3",
        "Moonshot"
      ],
      [
        "kimi-k2.7-code",
        "Kimi K2.7 Code",
        "Moonshot"
      ],
      [
        "kimi-k2.7-code-highspeed",
        "Kimi K2.7 Code Highspeed",
        "Moonshot"
      ],
      [
        "kimi-k2.6",
        "Kimi K2.6",
        "Moonshot"
      ]
    ],
    "imageModels": [],
    "visionModels": [
      [
        "kimi-k3",
        "Kimi K3",
        "Moonshot"
      ],
      [
        "kimi-k2.7-code",
        "Kimi K2.7 Code",
        "Moonshot"
      ],
      [
        "kimi-k2.7-code-highspeed",
        "Kimi K2.7 Code Highspeed",
        "Moonshot"
      ],
      [
        "kimi-k2.6",
        "Kimi K2.6",
        "Moonshot"
      ]
    ],
    "guideUrl": "https://platform.kimi.com/",
    "guideSteps": [
      "登录 Kimi（月之暗面） 官方开放平台，进入 API Key 管理页面。",
      "创建 API Key，并确认账户已开通所选模型。",
      "复制密钥并粘贴到对应渠道的输入框。"
    ]
  },
  zhipu: {
    "label": "智谱",
    "keyName": "zhipu",
    "keyPlaceholder": "sk-...",
    "mainModel": "glm-5.2",
    "imageModel": "glm-image",
    "visionModel": "glm-5v-turbo",
    "mainModels": [
      [
        "glm-5.2",
        "GLM 5.2",
        "Zhipu"
      ],
      [
        "glm-5v-turbo",
        "GLM 5V Turbo",
        "Zhipu"
      ]
    ],
    "imageModels": [
      [
        "glm-image",
        "GLM Image",
        "Zhipu"
      ]
    ],
    "visionModels": [
      [
        "glm-5v-turbo",
        "GLM 5V Turbo",
        "Zhipu"
      ]
    ],
    "guideUrl": "https://open.bigmodel.cn/",
    "guideSteps": [
      "登录 智谱 官方开放平台，进入 API Key 管理页面。",
      "创建 API Key，并确认账户已开通所选模型。",
      "复制密钥并粘贴到对应渠道的输入框。"
    ]
  },
  siliconflow: {
    "label": "硅基流动",
    "keyName": "siliconflow",
    "keyPlaceholder": "sk-...",
    "mainModel": "Pro/moonshotai/Kimi-K2.6",
    "imageModel": "Qwen/Qwen-Image",
    "visionModel": "Pro/moonshotai/Kimi-K2.6",
    "mainModels": [
      [
        "Pro/moonshotai/Kimi-K2.6",
        "Kimi K2.6",
        "Moonshot"
      ]
    ],
    "imageModels": [
      [
        "Qwen/Qwen-Image",
        "Qwen Image",
        "Alibaba Qwen"
      ],
      [
        "Kwai-Kolors/Kolors",
        "Kolors",
        "Kwai"
      ]
    ],
    "visionModels": [
      [
        "Pro/moonshotai/Kimi-K2.6",
        "Kimi K2.6",
        "Moonshot"
      ]
    ],
    "guideUrl": "https://cloud.siliconflow.cn/account/ak",
    "guideSteps": [
      "登录 硅基流动 官方开放平台，进入 API Key 管理页面。",
      "创建 API Key，并确认账户已开通所选模型。",
      "复制密钥并粘贴到对应渠道的输入框。"
    ]
  },
  anthropic: {
    "label": "Anthropic",
    "keyName": "anthropic",
    "keyPlaceholder": "sk-ant-...",
    "mainModel": "claude-fable-5-1",
    "imageModel": "",
    "visionModel": "claude-fable-5-1",
    "mainModels": [
      [
        "claude-fable-5-1",
        "Claude Fable 5.1",
        "Anthropic"
      ],
      [
        "claude-opus-5",
        "Claude Opus 5",
        "Anthropic"
      ],
      [
        "claude-sonnet-5",
        "Claude Sonnet 5",
        "Anthropic"
      ],
      [
        "claude-haiku-4-5-20251001",
        "Claude Haiku 4.5",
        "Anthropic"
      ]
    ],
    "imageModels": [],
    "visionModels": [
      [
        "claude-fable-5-1",
        "Claude Fable 5.1",
        "Anthropic"
      ],
      [
        "claude-opus-5",
        "Claude Opus 5",
        "Anthropic"
      ],
      [
        "claude-sonnet-5",
        "Claude Sonnet 5",
        "Anthropic"
      ],
      [
        "claude-haiku-4-5-20251001",
        "Claude Haiku 4.5",
        "Anthropic"
      ]
    ],
    "guideUrl": "https://platform.claude.com/settings/keys",
    "guideSteps": [
      "登录 Anthropic 官方开放平台，进入 API Key 管理页面。",
      "创建 API Key，并确认账户已开通所选模型。",
      "复制密钥并粘贴到对应渠道的输入框。"
    ]
  },
  recraft: {
    "label": "Recraft",
    "keyName": "recraft",
    "keyPlaceholder": "API Key",
    "mainModel": "",
    "imageModel": "recraftv4_1",
    "visionModel": "",
    "mainModels": [],
    "imageModels": [
      [
        "recraftv4_1",
        "Recraft V4.1",
        "Recraft"
      ],
      [
        "recraftv4_1_pro",
        "Recraft V4.1 Pro",
        "Recraft"
      ],
      [
        "recraftv4_1_vector",
        "Recraft V4.1 Vector",
        "Recraft"
      ],
      [
        "recraftv4_1_pro_vector",
        "Recraft V4.1 Pro Vector",
        "Recraft"
      ]
    ],
    "visionModels": [],
    "guideUrl": "https://app.recraft.ai/",
    "guideSteps": [
      "登录 Recraft 官方开放平台，进入 API Key 管理页面。",
      "创建 API Key，并确认账户已开通所选模型。",
      "复制密钥并粘贴到对应渠道的输入框。"
    ]
  },
  xai: {
    "label": "SpaceXAI",
    "keyName": "xai",
    "keyPlaceholder": "xai-...",
    "mainModel": "grok-4.6",
    "imageModel": "grok-imagine-image-2.0",
    "visionModel": "grok-4.6",
    "mainModels": [
      [
        "grok-4.6",
        "Grok 4.6",
        "SpaceXAI"
      ]
    ],
    "imageModels": [
      [
        "grok-imagine-image-2.0",
        "Grok Imagine Image 2.0",
        "SpaceXAI"
      ]
    ],
    "visionModels": [
      [
        "grok-4.6",
        "Grok 4.6",
        "SpaceXAI"
      ]
    ],
    "guideUrl": "https://console.x.ai/",
    "guideSteps": [
      "登录 SpaceXAI 官方开放平台，进入 API Key 管理页面。",
      "创建 API Key，并确认账户已开通所选模型。",
      "复制密钥并粘贴到对应渠道的输入框。"
    ]
  },
};

// Generated catalog is the common fallback; public runtime registry remains authoritative.
for (const [id, registry] of Object.entries(STATIC_MODEL_REGISTRY)) {
  const options = (role) => registry.models.filter((model) => model.selectable !== false && model.roles.includes(role)).map((model) => [model.id, model.label, model.vendor])
  PROVIDERS[id] = { ...PROVIDERS[id], ...(EXTENDED_MODEL_CHANNELS[id] ? { ...EXTENDED_MODEL_CHANNELS[id], name: EXTENDED_MODEL_CHANNELS[id].label, keyName: id, keyPlaceholder: 'API Key' } : {}), mainModel: registry.defaults.main, imageModel: registry.defaults.image, visionModel: registry.defaults.vision, mainModels: options('main'), imageModels: options('image'), visionModels: options('vision'), registryModels: registry.models }
}

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

export const RESOLUTION_OPTIONS = [['512', '512（预览）'], ['auto', '原生尺寸'], ['1K', '1K（标准）'], ['1.5K', '1.5K'], ['2K', '2K（高清）'], ['3K', '3K'], ['4K', '4K（超清）']];

// 不同图像生成模型支持的清晰度子集（自动精修由清晰度档位驱动）。
export function supportedResolutions(provider, imageModel) {
  const entry = STATIC_MODEL_REGISTRY[provider]?.models.find((model) => model.id === imageModel)
  if (entry) return entry.capabilities.resolutions || []
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

for (const [id, label] of Object.entries(MODEL_CHANNEL_LABELS)) if (PROVIDERS[id]) { PROVIDERS[id].label = label; PROVIDERS[id].name = label }
