import SwiftUI

struct RecordsView: View {
  @Bindable var model: AppModel
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass

  var body: some View {
    NavigationStack {
      recordsList
      .background(AppBackground(isGenerating: model.jobs.isActivelyGenerating))
      .toolbar(.hidden, for: .navigationBar)
    }
  }

  // MARK: - 列表

  private var showsSkeleton: Bool {
    model.jobs.recordsLoading && model.jobs.userJobs.isEmpty
  }

  private var recordsList: some View {
    ScrollView {
      LazyVStack(alignment: .leading, spacing: Theme.Spacing.md) {
        accountRecordsPanel
        localRecentPanel
      }
      .padding()
      .padding(.bottom, Theme.Spacing.xxl)
    }
    .safeAreaInset(edge: .top, spacing: 0) {
      if topScrollGuardHeight > 0 {
        Color.clear
          .frame(height: topScrollGuardHeight)
          .allowsHitTesting(false)
      }
    }
    .refreshable { await model.jobs.loadUserJobs(silent: false) }
    .navigationDestination(for: String.self) { id in
      if let job = job(for: id) {
        ScrollView {
          JobDetailView(model: model, job: job)
            .padding()
            .padding(.bottom, Theme.Spacing.xxl)
        }
        .safeAreaInset(edge: .top, spacing: 0) {
          if topScrollGuardHeight > 0 {
            Color.clear
              .frame(height: topScrollGuardHeight)
              .allowsHitTesting(false)
          }
        }
        .background(AppBackground(isGenerating: model.jobs.isActivelyGenerating))
        .navigationTitle("任务详情")
      }
    }
  }

  private var topScrollGuardHeight: CGFloat {
    horizontalSizeClass == .compact ? 28 : 0
  }

  private var accountRecordsPanel: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        HStack(alignment: .firstTextBaseline) {
          VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            SectionHeader(title: "我的任务记录", systemImage: "person.crop.circle")
            Text("任务记录与账号绑定，登录后可以查看自己提交过的任务。")
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
          Spacer(minLength: Theme.Spacing.sm)
          if model.auth.currentUser != nil {
            Button {
              Task { await model.jobs.loadUserJobs(silent: false) }
            } label: {
              Label("刷新", systemImage: "arrow.clockwise")
            }
            .controlSize(.small)
            .paperGlassButton()
          }
        }

