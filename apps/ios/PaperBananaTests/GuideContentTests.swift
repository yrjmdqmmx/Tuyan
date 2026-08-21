import XCTest
@testable import PaperBanana

final class GuideContentTests: XCTestCase {
  func testGuideKeepsRegistryAndIndependentRefineBoundariesExplicit() {
    let guideText = ([PaperBananaGuide.intro]
      + PaperBananaGuide.workflowSteps.map(\.detail)
      + PaperBananaGuide.modelTerms.map(\.detail)
      + PaperBananaGuide.parameterTerms.map(\.detail)
      + PaperBananaGuide.referenceTerms.map(\.detail)
      + PaperBananaGuide.resultTerms.map(\.detail)).joined(separator: "\n")

    XCTAssertTrue(guideText.contains("registry"))
    XCTAssertTrue(guideText.contains("独立精修"))
    XCTAssertTrue(guideText.contains("Keychain"))
    XCTAssertTrue(guideText.contains("短生命周期"))
    XCTAssertTrue(guideText.contains("方舟"))
  }

  func testSettingsLegalURLsUseThePublishedSourcesAndCorrectRepository() {
    XCTAssertEqual(PaperBananaLegal.privacyURL.absoluteString, "https://www.paperbanana.asia/privacy-policy.html")
    XCTAssertEqual(PaperBananaLegal.termsURL.absoluteString, "https://www.paperbanana.asia/terms-of-service.html")
    XCTAssertEqual(PaperBananaLegal.websiteURL.absoluteString, "https://www.paperbanana.asia/")
    XCTAssertEqual(PaperBananaLegal.githubURL.absoluteString, "https://github.com/yrjmdqmmx/paperbanana-clients")
  }
}
