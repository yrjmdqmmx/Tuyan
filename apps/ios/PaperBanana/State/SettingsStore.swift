import Foundation
import Observation

/// 后端地址、健康检查与意见反馈。
@Observable
@MainActor
final class SettingsStore {
  var apiBase: String {
    didSet {
      apiBase = AppDefaults.normalizedAPIBase(apiBase)
      UserDefaults.standard.set(apiBase, forKey: AppDefaults.apiBaseKey)
    }
  }

  var health: BackendHealth?
  var healthError = ""

  var feedbackCategory: FeedbackCategory = .experience
  var feedbackMessage = ""
  var feedbackContact = ""
  var feedbackError = ""
  var feedbackSuccess = false
  var feedbackSubmitting = false

  /// 由 AppModel 注入：提交反馈时带上当前任务 ID（跨 store 只读依赖）。
  @ObservationIgnored var currentJobIDProvider: () -> String? = { nil }

  private let apiClient: PaperBananaAPIClient

  init(apiClient: PaperBananaAPIClient) {
    self.apiClient = apiClient
    let storedBase = UserDefaults.standard.string(forKey: AppDefaults.apiBaseKey) ?? AppDefaults.productionAPIBase
    apiBase = AppDefaults.normalizedAPIBase(storedBase)
  }

  var canSubmitFeedback: Bool {
    let messageLength = feedbackMessage.trimmingCharacters(in: .whitespacesAndNewlines).count
    return !feedbackSubmitting && (1...2000).contains(messageLength)
  }

  func refreshHealth() async {
    healthError = ""
    do {
      health = try await apiClient.fetchBackendHealth(apiBase: apiBase)
    } catch {
      health = nil
      healthError = formatUserFacingError(error)
    }
  }

  func resetBackendBase() {
    apiBase = AppDefaults.productionAPIBase
  }

  func submitFeedback() async {
    guard canSubmitFeedback else {
      feedbackError = feedbackMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        ? "请先填写反馈内容。"
        : "反馈内容不能超过 2000 字。"
      return
    }
    feedbackSubmitting = true
    feedbackError = ""
    feedbackSuccess = false
    defer { feedbackSubmitting = false }
    do {
      try await apiClient.submitFeedback(
        apiBase: apiBase,
        message: feedbackMessage.trimmingCharacters(in: .whitespacesAndNewlines),
        category: feedbackCategory,
        jobID: currentJobIDProvider(),
        contact: feedbackContact.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : feedbackContact
      )
      feedbackMessage = ""
      feedbackSuccess = true
    } catch {
      feedbackError = formatUserFacingError(error)
    }
  }
}
