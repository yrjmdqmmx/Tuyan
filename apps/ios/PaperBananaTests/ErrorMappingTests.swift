import XCTest
@testable import PaperBanana

final class ErrorMappingTests: XCTestCase {
  // MARK: - HTTP 状态码映射

  func testUnauthorizedStatusCodeMapsToLoginPrompt() {
    let error = PaperBananaAPIError.http(ServerErrorDetails(statusCode: 401, code: nil, message: nil))
    XCTAssertEqual(formatUserFacingError(error), "请先登录后再使用任务记录。")
  }

  func testUnauthorizedWithUnknownMessageStillPromptsLogin() {
    let error = PaperBananaAPIError.http(ServerErrorDetails(statusCode: 401, code: nil, message: "Token has expired"))
    XCTAssertEqual(formatUserFacingError(error), "请先登录后再使用任务记录。")
  }

  func testForbiddenStatusCodeMapsToPermissionMessage() {
    let error = PaperBananaAPIError.http(ServerErrorDetails(statusCode: 403, code: nil, message: nil))
    XCTAssertEqual(formatUserFacingError(error), "当前账号没有权限查看这个任务。")
  }

  func testTooManyRequestsStatusCodeMapsToRetryLater() {
    let error = PaperBananaAPIError.http(ServerErrorDetails(statusCode: 429, code: nil, message: nil))
    XCTAssertEqual(formatUserFacingError(error), "请求过于频繁，请稍后再试。")
  }

  func testServerErrorStatusCodesMapToServiceUnavailable() {
    for statusCode in [500, 502, 503, 504] {
      let error = PaperBananaAPIError.http(ServerErrorDetails(statusCode: statusCode, code: nil, message: nil))
      XCTAssertEqual(formatUserFacingError(error), "服务暂时不可用，请稍后重试。", "HTTP \(statusCode)")
    }
  }

  func testServerErrorWithSpecificMessageKeepsMessage() {
    let error = PaperBananaAPIError.http(ServerErrorDetails(statusCode: 503, code: nil, message: "Capability unavailable"))
    XCTAssertEqual(formatUserFacingError(error), "Capability unavailable")
  }

  // MARK: - envelope code 字段映射

  func testInvalidCredentialsCodeMapsToFriendlyMessage() {
    let error = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 401, code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password")
    )
    XCTAssertEqual(formatUserFacingError(error), "邮箱或密码不正确。")
  }

  func testUserAlreadyExistsCodeTakesPriorityOverStatusCode() {
    let error = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 422, code: "USER_ALREADY_EXISTS", message: nil)
    )
    XCTAssertEqual(formatUserFacingError(error), "这个邮箱已经注册，请直接登录。")
  }

  func testInvalidPasswordCodeMapsToReenterPasswordMessage() {
    let error = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 401, code: "INVALID_PASSWORD", message: "Invalid password")
    )
    XCTAssertEqual(formatUserFacingError(error), "密码不正确，请重新输入。")
  }

  /// 网关删除账号端点返回扁平 shape `{"code":401,"error":"INVALID_PASSWORD"}`，
  /// 解析后 code=nil、message="INVALID_PASSWORD"——验证 message 也会按已知 code 映射。
  func testFlatErrorStringIsMappedAsKnownCode() {
    let invalidPassword = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 401, code: nil, message: "INVALID_PASSWORD")
    )
    XCTAssertEqual(formatUserFacingError(invalidPassword), "密码不正确，请重新输入。")

    let emailMismatch = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 403, code: nil, message: "EMAIL_MISMATCH")
    )
    XCTAssertEqual(formatUserFacingError(emailMismatch), "账号信息不匹配，请重新登录。")
  }

  func testEmailMismatchCodeMapsToReLoginMessage() {
    let error = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 403, code: "EMAIL_MISMATCH", message: "Email mismatch")
    )
    XCTAssertEqual(formatUserFacingError(error), "账号信息不匹配，请重新登录。")
  }

  func testSessionExpiredCodeMapsToReLoginPrompt() {
    let error = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 401, code: "SESSION_EXPIRED", message: nil)
    )
    XCTAssertEqual(formatUserFacingError(error), "登录已过期，请重新登录。")
  }

  func testConcreteServerMessageWinsOverBusinessCodeLabel() {
    let error = PaperBananaAPIError.http(ServerErrorDetails(statusCode: 400, code: "REFINE_RESOLUTION_UNSUPPORTED", message: "wan2.7-image-pro 仅支持 2K 精修"))
    XCTAssertEqual(formatUserFacingError(error), "wan2.7-image-pro 仅支持 2K 精修")
  }

  // MARK: - Better Auth 已知英文消息

  func testKnownEnglishMessageMappingStillApplies() {
    let error = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 400, code: nil, message: "Missing API key for provider bailian")
    )
    XCTAssertEqual(formatUserFacingError(error), "缺少所选模型接口的 API Key。")
  }

  func testUserAlreadyExistsMessageWithoutCodeStillMaps() {
    let error = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 422, code: nil, message: "User already exists")
    )
    XCTAssertEqual(formatUserFacingError(error), "这个邮箱已经注册，请直接登录。")
  }

  // MARK: - 字符串兜底

  func testUnknownMessageFallsBackToRawMessage() {
    XCTAssertEqual(formatUserFacingError("Some random failure"), "Some random failure")
  }

  func testEmptyMessageFallsBackToGenericFailure() {
    XCTAssertEqual(formatUserFacingError(""), "操作失败")
  }

  func testHTTPErrorWithUnknownStatusAndMessageFallsBackToMessage() {
    let error = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 418, code: nil, message: "I'm a teapot")
    )
    XCTAssertEqual(formatUserFacingError(error), "I'm a teapot")
  }

  // MARK: - URLError code 显式映射（不依赖 localizedDescription 的语言）

  func testURLErrorTimedOutMapsToTimeoutMessage() {
    XCTAssertEqual(formatUserFacingError(URLError(.timedOut)), "请求超时，请稍后重试。")
  }

  func testURLErrorOfflineCodesMapToNoNetworkMessage() {
    XCTAssertEqual(formatUserFacingError(URLError(.notConnectedToInternet)), "网络未连接，请检查网络后重试。")
    XCTAssertEqual(formatUserFacingError(URLError(.networkConnectionLost)), "网络未连接，请检查网络后重试。")
  }

  func testURLErrorHostCodesMapToCannotReachServerMessage() {
    XCTAssertEqual(formatUserFacingError(URLError(.cannotFindHost)), "无法连接服务器，请确认网络可访问 Sealos 后端地址。")
    XCTAssertEqual(formatUserFacingError(URLError(.cannotConnectToHost)), "无法连接服务器，请确认网络可访问 Sealos 后端地址。")
  }

  func testUnmappedURLErrorFallsBackToDescriptionPath() {
    let error = URLError(.badServerResponse)
    XCTAssertEqual(formatUserFacingError(error), formatUserFacingError(error.localizedDescription))
  }

  // MARK: - localizedDescription

  func testHTTPErrorDescriptionPrefersMessageThenFallsBackToStatus() {
    let withMessage = PaperBananaAPIError.http(
      ServerErrorDetails(statusCode: 503, code: nil, message: "Backend is unavailable")
    )
    XCTAssertEqual(withMessage.localizedDescription, "Backend is unavailable")

    let withoutMessage = PaperBananaAPIError.http(ServerErrorDetails(statusCode: 503, code: nil, message: nil))
    XCTAssertEqual(withoutMessage.localizedDescription, "HTTP 503")
  }
}
