import SwiftUI

/// 任务详情：流水线卡 → 阶段流 → 结果区 → 参考回显 → 元数据 → 失败信息。
/// 两个使用场景共用：GenerateView 内联（currentJob）与 RecordsView push（历史详情）。
/// 自身不带外边距，由调用方决定 padding（避免内联路径双 padding）。
struct JobDetailView: View {
  @Bindable var model: AppModel
  let job: Job

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// 当前正被轮询跟踪的进行中任务（刷新行 / 轮询错误只对它展示）。
  private var isCurrentLiveJob: Bool {
    job.id == model.jobs.currentJobID && (job.statusKind == .queued || job.statusKind == .running)
  }

  private var showsPipeline: Bool {
    job.statusKind == .queued || job.statusKind == .running || !job.stages.isEmpty
  }

  var body: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
      headerCard
      if showsPipeline {
        PipelineProgressView(
          state: PipelineState(job: job),
          lastPolledAt: isCurrentLiveJob ? model.jobs.lastPolledAt : nil,
          isLive: isCurrentLiveJob,
          pollingError: job.id == model.jobs.currentJobID ? model.jobs.pollingError : "",
          onRefresh: { Task { await model.jobs.refreshCurrentJob() } },
          onRetry: { model.jobs.retryPolling() }
        )
      }
      if !job.stages.isEmpty {
        StageFlowView(model: model, stages: job.stages)
      }
      resultsSection
      referenceSection
      metadataCard
      if job.statusKind == .failed {
        failureCard
      }
    }
  }

  // MARK: - 头卡

  private var headerCard: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        HStack(alignment: .firstTextBaseline, spacing: Theme.Spacing.sm) {
          Text(job.title)
            .font(.headline)
          Spacer()
          statusChip
        }
        if job.hasExportableAssets {
          Button {
            Task { await model.exports.exportJobArchive(job) }
          } label: {
            Label(
              model.exports.exportingJobArchiveID == job.id ? "打包中" : "分享全部",
              systemImage: model.exports.exportingJobArchiveID == job.id ? "hourglass" : "square.and.arrow.up.on.square"
            )
            .font(.footnote.weight(.semibold))
          }
          .paperGlassButton()
          .controlSize(.small)
          .disabled(model.exports.exportingJobArchiveID == job.id)
          .accessibilityLabel("打包分享全部结果")
          .accessibilityHint("把结果图、参考图和元数据打包成 ZIP 分享")
        }
        JobPromptEcho(job: job)
        if !job.retrievedReferences.isEmpty {
          VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("检索参考")
              .font(.subheadline.weight(.semibold))
            FlowText(items: job.retrievedReferences.map { $0.title.isEmpty ? $0.id : $0.title })
          }
        }
      }
    }
  }

  /// 卡内状态徽标：tint 胶囊（不嵌套玻璃）。
  /// 小字前景走 textTint（running 态浅色亮黄对比不足，与 StatusPill / TemplateCard 同方案）。
  private var statusChip: some View {
    let tint = Theme.Palette.tint(for: job.statusKind)
    return Label(job.statusKind.title, systemImage: job.statusKind == .failed ? "xmark.circle" : "sparkles")
      .font(.caption.weight(.semibold))
      .foregroundStyle(Theme.Palette.textTint(for: job.statusKind))
      .padding(.horizontal, Theme.Spacing.md)
      .padding(.vertical, Theme.Spacing.xs)
      .background(tint.opacity(0.14), in: .capsule)
  }

  // MARK: - 结果区

  @ViewBuilder
  private var resultsSection: some View {
    if !job.resultImages.isEmpty {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        Text("生成结果")
          .font(.headline)
          .accessibilityAddTraits(.isHeader)
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 200), spacing: Theme.Spacing.md)], spacing: Theme.Spacing.md) {
          ForEach(job.resultImages) { image in
            ResultImageView(model: model, image: image, outputFormat: job.outputFormat, job: job)
          }
        }
      }
      .transition(reduceMotion ? AnyTransition.opacity : AnyTransition(.blurReplace.combined(with: .move(edge: .bottom))))
      .animation(Theme.Motion.entrance, value: job.resultImages.map(\.id))
    }
  }

  // MARK: - 参考回显

  @ViewBuilder
  private var referenceSection: some View {
    if !job.visibleReferenceImages.isEmpty {
      GlassPanel {
        ReferenceEchoGrid(model: model, references: job.visibleReferenceImages)
      }
    } else if !job.referenceImages.isEmpty {
      Label("参考图 \(job.referenceImages.count) 张，后端未返回可预览 URL。", systemImage: "photo.on.rectangle")
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
  }

  // MARK: - 元数据

  private var metadataCard: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        Text("任务参数")
          .font(.subheadline.weight(.semibold))
        JobMetadataGrid(job: job)
      }
    }
  }

  // MARK: - 失败信息

  private var failureCard: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      Label("任务失败", systemImage: "exclamationmark.triangle.fill")
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(.red)
      if !job.failureErrorText.isEmpty {
        Text(formatUserFacingError(job.failureErrorText))
          .font(.footnote)
          .foregroundStyle(.secondary)
          .textSelection(.enabled)
      } else if !job.failureLogsText.isEmpty {
        Text("任务失败，展开日志了解原因。")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
      if !job.failureLogsText.isEmpty {
        FailureLogsView(logsTail: job.failureLogsText)
      }
    }
    .padding(Theme.Spacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
    .paperGlass(.tinted(.red.opacity(0.18)))
    .accessibilityElement(children: .combine)
  }
}

struct FailureLogsView: View {
  let logsTail: String

  var body: some View {
    DisclosureGroup("失败日志") {
      ScrollView(.horizontal) {
        Text(logsTail)
          .font(.system(.caption, design: .monospaced))
          .foregroundStyle(.secondary)
          .textSelection(.enabled)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(Theme.Spacing.md)
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: Theme.Radius.control))
    }
    .font(.footnote.weight(.semibold))
    .tint(.red)
    .accessibilityHint("展开查看后端日志尾部")
  }
}

struct JobPromptEcho: View {
  let job: Job

  var body: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      if !job.methodContent.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        DisclosureGroup("论文方法内容") {
          Text(job.methodContent)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }
      if !job.caption.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        DisclosureGroup("目标图注") {
          Text(job.caption)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }
    }
    .font(.footnote)
  }
}

struct FlowText: View {
  let items: [String]

  var body: some View {
    LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: Theme.Spacing.sm)], alignment: .leading, spacing: Theme.Spacing.sm) {
      ForEach(items, id: \.self) { item in
        Text(item)
          .font(.caption)
          .lineLimit(1)
          .padding(.horizontal, Theme.Spacing.md)
          .padding(.vertical, Theme.Spacing.xs + 2)
          .background(.thinMaterial, in: Capsule())
      }
    }
  }
}

#if DEBUG
#Preview("进行中") {
  ZStack {
    AppBackground(isGenerating: true)
    ScrollView {
      JobDetailView(model: AppModel(), job: JobPreviewFixtures.running)
        .padding()
    }
  }
}

#Preview("已完成") {
  ZStack {
    AppBackground()
    ScrollView {
      JobDetailView(model: AppModel(), job: JobPreviewFixtures.succeeded)
        .padding()
    }
  }
}

#Preview("失败") {
  ZStack {
    AppBackground()
    ScrollView {
      JobDetailView(model: AppModel(), job: JobPreviewFixtures.failed)
        .padding()
    }
  }
}
#endif
