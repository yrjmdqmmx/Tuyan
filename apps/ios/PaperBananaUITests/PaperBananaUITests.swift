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
    openGenerationSettings()
    XCTAssertTrue(waitForElement("generate.settings.key.bailian"))
    XCTAssertTrue(waitForElement("generate.settings.route.main", scrolling: true))
    app.descendants(matching: .any)["generate.settings.route.main"].firstMatch.tap()
    XCTAssertTrue(app.navigationBars["主模型路由"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.buttons["route.provider.bailian"].waitForExistence(timeout: 3))
    app.buttons["route.provider.bailian"].tap()
    XCTAssertTrue(app.navigationBars["选择模型厂商"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.buttons["route.vendor.bailian.bailian"].waitForExistence(timeout: 3))
    app.buttons["route.vendor.bailian.bailian"].tap()
    XCTAssertTrue(app.navigationBars["选择主模型"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.buttons["route.model.bailian-main"].waitForExistence(timeout: 3))
    app.navigationBars.buttons.firstMatch.tap()
    app.navigationBars.buttons.firstMatch.tap()
    app.navigationBars.buttons.firstMatch.tap()
    XCTAssertTrue(app.buttons["generate.settings.close"].exists)
    app.buttons["generate.settings.close"].tap()
    XCTAssertTrue(app.buttons["generate.settings.summary"].waitForExistence(timeout: 3))
  }

  func testGenerateHomeRemovesQuickStartAndShowsCompleteEffectiveSummary() {
    XCTAssertFalse(app.staticTexts["快速上手案例"].exists)
    for identifier in [
      "generate.summary.route.main",
      "generate.summary.route.image",
      "generate.summary.route.vision",
      "generate.summary.pipeline",
      "generate.summary.retrieval",
      "generate.summary.candidates",
      "generate.summary.criticRounds",
    ] {
      XCTAssertTrue(waitForElement(identifier, scrolling: true), "Missing summary item \(identifier)")
    }
  }

  func testFeaturedTemplateDirtyConfirmationCanCancelThenReplace() {
    let field = app.textViews["generate.negativePrompt"]
    field.tap()
    field.typeText("自定义排除项")
    app.buttons["generate.featured.browse"].tap()
    XCTAssertTrue(app.navigationBars["精选模板库"].waitForExistence(timeout: 3))
    app.descendants(matching: .any)["generate.featured.card.multi-agent-method"].firstMatch.tap()
    XCTAssertTrue(app.navigationBars["多智能体方法框架"].waitForExistence(timeout: 3))
    app.buttons["generate.featured.apply"].tap()
    XCTAssertTrue(app.alerts["替换输入内容？"].waitForExistence(timeout: 3))
    app.alerts.buttons["generate.featured.confirm.cancel"].firstMatch.tap()
    XCTAssertTrue(app.navigationBars["精选模板库"].waitForExistence(timeout: 3))
    app.descendants(matching: .any)["generate.featured.card.multi-agent-method"].firstMatch.tap()
    app.buttons["generate.featured.apply"].tap()
    XCTAssertTrue(app.alerts["替换输入内容？"].waitForExistence(timeout: 3))
    app.alerts.buttons["generate.featured.confirm.replace"].firstMatch.tap()
    XCTAssertTrue(app.buttons["generate.featured.browse"].waitForExistence(timeout: 3))
  }

  func testReferenceGalleryFixtureSupportsSearchFacetsPagingAndSelection() {
    openGenerationSettings()
    let gallery = app.buttons["generate.referenceGallery.open"]
    XCTAssertTrue(waitForElement("generate.referenceGallery.open", scrolling: true))
    gallery.tap()
    XCTAssertTrue(app.navigationBars["参考图库"].waitForExistence(timeout: 3))
    let search = app.textFields["reference.search"]
    XCTAssertTrue(search.waitForExistence(timeout: 8))
    XCTAssertTrue(app.buttons["reference.facet.visual"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.buttons["reference.facet.domain"].waitForExistence(timeout: 3))

    XCTAssertTrue(app.buttons["reference.item.ref_279"].waitForExistence(timeout: 3))
    XCTAssertEqual(app.staticTexts["reference.page.range"].label, "1-2 / 306")
    assertReferencePreviewCardsStayInsideTwoColumnGrid()
    if app.frame.width < 700 {
      search.tap()
      search.typeText("重建")
      XCTAssertTrue(app.buttons["reference.item.ref_281"].waitForExistence(timeout: 3), "Search must reload the deterministic fixture")
      XCTAssertFalse(app.buttons["reference.item.ref_279"].exists, "Search result must replace the first page item")

      XCTAssertTrue(app.buttons["reference.filters.clear"].waitForExistence(timeout: 3))
      app.buttons["reference.filters.clear"].tap()
      XCTAssertTrue(app.buttons["reference.item.ref_279"].waitForExistence(timeout: 3))
    }
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

  func testTemplateDetailAndReferenceLibrarySurviveBackgroundingWithoutOverlapping() {
    app.buttons["generate.featured.browse"].tap()
    XCTAssertTrue(app.navigationBars["精选模板库"].waitForExistence(timeout: 3))
    let templateCard = app.descendants(matching: .any)["generate.featured.card.multi-agent-method"].firstMatch
    XCTAssertTrue(templateCard.waitForExistence(timeout: 3))
    XCTAssertLessThan(templateCard.frame.height, 420, "A compact template card must have a finite image height")
    XCTAssertLessThanOrEqual(templateCard.frame.maxX, app.frame.maxX + 1)
    templateCard.tap()
    XCTAssertTrue(app.navigationBars["多智能体方法框架"].waitForExistence(timeout: 3))
    let detailCard = app.descendants(matching: .any)["generate.featured.card.multi-agent-method"].firstMatch
    XCTAssertTrue(detailCard.waitForExistence(timeout: 3))
    XCTAssertLessThan(detailCard.frame.height, 500, "Template detail artwork must not push text out of its card")

    XCUIDevice.shared.press(.home)
    app.activate()
    XCTAssertTrue(app.navigationBars["多智能体方法框架"].waitForExistence(timeout: 5), "The app must remain alive after backgrounding an image-heavy view")
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
    openGenerationSettings()
    XCTAssertTrue(waitForElement("generate.settings.key.bailian", scrolling: true))
    app.buttons["generate.settings.close"].tap()

    let refineTab = tab("refine")
    XCTAssertTrue(refineTab.waitForExistence(timeout: 5), "Tab bar did not return after dismissing settings")
    refineTab.tap()
    XCTAssertTrue(app.navigationBars["精修图片"].waitForExistence(timeout: 3))

    let settingsTab = tab("settings")
    XCTAssertTrue(settingsTab.waitForExistence(timeout: 5))
    settingsTab.tap()
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

  private func openGenerationSettings(file: StaticString = #filePath, line: UInt = #line) {
    let summary = app.buttons["generate.settings.summary"]
    XCTAssertTrue(summary.waitForExistence(timeout: 5), "Missing generation settings summary", file: file, line: line)
    for _ in 0..<5 where !summary.isHittable {
      app.swipeUp()
    }
    XCTAssertTrue(summary.isHittable, "Generation settings summary is not tappable", file: file, line: line)
    summary.tap()
    XCTAssertTrue(
      app.navigationBars["生成设置"].waitForExistence(timeout: 5),
      "Generation settings did not open",
      file: file,
      line: line
    )
  }


  private func assertReferencePreviewCardsStayInsideTwoColumnGrid(file: StaticString = #filePath, line: UInt = #line) {
    let previews = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "预览参考图"))
    XCTAssertGreaterThanOrEqual(previews.count, 2, file: file, line: line)
    let first = previews.element(boundBy: 0)
    let second = previews.element(boundBy: 1)
    XCTAssertTrue(first.exists && second.exists, file: file, line: line)
    if app.frame.width < 700 {
      XCTAssertLessThan(first.frame.width, app.frame.width * 0.55, file: file, line: line)
      XCTAssertLessThan(second.frame.width, app.frame.width * 0.55, file: file, line: line)
      XCTAssertFalse(first.frame.intersects(second.frame), "Reference images must not overlap adjacent iPhone grid cells", file: file, line: line)
      XCTAssertGreaterThanOrEqual(first.frame.minX, -1, file: file, line: line)
      XCTAssertLessThanOrEqual(second.frame.maxX, app.frame.maxX + 1, file: file, line: line)
    } else {
      // A regular-width sheet uses an adaptive grid. XCTest may expose the
      // same combined accessibility frame for adjacent image buttons, so only
      // assert the finite-card invariant here; compact width owns the strict
      // two-column non-intersection contract reported by the real device.
      XCTAssertLessThan(first.frame.width, app.frame.width * 0.8, file: file, line: line)
      XCTAssertLessThan(first.frame.height, app.frame.height * 0.5, file: file, line: line)
      XCTAssertLessThan(second.frame.height, app.frame.height * 0.5, file: file, line: line)
    }
  }

  private func tab(_ identifier: String) -> XCUIElement {
    app.descendants(matching: .any)["tab.\(identifier)"].firstMatch
  }
}
