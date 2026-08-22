import Foundation
import XCTest
@testable import PaperBanana

final class DebugPreviewContractTests: XCTestCase {
  func testPreviewLaunchContractIsDebugOnlyAndCoversStableUITestState() throws {
    let source = try String(
      contentsOf: sourceURL(named: "DebugPreviewConfiguration.swift"),
      encoding: .utf8
    )

    XCTAssertTrue(source.contains("#if DEBUG"))
    XCTAssertFalse(source.contains("#if !DEBUG"))
    [
      "pb-ui-testing",
      "pb-preview-live-registry",
      "pb-preview-reference-library",
      "pb-preview-current-result",
      "pb-preview-signed-in",
      "pb-initial-tab",
    ].forEach { argument in
      XCTAssertTrue(source.contains(argument), "Missing deterministic launch argument: \(argument)")
    }
  }

  private func sourceURL(named name: String) -> URL {
    URL(fileURLWithPath: #filePath)
      .deletingLastPathComponent()
      .deletingLastPathComponent()
      .appendingPathComponent("PaperBanana/App")
      .appendingPathComponent(name)
  }
}
