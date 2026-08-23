import XCTest
@testable import PaperBanana

@MainActor
final class AuthStoreSecurityTests: XCTestCase {
  override func tearDown() {
    AuthSecurityStub.requestHandler = nil
    super.tearDown()
  }

  private func makeModel() -> AppModel {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [AuthSecurityStub.self]
    return AppModel(apiClient: PaperBananaAPIClient(session: URLSession(configuration: configuration)))
  }

  func testSignUpMovesToAwaitingVerificationWithoutCreatingSession() async {
    let model = makeModel()
    model.auth.setFlow(.signUp)
    model.auth.authEmail = "new@example.com"
    model.auth.authPassword = "password-123"
    AuthSecurityStub.requestHandler = { request in
      XCTAssertEqual(request.url?.path, "/api/auth/sign-up/email")
      return AuthSecurityStub.response(request, status: 200, body: #"{"ok":true}"#)
    }

    await model.auth.submitPrimary()

    XCTAssertEqual(model.auth.flow, .awaitingVerification)
    XCTAssertNil(model.auth.currentUser)
    XCTAssertGreaterThan(model.auth.resendCooldownSeconds, 0)
  }

  func testUnverifiedSignInUsesStableCodeAndPreservesVerificationEmail() async {
    let model = makeModel()
    model.auth.authEmail = "pending@example.com"
    model.auth.authPassword = "password-123"
    AuthSecurityStub.requestHandler = { request in
      AuthSecurityStub.response(request, status: 403, body: #"{"code":"EMAIL_NOT_VERIFIED","message":"English detail"}"#)
    }

    await model.auth.submitPrimary()

    XCTAssertEqual(model.auth.flow, .awaitingVerification)
    XCTAssertEqual(model.auth.authEmail, "pending@example.com")
    XCTAssertEqual(model.auth.authError, "邮箱尚未验证，请先查看验证邮件。")
  }

  func testUnknownEmailPasswordResetUsesGenericSuccessState() async {
    let model = makeModel()
    model.auth.setFlow(.forgotPassword)
    model.auth.authEmail = "unknown@example.com"
    AuthSecurityStub.requestHandler = { request in
      XCTAssertEqual(request.url?.path, "/api/auth/request-password-reset")
      return AuthSecurityStub.response(request, status: 200, body: #"{"ok":true}"#)
    }

    await model.auth.submitPrimary()

    XCTAssertEqual(model.auth.flow, .recoverySent)
    XCTAssertTrue(model.auth.authError.isEmpty)
  }

  func testPasswordValidationShowsMinimumWithoutAdvertisingMaximum() async {
    let model = makeModel()
    model.auth.authEmail = "person@example.com"
    model.auth.authPassword = "short"

    await model.auth.submitPrimary()

    XCTAssertEqual(model.auth.authError, "密码至少 8 位。")

    model.auth.authPassword = String(repeating: "x", count: 129)
    await model.auth.submitPrimary()

    XCTAssertEqual(model.auth.authError, "密码过长，请使用更短的密码。")
  }
}

private final class AuthSecurityStub: URLProtocol {
  nonisolated(unsafe) static var requestHandler: ((URLRequest) -> (HTTPURLResponse, Data))?

  static func response(_ request: URLRequest, status: Int, body: String) -> (HTTPURLResponse, Data) {
    let response = HTTPURLResponse(
      url: request.url!, statusCode: status, httpVersion: "HTTP/1.1",
      headerFields: ["Content-Type": "application/json"]
    )!
    return (response, Data(body.utf8))
  }

  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() {
    guard let handler = Self.requestHandler else { return client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse)) ?? () }
    let (response, data) = handler(request)
    client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: data)
    client?.urlProtocolDidFinishLoading(self)
  }
  override func stopLoading() {}
}
