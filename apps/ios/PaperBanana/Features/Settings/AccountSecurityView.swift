import SwiftUI

struct AccountSecurityView: View {
  @Bindable var model: AppModel
  @State private var showsDeleteAccount = false
  @State private var showsChangePassword = false

  var body: some View {
    ScrollView {
      VStack(spacing: Theme.Spacing.lg) {
        header
        if let user = model.auth.currentUser { signedIn(user) }
        else { signedOut }
      }
      .padding()
    }
    .background(AppBackground(isGenerating: model.jobs.isActivelyGenerating))
    .navigationTitle("账号与安全")
    .navigationBarTitleDisplayMode(.inline)
    .sheet(isPresented: $showsDeleteAccount) { DeleteAccountSheet(model: model) }
    .sheet(isPresented: $showsChangePassword) { ChangePasswordSheet(model: model) }
    .onChange(of: model.auth.authError) { _, value in
      if !value.isEmpty { AccessibilityNotification.Announcement(value).post() }
    }
  }

  private var header: some View {
    GlassPanel {
      HStack(spacing: Theme.Spacing.md) {
        Image(systemName: "checkmark.shield.fill")
          .font(.title2)
          .foregroundStyle(Theme.Palette.paperGreenText)
          .frame(width: 46, height: 46)
          .background(Theme.Palette.paperGreenWell, in: Circle())
        VStack(alignment: .leading, spacing: 3) {
          Text("保护你的图研账号").font(.headline)
          Text("验证邮箱可用于登录保护与密码恢复。")
            .font(.footnote).foregroundStyle(.secondary)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  private func signedIn(_ user: CurrentUser) -> some View {
    VStack(spacing: Theme.Spacing.lg) {
      GlassPanel {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
          SectionHeader(title: "账号摘要", systemImage: "person.text.rectangle")
          Text(user.name).font(.headline)
          Text(user.email).font(.subheadline).foregroundStyle(.secondary)
          Label(user.emailVerified ? "邮箱已验证" : "邮箱待验证", systemImage: user.emailVerified ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
            .font(.footnote.weight(.semibold))
            .foregroundStyle(user.emailVerified ? Theme.Palette.paperGreenText : .orange)
            .accessibilityIdentifier("account.verificationStatus")
          if !user.emailVerified {
            Button(model.auth.resendCooldownSeconds > 0 ? "\(model.auth.resendCooldownSeconds) 秒后可重发" : "重发验证邮件") {
              model.auth.authEmail = user.email
              Task { await model.auth.resendVerification() }
            }
            .paperGlassButton(prominent: false)
            .disabled(model.auth.resendCooldownSeconds > 0 || model.auth.authSubmitting)
          }
        }
      }
      GlassPanel {
        VStack(spacing: Theme.Spacing.md) {
          Button("修改密码") { showsChangePassword = true }
            .paperGlassButton(prominent: true)
            .accessibilityHint("修改密码并撤销其他设备会话")
          Button("退出登录") { Task { await model.auth.signOut() } }
            .paperGlassButton(prominent: false)
          Divider()
          Button("删除账号", role: .destructive) { showsDeleteAccount = true }
            .buttonStyle(.plain)
            .font(.footnote.weight(.semibold))
            .foregroundStyle(Theme.Palette.warningText)
            .accessibilityHint("永久删除账号及所有本机数据，需要重新输入密码确认")
        }
      }
    }
  }

  @ViewBuilder
  private var signedOut: some View {
    GlassPanel {
      switch model.auth.flow {
      case .awaitingVerification:
        messageState(title: "等待验证", detail: "验证邮件已发送，请在 1 小时内完成验证后返回登录。", verification: true)
      case .recoverySent:
        messageState(title: "检查你的邮箱", detail: "如该邮箱存在，我们已发送 1 小时内有效的重置链接。", verification: false)
      case .signIn, .signUp, .forgotPassword:
        authForm
      }
    }
  }

  private var authForm: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.md) {
      SectionHeader(title: formTitle, systemImage: model.auth.flow == .forgotPassword ? "key.fill" : "person.crop.circle")
      if model.auth.flow == .signUp {
        field("昵称") { TextField("可选", text: $model.auth.authName).textContentType(.name).paperFieldWell() }
      }
      field("邮箱") {
        TextField("you@example.com", text: $model.auth.authEmail)
          .textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.emailAddress)
          .textContentType(.emailAddress).paperFieldWell()
          .accessibilityIdentifier("account.email")
      }
      if model.auth.flow != .forgotPassword {
        field("密码") {
          SecureField("8–128 位", text: $model.auth.authPassword)
            .textContentType(model.auth.flow == .signUp ? .newPassword : .password)
            .paperFieldWell().accessibilityIdentifier("account.password")
        }
      }
      Button { Task { await model.auth.submitPrimary() } } label: {
        Text(model.auth.authSubmitting ? "提交中" : primaryTitle).frame(maxWidth: .infinity)
      }
      .paperGlassButton(prominent: true).disabled(model.auth.authSubmitting)
      if model.auth.flow == .signIn {
        Button("忘记密码") { model.auth.setFlow(.forgotPassword) }
          .buttonStyle(.plain).font(.footnote.weight(.semibold)).foregroundStyle(Theme.Palette.paperGreenText)
          .frame(maxWidth: .infinity)
      }
      Button(toggleTitle) { model.auth.setFlow(model.auth.flow == .signUp ? .signIn : model.auth.flow == .signIn ? .signUp : .signIn) }
        .buttonStyle(.plain).font(.footnote.weight(.semibold)).foregroundStyle(Theme.Palette.paperGreenText)
        .frame(maxWidth: .infinity)
      errorText
    }
  }

  private func messageState(title: String, detail: String, verification: Bool) -> some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.md) {
      Label(title, systemImage: "envelope.badge.fill").font(.headline)
      Text(detail).font(.footnote).foregroundStyle(.secondary)
      if verification {
        Button(model.auth.resendCooldownSeconds > 0 ? "\(model.auth.resendCooldownSeconds) 秒后可重发" : "重发验证邮件") {
          Task { await model.auth.resendVerification() }
        }
        .paperGlassButton(prominent: true)
        .disabled(model.auth.authSubmitting || model.auth.resendCooldownSeconds > 0)
      }
      Button("返回登录") { model.auth.setFlow(.signIn) }
        .buttonStyle(.plain).font(.footnote.weight(.semibold)).foregroundStyle(Theme.Palette.paperGreenText)
        .frame(maxWidth: .infinity)
      errorText
    }
  }

  @ViewBuilder private var errorText: some View {
    if !model.auth.authError.isEmpty {
      Text(model.auth.authError).font(.footnote).foregroundStyle(.red).fixedSize(horizontal: false, vertical: true)
        .accessibilityIdentifier("account.error")
    }
  }

  @ViewBuilder private func field<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.xs) { Text(title).font(.footnote.weight(.semibold)).foregroundStyle(.secondary); content() }
  }

  private var formTitle: String { model.auth.flow == .forgotPassword ? "忘记密码" : model.auth.flow == .signUp ? "注册账号" : "登录账号" }
  private var primaryTitle: String { model.auth.flow == .forgotPassword ? "发送重置链接" : model.auth.flow == .signUp ? "注册并验证邮箱" : "登录" }
  private var toggleTitle: String { model.auth.flow == .signUp ? "已有账号？登录" : model.auth.flow == .signIn ? "没有账号？注册" : "返回登录" }
}

