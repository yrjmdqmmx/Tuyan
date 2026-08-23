import Foundation
import Observation

enum AuthFlowState: String, Equatable {
  case signIn
  case signUp
  case forgotPassword
  case awaitingVerification
  case recoverySent
}

/// 单一账号状态机：登录、注册、邮箱验证、密码恢复与安全操作。
@Observable
@MainActor
final class AuthStore {
  var currentUser: CurrentUser?
  var sessionPending = false
  var flow: AuthFlowState = .signIn
  var authEmail = ""
  var authPassword = ""
  var authName = ""
  var authError = ""
  var authSubmitting = false
  var resendCooldownSeconds = 0

  @ObservationIgnored var onAuthenticated: () async -> Void = {}
  @ObservationIgnored var onSignedOut: () -> Void = {}
  @ObservationIgnored var onAccountDeleted: () -> Void = {}

  private let apiClient: PaperBananaAPIClient
  private let settings: SettingsStore
  private var cooldownTask: Task<Void, Never>?

  init(apiClient: PaperBananaAPIClient, settings: SettingsStore) {
    self.apiClient = apiClient
    self.settings = settings
  }

  func refreshSession() async {
    sessionPending = true
    defer { sessionPending = false }
    currentUser = try? await apiClient.getSession(apiBase: settings.apiBase)
  }

  func submitPrimary() async {
    switch flow {
    case .signIn, .signUp:
      await signInOrSignUp()
    case .forgotPassword:
      await requestPasswordReset()
    case .awaitingVerification:
      await resendVerification()
    case .recoverySent:
      flow = .signIn
    }
  }

  func signInOrSignUp() async {
    let email = authEmail.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !email.isEmpty else {
      authError = "请输入邮箱。"
      return
    }
    guard authPassword.count >= 8 else {
      authError = "密码至少 8 位。"
      return
    }
    guard authPassword.count <= 128 else {
      authError = "密码过长，请使用更短的密码。"
      return
    }
    authSubmitting = true
    authError = ""
    defer { authSubmitting = false }
    do {
      if flow == .signUp {
        let name = authName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
          ? String(email.split(separator: "@").first ?? "图研")
          : authName.trimmingCharacters(in: .whitespacesAndNewlines)
        try await apiClient.signUp(apiBase: settings.apiBase, email: email, password: authPassword, name: name)
        authPassword = ""
        flow = .awaitingVerification
        startCooldown(60)
      } else {
        try await apiClient.signIn(apiBase: settings.apiBase, email: email, password: authPassword)
        authPassword = ""
        await refreshSession()
        await onAuthenticated()
      }
    } catch {
      if authErrorCode(error) == "EMAIL_NOT_VERIFIED" {
        authPassword = ""
        flow = .awaitingVerification
        startCooldown(retryAfter(error, fallback: 60))
      }
      authError = formatUserFacingError(error)
    }
  }

  func resendVerification() async {
    guard resendCooldownSeconds == 0 else { return }
    let email = authEmail.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !email.isEmpty else { authError = "请先输入邮箱。"; return }
    await performAuthAction {
      try await apiClient.sendVerificationEmail(apiBase: settings.apiBase, email: email)
      startCooldown(60)
    }
  }

  func requestPasswordReset() async {
    let email = authEmail.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !email.isEmpty else { authError = "请先输入邮箱。"; return }
    await performAuthAction {
      try await apiClient.requestPasswordReset(apiBase: settings.apiBase, email: email)
      flow = .recoverySent
      startCooldown(60)
    }
  }

  func changePassword(currentPassword: String, newPassword: String) async throws {
    guard newPassword.count >= 8 else {
      throw PaperBananaAPIError.server("新密码至少 8 位。")
    }
    guard newPassword.count <= 128 else {
      throw PaperBananaAPIError.server("新密码过长，请使用更短的密码。")
    }
    try await apiClient.changePassword(
      apiBase: settings.apiBase,
      currentPassword: currentPassword,
      newPassword: newPassword
    )
  }

  func signOut() async {
    await apiClient.signOut(apiBase: settings.apiBase)
    currentUser = nil
    flow = .signIn
    onSignedOut()
  }

  func deleteAccount(password: String) async throws {
    guard let email = currentUser?.email, !email.isEmpty else {
      throw PaperBananaAPIError.server("当前未登录，无法删除账号。")
    }
    try await apiClient.deleteAccount(apiBase: settings.apiBase, email: email, password: password)
    currentUser = nil
    flow = .signIn
    onAccountDeleted()
  }

  func setFlow(_ next: AuthFlowState) {
    flow = next
    authError = ""
  }

  private func performAuthAction(_ action: () async throws -> Void) async {
    authSubmitting = true
    authError = ""
    defer { authSubmitting = false }
    do { try await action() }
    catch {
      if retryAfter(error, fallback: 0) > 0 { startCooldown(retryAfter(error, fallback: 60)) }
      authError = formatUserFacingError(error)
    }
  }

  private func startCooldown(_ seconds: Int) {
    cooldownTask?.cancel()
    resendCooldownSeconds = max(0, seconds)
    cooldownTask = Task { [weak self] in
      while !Task.isCancelled, let self, self.resendCooldownSeconds > 0 {
        try? await Task.sleep(for: .seconds(1))
        if !Task.isCancelled { self.resendCooldownSeconds -= 1 }
      }
    }
  }
}

private func authErrorCode(_ error: Error) -> String? {
  guard let apiError = error as? PaperBananaAPIError, case .http(let details) = apiError else { return nil }
  return details.code ?? details.message
}

private func retryAfter(_ error: Error, fallback: Int) -> Int {
  guard let apiError = error as? PaperBananaAPIError, case .http(let details) = apiError,
        details.statusCode == 429 else { return fallback == 0 ? 0 : fallback }
  return max(1, details.retryAfterSeconds ?? fallback)
}
