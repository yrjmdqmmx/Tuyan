import XCTest
@testable import PaperBanana

final class ModelRegistryTests: XCTestCase {
  func testProviderIDDecodesUnknownServerValueWithoutFailing() throws {
    let provider = try JSONDecoder().decode(ProviderID.self, from: Data(#""future-provider""#.utf8))

    XCTAssertEqual(provider.rawValue, "future-provider")
  }

  func testV9RegistryDecodesTolerantMetadataAndNullableReleaseDate() throws {
    let registry = try JSONDecoder().decode(ModelRegistry.self, from: fixtureData())
    let provider = try XCTUnwrap(registry.providers[.bailian])
    let image = try XCTUnwrap(provider.models.first { $0.id == "image-a" })

    XCTAssertEqual(registry.registryVersion, "2026-08-21.v9")
    XCTAssertTrue(registry.supportsModelRoutes)
    XCTAssertEqual(provider.defaults.main, "main-a")
    XCTAssertEqual(image.lifecycle, "future-lifecycle")
    XCTAssertEqual(image.verificationState, "future-verification")
    XCTAssertNil(image.releasedAt)
    XCTAssertEqual(image.capabilities.imageEditMode, "direct-edit")
  }

  func testRegistryOrdersOnlyLiveProvidersAndSelectableRoleEntries() throws {
    var registry = try JSONDecoder().decode(ModelRegistry.self, from: fixtureData())
    registry.providers[ProviderID(rawValue: "future")] = try XCTUnwrap(registry.providers[.bailian])

    XCTAssertEqual(registry.orderedProviders, [.openrouter, .bailian, ProviderID(rawValue: "future")])
    XCTAssertEqual(registry.models(for: .bailian, role: .main).map(\.id), ["main-a"])
    XCTAssertEqual(registry.models(for: .bailian, role: .image).map(\.id), ["image-a"])
  }

  func testDefaultsCreateCompleteSingleProviderRoutes() throws {
    let registry = try JSONDecoder().decode(ModelRegistry.self, from: fixtureData())

    XCTAssertEqual(registry.defaultRoutes(for: .bailian), ModelRoutes(
      main: ModelRoute(accessProvider: .bailian, modelId: "main-a"),
      image: ModelRoute(accessProvider: .bailian, modelId: "image-a"),
      vision: ModelRoute(accessProvider: .bailian, modelId: "vision-a")
    ))
  }

  func testCapabilityMissingAndExplicitEmptyRemainDistinct() throws {
    let registry = try JSONDecoder().decode(ModelRegistry.self, from: fixtureData())
    let missing = try XCTUnwrap(registry.providers[.bailian]?.models.first { $0.id == "main-a" })
    let explicitEmpty = try XCTUnwrap(registry.providers[.bailian]?.models.first { $0.id == "image-a" })

    XCTAssertNil(missing.capabilities.aspectRatios)
    XCTAssertEqual(explicitEmpty.capabilities.aspectRatios, [])
    XCTAssertEqual(registry.generationAspectRatios(for: ModelRoute(accessProvider: .bailian, modelId: "main-a")), ["16:9", "21:9", "3:2", "1:1"])
    XCTAssertEqual(registry.generationAspectRatios(for: ModelRoute(accessProvider: .bailian, modelId: "image-a")), ["auto"])
    XCTAssertEqual(registry.refineResolutions(for: ModelRoute(accessProvider: .bailian, modelId: "main-a")), [.twoK])
    XCTAssertEqual(registry.refineResolutions(for: ModelRoute(accessProvider: .bailian, modelId: "image-a")), [])
  }

  private func fixtureData() -> Data {
    Data(#"""
    {"code":0,"registryVersion":"2026-08-21.v9","routeContractVersion":1,"supportsModelRoutes":true,"providers":{"bailian":{"accessKind":"direct","routeContractVersion":1,"accountCatalogRequired":false,"defaults":{"main":"main-a","image":"image-a","vision":"vision-a"},"models":[{"id":"main-a","label":"Main","vendor":"Vendor","lifecycle":"stable","verificationState":"registry","releasedAt":"2026-08-20","roles":["main"],"roleReasons":{},"protocol":"bailian-openai-chat","selectable":true,"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},{"id":"image-a","label":"Image","vendor":"Vendor","lifecycle":"future-lifecycle","verificationState":"future-verification","releasedAt":null,"roles":["image"],"roleReasons":{},"protocol":"bailian-multimodal-generation","selectable":true,"capabilities":{"referenceImages":false,"imageGeneration":true,"imageEditing":true,"imageEditMode":"direct-edit","resolutions":["1K","2K"],"refineResolutions":[],"aspectRatios":[],"refineAspectRatios":[],"outputFormats":["png"]}},{"id":"vision-a","label":"Vision","vendor":"Vendor","lifecycle":"stable","verificationState":"registry","releasedAt":null,"roles":["vision"],"roleReasons":{},"protocol":"bailian-openai-chat","selectable":true,"capabilities":{"referenceImages":true,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}},{"id":"disabled-main","label":"Disabled","vendor":"Vendor","lifecycle":"stable","verificationState":"registry","releasedAt":null,"roles":["main"],"roleReasons":{},"protocol":"bailian-openai-chat","selectable":false,"disabledReason":"No entitlement","capabilities":{"referenceImages":false,"imageGeneration":false,"imageEditing":false,"imageEditMode":"none"}}]}},"unavailableProviders":{"gemini":"offline"}}
    """#.utf8)
  }
}
