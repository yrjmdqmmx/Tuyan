import XCTest
@testable import PaperBanana

final class ProviderCatalogTests: XCTestCase {
  func testBailianCatalogMatchesWebContract() {
    let config = ProviderCatalog.config(for: .bailian)
    let mainValues = config.mainModels.map(\.value)
    let imageValues = config.imageModels.map(\.value)
    let visionValues = config.visionModels.map(\.value)

    XCTAssertEqual(config.mainModel, "qwen3.8-max")
    XCTAssertEqual(config.imageModel, "wan2.7-image-pro")
    XCTAssertEqual(config.visionModel, "qwen3.8-max")
    XCTAssertTrue(mainValues.contains("MiniMax/MiniMax-M3"))
    XCTAssertFalse(mainValues.contains("mimo-v2.5-pro"))
    XCTAssertFalse(mainValues.contains("MiniMax-M2.7"))
    XCTAssertEqual(imageValues, ["wan2.7-image-pro", "qwen-image-3.0-pro", "qwen-image-3.0"])
    XCTAssertEqual(visionValues, ["qwen3.8-max", "qwen3.7-plus", "qwen3.5-omni-plus", "kimi/kimi-k3"])
  }

  func testMainModelImageCapabilityMatchesWebHelper() {
    XCTAssertTrue(ProviderCatalog.mainModelCanReadImages(provider: .bailian, model: "qwen3.8-max"))
    XCTAssertTrue(ProviderCatalog.mainModelCanReadImages(provider: .bailian, model: "qwen3.7-plus"))
    XCTAssertTrue(ProviderCatalog.mainModelCanReadImages(provider: .bailian, model: "kimi/kimi-k3"))
    XCTAssertTrue(ProviderCatalog.mainModelCanReadImages(provider: .gemini, model: "gemini-3.5-flash"))
    XCTAssertTrue(ProviderCatalog.mainModelCanReadImages(provider: .openrouter, model: "anything"))
    XCTAssertTrue(ProviderCatalog.mainModelCanReadImages(provider: .openai, model: "gpt-4.1"))
    XCTAssertFalse(ProviderCatalog.mainModelCanReadImages(provider: .openai, model: "text-davinci-003"))
  }

  func testSupportedResolutionsMatchWebContract() {
    XCTAssertEqual(ProviderCatalog.supportedResolutions(provider: .bailian, imageModel: "wan2.7-image-pro"), [.oneK, .twoK])
    XCTAssertEqual(ProviderCatalog.supportedResolutions(provider: .gemini, imageModel: "gemini-3.1-flash-image"), [.oneK, .twoK])
    XCTAssertEqual(ProviderCatalog.supportedResolutions(provider: .openai, imageModel: "gpt-image-2"), [.oneK, .twoK, .fourK])
    XCTAssertEqual(ProviderCatalog.supportedResolutions(provider: .openrouter, imageModel: "openrouter/openai/gpt-5.4-image-2"), [.oneK, .twoK, .fourK])
  }

  func testProviderGuideMetadataMatchesWebContract() {
    for provider in ProviderCatalog.order {
      let config = ProviderCatalog.config(for: provider)

      XCTAssertFalse(config.label.isEmpty)
      XCTAssertEqual(config.guideURL.scheme, "https")
      XCTAssertFalse(config.guideURL.host?.isEmpty ?? true)
      XCTAssertEqual(config.guideSteps.count, 3)
      XCTAssertTrue(config.guideSteps.allSatisfy { !$0.isEmpty })
    }

    XCTAssertEqual(ProviderCatalog.config(for: .bailian).guideURL.absoluteString, "https://help.aliyun.com/zh/model-studio/get-api-key")
    XCTAssertEqual(ProviderCatalog.config(for: .openrouter).guideURL.absoluteString, "https://openrouter.ai/settings/keys")
    XCTAssertEqual(ProviderCatalog.config(for: .gemini).guideURL.absoluteString, "https://aistudio.google.com/app/apikey")
    XCTAssertEqual(ProviderCatalog.config(for: .openai).guideURL.absoluteString, "https://platform.openai.com/api-keys")
  }

  func testGuideTabAndContentMatchWebTutorialContract() {
    XCTAssertEqual(AppTab.allCases.map(\.rawValue), ["generate", "records", "guide", "templates", "settings"])
    XCTAssertEqual(AppTab.guide.title, "指南")
    XCTAssertEqual(AppTab.guide.symbol, "book")

    XCTAssertTrue(PaperBananaGuide.intro.contains("多智能体"))
    XCTAssertTrue(PaperBananaGuide.intro.contains("Keychain"))
    XCTAssertEqual(PaperBananaGuide.onboardingSteps.map(\.title), ["选接口、填 Key", "填内容", "生成候选图"])
    XCTAssertEqual(PaperBananaGuide.workflowSteps.map(\.title), ["规划", "初次渲染", "图像评审", "重渲染", "精修放大"])
    XCTAssertTrue(PaperBananaGuide.modelTerms.map(\.name).contains("模型接口（Provider）"))
    XCTAssertTrue(PaperBananaGuide.parameterTerms.map(\.name).contains("输出清晰度"))
    XCTAssertTrue(PaperBananaGuide.referenceTerms.map(\.name).contains("检索设置 · 自动检索"))
    XCTAssertTrue(PaperBananaGuide.referenceTerms.map(\.name).contains("上传参考图"))
    XCTAssertTrue(PaperBananaGuide.resultTerms.map(\.name).contains("生成演化"))
    XCTAssertTrue(PaperBananaGuide.faq.contains { $0.contains("任务记录页") })
    XCTAssertTrue(PaperBananaGuide.resources.allSatisfy { $0.url.scheme == "https" })
    XCTAssertEqual(PaperBananaGuide.resources.first?.url.absoluteString, "https://www.paperbanana.asia/")
    XCTAssertTrue(PaperBananaGuide.resources.map(\.id).contains("github"))
  }
}
