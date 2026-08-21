import SwiftUI

struct RefineView: View {
  @Bindable var model: AppModel
  @State private var settingsSheet: GenerationSettingsSheet?

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
          if model.refine.draft.source == nil { emptyState } else { editor }
          if let job = model.jobs.currentJob, job.jobType == "refine" || model.refine.isSubmitting { JobDetailView(model: model, job: job).accessibilityIdentifier("refine.result") }
        }.padding(Theme.Spacing.md)
      }.navigationTitle("精修图片")
        .sheet(item: $settingsSheet) { $0 }
        .onChange(of: model.generation.draft.modelRoutes) { _, _ in model.refine.normalizeWithLiveRegistry() }
        .onChange(of: model.generation.draft.configurationMode) { _, _ in model.refine.normalizeWithLiveRegistry() }
    }
  }

  private var emptyState: some View {
    ContentUnavailableView {
      Label("选择一张结果图开始精修", systemImage: "photo.badge.plus")
    } description: { Text("精修仅可使用当前生成结果或本账号任务记录中的图片，不支持任意链接或相册导入。") } actions: {
      HStack {
        Button("去生成") { model.selectedTab = .generate }.accessibilityIdentifier("refine.empty.generate")
        Button("查看记录") { model.selectedTab = .records }.accessibilityIdentifier("refine.empty.records")
      }
    }.frame(maxWidth: .infinity, minHeight: 360)
  }

  private var editor: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
      sourceCard; capabilityCard; routeCard; instructionCard; outputControls
      if !model.refine.submitError.isEmpty { Label(model.refine.submitError, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red) }
      Button { Task { await model.refine.submit() } } label: {
        Label(model.refine.isSubmitting ? "正在提交精修…" : "提交精修", systemImage: "wand.and.stars").frame(maxWidth: .infinity)
      }.buttonStyle(.borderedProminent).controlSize(.large).disabled(!model.refine.canSubmit).accessibilityIdentifier("refine.submit")
    }
  }

  private var sourceCard: some View {
    GlassPanel { VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      Text("源图").font(.headline)
      if let source = model.refine.draft.source, let url = model.resolvedImageURL(source.previewURL) {
        DownsampledAsyncImage(url: url, maxDimension: 1200) { phase in
          switch phase { case .success(let image): image.resizable().scaledToFit(); case .failure: Image(systemName: "photo.badge.exclamationmark"); default: ProgressView() }
        }.frame(maxWidth: .infinity, minHeight: 220).clipShape(RoundedRectangle(cornerRadius: Theme.Radius.control)).accessibilityIdentifier("refine.source")
        Text(source.filename.isEmpty ? "候选图 \(source.candidateID + 1)" : source.filename).font(.footnote).foregroundStyle(.secondary)
        if source.isLegacyURLCompatibility { Text("旧记录兼容：该图片没有对象键，将使用此记录的签名地址。").font(.footnote).foregroundStyle(.orange) }
      }
    }}
  }

  private var capabilityCard: some View {
    GlassPanel { VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
      Text("精修能力").font(.headline); Text(model.refine.capability.title).font(.subheadline.weight(.semibold))
      Text(model.refine.capability.isSupported ? "所需路线：\(model.refine.capability.requiredRoles.map(\.rawValue).joined(separator: "、"))" : "请在生成设置中选择支持图片精修的图像模型。").font(.footnote).foregroundStyle(.secondary)
    }}.accessibilityIdentifier("refine.capability")
  }

  private var routeCard: some View {
    GlassPanel { HStack { VStack(alignment: .leading) { Text("模型路线").font(.headline); Text(routeSummary).font(.footnote).foregroundStyle(.secondary) }; Spacer()
      Button("生成设置") { settingsSheet = GenerationSettingsSheet(model: model, onPresentReferenceLibrary: { model.selectedTab = .generate }) }.accessibilityIdentifier("refine.settings.summary")
    }}.accessibilityIdentifier("refine.route.summary")
  }

  private var routeSummary: String {
    guard let routes = model.refine.activeRoutes else { return "尚未加载权威注册表" }
    return [routes.main, routes.image, routes.vision].map { "\(ProviderCatalog.config(for: $0.accessProvider).label) · \($0.modelId)" }.joined(separator: "\n")
  }

  private var instructionCard: some View {
    GlassPanel { VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      Text("精修说明").font(.headline); TextEditor(text: $model.refine.draft.instruction).frame(minHeight: 120).accessibilityIdentifier("refine.instruction")
      Text("至少 3 个字符；失败后会保留源图和说明。").font(.footnote).foregroundStyle(.secondary)
    }}
  }

  private var outputControls: some View {
    GlassPanel { VStack(alignment: .leading, spacing: Theme.Spacing.md) {
      Picker("目标比例", selection: $model.refine.draft.aspectRatio) { ForEach(model.refine.refineAspectRatios, id: \.self) { Text($0).tag($0) } }.accessibilityIdentifier("refine.ratio")
      if model.refine.refineResolutions.isEmpty { Text("当前图像模型未声明可执行的精修清晰度。").foregroundStyle(.red).accessibilityIdentifier("refine.resolution") }
      else { Picker("精修清晰度", selection: Binding(get: { model.refine.draft.imageSize ?? model.refine.refineResolutions.first! }, set: { model.refine.draft.imageSize = $0 })) { ForEach(model.refine.refineResolutions) { Text($0.title).tag($0) } }.accessibilityIdentifier("refine.resolution") }
    }}
  }
}
