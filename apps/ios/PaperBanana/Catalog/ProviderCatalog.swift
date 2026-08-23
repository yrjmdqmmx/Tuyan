import Foundation

/// Local presentation and Keychain metadata only. Models, defaults and
/// capabilities are owned exclusively by the live server registry.
enum ProviderCatalog {
  static let order: [ProviderID] = [.openrouter, .gemini, .openai, .bailian, .ark]
  static let providers: [ProviderID: ProviderConfig] = [
    .openrouter: metadata(.openrouter, "OpenRouter", "openrouter", "sk-or-v1-...", "https://openrouter.ai/settings/keys", ["登录 OpenRouter，进入 Keys 页面。", "点击 Create Key，创建一个新的 API Key。", "复制 sk-or-v1- 开头的密钥，粘贴到上方输入框。"]),
    .gemini: metadata(.gemini, "Gemini", "gemini", "AIza...", "https://aistudio.google.com/app/apikey", ["登录 Google AI Studio，进入 API Keys 页面。", "点击 Create API key，选择或创建项目。", "复制生成的 AIza 开头密钥，粘贴到上方输入框。"]),
    .openai: metadata(.openai, "OpenAI", "openai", "sk-...", "https://platform.openai.com/api-keys", ["登录 OpenAI Platform，进入 API keys 页面。", "点击 Create new secret key，创建密钥。", "复制 sk- 开头密钥，粘贴到上方输入框。"]),
    .bailian: metadata(.bailian, "阿里百炼", "bailian", "sk-...", "https://help.aliyun.com/zh/model-studio/get-api-key", ["登录阿里云百炼控制台，确认已开通百炼模型服务。", "进入 API Key 页面，点击创建 API Key。", "建议选择默认业务空间和全部权限，复制 sk- 开头密钥。"]),
    .ark: metadata(.ark, "火山方舟", "ark", "Ark API Key", "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey", ["登录火山方舟控制台并进入 API Key 页面。", "创建仅供图研使用的推理 API Key。", "复制密钥并粘贴到上方输入框；实际模型可用性以账号探测为准。"])
  ]

  static func config(for id: ProviderID) -> ProviderConfig {
    providers[id] ?? ProviderConfig(id: id, label: id.rawValue, keyName: id.rawValue, keyPlaceholder: "API Key", guideURL: URL(string: "https://www.paperbanana.asia/")!, guideSteps: [])
  }

  private static func metadata(_ id: ProviderID, _ label: String, _ keyName: String, _ placeholder: String, _ guide: String, _ steps: [String]) -> ProviderConfig {
    ProviderConfig(id: id, label: label, keyName: keyName, keyPlaceholder: placeholder, guideURL: URL(string: guide)!, guideSteps: steps)
  }
}
