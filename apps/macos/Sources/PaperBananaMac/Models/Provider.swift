import Foundation

enum ProviderID: String, CaseIterable, Codable, Identifiable {
  case bailian
  case openrouter
  case gemini
  case openai

  var id: String { rawValue }
}

struct ModelOption: Identifiable, Equatable {
  let value: String
  let label: String
  let group: String

  var id: String { value }

  var displayName: String {
    group.isEmpty ? label : "\(group) / \(label)"
  }
}

struct ModelOptionGroup: Identifiable, Equatable {
  let name: String
  let options: [ModelOption]

  var id: String { name }
}

struct ProviderConfig: Identifiable, Equatable {
  let id: ProviderID
  let label: String
  let keyName: String
  let keyPlaceholder: String
  let mainModel: String
  let imageModel: String
  let mainModels: [ModelOption]
  let imageModels: [ModelOption]
  let guideURL: URL
  let guideSteps: [String]

  var mainModelDisplayName: String {
    mainModels.first { $0.value == mainModel }?.displayName ?? mainModel
  }

  var imageModelDisplayName: String {
    imageModels.first { $0.value == imageModel }?.displayName ?? imageModel
  }

  var mainModelGroups: [ModelOptionGroup] {
    ProviderCatalog.grouped(mainModels)
  }

  var imageModelGroups: [ModelOptionGroup] {
    ProviderCatalog.grouped(imageModels)
  }
}

