import SwiftUI

struct SettingsView: View {
  @Bindable var model: AppModel

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: Theme.Spacing.lg) {
          accountPanel
          feedbackPanel
          legalAndDataPanel
          contactPanel
          aboutPanel
        }
        .padding()
      }
      .background(AppBackground(isGenerating: model.jobs.isActivelyGenerating))
      .toolbar(.hidden, for: .navigationBar)
    }
  }

  // MARK: - ① 账号

  private var accountPanel: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        SectionHeader(title: "账号", systemImage: "person.crop.circle")
        Text(model.auth.currentUser == nil ? "登录、验证邮箱并管理密码。" : "账号安全、密码与删除操作集中管理。")
          .font(.footnote)
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)
        NavigationLink {
          AccountSecurityView(model: model)
        } label: {
          HStack(spacing: Theme.Spacing.md) {
            Image(systemName: model.auth.currentUser == nil ? "person.crop.circle.badge.plus" : "checkmark.shield.fill")
              .foregroundStyle(Theme.Palette.paperGreenText)
            VStack(alignment: .leading, spacing: 3) {
              Text(model.auth.currentUser?.email ?? "登录或注册")
                .font(.callout.weight(.semibold))
                .foregroundStyle(.primary)
              Text(accountStatusText)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
              .font(.caption.weight(.bold))
              .foregroundStyle(.tertiary)
          }
          .padding(Theme.Spacing.md)
          .background(Theme.Palette.paperGreenWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("settings.accountSecurity")
        .accessibilityLabel("账号与安全")
      }
    }
  }

  private var accountStatusText: String {
    guard let user = model.auth.currentUser else { return "未登录" }
    return user.emailVerified ? "邮箱已验证" : "邮箱待验证"
  }

  // MARK: - ② 反馈

  private var feedbackPanel: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        SectionHeader(title: "反馈", systemImage: "message")

        Picker("类别", selection: $model.settings.feedbackCategory) {
          ForEach(FeedbackCategory.allCases) { category in
            Text(category.title).tag(category)
          }
        }
        .pickerStyle(.segmented)

        LabeledTextEditor(title: "问题或建议", text: feedbackMessageBinding, minHeight: 120)
        Text("\(model.settings.feedbackMessage.trimmingCharacters(in: .whitespacesAndNewlines).count)/2000")
          .font(.caption)
          .foregroundStyle(.secondary)
          .frame(maxWidth: .infinity, alignment: .trailing)
        TextField("联系方式（可选）", text: feedbackContactBinding)
          .fieldWell()

        Button {
          Task { await model.settings.submitFeedback() }
        } label: {
          Text(model.settings.feedbackSubmitting ? "提交中" : "提交反馈")
            .frame(maxWidth: .infinity)
        }
        .paperGlassButton(prominent: true)
        .disabled(!model.settings.canSubmitFeedback)

        if model.settings.feedbackSuccess {
          Label("已提交。", systemImage: "checkmark.circle")
            .font(.footnote)
            .foregroundStyle(.green)
        }
        if !model.settings.feedbackError.isEmpty {
          Text(model.settings.feedbackError)
            .font(.footnote)
            .foregroundStyle(.red)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
    }
  }

  // MARK: - ③ 联系作者

  private var legalAndDataPanel: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        SectionHeader(title: "法律与数据", systemImage: "hand.raised")
        Text("账号、任务记录与对象存储/API 主服务位于香港；按所选模型渠道与策略，OpenAI、Gemini、OpenRouter 等流量可能经固定新加坡出口。方舟为中国区服务。BYOK Key 持久保存在本机 Keychain，仅在你发起请求时作为短生命周期字段经香港网关/核心转发，服务端不会持久化、记录或回显。无广告、分析 SDK 或跨 App 追踪。")
          .font(.footnote)
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)
        GuideResourceRow(resource: GuideResource(id: "privacy", title: "隐私政策", subtitle: "查看完整数据处理说明", systemImage: "hand.raised", url: PaperBananaLegal.privacyURL), embeddedInPanel: true, accessibilityIdentifier: "settings.privacy")
        GuideResourceRow(resource: GuideResource(id: "terms", title: "服务条款", subtitle: "查看使用条款", systemImage: "doc.plaintext", url: PaperBananaLegal.termsURL), embeddedInPanel: true, accessibilityIdentifier: "settings.terms")
        GuideResourceRow(resource: GuideResource(id: "website", title: "官方网站", subtitle: "在 Safari 中打开", systemImage: "safari", url: PaperBananaLegal.websiteURL), embeddedInPanel: true, accessibilityIdentifier: "settings.website")
        GuideResourceRow(resource: GuideResource(id: "github", title: "GitHub", subtitle: "yrjmdqmmx/paperbanana-clients", systemImage: "chevron.left.forwardslash.chevron.right", url: PaperBananaLegal.githubURL), embeddedInPanel: true, accessibilityIdentifier: "settings.github")
      }
    }
  }

  // MARK: - ④ 联系作者

  private var contactPanel: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        SectionHeader(title: "联系作者", systemImage: "qrcode")

        if let authorQRCodeURL {
          ShareLink(
            item: authorQRCodeURL,
            preview: SharePreview("作者微信二维码", image: Image("AuthorQRCode"))
          ) {
            authorQRCodeImage
          }
          .buttonStyle(.plain)
          .accessibilityLabel("保存作者微信二维码")
          .accessibilityHint("打开系统分享面板，可保存图片")
          .accessibilityIdentifier("settings.contact.qr")
        } else {
          authorQRCodeImage
            .accessibilityIdentifier("settings.contact.qr")
        }
      }
    }
  }

  private var authorQRCodeImage: some View {
    Image("AuthorQRCode")
      .resizable()
      .interpolation(.none)
      .scaledToFit()
      .frame(maxWidth: .infinity)
      .frame(maxHeight: 420)
      .padding(Theme.Spacing.sm)
      .background(.white, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
      .overlay {
        RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous)
          .strokeBorder(Theme.Palette.paperBorder, lineWidth: 1)
      }
      .accessibilityLabel("作者微信二维码")
  }

  private var authorQRCodeURL: URL? {
    Bundle.main.url(forResource: "author-qr", withExtension: "jpg")
  }

  // MARK: - ⑤ 关于

  private var aboutPanel: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        SectionHeader(title: "关于", systemImage: "info.circle")

        HStack {
          Text("版本")
            .font(.callout)
          Spacer()
          Text(appVersionText)
            .font(.callout.monospacedDigit())
            .foregroundStyle(.secondary)
        }
        .fieldWell()
        .accessibilityElement(children: .combine)
        .accessibilityLabel("版本 \(appVersionText)")

        ForEach(aboutLinks) { resource in
          GuideResourceRow(resource: resource, embeddedInPanel: true)
        }
      }
    }
  }

  /// 版本号从 Bundle 读取，不在代码里硬编码。
  private var appVersionText: String {
    let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
    let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"
    return "\(version) (\(build))"
  }

  /// 关于区只放最核心的两条外链。
  private var aboutLinks: [GuideResource] {
    PaperBananaGuide.resources.filter { ["website", "github"].contains($0.id) }
  }

  private var feedbackMessageBinding: Binding<String> {
    Binding(
      get: { model.settings.feedbackMessage },
      set: { model.settings.feedbackMessage = String($0.prefix(2000)) }
    )
  }

  private var feedbackContactBinding: Binding<String> {
    Binding(
      get: { model.settings.feedbackContact },
      set: { model.settings.feedbackContact = String($0.prefix(300)) }
    )
  }
}

#if DEBUG
#Preview("未登录") {
  SettingsView(model: AppModel())
}

#Preview("已登录") {
  let model = AppModel()
  let _ = {
    model.auth.currentUser = try? JSONDecoder().decode(
      CurrentUser.self,
      from: Data(#"{"id":"u-preview","email":"preview@paperbanana.app","name":"Preview"}"#.utf8)
    )
  }()
  SettingsView(model: model)
}
#endif
