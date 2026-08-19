import XCTest
@testable import PaperBananaMac

final class ClientPlatformTests: XCTestCase {
  func testCreateJobBodyUsesFixedMacOSPlatform() {
    XCTAssertEqual(PaperBananaAPIClient.createJobClientPlatform, "macos")
  }

  func testJobDecodesSnakeAndCamelClientPlatformAndFormatsCanonicalValues() throws {
    let snake = try JSONDecoder().decode(Job.self, from: Data(#"{"id":"snake","client_platform":"windows"}"#.utf8))
    let camel = try JSONDecoder().decode(Job.self, from: Data(#"{"id":"camel","clientPlatform":"harmony"}"#.utf8))
    let legacy = try JSONDecoder().decode(Job.self, from: Data(#"{"id":"legacy"}"#.utf8))

    XCTAssertEqual(snake.clientPlatformDisplayName, "Windows")
    XCTAssertEqual(camel.clientPlatformDisplayName, "HarmonyOS")
    XCTAssertEqual(legacy.clientPlatformDisplayName, "未记录")
  }
}
