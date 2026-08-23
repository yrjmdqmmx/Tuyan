import XCTest
@testable import PaperBanana

@MainActor
final class ModelRegistryStoreTests: XCTestCase {
  func testCachedRegistryIsDisplayOnlyUntilLiveRefreshSucceeds() throws {
    let cacheURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: cacheURL) }
    let store = ModelRegistryStore(apiClient: PaperBananaAPIClient(), cacheURL: cacheURL)
    let registry = try JSONDecoder().decode(ModelRegistry.self, from: Data(#"{"code":0,"registryVersion":"v9","routeContractVersion":1,"supportsModelRoutes":true,"providers":{}}"#.utf8))

    store.acceptCachedRegistry(registry)
    XCTAssertEqual(store.registry?.registryVersion, "v9")
    XCTAssertFalse(store.hasLiveRegistry)

    store.acceptLiveRegistry(registry)
    XCTAssertTrue(store.hasLiveRegistry)
  }
}
