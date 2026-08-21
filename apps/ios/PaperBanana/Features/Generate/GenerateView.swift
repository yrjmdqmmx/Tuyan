import SwiftUI
import PhotosUI

struct GenerateView: View {
  @Bindable var model: AppModel
  @State private var isImporterPresented = false
  @State private var isQuickStartExpanded = false
  @State private var selectedPhotoItems: [PhotosPickerItem] = []
  @State private var confirmArkImageProbe = false
  @Namespace private var submitNamespace
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass

  private var importPipeline: ReferenceImportPipeline {
    ReferenceImportPipeline(generation: model.generation)
  }

  private var isAdvanced: Bool {
    model.generation.draft.configurationMode == .advanced
  }

  var body: some View {
    NavigationStack {
      ScrollViewReader { proxy in
        ScrollView {
          VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            hero
            quickStartSection
            generationSettingsSection
            inputSection
            submitHints
            if let job = model.jobs.currentJob {
              JobDetailView(model: model, job: job)
                .id("pipeline")
            }
          }
          .padding(.horizontal, Theme.Spacing.md)
          .padding(.top, Theme.Spacing.md)
          .padding(.bottom, bottomContentPadding)
        }
        .safeAreaInset(edge: .top, spacing: 0) {
          if topScrollGuardHeight > 0 {
            Color.clear
              .frame(height: topScrollGuardHeight)
              .allowsHitTesting(false)
          }
        }
        .safeAreaInset(edge: .bottom) {
          if showsFixedSubmitBar {
            submitBar
              .padding(.top, Theme.Spacing.sm)
              .padding(.bottom, Theme.Spacing.xs)
              .background(.clear)
              .transition(.move(edge: .bottom).combined(with: .opacity))
          }
        }
        .scrollDismissesKeyboard(.interactively)
        .animation(Theme.Motion.stateChange, value: model.jobs.hasActiveJob)
        .onChange(of: model.jobs.currentJobID) { _, newID in
          guard !newID.isEmpty else { return }
          withAnimation(reduceMotion ? nil : Theme.Motion.entrance) {
            proxy.scrollTo("pipeline", anchor: .top)
          }
        }
      }
      .background(AppBackground(isGenerating: model.jobs.isActivelyGenerating))
      .toolbar(.hidden, for: .navigationBar)
      .task(id: model.generation.modelCapabilityQueryID) {
        await model.generation.refreshMainModelCapability()
      }
      .fileImporter(isPresented: $isImporterPresented, allowedContentTypes: ReferenceImportPipeline.referenceContentTypes, allowsMultipleSelection: true) { result in
        switch result {
        case .success(let urls):
          importPipeline.addFileReferences(urls)
        case .failure(let error):
          model.generation.referenceUploadError = formatUserFacingError(error)
        }
      }
      .onChange(of: selectedPhotoItems) { _, items in
        guard !items.isEmpty else { return }
        Task {
          await importPipeline.addPhotoReferences(items)
          selectedPhotoItems = []
        }
      }
    }
  }

  private var showsFixedSubmitBar: Bool {
    model.jobs.currentJob == nil
      && !model.jobs.hasActiveJob
      && (model.generation.canSubmit || model.generation.isSubmitting)
  }

  private var bottomContentPadding: CGFloat {
    showsFixedSubmitBar ? 112 : 96
  }

  private var topScrollGuardHeight: CGFloat {
    horizontalSizeClass == .compact ? 44 : 0
  }

  private var quickStartExamples: [QuickStartExample] {
    Array(PaperBananaSamples.quickStartExamples.prefix(2))
  }

  // MARK: - Hero

  private var hero: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
        ViewThatFits(in: .horizontal) {
          HStack(spacing: Theme.Spacing.md) {
            brandMark
            heroTitleBlock
            Spacer(minLength: Theme.Spacing.sm)
            heroAccountPill
          }
          VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            HStack(spacing: Theme.Spacing.sm) {
              brandMark
              heroTitleBlock
            }
            heroAccountPill
          }
        }
      }
    }
  }

  private var brandMark: some View {
    ZStack {
      RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous)
        .fill(Theme.Palette.paperGreen.opacity(0.12))
      Image("AppIconSource")
        .resizable()
        .scaledToFit()
        .padding(5)
    }
    .frame(width: 46, height: 46)
    .accessibilityHidden(true)
  }

  private var heroTitleBlock: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text("图研 Tuyan")
        .font(.callout.bold())
      Text("学术图示工作台")
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
  }

  private var heroAccountPill: some View {
    StatusPill(
      text: compactAccountLabel,
      systemImage: model.auth.currentUser == nil ? "person.crop.circle.badge.exclamationmark" : "person.crop.circle.fill",
      tint: model.auth.currentUser == nil ? Theme.Palette.warning : Theme.Palette.paperGreen,
      textTint: model.auth.currentUser == nil ? Theme.Palette.warningText : Theme.Palette.paperGreenText,
      accessibilityLabel: accountAccessibilityLabel
    )
  }

  private var compactAccountLabel: String {
    guard let user = model.auth.currentUser else { return "未登录" }
    let displayName = preferredDisplayName(for: user)
    guard displayName.count > 9 else { return displayName }
    return "\(displayName.prefix(9))..."
  }

  private var accountAccessibilityLabel: String {
    guard let user = model.auth.currentUser else { return "未登录" }
    let name = user.name.trimmingCharacters(in: .whitespacesAndNewlines)
    let email = user.email.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !name.isEmpty, name != email else { return email.isEmpty ? "已登录" : email }
    return "\(name)，\(email)"
  }

  private func preferredDisplayName(for user: CurrentUser) -> String {
    let name = user.name.trimmingCharacters(in: .whitespacesAndNewlines)
    let email = user.email.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !name.isEmpty, name != email else {
      return emailLocalPart(email)
    }
    return name
  }

  private func emailLocalPart(_ email: String) -> String {
    guard !email.isEmpty else { return "已登录" }
    let localPart = email.split(separator: "@").first.map(String.init) ?? email
    return localPart.isEmpty ? email : localPart
  }

  // MARK: - 快速案例

  private var quickStartSection: some View {
    sectionCard("快速上手案例", trailing: {
      Button {
        toggleQuickStart()
      } label: {
        Label(isQuickStartExpanded ? "收起" : "展开", systemImage: isQuickStartExpanded ? "chevron.up" : "chevron.down")
          .font(.caption.weight(.semibold))
      }
      .buttonStyle(.plain)
      .foregroundStyle(Theme.Palette.paperGreenText)
      .accessibilityLabel(isQuickStartExpanded ? "收起快速上手案例" : "展开快速上手案例")
    }) {
      if isQuickStartExpanded {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 148), spacing: Theme.Spacing.md)], spacing: Theme.Spacing.md) {
          ForEach(quickStartExamples) { example in
            Button {
              model.applyExample(example)
            } label: {
              QuickStartMiniCard(example: example)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("套用案例 \(example.title)")
          }
        }
        .transition(reduceMotion ? .opacity : .opacity.combined(with: .move(edge: .top)))
      } else {
        quickStartCollapsedSummary
      }
    }
    .animation(Theme.Motion.stateChange, value: isQuickStartExpanded)
  }

  private func toggleQuickStart() {
    withAnimation(reduceMotion ? nil : Theme.Motion.stateChange) {
      isQuickStartExpanded.toggle()
    }
  }

  private var quickStartCollapsedSummary: some View {
    Button {
      toggleQuickStart()
    } label: {
      HStack(spacing: Theme.Spacing.md) {
        Image(systemName: "sparkles.rectangle.stack")
          .font(.title3)
          .foregroundStyle(Theme.Palette.warningText)
          .frame(width: 34, height: 34)
          .background(Theme.Palette.paperAmber.opacity(0.22), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
          .accessibilityHidden(true)
        VStack(alignment: .leading, spacing: 2) {
          Text(quickStartExamples.map(\.label).joined(separator: " · "))
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.primary)
            .lineLimit(1)
          Text("展开后可一键套用示例内容")
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
        Spacer(minLength: Theme.Spacing.sm)
        Image(systemName: "chevron.down")
          .font(.caption.weight(.bold))
          .foregroundStyle(.secondary)
          .accessibilityHidden(true)
      }
      .padding(Theme.Spacing.md)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
      .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
    }
    .buttonStyle(.plain)
    .accessibilityLabel("展开快速上手案例，包含 \(quickStartExamples.map(\.label).joined(separator: "、"))")
  }

  // MARK: - ① 生成设置

  private var generationSettingsSection: some View {
    sectionCard("生成设置") {
      Text("普通模式使用平台默认配置；专业模式可调整模型、比例和模型名称。")
        .font(.footnote)
        .foregroundStyle(.secondary)

      modeSwitch
      providerControls
      if !isAdvanced {
        defaultSummaryChips
      }
      outputControls
      apiKeyControls

      if isAdvanced {
        Text("专业配置")
          .font(.subheadline.weight(.semibold))
          .padding(.top, Theme.Spacing.xs)
        advancedControls
          .transition(reduceMotion ? .opacity : .opacity.combined(with: .move(edge: .top)))
      }

      categoryControls
    }
    .animation(Theme.Motion.stateChange, value: isAdvanced)
  }

  private var modeSwitch: some View {
    HStack(spacing: Theme.Spacing.xs) {
      ModeChoiceButton(
        title: "普通模式",
        subtitle: "默认流程",
        systemImage: "sparkles",
        isSelected: model.generation.draft.configurationMode == .simple
      ) {
        model.generation.draft.configurationMode = .simple
      }
      ModeChoiceButton(
        title: "专业模式",
        subtitle: "自定义参数",
        systemImage: "slider.horizontal.3",
        isSelected: model.generation.draft.configurationMode == .advanced
      ) {
        model.generation.draft.configurationMode = .advanced
      }
    }
    .padding(5)
    .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
    .accessibilityElement(children: .contain)
    .accessibilityLabel("使用模式")
  }

  private var providerControls: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.md) {
      paperMenuTile(
        title: isAdvanced ? "模型接口" : "模型平台",
        systemImage: "antenna.radiowaves.left.and.right",
        value: model.generation.selectedProviderConfig.label,
        options: model.generation.liveProviders,
        optionTitle: { ProviderCatalog.config(for: $0).label },
        isSelected: { $0 == model.generation.draft.provider },
        action: { model.generation.selectProvider($0) }
      )
      .accessibilityLabel("模型平台")
    }
  }

  private var defaultSummaryChips: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: Theme.Spacing.sm) {
        ForEach(defaultSummaryItems, id: \.self) { item in
          Text(item)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.primary)
            .lineLimit(1)
            .padding(.horizontal, Theme.Spacing.sm)
            .padding(.vertical, 6)
            .background(Theme.Palette.paperWell, in: .capsule)
            .overlay {
              Capsule()
                .strokeBorder(Theme.Palette.paperBorder, lineWidth: 1)
            }
        }
      }
      .padding(.vertical, 1)
    }
    .accessibilityElement(children: .combine)
    .accessibilityLabel("默认配置：\(defaultSummaryItems.joined(separator: "，"))")
  }

  private var defaultSummaryItems: [String] {
    var items = [
      modelDisplayName(model.generation.activeMainModelName),
      "规划器 + 评审器",
      model.generation.draft.aspectRatio,
      model.generation.draft.outputFormat.title
    ]
    if model.generation.draft.outputFormat != .svg {
      items.insert(modelDisplayName(model.generation.activeImageModelName), at: 1)
      items.append(model.generation.draft.imageSize.title)
    }
    return items
  }

  private func modelDisplayName(_ value: String) -> String {
    model.generation.liveProviders
      .flatMap { model.generation.models(for: .main, provider: $0) + model.generation.models(for: .image, provider: $0) + model.generation.models(for: .vision, provider: $0) }
      .first { $0.id == value }?.label ?? value
  }

  private var apiKeyControls: some View {
    return VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      ForEach(model.generation.draft.configurationMode == .advanced ? model.generation.routeProviders : [model.generation.draft.provider]) { provider in
        let config = ProviderCatalog.config(for: provider)
        Text("\(config.label) API 密钥")
          .font(.subheadline.weight(.semibold))
        SecureField(config.keyPlaceholder, text: Binding(get: { model.generation.apiKey(for: provider) }, set: { model.generation.updateAPIKey($0, for: provider) }))
          .textContentType(.password)
          .paperFieldWell()
          .accessibilityLabel("\(config.label) API Key 输入")
      }

      APIKeyGuideView(config: model.generation.selectedProviderConfig)
        .padding(Theme.Spacing.md)
        .background(Theme.Palette.paperAmber.opacity(0.18), in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))

      if model.generation.activeRoutes.map({ routes in [routes.main, routes.image, routes.vision].contains { $0.accessProvider == .ark } }) == true {
        Toggle("我确认图像路线探测可能产生费用", isOn: $confirmArkImageProbe)
          .font(.footnote)
        Button(model.generation.arkProbeLoading ? "正在验证方舟路线…" : "验证方舟路线") {
          Task { await model.generation.verifyArkRoutes(confirmPaidImageProbe: confirmArkImageProbe) }
        }
        .buttonStyle(.bordered)
        .disabled(model.generation.arkProbeLoading)
        if !model.generation.arkProbeStatus.isEmpty {
          Text(model.generation.arkProbeStatus).font(.footnote).foregroundStyle(.secondary)
        }
      }
    }
  }

  // MARK: - ② 内容输入

  private var inputSection: some View {
    sectionCard("内容输入") {
      Text("粘贴论文方法部分或业务流程，再填写目标图注。")
        .font(.footnote)
        .foregroundStyle(.secondary)
      LabeledTextEditor(title: "论文方法内容", text: $model.generation.draft.methodContent, minHeight: 180)
      LabeledTextEditor(title: "目标图注", text: $model.generation.draft.caption, minHeight: 90)

      ReferenceUploadStrip(
        model: model,
        selectedPhotoItems: $selectedPhotoItems,
        showImporter: { isImporterPresented = true }
      )

      if !showsFixedSubmitBar {
        inlineSubmitBlock
      }
    }
  }

  private var categoryControls: some View {
    return VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      paperPickerTile(title: "信息图类别", systemImage: PaperBananaSamples.categorySymbol(idOrLabel: model.generation.draft.infographicCategoryID)) {
        Picker("信息图类别", selection: $model.generation.draft.infographicCategoryID) {
          ForEach(PaperBananaSamples.categories) { category in
            Text(category.label).tag(category.id)
          }
        }
        .labelsHidden()
        .accessibilityLabel("信息图类别")
      }
      Text(model.generation.draft.selectedCategory.detail)
        .font(.footnote)
        .foregroundStyle(.secondary)
      if model.generation.draft.taskName == .plot {
        Label("统计图由独立渲染服务生成，可能稍慢。", systemImage: "chart.xyaxis.line")
          .font(.footnote)
          .foregroundStyle(Theme.Palette.warningText)
          .padding(Theme.Spacing.md)
          .background(Theme.Palette.paperAmber.opacity(0.20), in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
      }
    }
  }

  private var outputControls: some View {
    let outputColumns = model.generation.draft.outputFormat == .svg
      ? [GridItem(.flexible(), spacing: Theme.Spacing.md)]
      : [GridItem(.flexible(), spacing: Theme.Spacing.md), GridItem(.flexible(), spacing: Theme.Spacing.md)]

    return VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      LazyVGrid(columns: outputColumns, spacing: Theme.Spacing.md) {
        paperMenuTile(
          title: "导出格式",
          systemImage: "square.and.arrow.down",
          value: model.generation.draft.outputFormat.title,
          options: OutputFormat.allCases,
          optionTitle: { $0.title },
          isSelected: { $0 == model.generation.draft.outputFormat },
          action: { model.generation.draft.outputFormat = $0 }
        )
        .accessibilityLabel("导出格式")
        if model.generation.draft.outputFormat != .svg {
          paperMenuTile(
            title: "输出清晰度",
            systemImage: "sparkle.magnifyingglass",
            value: model.generation.draft.imageSize.title,
            options: model.generation.generationResolutions,
            optionTitle: { $0.title },
            isSelected: { $0 == model.generation.draft.imageSize },
            action: { model.generation.draft.imageSize = $0 }
          )
          .accessibilityLabel("清晰度")
        }
      }
      Text(model.generation.draft.outputFormat == .svg
        ? "SVG 为矢量格式，适合排版精修；由主模型直接生成，无需清晰度与图像生成模型。"
        : "PNG 适合直接预览保存；1K 仅基础渲染，2K/4K 出图后自动精修放大。")
          .font(.caption)
          .foregroundStyle(.secondary)
    }
  }

  @ViewBuilder
  private var advancedControls: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.md) {
      LazyVGrid(columns: [GridItem(.flexible(), spacing: Theme.Spacing.md), GridItem(.flexible(), spacing: Theme.Spacing.md)], spacing: Theme.Spacing.md) {
        paperPickerTile(title: "生成流程", systemImage: "point.3.connected.trianglepath.dotted") {
          Picker("生成流程", selection: $model.generation.draft.pipelineMode) {
            ForEach(PipelineMode.allCases) { mode in
              Text(mode.title).tag(mode)
            }
          }
          .labelsHidden()
        }
        paperPickerTile(title: "检索设置", systemImage: "magnifyingglass") {
          Picker(
            "检索设置",
            selection: Binding(
              get: { model.generation.draft.retrievalSetting },
              set: { model.generation.selectRetrievalSetting($0) }
            )
          ) {
            ForEach(RetrievalSetting.allCases) { setting in
              Text(setting.title).tag(setting)
            }
          }
          .labelsHidden()
          .disabled(!model.generation.draft.referenceImages.isEmpty)
        }
        paperPickerTile(title: "画面比例", systemImage: "aspectratio") {
          Picker("画面比例", selection: $model.generation.draft.aspectRatio) {
            ForEach(model.generation.generationAspectRatios, id: \.self) { ratio in
              Text(ratio).tag(ratio)
            }
          }
          .labelsHidden()
        }
        StepperTile(title: "候选数量", valueText: "\(model.generation.draft.numCandidates) 张") {
          Stepper("候选数量", value: $model.generation.draft.numCandidates, in: 1...3)
            .labelsHidden()
        }
        StepperTile(title: "评审轮数", valueText: "\(model.generation.draft.maxCriticRounds) 轮") {
          Stepper("评审轮数", value: $model.generation.draft.maxCriticRounds, in: 0...3)
            .labelsHidden()
        }
      }

      if !model.generation.draft.referenceImages.isEmpty {
        Text("已上传参考图，当前不使用检索（以本地参考图作为唯一视觉风格来源）。")
          .font(.footnote)
          .foregroundStyle(.secondary)
      } else if model.generation.referenceUploadBlockedByRetrieval {
        Text("已启用检索参考，此时不能上传本地参考图；如需自传，请选择“不使用检索”。")
          .font(.footnote)
          .foregroundStyle(Theme.Palette.warningText)
      }

      LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: Theme.Spacing.md)], spacing: Theme.Spacing.md) {
        routePicker(title: "主模型", icon: "brain.head.profile", role: .main)
        if model.generation.draft.outputFormat != .svg {
          routePicker(title: "图像模型", icon: "photo", role: .image)
        }
        if model.generation.activeReferenceImageMode != .mainModel {
          routePicker(title: "参考图识别模型", icon: "eye", role: .vision)
        }
      }

      if !model.generation.draft.referenceImages.isEmpty {
        Picker("参考图处理方式", selection: $model.generation.draft.referenceImageMode) {
          Text(ReferenceImageMode.visionModel.title).tag(ReferenceImageMode.visionModel)
          Text(ReferenceImageMode.mainModel.title).tag(ReferenceImageMode.mainModel)
            .disabled(!model.generation.mainModelCanReadReferenceImages)
        }
        .pickerStyle(.segmented)
        Text(model.generation.referenceCapabilityNote)
          .font(.footnote)
          .foregroundStyle(model.generation.mainModelDirectUnsupported ? .red : .secondary)
      }

      if model.generation.draft.retrievalSetting == .manual && model.generation.draft.referenceImages.isEmpty {
        ManualReferencePanel(model: model)
      }
    }
  }

  private func routePicker(title: String, icon: String, role: ModelRole) -> some View {
    let provider = model.generation.route(for: role)?.accessProvider ?? model.generation.draft.provider
    let currentModel = model.generation.route(for: role)?.modelId ?? ""
    return VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
      paperMenuTile(
        title: "\(title)接口",
        systemImage: "antenna.radiowaves.left.and.right",
        value: ProviderCatalog.config(for: provider).label,
        options: model.generation.liveProviders,
        optionTitle: { ProviderCatalog.config(for: $0).label },
        isSelected: { $0 == provider },
        action: { model.generation.selectProvider($0, for: role) }
      )
      paperMenuTile(
        title: title,
        systemImage: icon,
        value: modelDisplayName(currentModel),
        options: model.generation.models(for: role, provider: provider),
        optionTitle: { $0.vendor.isEmpty ? $0.label : "\($0.vendor) / \($0.label)" },
        isSelected: { $0.id == currentModel },
        action: { model.generation.selectModel($0, for: role) }
      )
    }
  }

  // MARK: - 提交提示

  private var inlineSubmitBlock: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      Button {
        Task { await model.generation.submitJob() }
      } label: {
        Label("生成候选图", systemImage: "sparkles")
          .font(.headline)
          .frame(maxWidth: .infinity)
      }
      .paperGlassButton(prominent: true)
      .disabled(!model.generation.canSubmit)
      .accessibilityLabel("生成候选图")

      if !model.generation.canSubmit {
        Text(submitRequirementText)
          .font(.footnote)
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .padding(.top, Theme.Spacing.xs)
  }

  @ViewBuilder
  private var submitHints: some View {
    if !model.generation.submitError.isEmpty {
      Label(model.generation.submitError, systemImage: "exclamationmark.triangle")
        .font(.footnote)
        .foregroundStyle(.red)
    }
    if model.generation.mainModelDirectUnsupported {
      Label("当前主模型不能直读参考图，请切换为独立识别模型。", systemImage: "eye.trianglebadge.exclamationmark")
        .font(.footnote)
        .foregroundStyle(.red)
    } else if !model.generation.hasRequiredManualReferences {
      Label("手动参考模式需要至少选择一个参考案例。", systemImage: "checklist")
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
  }

  private var submitRequirementText: String {
    if model.generation.mainModelDirectUnsupported {
      return "当前参考图处理方式不可用，请改用独立识别模型或更换主模型。"
    }
    if isAdvanced {
      return "需要为实际可达的模型接口填写 API Key，并完成三路路由、至少 20 字内容和目标图注；手动参考需至少选 1 个案例。"
    }
    return "需要填写 API Key、至少 20 字内容和目标图注。"
  }

  // MARK: - 底部提交栏

  /// 空闲态大按钮 ↔ 提交中紧凑进度胶囊，经同一 glassEffectID 在容器内 morph。
  private var submitBar: some View {
    GlassEffectContainer {
      if model.generation.isSubmitting {
        HStack(spacing: Theme.Spacing.sm) {
          ProgressView()
            .controlSize(.small)
          Text("正在提交…")
            .font(.footnote.weight(.semibold))
        }
        .padding(.horizontal, Theme.Spacing.xl)
        .padding(.vertical, Theme.Spacing.md)
        .paperGlass(.interactive, in: .capsule)
        .glassEffectID("submit", in: submitNamespace)
        .accessibilityLabel("正在提交生成任务")
      } else {
        Button {
          Task { await model.generation.submitJob() }
        } label: {
          Label("生成候选图", systemImage: "sparkles")
            .font(.headline)
            .frame(maxWidth: .infinity)
        }
        .controlSize(.large)
        .paperGlassButton(prominent: true)
        .glassEffectID("submit", in: submitNamespace)
        .disabled(!model.generation.canSubmit)
        .accessibilityLabel("生成候选图")
        .accessibilityHint("提交论文方法内容，启动多智能体生成流水线")
      }
    }
    .animation(Theme.Motion.stateChange, value: model.generation.isSubmitting)
    .padding(.horizontal)
  }

  // MARK: - 分组卡

  private func paperPickerTile(title: String, systemImage: String, @ViewBuilder content: () -> some View) -> some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
      Label(title, systemImage: systemImage)
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)
      content()
        .font(.body.weight(.semibold))
        .lineLimit(1)
        .minimumScaleFactor(0.86)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.horizontal, Theme.Spacing.md)
    .padding(.vertical, 10)
    .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
    .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
  }

  private func paperMenuTile<Option: Identifiable & Hashable>(
    title: String,
    systemImage: String,
    value: String,
    options: [Option],
    optionTitle: @escaping (Option) -> String,
    isSelected: @escaping (Option) -> Bool,
    action: @escaping (Option) -> Void
  ) -> some View {
    Menu {
      ForEach(options, id: \.self) { option in
        Button {
          action(option)
        } label: {
          if isSelected(option) {
            Label(optionTitle(option), systemImage: "checkmark")
          } else {
            Text(optionTitle(option))
          }
        }
      }
    } label: {
      HStack(alignment: .center, spacing: Theme.Spacing.sm) {
        VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
          Label(title, systemImage: systemImage)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
          Text(value)
            .font(.body.weight(.semibold))
            .foregroundStyle(.primary)
            .lineLimit(1)
            .minimumScaleFactor(0.86)
        }
        Spacer(minLength: Theme.Spacing.sm)
        Image(systemName: "chevron.up.chevron.down")
          .font(.footnote.weight(.bold))
          .foregroundStyle(Theme.Palette.bananaText)
          .accessibilityHidden(true)
      }
      .padding(.horizontal, Theme.Spacing.md)
      .padding(.vertical, 10)
      .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
      .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
      .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
    }
    .buttonStyle(.plain)
  }

  private func sectionCard(
    _ title: String,
    @ViewBuilder trailing: () -> some View = { EmptyView() },
    @ViewBuilder content: () -> some View
  ) -> some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
        HStack(alignment: .firstTextBaseline) {
          SectionHeader(title: title)
          Spacer()
          trailing()
        }
        content()
      }
      .padding(Theme.Spacing.md)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Theme.Palette.paperPanel, in: RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
      .overlay {
        RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous)
          .strokeBorder(Theme.Palette.paperBorder, lineWidth: 1)
      }
      .paperGlass(.panel)
  }
}