        if model.auth.sessionPending {
          loadingCard("正在检查登录状态", detail: "请稍候。")
        } else if model.auth.currentUser == nil {
          loginRequiredCard
        } else {
          signedInAccountRow
          if model.jobs.isShowingCachedData {
            StatusPill(
              text: "离线数据",
              systemImage: "wifi.slash",
              tint: Theme.Palette.warning,
              textTint: Theme.Palette.warningText,
              accessibilityLabel: "正在显示本地缓存的记录，下拉刷新获取最新数据"
            )
          }
          if !model.jobs.recordsError.isEmpty {
            recordsErrorCard
          }
          if showsSkeleton {
            skeletonList
          } else if model.jobs.userJobs.isEmpty {
            emptyAccountRecordsCard
          } else {
            ForEach(model.jobs.userJobs) { job in
              NavigationLink(value: job.id) {
                AccountJobRecordCard(model: model, job: job)
              }
              .buttonStyle(.plain)
            }
          }
        }
      }
    }
  }

  private var recordsErrorCard: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      Label(model.jobs.recordsError, systemImage: "exclamationmark.triangle")
        .font(.footnote)
        .foregroundStyle(.red)
      Button("重试") {
        Task { await model.jobs.loadUserJobs(silent: false) }
      }
      .font(.footnote.weight(.semibold))
      .paperGlassButton()
      .controlSize(.small)
      .accessibilityHint("重新加载任务记录")
    }
    .padding(Theme.Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.red.opacity(0.10), in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
  }

  private var skeletonList: some View {
    VStack(spacing: Theme.Spacing.md) {
      ForEach(0..<3, id: \.self) { _ in
        RecordSkeletonCard()
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("正在加载任务记录")
  }

  private var loginRequiredCard: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      Text("任务记录需要登录后使用")
        .font(.callout.weight(.semibold))
      Text("不登录也可以正常生成候选图；登录后，新提交的任务会保存到你的账号记录里。")
        .font(.footnote)
        .foregroundStyle(.secondary)
        .fixedSize(horizontal: false, vertical: true)
      Button {
        model.selectedTab = .settings
      } label: {
        Label("登录 / 注册", systemImage: "person.badge.key")
      }
      .paperGlassButton(prominent: true)
      .controlSize(.small)
      .padding(.top, Theme.Spacing.xs)
    }
    .padding(Theme.Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
    .overlay(alignment: .leading) {
      Rectangle()
        .fill(Theme.Palette.paperAmber)
        .frame(width: 4)
    }
    .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
  }

  private var signedInAccountRow: some View {
    HStack(spacing: Theme.Spacing.md) {
      Label(model.auth.currentUser?.email ?? "已登录", systemImage: "checkmark.seal.fill")
        .font(.footnote.weight(.semibold))
        .foregroundStyle(Theme.Palette.paperGreenText)
        .lineLimit(1)
        .truncationMode(.middle)
      Spacer(minLength: Theme.Spacing.sm)
      Button("退出") {
        Task { await model.auth.signOut() }
      }
      .font(.footnote.weight(.semibold))
      .buttonStyle(.plain)
      .foregroundStyle(Theme.Palette.warningText)
    }
    .padding(Theme.Spacing.md)
    .background(Theme.Palette.paperGreen.opacity(0.12), in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
  }

  private var emptyAccountRecordsCard: some View {
    loadingCard("暂无任务记录", detail: "登录后提交的新任务会出现在这里。")
  }

  private func loadingCard(_ title: String, detail: String) -> some View {
    VStack(spacing: Theme.Spacing.xs) {
      Text(title)
        .font(.callout.weight(.semibold))
      Text(detail)
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, minHeight: 120)
    .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
  }

  @ViewBuilder
  private var localRecentPanel: some View {
    if !localRecentJobs.isEmpty {
      GlassPanel {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
          HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
              SectionHeader(title: "本机缓存", systemImage: "internaldrive")
              Text("来自本设备已跟踪过的任务；换设备后不会同步，可随时清空。")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
            Spacer()
            Button("清空", role: .destructive) {
              model.jobs.clearLocalJobs()
            }
            .controlSize(.small)
            .paperGlassButton()
          }
          ForEach(localRecentJobs) { job in
            NavigationLink(value: job.id) {
              LocalJobHistoryRow(job: job)
            }
            .buttonStyle(.plain)
          }
        }
      }
    }
  }

  private var localRecentJobs: [Job] {
    var jobs: [Job] = []
    if let currentJob = model.jobs.currentJob {
      jobs.append(currentJob)
    }
    for job in model.jobs.localJobs where !jobs.contains(where: { $0.id == job.id }) {
      jobs.append(job)
    }
    return Array(jobs.prefix(10))
  }

  private func job(for id: String) -> Job? {
    if model.jobs.currentJob?.id == id { return model.jobs.currentJob }
    if let accountJob = model.jobs.userJobs.first(where: { $0.id == id }) { return accountJob }
    return model.jobs.localJobs.first { $0.id == id }
  }
}

// MARK: - 行卡

struct LocalJobHistoryRow: View {
  let job: Job

  var body: some View {
    HStack(alignment: .center, spacing: Theme.Spacing.md) {
      VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
        Text(job.title)
          .font(.callout.weight(.semibold))
          .foregroundStyle(.primary)
          .lineLimit(2)
          .fixedSize(horizontal: false, vertical: true)
        Text(metadataLine)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
      Spacer(minLength: Theme.Spacing.sm)
      statusPill
    }
    .padding(Theme.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous)
        .strokeBorder(Theme.Palette.paperBorder, lineWidth: 1)
    }
    .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
    .accessibilityElement(children: .combine)
    .accessibilityHint("点按查看任务详情")
  }

  private var statusPill: some View {
    StatusPill(
      text: job.statusKind.title,
      systemImage: statusIconName,
      tint: Theme.Palette.tint(for: job.statusKind),
      textTint: Theme.Palette.textTint(for: job.statusKind),
      accessibilityLabel: "任务状态：\(job.statusKind.title)"
    )
    .fixedSize()
  }

  private var metadataLine: String {
    [displayCategory, providerLabel]
      .filter { !$0.isEmpty }
      .joined(separator: " · ")
  }

  private var displayCategory: String {
    let trimmed = job.infographicCategory.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty { return trimmed }
    return job.taskName == .plot ? "数据统计图" : "方法框架图"
  }

  private var providerLabel: String {
    guard !job.provider.isEmpty else { return "模型服务" }
    return ProviderCatalog.config(for: ProviderID(rawValue: job.provider)).label
  }

  private var statusIconName: String {
    switch job.statusKind {
    case .queued: "clock"
    case .running: "progress.indicator"
    case .succeeded: "checkmark.circle"
    case .failed: "xmark.circle"
    case .unknown: "questionmark.circle"
    }
  }
}

struct AccountJobRecordCard: View {
  let model: AppModel
  let job: Job

