import XCTest
@testable import PaperBanana

final class ProviderCatalogTests: XCTestCase {
  func testProviderCatalogRetainsOnlyLocalKeyAndGuideMetadata() {
    for provider in ProviderCatalog.order {
      let config = ProviderCatalog.config(for: provider)
      XCTAssertEqual(config.id, provider)
      XCTAssertFalse(config.label.isEmpty)
      XCTAssertFalse(config.keyName.isEmpty)
      XCTAssertFalse(config.keyPlaceholder.isEmpty)
      XCTAssertEqual(config.guideURL.scheme, "https")
      XCTAssertEqual(config.guideSteps.count, 3)
    }
  }

  func testUnknownProviderGetsSafeMetadataWithoutInventingModels() {
    let config = ProviderCatalog.config(for: ProviderID(rawValue: "future"))
    XCTAssertEqual(config.label, "future")
    XCTAssertEqual(config.keyName, "future")
  }
}