private struct QuickStartMiniCard: View {
  let example: QuickStartExample

  var body: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      HStack(spacing: Theme.Spacing.xs) {
        Label(example.label, systemImage: PaperBananaSamples.categorySymbol(idOrLabel: example.categoryID))
          .font(.caption.weight(.semibold))
          .foregroundStyle(Theme.Palette.warningText)
          .lineLimit(1)
          .padding(.horizontal, Theme.Spacing.xs)
          .padding(.vertical, 2)
          .background(Theme.Palette.paperAmber.opacity(0.22), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        Spacer(minLength: Theme.Spacing.xs)
        Image(systemName: "wand.and.sparkles")
          .font(.caption.weight(.semibold))
          .foregroundStyle(.secondary)
          .accessibilityHidden(true)
      }
      Text(example.title)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(.primary)
        .lineLimit(2)
        .fixedSize(horizontal: false, vertical: true)
      Text(example.hint)
        .font(.caption)
        .foregroundStyle(.secondary)
        .lineLimit(3)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(Theme.Spacing.md)
    .frame(maxWidth: .infinity, minHeight: 128, alignment: .topLeading)
    .fieldWell()
    .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
  }
}

private struct ModeChoiceButton: View {
  let title: String
  let subtitle: String
  let systemImage: String
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 3) {
        Label(title, systemImage: systemImage)
          .font(.subheadline.weight(.semibold))
          .lineLimit(1)
          .minimumScaleFactor(0.82)
        Text(subtitle)
          .font(.caption.weight(.medium))
          .opacity(0.78)
          .lineLimit(1)
      }
      .frame(maxWidth: .infinity, minHeight: 62)
      .foregroundStyle(isSelected ? .white : Theme.Palette.paperGreenText)
      .background(
        RoundedRectangle(cornerRadius: Theme.Radius.control - 2, style: .continuous)
          .fill(isSelected ? Theme.Palette.paperGreen : Color.clear)
      )
      .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.control - 2, style: .continuous))
    }
    .buttonStyle(.plain)
    .accessibilityAddTraits(isSelected ? [.isSelected] : [])
  }
}

private struct StepperTile<Controls: View>: View {
  let title: String
  let valueText: String
  @ViewBuilder let controls: Controls

  var body: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
      Text(title)
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)
      HStack {
        Text(valueText)
          .font(.callout.weight(.semibold))
          .foregroundStyle(.primary)
        Spacer(minLength: Theme.Spacing.sm)
        controls
      }
    }
    .padding(Theme.Spacing.md)
    .frame(maxWidth: .infinity, minHeight: 76, alignment: .leading)
    .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
  }
}

#if DEBUG
#Preview("生成表单") {
  GenerateView(model: AppModel())
}
#endif