  var body: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.md) {
      HStack(alignment: .firstTextBaseline, spacing: Theme.Spacing.sm) {
        StatusPill(
          text: job.statusKind.title,
          systemImage: statusIconName,
          tint: Theme.Palette.tint(for: job.statusKind),
          textTint: Theme.Palette.textTint(for: job.statusKind),
          accessibilityLabel: "任务状态：\(job.statusKind.title)"
        )
        Spacer(minLength: Theme.Spacing.sm)
        Text(DateDisplay.relative(fromISO: job.createdAt))
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Text(job.title)
        .font(.callout.weight(.semibold))
        .lineLimit(2)
        .fixedSize(horizontal: false, vertical: true)

      FlowText(items: recordChips)

      VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
        modelInfoRow("主模型", job.mainModelName)
        modelInfoRow("图像模型", job.outputFormat == .svg ? "SVG 模式不使用" : job.imageModelName)
        modelInfoRow("导出格式", job.outputFormat.title)
        modelInfoRow("参考图处理", referenceImageModeText)
      }
      .padding(Theme.Spacing.md)
      .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))

      if !job.methodContent.isEmpty {
        Text(job.methodContent)
          .font(.footnote)
          .foregroundStyle(.secondary)
          .lineLimit(3)
          .fixedSize(horizontal: false, vertical: true)
          .padding(Theme.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
      }

      HStack(spacing: Theme.Spacing.sm) {
        if job.referenceImageCount > 0 || !job.referenceImages.isEmpty {
          Label("参考图 \(max(job.referenceImageCount, job.referenceImages.count))", systemImage: "photo.on.rectangle")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        if job.resultImageCount > 0 || !job.resultImages.isEmpty {
          Label("候选图 \(max(job.resultImageCount, job.resultImages.count))", systemImage: "sparkles.rectangle.stack")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        Spacer()
        Label("查看详情", systemImage: "chevron.right")
          .font(.caption.weight(.semibold))
          .foregroundStyle(Theme.Palette.paperGreenText)
      }
    }
    .padding(Theme.Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: Theme.Radius.control + 2, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: Theme.Radius.control + 2, style: .continuous)
        .strokeBorder(Theme.Palette.paperGreen.opacity(0.16), lineWidth: 1)
    }
    .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.control + 2, style: .continuous))
  }

  private var recordChips: [String] {
    [
      job.infographicCategory.isEmpty ? (job.taskName == .plot ? "数据统计图" : "方法框架图") : job.infographicCategory,
      providerLabel,
      job.configurationMode == "simple" ? "普通模式" : "专业模式",
      job.outputFormat == .svg ? job.outputFormat.title : job.imageSize.rawValue,
      job.retrievalSetting == .none ? nil : job.retrievalSetting.title,
      job.taskName == .plot ? "统计图" : nil
    ].compactMap { $0 }.filter { !$0.isEmpty }
  }

  private var providerLabel: String {
    guard !job.provider.isEmpty else { return "模型服务" }
    return ProviderCatalog.config(for: ProviderID(rawValue: job.provider)).label
  }

  private var referenceImageModeText: String {
    if job.referenceImageCount == 0 && job.referenceImages.isEmpty { return "未使用参考图" }
    if let mode = job.referenceImageMode { return mode.title }
    switch job.referenceImageModeUsed {
    case ReferenceImageMode.mainModel.rawValue: return ReferenceImageMode.mainModel.title
    case ReferenceImageMode.visionModel.rawValue: return ReferenceImageMode.visionModel.title
    default: return "未记录"
    }
  }

  private var statusIconName: String {
    switch job.statusKind {
    case .queued: "clock"
    case .running: "progress.indicator"
    case .succeeded: "checkmark.circle"
    case .failed: "xmark.circle"
    case .unknown: "questionmark.circle"
    }
  }

  private func modelInfoRow(_ label: String, _ value: String) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: Theme.Spacing.sm) {
      Text(label)
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)
        .frame(width: 78, alignment: .leading)
      Text(value.isEmpty ? "未记录" : value)
        .font(.caption)
        .foregroundStyle(.primary)
        .lineLimit(1)
        .truncationMode(.middle)
      Spacer(minLength: 0)
    }
  }
}

struct JobRow: View {
  let model: AppModel
  let job: Job

