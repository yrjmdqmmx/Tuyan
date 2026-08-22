import XCTest

final class PaperBananaUITests: XCTestCase {
  private var app: XCUIApplication!

  override func setUpWithError() throws {
    continueAfterFailure = false
    app = XCUIApplication()
    app.launchArguments = baseLaunchArguments
    app.launch()
  }

  private var baseLaunchArguments: [String] {
    [
      "-pb-ui-testing", "YES",
      "-pb-ui-disable-network", "YES",
      "-pb-ui-disable-animations", "YES",
      "-pb-preview-live-registry", "YES",
      "-pb-preview-reference-library", "YES",
      "-pb-preview-current-result", "YES",
      "-pb-preview-signed-in", "YES",
      "-pb-initial-tab", "generate",
    ]
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
    let search = app.searchFields["搜索主题、图示或论文"]
    XCTAssertTrue(search.waitForExistence(timeout: 3))
    XCTAssertTrue(app.buttons["reference.facet.visual"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.buttons["reference.facet.domain"].waitForExistence(timeout: 3))

    XCTAssertTrue(app.buttons["reference.item.ref_279"].waitForExistence(timeout: 3))
    search.tap()
    search.typeText("重建")
    XCTAssertTrue(app.buttons["reference.item.ref_281"].waitForExistence(timeout: 3), "Search must reload the deterministic fixture")
    XCTAssertFalse(app.buttons["reference.item.ref_279"].exists, "Search result must replace the first page item")

    XCTAssertTrue(app.buttons["reference.filters.clear"].waitForExistence(timeout: 3))
    app.buttons["reference.filters.clear"].tap()
    XCTAssertTrue(app.buttons["reference.item.ref_279"].waitForExistence(timeout: 3))
    app.buttons["reference.facet.visual"].tap()
    let frameworkFacet = app.buttons["reference.facet.visual.framework"]
    XCTAssertTrue(frameworkFacet.waitForExistence(timeout: 3))
    frameworkFacet.tap()
    XCTAssertTrue(app.buttons["reference.item.ref_245"].waitForExistence(timeout: 3), "Facet must replace results")
    let pageRange = app.staticTexts["reference.page.range"]
    XCTAssertEqual(pageRange.label, "1-2 / 4")

    let next = app.buttons["reference.nextPage"]
    XCTAssertTrue(next.waitForExistence(timeout: 3))
    next.tap()
    XCTAssertTrue(app.buttons["reference.item.ref_240"].waitForExistence(timeout: 3), "Next page must expose a different fixture item")
    XCTAssertEqual(pageRange.label, "3-4 / 4")
    let selectionCount = app.staticTexts["reference.selectionCount"]
    XCTAssertTrue(selectionCount.waitForExistence(timeout: 3))
    let before = selectionCount.label
    app.buttons["reference.item.ref_240"].tap()
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

  func testDarkAccessibilityXXLReduceMotionMatrixKeepsPrimaryFlowsOperable() {
    app.terminate()
    app.launchArguments = baseLaunchArguments + [
      "-pb-ui-preview-dark", "YES",
      "-pb-ui-preview-accessibility-size", "AX-XXL",
      "-pb-ui-preview-reduce-motion", "YES",
    ]
    app.launch()

    for identifier in ["generate", "refine", "records", "guide", "settings"] {
      let item = tab(identifier)
      XCTAssertTrue(item.waitForExistence(timeout: 5), "Dark AX matrix missing \(identifier)")
      item.tap()
    }

    tab("generate").tap()
    app.buttons["generate.settings.summary"].tap()
    XCTAssertTrue(app.navigationBars["生成设置"].waitForExistence(timeout: 3))
    XCTAssertTrue(waitForElement("generate.settings.key.bailian", scrolling: true))
    app.buttons["generate.settings.close"].tap()

    tab("refine").tap()
    XCTAssertTrue(app.navigationBars["精修图片"].waitForExistence(timeout: 3))

    tab("settings").tap()
    for identifier in ["settings.privacy", "settings.terms", "settings.website", "settings.github", "settings.contact.qr"] {
      XCTAssertTrue(waitForElement(identifier, scrolling: true), "Dark AX matrix missing \(identifier)")
    }

    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = "dark-accessibility-xxl-reduce-motion-settings"
    attachment.lifetime = .keepAlways
    add(attachment)
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