enum ProviderCatalog {
  static let providers: [ProviderID: ProviderConfig] = [
    .bailian: ProviderConfig(
      id: .bailian,
      label: "阿里百炼",
      keyName: "bailian",
      keyPlaceholder: "sk-...",
      mainModel: "qwen3.8-max",
      imageModel: "wan2.7-image-pro",
      mainModels: [
        .init(value: "qwen3.8-max", label: "Qwen3.8 Max", group: "通义千问"),
        .init(value: "qwen3.7-plus", label: "Qwen3.7 Plus", group: "通义千问"),
        .init(value: "qwen3.7-flash", label: "Qwen3.7 Flash", group: "通义千问"),
        .init(value: "deepseek-v4-pro", label: "DeepSeek V4 Pro", group: "百炼第三方"),
        .init(value: "deepseek-v4-flash", label: "DeepSeek V4 Flash", group: "百炼第三方"),
        .init(value: "kimi/kimi-k3", label: "Kimi K3", group: "百炼第三方"),
        .init(value: "glm-5.2", label: "GLM 5.2", group: "百炼第三方"),
        .init(value: "MiniMax/MiniMax-M3", label: "MiniMax M3", group: "百炼第三方")
      ],
      imageModels: [
        .init(value: "wan2.7-image-pro", label: "Wan 2.7 Image Pro", group: "通义万相"),
        .init(value: "wan2.7-image", label: "Wan 2.7 Image", group: "通义万相"),
        .init(value: "qwen-image-3.0-pro", label: "Qwen Image 3.0 Pro", group: "通义千问 Image"),
        .init(value: "qwen-image-3.0", label: "Qwen Image 3.0", group: "通义千问 Image")
      ],
      guideURL: URL(string: "https://help.aliyun.com/zh/model-studio/get-api-key")!,
      guideSteps: [
        "登录阿里云百炼控制台，确认已开通百炼模型服务。",
        "进入 API Key 页面，点击创建 API Key。",
        "建议选择默认业务空间和全部权限，复制 sk- 开头密钥。"
      ]
    ),
    .openrouter: ProviderConfig(
      id: .openrouter,
      label: "OpenRouter",
      keyName: "openrouter",
      keyPlaceholder: "sk-or-v1-...",
      mainModel: "openrouter/openai/gpt-5.5",
      imageModel: "openrouter/openai/gpt-5.4-image-2",
      mainModels: [
        .init(value: "openrouter/openai/gpt-5.5", label: "GPT-5.5", group: "OpenAI"),
        .init(value: "openrouter/openai/gpt-5.5-pro", label: "GPT-5.5 Pro", group: "OpenAI"),
        .init(value: "openrouter/openai/gpt-5.4", label: "GPT-5.4", group: "OpenAI"),
        .init(value: "openrouter/openai/gpt-5.4-pro", label: "GPT-5.4 Pro", group: "OpenAI"),
        .init(value: "openrouter/openai/gpt-5.4-mini", label: "GPT-5.4 Mini", group: "OpenAI"),
        .init(value: "openrouter/openai/gpt-5.4-nano", label: "GPT-5.4 Nano", group: "OpenAI"),
        .init(value: "openrouter/openai/gpt-chat-latest", label: "GPT Chat Latest", group: "OpenAI"),
        .init(value: "openrouter/openai/gpt-5.3-chat", label: "GPT-5.3 Chat", group: "OpenAI"),
        .init(value: "openrouter/~openai/gpt-latest", label: "GPT Latest", group: "OpenAI"),
        .init(value: "openrouter/~openai/gpt-mini-latest", label: "GPT Mini Latest", group: "OpenAI"),
        .init(value: "openrouter/anthropic/claude-opus-4.8", label: "Claude Opus 4.8", group: "Anthropic"),
        .init(value: "openrouter/anthropic/claude-opus-4.8-fast", label: "Claude Opus 4.8 Fast", group: "Anthropic"),
        .init(value: "openrouter/anthropic/claude-opus-4.7", label: "Claude Opus 4.7", group: "Anthropic"),
        .init(value: "openrouter/anthropic/claude-opus-4.7-fast", label: "Claude Opus 4.7 Fast", group: "Anthropic"),
        .init(value: "openrouter/~anthropic/claude-opus-latest", label: "Claude Opus Latest", group: "Anthropic"),
        .init(value: "openrouter/~anthropic/claude-sonnet-latest", label: "Claude Sonnet Latest", group: "Anthropic"),
        .init(value: "openrouter/google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", group: "Google"),
        .init(value: "openrouter/google/gemini-3.5-flash", label: "Gemini 3.5 Flash", group: "Google"),
        .init(value: "openrouter/google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", group: "Google"),
        .init(value: "openrouter/google/gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite Preview", group: "Google"),
        .init(value: "openrouter/~google/gemini-pro-latest", label: "Gemini Pro Latest", group: "Google"),
        .init(value: "openrouter/~google/gemini-flash-latest", label: "Gemini Flash Latest", group: "Google"),
        .init(value: "openrouter/qwen/qwen3.7-max", label: "Qwen3.7 Max", group: "Qwen"),
        .init(value: "openrouter/qwen/qwen3.6-plus", label: "Qwen3.6 Plus", group: "Qwen"),
        .init(value: "openrouter/qwen/qwen3.6-flash", label: "Qwen3.6 Flash", group: "Qwen"),
        .init(value: "openrouter/qwen/qwen3.6-max-preview", label: "Qwen3.6 Max Preview", group: "Qwen"),
        .init(value: "openrouter/qwen/qwen3.5-plus-20260420", label: "Qwen3.5 Plus 2026-04-20", group: "Qwen"),
        .init(value: "openrouter/deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro", group: "DeepSeek"),
        .init(value: "openrouter/deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", group: "DeepSeek"),
        .init(value: "openrouter/x-ai/grok-4.3", label: "Grok 4.3", group: "xAI"),
        .init(value: "openrouter/x-ai/grok-4.20", label: "Grok 4.20", group: "xAI"),
        .init(value: "openrouter/x-ai/grok-4.20-multi-agent", label: "Grok 4.20 Multi-Agent", group: "xAI"),
        .init(value: "openrouter/x-ai/grok-build-0.1", label: "Grok Build 0.1", group: "xAI"),
        .init(value: "openrouter/moonshotai/kimi-k2.6", label: "Kimi K2.6", group: "Moonshot"),
        .init(value: "openrouter/z-ai/glm-5.1", label: "GLM 5.1", group: "Z.ai"),
        .init(value: "openrouter/minimax/minimax-m2.7", label: "MiniMax M2.7", group: "MiniMax"),
        .init(value: "openrouter/stepfun/step-3.7-flash", label: "Step 3.7 Flash", group: "StepFun")
      ],
      imageModels: [
        .init(value: "openrouter/openai/gpt-5.4-image-2", label: "GPT-5.4 Image 2", group: "OpenAI"),
        .init(value: "openrouter/openai/gpt-5-image", label: "GPT-5 Image", group: "OpenAI"),
        .init(value: "openrouter/openai/gpt-5-image-mini", label: "GPT-5 Image Mini", group: "OpenAI"),
        .init(value: "openrouter/google/gemini-3.1-flash-image-preview", label: "Nano Banana 2", group: "Google"),
        .init(value: "openrouter/google/gemini-3-pro-image-preview", label: "Nano Banana Pro", group: "Google"),
        .init(value: "openrouter/google/gemini-2.5-flash-image", label: "Nano Banana", group: "Google"),
        .init(value: "openrouter/x-ai/grok-imagine-image-quality", label: "Grok Imagine Image Quality", group: "xAI"),
        .init(value: "openrouter/recraft/recraft-v4.1-pro", label: "Recraft V4.1 Pro", group: "Recraft"),
        .init(value: "openrouter/recraft/recraft-v4.1", label: "Recraft V4.1", group: "Recraft"),
        .init(value: "openrouter/recraft/recraft-v4.1-pro-vector", label: "Recraft V4.1 Pro Vector", group: "Recraft"),
        .init(value: "openrouter/black-forest-labs/flux.2-pro", label: "FLUX.2 Pro", group: "Black Forest Labs"),
        .init(value: "openrouter/black-forest-labs/flux.2-flex", label: "FLUX.2 Flex", group: "Black Forest Labs"),
        .init(value: "openrouter/black-forest-labs/flux.2-max", label: "FLUX.2 Max", group: "Black Forest Labs"),
        .init(value: "openrouter/bytedance-seed/seedream-4.5", label: "Seedream 4.5", group: "ByteDance Seed"),
        .init(value: "openrouter/sourceful/riverflow-v2-pro", label: "Riverflow V2 Pro", group: "Sourceful"),
        .init(value: "openrouter/sourceful/riverflow-v2-fast", label: "Riverflow V2 Fast", group: "Sourceful")
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
      mainModels: [
        .init(value: "gemini-3.7-flash", label: "Gemini 3.7 Flash", group: "Gemini 3.7"),
        .init(value: "gemini-3.6-flash", label: "Gemini 3.6 Flash", group: "Gemini 3.6"),
        .init(value: "gemini-3.5-flash", label: "Gemini 3.5 Flash", group: "Gemini 3.5"),
        .init(value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", group: "Gemini 3.1"),
        .init(value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", group: "Gemini 3.1"),
        .init(value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", group: "Gemini 3"),
        .init(value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", group: "Gemini 2.5"),
        .init(value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", group: "Gemini 2.5"),
        .init(value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", group: "Gemini 2.5")
      ],
      imageModels: [
        .init(value: "gemini-3.1-flash-image", label: "Nano Banana 2", group: "Nano Banana"),
        .init(value: "gemini-3-pro-image", label: "Nano Banana Pro", group: "Nano Banana"),
        .init(value: "gemini-2.5-flash-image", label: "Nano Banana", group: "Nano Banana")
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
      mainModels: [
        .init(value: "gpt-5.6-sol", label: "GPT-5.6 Sol", group: "GPT-5.6"),
        .init(value: "gpt-5.6-terra", label: "GPT-5.6 Terra", group: "GPT-5.6"),
        .init(value: "gpt-5.6-luna", label: "GPT-5.6 Luna", group: "GPT-5.6"),
        .init(value: "gpt-5.5", label: "GPT-5.5", group: "GPT-5.5"),
        .init(value: "gpt-5.4", label: "GPT-5.4", group: "GPT-5.4"),
        .init(value: "gpt-5.4-mini", label: "GPT-5.4 Mini", group: "GPT-5.4"),
        .init(value: "gpt-5.4-nano", label: "GPT-5.4 Nano", group: "GPT-5.4"),
        .init(value: "gpt-5-mini", label: "GPT-5 Mini", group: "GPT-5"),
        .init(value: "gpt-4.1", label: "GPT-4.1", group: "GPT-4.1"),
        .init(value: "gpt-4.1-mini", label: "GPT-4.1 Mini", group: "GPT-4.1"),
      ],
      imageModels: [
        .init(value: "gpt-image-2", label: "GPT Image 2", group: "GPT Image"),
        .init(value: "gpt-image-1", label: "GPT Image 1", group: "GPT Image"),
        .init(value: "gpt-image-1-mini", label: "GPT Image 1 Mini", group: "GPT Image")
      ],
      guideURL: URL(string: "https://platform.openai.com/api-keys")!,
      guideSteps: [
        "登录 OpenAI Platform，进入 API keys 页面。",
        "点击 Create new secret key，创建密钥。",
        "复制 sk- 开头的密钥，粘贴到上方输入框。"
      ]
    )
  ]

  static let order: [ProviderID] = [.bailian, .openrouter, .gemini, .openai]

  static func config(for id: ProviderID) -> ProviderConfig {
    providers[id] ?? providers[.bailian]!
  }

  static func grouped(_ options: [ModelOption]) -> [ModelOptionGroup] {
    var result: [ModelOptionGroup] = []
    for option in options {
      let name = option.group.isEmpty ? "其他" : option.group
      if let index = result.firstIndex(where: { $0.name == name }) {
        result[index] = ModelOptionGroup(name: name, options: result[index].options + [option])
      } else {
        result.append(ModelOptionGroup(name: name, options: [option]))
      }
    }
    return result
  }

  static func mainModelDisplayName(provider: ProviderID, value: String) -> String {
    let config = config(for: provider)
    return config.mainModels.first { $0.value == value }?.displayName ?? value
  }

  static func imageModelDisplayName(provider: ProviderID, value: String) -> String {
    let config = config(for: provider)
    return config.imageModels.first { $0.value == value }?.displayName ?? value
  }
}