  var body: some View {
    HStack(alignment: .top, spacing: Theme.Spacing.md) {
      thumbnail
      VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
        // 标题 + 状态徽章：放得下时同行，AX 大字号或长标题时上下排。
        ViewThatFits(in: .horizontal) {
          HStack(alignment: .firstTextBaseline, spacing: Theme.Spacing.sm) {
            titleText
            Spacer(minLength: Theme.Spacing.sm)
            statusPill
          }
          VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            titleText
            statusPill
          }
        }
        Text(metadataLine)
          .font(.caption)
          .foregroundStyle(.secondary)
        if job.statusKind == .failed, !job.failureErrorText.isEmpty {
          Text(formatUserFacingError(job.failureErrorText))
            .font(.caption)
            .foregroundStyle(.red.opacity(0.85))
            .lineLimit(1)
        }
      }
    }
    .padding(Theme.Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .paperGlass(.interactive)
    .accessibilityElement(children: .combine)
    .accessibilityHint("点按查看任务详情")
  }

  private var titleText: some View {
    Text(job.title)
      .font(.callout.weight(.semibold))
      .lineLimit(2)
      .multilineTextAlignment(.leading)
  }

  private var statusPill: some View {
    StatusPill(
      text: job.statusKind.title,
      systemImage: statusIconName,
      tint: Theme.Palette.tint(for: job.statusKind),
      textTint: Theme.Palette.textTint(for: job.statusKind),
      accessibilityLabel: "任务状态：\(job.statusKind.title)"
    )
  }

  /// 按状态给正确图标（修复旧版 running 误用 checkmark.circle 的问题）。
  private var statusIconName: String {
    switch job.statusKind {
    case .queued: "clock"
    case .running: "progress.indicator"
    case .succeeded: "checkmark.circle"
    case .failed: "xmark.circle"
    case .unknown: "questionmark.circle"
    }
  }

  private var metadataLine: String {
    [relativeCreatedAt, "任务来源：\(job.clientPlatformDisplayName)", displayCategory, "\(job.outputFormat.rawValue.uppercased()) · \(job.imageSize.rawValue)"]
      .filter { !$0.isEmpty }
      .joined(separator: " · ")
  }

  private var displayCategory: String {
    let trimmed = job.infographicCategory.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty { return trimmed }
    return job.taskName == .plot ? "数据统计图" : "方法框架图"
  }

  private var relativeCreatedAt: String {
    // 相对时间策略（zh-Hans 固定 + 解析失败截断回退）集中在 DateDisplay。
    DateDisplay.relative(fromISO: job.createdAt)
  }

  // MARK: 缩略图

  /// 首张可栅格预览的结果图；SVG / 无结果图时用类别图标占位。
  private var thumbnailURL: URL? {
    guard
      let first = job.resultImages.first,
      !first.url.isEmpty,
      first.format != "svg"
    else { return nil }
    return model.resolvedImageURL(first.url)
  }

  private var thumbnail: some View {
    Group {
      if let url = thumbnailURL {
        // 行头像只有 64pt：降采样解码，2K/4K 结果图不再全量进内存。
        DownsampledAsyncImage(url: url, maxDimension: 64) { phase in
          switch phase {
          case .success(let image):
            image.resizable().scaledToFill()
          case .failure:
            categoryIcon
          default:
            ProgressView().controlSize(.small)
          }
        }
      } else {
        categoryIcon
      }
    }
    .frame(width: 64, height: 64)
    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: Theme.Radius.control))
    .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.control))
    .accessibilityHidden(true)
  }

  private var categoryIcon: some View {
    Image(systemName: PaperBananaSamples.categorySymbol(idOrLabel: displayCategory))
      .font(.title3)
      .foregroundStyle(.secondary)
  }
}

// MARK: - 骨架卡

/// 列表加载中的占位卡：redacted + subtle 不透明度脉冲；减弱动态效果时静态。
struct RecordSkeletonCard: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let card = HStack(alignment: .top, spacing: Theme.Spacing.md) {
      RoundedRectangle(cornerRadius: Theme.Radius.control)
        .fill(.quaternary)
        .frame(width: 64, height: 64)
      VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
        Text("占位标题占位标题占位标题")
          .font(.callout.weight(.semibold))
        Text("时间 · 类别 · 格式尺寸")
          .font(.caption)
      }
      .redacted(reason: .placeholder)
      Spacer(minLength: 0)
    }
    .padding(Theme.Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .paperGlass(.panel)
    .accessibilityHidden(true)

    if reduceMotion {
      card
    } else {
      card.phaseAnimator([1.0, 0.55]) { content, opacity in
        content.opacity(opacity)
      } animation: { _ in
        Theme.Motion.pulseSegment
      }
    }
  }
}

#if DEBUG
#Preview("记录列表") {
  let model = AppModel()
  let _ = {
    model.auth.currentUser = try? JSONDecoder().decode(
      CurrentUser.self,
      from: Data(#"{"id":"u-preview","email":"preview@paperbanana.app"}"#.utf8)
    )
    model.jobs.userJobs = [
      JobPreviewFixtures.succeeded,
      JobPreviewFixtures.running,
      JobPreviewFixtures.queued,
      JobPreviewFixtures.failed
    ]
  }()
  RecordsView(model: model)
}

#Preview("骨架屏") {
  let model = AppModel()
  let _ = {
    model.auth.currentUser = try? JSONDecoder().decode(
      CurrentUser.self,
      from: Data(#"{"id":"u-preview","email":"preview@paperbanana.app"}"#.utf8)
    )
    model.jobs.recordsLoading = true
  }()
  RecordsView(model: model)
}

#Preview("未登录") {
  RecordsView(model: AppModel())
}
#endif
