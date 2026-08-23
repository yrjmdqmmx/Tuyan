import Foundation

struct GuideStep: Identifiable, Equatable {
  let id: String
  let title: String
  let detail: String
}

struct GuideTerm: Identifiable, Equatable {
  let id: String
  let name: String
  let detail: String
}

struct GuideResource: Identifiable, Equatable {
  let id: String
  let title: String
  let subtitle: String
  let systemImage: String
  let url: URL
}

/// FAQ 条目：结构化 (title, detail)，不再靠"，/；"切分启发式拆标题。
struct GuideFAQItem: Identifiable, Equatable {
  let id: String
  let title: String
  /// 为 nil 时整条平铺展示（无可展开详情）。
  let detail: String?

  /// 跨字段子串检查（保持既有 `faq.contains { $0.contains(…) }` 断言语义）。
  func contains(_ substring: String) -> Bool {
    title.contains(substring) || (detail?.contains(substring) ?? false)
  }
}

enum PaperBananaGuide {
  static let intro = "图研 Tuyan 是一个多智能体学术配图生成工具：把论文方法描述和目标图注交给它，多个 AI 角色协作产出框架图、流程图、架构图或统计图。模型 API Key 由你自带，持久保存在本机 Keychain；仅在你发起请求时短暂经服务转发至所选模型渠道。"

  static let onboardingSteps: [GuideStep] = [
    GuideStep(
      id: "provider-key",
      title: "选接口、填 Key",
      detail: "选择 OpenRouter、Gemini、OpenAI、阿里百炼或火山方舟（中国区方舟）之一。普通模式只需当前单渠道 Key；专业模式可为主模型、图像模型、视觉模型分别选择渠道并填写各自 Key。"
    ),
    GuideStep(
      id: "paper-input",
      title: "填内容",
      detail: "选择信息图类别，粘贴论文方法部分和目标图注；如果有风格参考，可上传 PNG、JPG、WebP 或 SVG 参考图，最多 3 张。"
    ),
    GuideStep(
      id: "generate-export",
      title: "生成候选图",
      detail: "提交后等待任务轮询完成。结果图可单张分享，也可整单 ZIP 导出，包含结果、参考图、中间阶段和 metadata。"
    )
  ]

  static let workflowSteps: [GuideStep] = [
    GuideStep(id: "plan", title: "规划", detail: "主模型把方法内容和图注拆成目标图描述，明确模块、连接关系、布局和视觉层级。"),
    GuideStep(id: "render", title: "初次渲染", detail: "图像模型按规划生成第一版候选图。"),
    GuideStep(id: "critic", title: "图像评审", detail: "评审模型检查排版、文字和逻辑问题，并给出修改建议。"),
    GuideStep(id: "rerender", title: "重渲染", detail: "按评审意见继续改进，直到用完设置的评审轮数。"),
    GuideStep(id: "refine", title: "生成阶段与独立精修", detail: "生成流程可能按所选路线执行额外渲染或放大，但这不等于“精修”页。独立精修需在精修 Tab 选择本人结果图，并按当前图像路线明确声明的精修比例和分辨率执行。")
  ]

  static let modelTerms: [GuideTerm] = [
    GuideTerm(id: "provider", name: "模型接口（Provider）与 BYOK", detail: "先选 API 接入渠道。普通模式保持当前 live 渠道并使用服务端三路默认模型；专业模式可分别选主、图、识路线。Key 持久保存在本机 Keychain；你发起请求时会作为短生命周期字段经香港网关/核心转发给所选渠道，服务端不持久化、记录或回显 Key。方舟为中国区火山方舟，可在设置中运行账号路线探测。"),
    GuideTerm(id: "main-model", name: "主模型", detail: "负责规划、文本评审和自动检索相关性排序。建议选择推理能力强的模型。"),
    GuideTerm(id: "image-model", name: "图像生成模型", detail: "负责真正出图，决定风格、质量上限和可用清晰度。"),
    GuideTerm(id: "vision-model", name: "参考图识别模型", detail: "当主模型不能直读参考图时，先把参考图读成文字描述，再交给生成链路。")
  ]

  static let parameterTerms: [GuideTerm] = [
    GuideTerm(id: "mode", name: "使用模式", detail: "普通模式使用平台预置配置；专业模式开放模型、流程、比例、候选数量和评审轮数。"),
    GuideTerm(id: "pipeline", name: "生成流程", detail: "规划器 + 评审器兼顾质量与速度；完整流程更细但更慢；基础生成跳过评审最快。"),
    GuideTerm(id: "candidates", name: "候选图数量", detail: "一次生成 1 到 3 张独立备选图。数量越多，耗时和模型成本越高。"),
    GuideTerm(id: "critic-rounds", name: "评审轮数", detail: "控制评审到重渲染的迭代次数，0 表示不评审。"),
    GuideTerm(id: "aspect-ratio", name: "画面比例与分辨率", detail: "固定比例为 1:1、3:2、2:3、4:3、3:4、16:9、9:16、21:9、1:4、4:1，另有自动。1K/2K/4K、比例和精修能力均以服务端 registry 为权威；未知或未声明即如实显示，不从模型名称推断或静默降级。"),
    GuideTerm(id: "output-format", name: "导出格式", detail: "PNG 通用；SVG 可无损缩放，更适合后续排版精修。"),
    GuideTerm(id: "image-size", name: "输出清晰度", detail: "1K 适合快速草稿，2K 通常适合论文正文，4K 适合有明确支持的最终导出。可选项仅来自当前 image route 的 registry 能力，未知并不等于支持。")
  ]

