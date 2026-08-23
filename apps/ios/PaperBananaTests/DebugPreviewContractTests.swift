import Foundation
import XCTest
@testable import PaperBanana

final class DebugPreviewContractTests: XCTestCase {
  @MainActor
  func testPreviewRegistryDecodesProductionRouteContractVersionOne() throws {
    let suite = previewDefaultsSuite()
    defer { UserDefaults.standard.removeSuite(named: suite.name) }

    let model = AppModel()
    let registry = try XCTUnwrap(model.modelRegistry.registry)
    XCTAssertEqual(registry.registryVersion, "2026-08-21.v9-ui-preview")
    XCTAssertEqual(registry.routeContractVersion, 1)
    XCTAssertEqual(registry.providers.count, 5)
    for provider in [ProviderID.bailian, .openrouter, .gemini, .openai, .ark] {
      XCTAssertEqual(registry.providers[provider]?.routeContractVersion, 1, "\(provider) must use the production route contract")
    }
  }

  @MainActor
  func testPreviewReferenceFixtureFiltersAndPaginatesWithoutNetwork() async throws {
    let suite = previewDefaultsSuite()
    defer { UserDefaults.standard.removeSuite(named: suite.name) }

    let model = AppModel()
    await model.generation.loadReferenceLibraryPage(.init(page: 1, query: "图"))
    XCTAssertEqual(model.generation.referenceLibraryPage?.references.map(\.id), ["ref_279", "ref_281"])

    await model.generation.loadReferenceLibraryPage(.init(page: 1, query: "图", visualCategory: "framework"))
    XCTAssertEqual(model.generation.referenceLibraryPage?.references.map(\.id), ["ref_279", "ref_245"])
    XCTAssertEqual(model.generation.referenceLibraryPage?.page, 1)

    await model.generation.loadReferenceLibraryPage(.init(page: 2, query: "图", visualCategory: "framework"))
    XCTAssertEqual(model.generation.referenceLibraryPage?.references.map(\.id), ["ref_240", "ref_295"])
    XCTAssertEqual(model.generation.referenceLibraryPage?.page, 2)
    XCTAssertTrue(model.generation.referenceLibraryError.isEmpty)
  }

  func testPreviewLaunchContractIsDebugOnlyAndCoversStableUITestState() throws {
    let source = try String(
      contentsOf: sourceURL(named: "DebugPreviewConfiguration.swift"),
      encoding: .utf8
    )

    XCTAssertTrue(source.contains("#if DEBUG"))
    XCTAssertFalse(source.contains("#if !DEBUG"))
    [
      "pb-ui-testing",
      "pb-ui-disable-network",
      "pb-ui-disable-animations",
      "pb-ui-preview-dark",
      "pb-ui-preview-accessibility-size",
      "pb-ui-preview-reduce-motion",
      "pb-preview-live-registry",
      "pb-preview-reference-library",
      "pb-preview-current-result",
      "pb-preview-signed-in",
      "pb-initial-tab",
    ].forEach { argument in
      XCTAssertTrue(source.contains(argument), "Missing deterministic launch argument: \(argument)")
    }
    XCTAssertTrue(source.contains("isNetworkDisabled"))
    XCTAssertTrue(source.contains("isAnimationsDisabled"))
  }

  private func sourceURL(named name: String) -> URL {
    URL(fileURLWithPath: #filePath)
      .deletingLastPathComponent()
      .deletingLastPathComponent()
      .appendingPathComponent("PaperBanana/App")
      .appendingPathComponent(name)
  }

  private func previewDefaultsSuite() -> (name: String, defaults: UserDefaults) {
    let name = "DebugPreviewContractTests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: name)!
    defaults.set(true, forKey: "pb-ui-testing")
    defaults.set(true, forKey: "pb-preview-live-registry")
    defaults.set(true, forKey: "pb-preview-reference-library")
    defaults.set(true, forKey: "pb-ui-disable-network")
    UserDefaults.standard.addSuite(named: name)
    return (name, defaults)
  }
}
