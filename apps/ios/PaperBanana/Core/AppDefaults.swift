import Foundation

enum AppDefaults {
  static let productionAPIBase = "https://api.paperbanana.asia"
  static let webOrigin = "https://www.paperbanana.asia"
  static let apiBaseKey = "paperbanana.ios.apiBase"
  static let clientVersion = "ios-0.1.0"

  static func normalizedAPIBase(_ value: String) -> String {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    let base = trimmed.isEmpty ? productionAPIBase : trimmed
    return base.replacingOccurrences(of: "/+$", with: "", options: .regularExpression)
  }
}
