import Foundation

enum ProviderCatalog {
  static let order: [ProviderID] = [.bailian, .openrouter, .gemini, .openai]

  static let providers: [ProviderID: ProviderConfig] = [
    .openrouter: ProviderConfig(
      id: .openrouter,
      label: "OpenRouter",
      keyName: "openrouter",
      keyPlaceholder: "sk-or-v1-...",
      mainModel: "openrouter/openai/gpt-5.5",
      imageModel: "openrouter/openai/gpt-5.4-image-2",
      visionModel: "openrouter/google/gemini-3.5-flash",
      mainModels: [
        option("openrouter/openai/gpt-5.5", "GPT-5.5", "OpenAI"),
        option("openrouter/openai/gpt-5.5-pro", "GPT-5.5 Pro", "OpenAI"),
        option("openrouter/openai/gpt-5.4", "GPT-5.4", "OpenAI"),
        option("openrouter/openai/gpt-5.4-pro", "GPT-5.4 Pro", "OpenAI"),
        option("openrouter/openai/gpt-5.4-mini", "GPT-5.4 Mini", "OpenAI"),
        option("openrouter/openai/gpt-5.4-nano", "GPT-5.4 Nano", "OpenAI"),
        option("openrouter/openai/gpt-chat-latest", "GPT Chat Latest", "OpenAI"),
        option("openrouter/~openai/gpt-latest", "GPT Latest", "OpenAI"),
        option("openrouter/~openai/gpt-mini-latest", "GPT Mini Latest", "OpenAI"),
        option("openrouter/anthropic/claude-opus-4.8", "Claude Opus 4.8", "Anthropic"),
        option("openrouter/anthropic/claude-opus-4.8-fast", "Claude Opus 4.8 Fast", "Anthropic"),
        option("openrouter/anthropic/claude-opus-4.7", "Claude Opus 4.7", "Anthropic"),
        option("openrouter/anthropic/claude-opus-4.7-fast", "Claude Opus 4.7 Fast", "Anthropic"),
        option("openrouter/~anthropic/claude-opus-latest", "Claude Opus Latest", "Anthropic"),
        option("openrouter/~anthropic/claude-sonnet-latest", "Claude Sonnet Latest", "Anthropic"),
        option("openrouter/google/gemini-3.1-pro-preview", "Gemini 3.1 Pro Preview", "Google"),
        option("openrouter/google/gemini-3.5-flash", "Gemini 3.5 Flash", "Google"),
        option("openrouter/google/gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite", "Google"),
        option("openrouter/google/gemini-3.1-flash-lite-preview", "Gemini 3.1 Flash Lite Preview", "Google"),
        option("openrouter/~google/gemini-pro-latest", "Gemini Pro Latest", "Google"),
        option("openrouter/~google/gemini-flash-latest", "Gemini Flash Latest", "Google"),
        option("openrouter/qwen/qwen3.7-max", "Qwen3.7 Max", "Qwen"),
        option("openrouter/qwen/qwen3.6-plus", "Qwen3.6 Plus", "Qwen"),
        option("openrouter/qwen/qwen3.6-flash", "Qwen3.6 Flash", "Qwen"),
        option("openrouter/qwen/qwen3.6-max-preview", "Qwen3.6 Max Preview", "Qwen"),
        option("openrouter/qwen/qwen3.5-plus-20260420", "Qwen3.5 Plus 2026-04-20", "Qwen"),
        option("openrouter/deepseek/deepseek-v4-pro", "DeepSeek V4 Pro", "DeepSeek"),
        option("openrouter/deepseek/deepseek-v4-flash", "DeepSeek V4 Flash", "DeepSeek"),
        option("openrouter/x-ai/grok-4.3", "Grok 4.3", "xAI"),
        option("openrouter/x-ai/grok-4.20", "Grok 4.20", "xAI"),
        option("openrouter/x-ai/grok-4.20-multi-agent", "Grok 4.20 Multi-Agent", "xAI"),
        option("openrouter/x-ai/grok-build-0.1", "Grok Build 0.1", "xAI"),
        option("openrouter/moonshotai/kimi-k2.6", "Kimi K2.6", "Moonshot"),
        option("openrouter/z-ai/glm-5.1", "GLM 5.1", "Z.ai"),
        option("openrouter/minimax/minimax-m2.7", "MiniMax M2.7", "MiniMax"),
        option("openrouter/stepfun/step-3.7-flash", "Step 3.7 Flash", "StepFun")
      ],
      imageModels: [
        option("openrouter/openai/gpt-5.4-image-2", "GPT-5.4 Image 2", "OpenAI"),
        option("openrouter/openai/gpt-5-image", "GPT-5 Image", "OpenAI"),
        option("openrouter/openai/gpt-5-image-mini", "GPT-5 Image Mini", "OpenAI"),
        option("openrouter/google/gemini-3.1-flash-image-preview", "Nano Banana 2 / Gemini 3.1 Flash Image Preview", "Google"),
        option("openrouter/google/gemini-3-pro-image-preview", "Nano Banana Pro / Gemini 3 Pro Image Preview", "Google"),
        option("openrouter/google/gemini-2.5-flash-image", "Nano Banana / Gemini 2.5 Flash Image", "Google"),
        option("openrouter/x-ai/grok-imagine-image-quality", "Grok Imagine Image Quality", "xAI"),
        option("openrouter/recraft/recraft-v4.1-pro", "Recraft V4.1 Pro", "Recraft"),
        option("openrouter/recraft/recraft-v4.1", "Recraft V4.1", "Recraft"),
        option("openrouter/recraft/recraft-v4.1-pro-vector", "Recraft V4.1 Pro Vector", "Recraft"),
        option("openrouter/black-forest-labs/flux.2-pro", "FLUX.2 Pro", "Black Forest Labs"),
        option("openrouter/black-forest-labs/flux.2-flex", "FLUX.2 Flex", "Black Forest Labs"),
        option("openrouter/black-forest-labs/flux.2-max", "FLUX.2 Max", "Black Forest Labs"),
        option("openrouter/bytedance-seed/seedream-4.5", "Seedream 4.5", "ByteDance Seed"),
        option("openrouter/sourceful/riverflow-v2-pro", "Riverflow V2 Pro", "Sourceful"),
        option("openrouter/sourceful/riverflow-v2-fast", "Riverflow V2 Fast", "Sourceful")
      ],
      visionModels: [
        option("openrouter/google/gemini-3.5-flash", "Gemini 3.5 Flash", "Google"),
        option("openrouter/google/gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite", "Google"),
        option("openrouter/openai/gpt-chat-latest", "GPT Chat Latest", "OpenAI"),
        option("openrouter/~openai/gpt-mini-latest", "GPT Mini Latest", "OpenAI"),
        option("openrouter/~google/gemini-flash-latest", "Gemini Flash Latest", "Google"),
        option("openrouter/qwen/qwen3.7-plus", "Qwen3.7 Plus", "Qwen"),
        option("openrouter/anthropic/claude-opus-4.8", "Claude Opus 4.8", "Anthropic"),
        option("openrouter/anthropic/claude-opus-4.8-fast", "Claude Opus 4.8 Fast", "Anthropic")
      ],
      guideURL: URL(string: "https://openrouter.ai/settings/keys")!,
      guideSteps: [
        "登录 OpenRouter，进入 Keys 页面。",
        "点击 Create Key，创建一个新的 API Key。",
        "复制 sk-or-v1- 开头的密钥，粘贴到上方输入框。"
      ]
    ),
    .gemini: ProviderConfig(
      id: .gemini,
      label: "Gemini",
      keyName: "gemini",
      keyPlaceholder: "AIza...",
      mainModel: "gemini-3.7-flash",
      imageModel: "gemini-3.1-flash-image",
      visionModel: "gemini-3.7-flash",
      mainModels: [
        option("gemini-3.7-flash", "Gemini 3.7 Flash", "Gemini 3.7"),
        option("gemini-3.6-flash", "Gemini 3.6 Flash", "Gemini 3.6"),
        option("gemini-3.5-flash", "Gemini 3.5 Flash", "Gemini 3.5"),
        option("gemini-3.1-pro-preview", "Gemini 3.1 Pro Preview", "Gemini 3.1"),
        option("gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite", "Gemini 3.1"),
        option("gemini-3-flash-preview", "Gemini 3 Flash Preview", "Gemini 3"),
        option("gemini-2.5-pro", "Gemini 2.5 Pro", "Gemini 2.5"),
        option("gemini-2.5-flash", "Gemini 2.5 Flash", "Gemini 2.5"),
        option("gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite", "Gemini 2.5")
      ],
      imageModels: [
        option("gemini-3.1-flash-image", "Nano Banana 2 / Gemini 3.1 Flash Image", "Nano Banana"),
        option("gemini-3-pro-image", "Nano Banana Pro / Gemini 3 Pro Image", "Nano Banana"),
        option("gemini-2.5-flash-image", "Nano Banana / Gemini 2.5 Flash Image", "Nano Banana")
      ],
      visionModels: [
        option("gemini-3.7-flash", "Gemini 3.7 Flash", "Gemini 3.7"),
        option("gemini-3.6-flash", "Gemini 3.6 Flash", "Gemini 3.6"),
        option("gemini-3.5-flash", "Gemini 3.5 Flash", "Gemini 3.5"),
        option("gemini-3.1-pro-preview", "Gemini 3.1 Pro Preview", "Gemini 3.1"),
        option("gemini-2.5-pro", "Gemini 2.5 Pro", "Gemini 2.5"),
        option("gemini-2.5-flash", "Gemini 2.5 Flash", "Gemini 2.5"),
        option("gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite", "Gemini 2.5")
      ],
      guideURL: URL(string: "https://aistudio.google.com/app/apikey")!,
      guideSteps: [
        "登录 Google AI Studio，进入 API Keys 页面。",
        "点击 Create API key，选择或创建项目。",
        "复制生成的 AIza 开头密钥，粘贴到上方输入框。"
      ]
    ),
    .openai: ProviderConfig(
      id: .openai,
      label: "OpenAI",
      keyName: "openai",
      keyPlaceholder: "sk-...",
      mainModel: "gpt-5.6-sol",
      imageModel: "gpt-image-2",
      visionModel: "gpt-5.6-sol",
      mainModels: [
        option("gpt-5.6-sol", "GPT-5.6 Sol", "GPT-5.6"),
        option("gpt-5.6-terra", "GPT-5.6 Terra", "GPT-5.6"),
        option("gpt-5.6-luna", "GPT-5.6 Luna", "GPT-5.6"),
        option("gpt-5.5", "GPT-5.5", "GPT-5.5"),
        option("gpt-5.4", "GPT-5.4", "GPT-5.4"),
        option("gpt-5.4-mini", "GPT-5.4 Mini", "GPT-5.4"),
        option("gpt-5.4-nano", "GPT-5.4 Nano", "GPT-5.4"),
        option("gpt-5-mini", "GPT-5 Mini", "GPT-5"),
        option("gpt-4.1", "GPT-4.1", "GPT-4.1"),
        option("gpt-4.1-mini", "GPT-4.1 Mini", "GPT-4.1"),
      ],
      imageModels: [
        option("gpt-image-2", "GPT Image 2", "GPT Image"),
        option("gpt-image-1", "GPT Image 1", "GPT Image"),
        option("gpt-image-1-mini", "GPT Image 1 Mini", "GPT Image")
      ],
      visionModels: [
        option("gpt-5.6-sol", "GPT-5.6 Sol", "GPT-5.6"),
        option("gpt-5.6-terra", "GPT-5.6 Terra", "GPT-5.6"),
        option("gpt-5.6-luna", "GPT-5.6 Luna", "GPT-5.6"),
        option("gpt-4.1", "GPT-4.1", "GPT-4.1"),
        option("gpt-4.1-mini", "GPT-4.1 Mini", "GPT-4.1"),
        option("gpt-5-mini", "GPT-5 Mini", "GPT-5")
      ],
      guideURL: URL(string: "https://platform.openai.com/api-keys")!,
      guideSteps: [
        "登录 OpenAI Platform，进入 API keys 页面。",
        "点击 Create new secret key，创建密钥。",
        "复制 sk- 开头的密钥，粘贴到上方输入框。"
      ]
    ),
    .bailian: ProviderConfig(
      id: .bailian,
      label: "阿里百炼",
      keyName: "bailian",
      keyPlaceholder: "sk-...",
      mainModel: "qwen3.8-max",
      imageModel: "wan2.7-image-pro",
      visionModel: "qwen3.8-max",
      mainModels: [
        option("qwen3.8-max", "Qwen3.8 Max", "通义千问"),
        option("qwen3.7-plus", "Qwen3.7 Plus（可直读图）", "通义千问"),
        option("qwen3.7-flash", "Qwen3.7 Flash", "通义千问"),
        option("deepseek-v4-pro", "DeepSeek V4 Pro", "百炼第三方"),
        option("deepseek-v4-flash", "DeepSeek V4 Flash", "百炼第三方"),
        option("kimi/kimi-k3", "Kimi K3（可直读图）", "百炼第三方"),
        option("glm-5.2", "GLM 5.2", "百炼第三方"),
        option("MiniMax/MiniMax-M3", "MiniMax M3", "百炼第三方")
      ],
      imageModels: [
        option("wan2.7-image-pro", "Wan 2.7 Image Pro", "通义万相"),
        option("qwen-image-3.0-pro", "Qwen Image 3.0 Pro", "通义千问 Image"),
        option("qwen-image-3.0", "Qwen Image 3.0", "通义千问 Image")
      ],
      visionModels: [
        option("qwen3.8-max", "Qwen3.8 Max（图像理解）", "通义千问"),
        option("qwen3.7-plus", "Qwen3.7 Plus（图像理解）", "通义千问"),
        option("qwen3.5-omni-plus", "Qwen3.5 Omni Plus（全模态）", "通义千问"),
        option("kimi/kimi-k3", "Kimi K3（图像理解）", "百炼第三方")
      ],
      guideURL: URL(string: "https://help.aliyun.com/zh/model-studio/get-api-key")!,
      guideSteps: [
        "登录阿里云百炼控制台，确认已开通百炼模型服务。",
        "进入 API Key 页面，点击创建 API Key。",
        "建议选择默认业务空间和全部权限，复制 sk- 开头密钥。"
      ]
    )
  ]

  static func config(for id: ProviderID) -> ProviderConfig {
    providers[id] ?? providers[.bailian]!
  }

  static func mainModelCanReadImages(provider: ProviderID, model: String) -> Bool {
    let m = model.lowercased()
    switch provider {
    case .bailian:
      return m.range(of: #"qwen3\.8-max|qwen3\.7-plus|qwen3\.5-omni|omni|kimi[\/-]kimi-k3|qwen-?vl|qwen3-?vl|-vl-|qvq"#, options: .regularExpression) != nil
    case .gemini, .openrouter:
      return true
    case .openai:
      return m.range(of: #"gpt-4|gpt-5|o4|gpt-4o|gpt-4\.1"#, options: .regularExpression) != nil
    }
  }

  static func supportedResolutions(provider: ProviderID, imageModel: String) -> [ImageSize] {
    switch provider {
    case .bailian, .gemini:
      return [.oneK, .twoK]
    case .openai, .openrouter:
      return [.oneK, .twoK, .fourK]
    }
  }

  static func option(_ value: String, _ label: String, _ group: String = "") -> ModelOption {
    ModelOption(value: value, label: label, group: group)
  }
}
