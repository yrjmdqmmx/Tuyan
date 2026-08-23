import Foundation

/// 后端失败响应中可用于错误映射的结构化信息。
struct ServerErrorDetails: Equatable {
  /// HTTP 状态码；envelope 失败（HTTP 200 但 ok=false/code!=0）时为 200。
  let statusCode: Int
  /// envelope 的错误 code 字段（如 Better Auth 的 "INVALID_EMAIL_OR_PASSWORD"）。
  let code: String?
  /// 从响应里提取出的错误消息。
  let message: String?
  /// Better Auth / gateway 的 X-Retry-After 秒数。
  let retryAfterSeconds: Int?

  init(statusCode: Int, code: String?, message: String?, retryAfterSeconds: Int? = nil) {
    self.statusCode = statusCode
    self.code = code
    self.message = message
    self.retryAfterSeconds = retryAfterSeconds
  }
}

enum PaperBananaAPIError: LocalizedError {
  case invalidURL(String)
  case invalidResponse
  case server(String)
  case http(ServerErrorDetails)
  case decoding(String)

  var errorDescription: String? {
    switch self {
    case .invalidURL(let value): "无效后端地址：\(value)"
    case .invalidResponse: "后端返回了无效响应。"
    case .server(let message): message
    case .http(let details): details.message ?? "HTTP \(details.statusCode)"
    case .decoding(let message): "响应解析失败：\(message)"
    }
  }
}
