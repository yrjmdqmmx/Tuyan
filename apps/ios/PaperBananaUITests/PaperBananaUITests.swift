import XCTest

final class PaperBananaUITests: XCTestCase {
  private var app: XCUIApplication!

  override func setUpWithError() throws {
    continueAfterFailure = false
    app = XCUIApplication()
    app.launchArguments = [
      "-pb-ui-testing", "YES",
      "-pb-preview-live-registry", "YES",
      "-pb-preview-reference-library", "YES",
      "-pb-preview-current-result", "YES",
      "-pb-preview-signed-in", "YES",
      "-pb-initial-tab", "generate",
    ]
    app.launch()
  }

  func testFiveTabNavigationUsesStableLabelsAndTargets() {
    let expected = [("generate", "生成"), ("refine", "精修"), ("records", "记录"), ("guide", "指南"), ("settings", "设置")]
    for (identifier, label) in expected {
      let tab = self.tab(identifier)
      XCTAssertTrue(tab.waitForExistence(timeout: 5), "Missing tab \(label)")
      // iPad's native sidebar exposes a 36pt label node although the owning
      // sidebar row handles a larger hit region. The compact tab bar exposes
      // the actionable frame directly, so that is where XCTest can assert it.
      if app.frame.width < 700 {
        XCTAssertGreaterThanOrEqual(tab.frame.height, 44, "\(label) must remain a 44pt target")
      }
      tab.tap()
    }
  }

  func testGenerationSettingsExposesRoutesAndDismisses() {
    app.buttons["generate.settings.summary"].tap()
    XCTAssertTrue(app.navigationBars["生成设置"].waitForExistence(timeout: 3))
    XCTAssertTrue(waitForElement("generate.settings.key.bailian"))
    XCTAssertTrue(waitForElement("generate.settings.route.main.provider"))
    XCTAssertTrue(waitForElement("generate.settings.route.image.model"))
    XCTAssertTrue(app.buttons["generate.settings.close"].exists)
    app.buttons["generate.settings.close"].tap()
    XCTAssertTrue(app.buttons["generate.settings.summary"].waitForExistence(timeout: 3))
  }

  func testFeaturedTemplateDirtyConfirmationCanCancelThenReplace() {
    let field = app.textViews["generate.negativePrompt"]
    field.tap()
    field.typeText("自定义排除项")
    app.buttons["generate.featured.browse"].tap()
    XCTAssertTrue(app.navigationBars["精选模板库"].waitForExistence(timeout: 3))
    app.buttons["generate.featured.apply"].tap()
    XCTAssertTrue(app.alerts["替换输入内容？"].waitForExistence(timeout: 3))
    app.alerts.buttons["generate.featured.confirm.cancel"].firstMatch.tap()
    XCTAssertTrue(app.navigationBars["精选模板库"].waitForExistence(timeout: 3))
    app.buttons["generate.featured.apply"].tap()
    XCTAssertTrue(app.alerts["替换输入内容？"].waitForExistence(timeout: 3))
    app.alerts.buttons["generate.featured.confirm.replace"].firstMatch.tap()
    XCTAssertTrue(app.buttons["generate.featured.browse"].waitForExistence(timeout: 3))
  }

  func testReferenceGalleryFixtureSupportsSearchFacetsPagingAndSelection() {
    app.buttons["generate.settings.summary"].tap()
    let gallery = app.buttons["generate.referenceGallery.open"]
    XCTAssertTrue(waitForElement("generate.referenceGallery.open", scrolling: true))
    gallery.tap()
    XCTAssertTrue(app.navigationBars["参考图库"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.searchFields["搜索主题、图示或论文"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.buttons["视觉类别"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.buttons["研究领域"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.buttons["下一页"].waitForExistence(timeout: 3))
    let selectionCount = app.staticTexts["reference.selectionCount"]
    XCTAssertTrue(selectionCount.waitForExistence(timeout: 3))
    let before = selectionCount.label
    app.buttons["reference.item.ref_279"].tap()
    XCTAssertNotEqual(before, selectionCount.label)
  }

  func testFixtureResultCanOpenRefineWithSourceAndInstruction() {
    tab("records").tap()
    let record = app.staticTexts["两阶段多模态融合框架总览"].firstMatch
    XCTAssertTrue(record.waitForExistence(timeout: 4))
    record.tap()
    let refine = app.buttons["result.refine.0"].firstMatch
    XCTAssertTrue(waitForElement("result.refine.0", scrolling: true))
    refine.tap()
    XCTAssertTrue(app.navigationBars["精修图片"].waitForExistence(timeout: 3))
    XCTAssertTrue(waitForElement("refine.source", scrolling: true))
    XCTAssertTrue(waitForElement("refine.instruction", scrolling: true))
    XCTAssertTrue(waitForElement("refine.submit", scrolling: true))
  }

  func testSettingsContainsLegalAndContactEntrypoints() {
    tab("settings").tap()
    for identifier in ["settings.privacy", "settings.terms", "settings.website", "settings.github", "settings.contact.qr"] {
      XCTAssertTrue(app.descendants(matching: .any)[identifier].waitForExistence(timeout: 3), "Missing \(identifier)")
    }
  }

  /// SwiftUI controls may surface as a picker, button, or generic accessibility
  /// node depending on the iOS runtime. Query by the stable identifier instead
  /// of asserting an implementation-specific XCUI element type.
  @discardableResult
  private func waitForElement(_ identifier: String, scrolling: Bool = false) -> Bool {
    let element = app.descendants(matching: .any)[identifier].firstMatch
    for _ in 0..<(scrolling ? 5 : 1) {
      if element.waitForExistence(timeout: 1) { return true }
      app.swipeUp()
    }
    return element.exists
  }

  private func tab(_ identifier: String) -> XCUIElement {
    app.descendants(matching: .any)["tab.\(identifier)"].firstMatch
  }
}