private struct ChangePasswordSheet: View {
  @Bindable var model: AppModel
  @Environment(\.dismiss) private var dismiss
  @State private var currentPassword = ""
  @State private var newPassword = ""
  @State private var confirmation = ""
  @State private var error = ""
  @State private var submitting = false

  var body: some View {
    NavigationStack {
      Form {
        Section("密码") {
          SecureField("当前密码", text: $currentPassword).textContentType(.password)
          SecureField("新密码（8–128 位）", text: $newPassword).textContentType(.newPassword)
          SecureField("再次输入新密码", text: $confirmation).textContentType(.newPassword)
        }
        if !error.isEmpty { Text(error).foregroundStyle(.red).accessibilityIdentifier("account.changePassword.error") }
        Section { Text("修改成功后，其他设备上的会话会被撤销。") }.font(.footnote).foregroundStyle(.secondary)
      }
      .navigationTitle("修改密码").navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) { Button(submitting ? "保存中" : "保存") { Task { await submit() } }.disabled(submitting || currentPassword.isEmpty || newPassword.count < 8 || newPassword.count > 128 || newPassword != confirmation) }
      }
    }
  }

  private func submit() async {
    submitting = true; error = ""; defer { submitting = false }
    do { try await model.auth.changePassword(currentPassword: currentPassword, newPassword: newPassword); dismiss() }
    catch { self.error = formatUserFacingError(error) }
  }
}