  static let referenceTerms: [GuideTerm] = [
    GuideTerm(id: "retrieval-none", name: "检索设置 · 不使用检索", detail: "不带任何范例，只按论文文字和图注生成。"),
    GuideTerm(id: "retrieval-auto", name: "检索设置 · 自动检索", detail: "从内置 PaperBanana 论文配图库中挑出相关范例作为风格与排版灵感。"),
    GuideTerm(id: "retrieval-random", name: "检索设置 · 随机参考", detail: "从参考库随机取图做风格灵感，不强调语义相关性。"),
    GuideTerm(id: "retrieval-manual", name: "检索设置 · 手动参考", detail: "你从参考库中手动选择最多 10 张范例。"),
    GuideTerm(id: "uploaded-reference", name: "本地上传与精选/图库", detail: "精选模板是可套用的研究场景起点；图库可搜索、分类、预览并手选参考。上传本地参考图前需把检索设为“不使用检索”；上传后它是唯一视觉来源，不能与图库检索并用。"),
    GuideTerm(id: "reference-mode", name: "参考图处理方式", detail: "主模型直读适合能读图的主模型；独立识别模型适合主模型不能读图的情况。")
  ]

  static let resultTerms: [GuideTerm] = [
    GuideTerm(id: "reference-echo", name: "参考回显", detail: "结果区会回显参考图，提醒它只作风格参考，不决定版式。"),
    GuideTerm(id: "candidate-image", name: "候选图", detail: "本次生成的结果图，可单张分享或整单打包。"),
    GuideTerm(id: "retrieved-reference", name: "检索参考", detail: "本次实际使用的参考范例标题列表。"),
    GuideTerm(id: "stage-timeline", name: "生成演化", detail: "展示规划、渲染、评审和中间图，便于理解模型为什么这样画。")
  ]

  static let faq: [GuideFAQItem] = [
    GuideFAQItem(
      id: "method-detail",
      title: "方法描述越具体",
      detail: "图中的模块、连接关系和层级越稳定。"
    ),
    GuideFAQItem(
      id: "key-rotation",
      title: "API Key 只保存在本机 Keychain",
      detail: "建议在各平台控制台定期轮换。"
    ),
    GuideFAQItem(
      id: "improve-results",
      title: "出图不理想时",
      detail: "可以加评审轮数、换更强模型，或上传风格接近的参考图。"
    ),
    GuideFAQItem(
      id: "resolution-missing",
      title: "某个清晰度选不到时",
      detail: "说明当前图像模型不支持该档位。"
    ),
    GuideFAQItem(
      id: "records-history",
      title: "任务记录页可回看历史任务、结果图、中间阶段和失败原因。",
      detail: nil
    )
  ]

  static let resources: [GuideResource] = [
    GuideResource(
      id: "website",
      title: "图研 Tuyan 官网",
      subtitle: "打开线上 Web 工作台",
      systemImage: "safari",
      url: URL(string: "https://www.paperbanana.asia/")!
    ),
    GuideResource(
      id: "paper",
      title: "论文",
      subtitle: "Hugging Face Papers",
      systemImage: "doc.text",
      url: URL(string: "https://huggingface.co/papers/2601.23265")!
    ),
    GuideResource(
      id: "github",
      title: "GitHub",
      subtitle: "图研 Tuyan 多端仓库",
      systemImage: "chevron.left.forwardslash.chevron.right",
      url: URL(string: "https://github.com/yrjmdqmmx/paperbanana-clients")!
    ),
    GuideResource(id: "privacy", title: "隐私政策", subtitle: "香港主服务、跨境与数据处理", systemImage: "hand.raised", url: PaperBananaLegal.privacyURL),
    GuideResource(id: "terms", title: "服务条款", subtitle: "使用本应用的条款", systemImage: "doc.plaintext", url: PaperBananaLegal.termsURL),
    GuideResource(
      id: "android",
      title: "Android 版",
      subtitle: "GitHub Releases 预览包",
      systemImage: "smartphone",
      url: URL(string: "https://github.com/zdywrnm/PaperBanana-clients/releases/tag/android-preview-0.1.3")!
    ),
    GuideResource(
      id: "macos",
      title: "Mac 版",
      subtitle: "GitHub Releases 安装包",
      systemImage: "macbook",
      url: URL(string: "https://github.com/zdywrnm/PaperBanana-clients/releases/tag/macos-v0.1.0")!
    ),
    GuideResource(
      id: "miniprogram",
      title: "微信小程序",
      subtitle: "查看小程序源码目录",
      systemImage: "message",
      url: URL(string: "https://github.com/zdywrnm/PaperBanana-clients/tree/main/apps/miniprogram")!
    )
  ]
}

enum PaperBananaLegal {
  static let privacyURL = URL(string: "https://www.paperbanana.asia/privacy-policy.html")!
  static let termsURL = URL(string: "https://www.paperbanana.asia/terms-of-service.html")!
  static let websiteURL = URL(string: "https://www.paperbanana.asia/")!
  static let githubURL = URL(string: "https://github.com/yrjmdqmmx/paperbanana-clients")!
}
