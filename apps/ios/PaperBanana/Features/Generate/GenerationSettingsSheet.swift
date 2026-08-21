import SwiftUI

struct GenerationSettingsSheet: View, Identifiable {
  let id = UUID()
  @Bindable var model: AppModel
  @Environment(\.dismiss) private var dismiss
  @State private var showGallery = false
  @State private var confirmClearLocal = false

  var body: some View {
    NavigationStack {
      Form {
        Section("模式与平台") {
          Picker("使用模式", selection: $model.generation.draft.configurationMode) { ForEach(ConfigurationMode.allCases) { Text($0.title).tag($0) } }.pickerStyle(.segmented)
          Picker("模型接口", selection: Binding(get: { model.generation.draft.provider }, set: { model.generation.selectProvider($0) })) { ForEach(model.generation.liveProviders) { Text(ProviderCatalog.config(for: $0).label).tag($0) } }
          ForEach(model.generation.draft.configurationMode == .advanced ? model.generation.routeProviders : [model.generation.draft.provider]) { provider in
            SecureField("\(ProviderCatalog.config(for: provider).label) API 密钥", text: Binding(get: { model.generation.apiKey(for: provider) }, set: { model.generation.updateAPIKey($0, for: provider) }))
              .textContentType(.password)
          }
        }
        Section("输出") {
          Picker("导出格式", selection: $model.generation.draft.outputFormat) { ForEach(OutputFormat.allCases) { Text($0.title).tag($0) } }
          if model.generation.draft.outputFormat != .svg { Picker("输出清晰度", selection: $model.generation.draft.imageSize) { ForEach(model.generation.generationResolutions) { Text($0.title).tag($0) } } }
          Picker("信息图类别", selection: $model.generation.draft.infographicCategoryID) { ForEach(PaperBananaSamples.categories) { Text($0.label).tag($0.id) } }
        }
        if model.generation.draft.configurationMode == .advanced { advancedSection }
      }
      .navigationTitle("生成设置")
      .toolbar { ToolbarItem(placement: .confirmationAction) { Button("完成") { dismiss() } } }
      .sheet(isPresented: $showGallery) { ReferenceLibrarySheet(model: model) }
      .alert("清除本地上传？", isPresented: $confirmClearLocal) {
        Button("取消", role: .cancel) {}
        Button("清除并浏览图库", role: .destructive) { model.generation.draft.referenceImages = []; model.generation.referenceUploadError = ""; showGallery = true }
      } message: { Text("本地上传与图库参考不能同时使用。继续会丢弃当前尚未提交的本地参考图。") }
    }.presentationDetents([.large])
  }

  @ViewBuilder private var advancedSection: some View {
    Section("专业流程") {
      Picker("生成流程", selection: $model.generation.draft.pipelineMode) { ForEach(PipelineMode.allCases) { Text($0.title).tag($0) } }
      Picker("检索设置", selection: Binding(get: { model.generation.draft.retrievalSetting }, set: { model.generation.selectRetrievalSetting($0) })) { ForEach(RetrievalSetting.allCases) { Text($0.title).tag($0) } }.disabled(!model.generation.draft.referenceImages.isEmpty)
      Picker("画面比例", selection: $model.generation.draft.aspectRatio) { ForEach(model.generation.generationAspectRatios, id: \.self) { Text($0).tag($0) } }
      Stepper("候选数量：\(model.generation.draft.numCandidates)", value: $model.generation.draft.numCandidates, in: 1...3)
      Stepper("评审轮数：\(model.generation.draft.maxCriticRounds)", value: $model.generation.draft.maxCriticRounds, in: 0...3)
      if model.generation.draft.retrievalSetting == .manual {
        Button("浏览参考图库", systemImage: "photo.stack") { if model.generation.draft.referenceImages.isEmpty { showGallery = true } else { confirmClearLocal = true } }
      }
    }
    Section("模型路由") {
      routePicker("主模型", role: .main)
      if model.generation.draft.outputFormat != .svg { routePicker("图像模型", role: .image) }
      routePicker("参考图识别模型", role: .vision)
      if !model.generation.draft.referenceImages.isEmpty { Picker("参考图处理方式", selection: $model.generation.draft.referenceImageMode) { Text(ReferenceImageMode.visionModel.title).tag(ReferenceImageMode.visionModel); Text(ReferenceImageMode.mainModel.title).tag(ReferenceImageMode.mainModel).disabled(!model.generation.mainModelCanReadReferenceImages) }.pickerStyle(.segmented) }
    }
  }
  private func routePicker(_ title: String, role: ModelRole) -> some View {
    let provider = model.generation.route(for: role)?.accessProvider ?? model.generation.draft.provider
    let value = model.generation.route(for: role)?.modelId ?? ""
    return VStack(alignment: .leading) {
      Picker("\(title)接口", selection: Binding(get: { provider }, set: { model.generation.selectProvider($0, for: role) })) { ForEach(model.generation.liveProviders) { Text(ProviderCatalog.config(for: $0).label).tag($0) } }
      Picker(title, selection: Binding(get: { value }, set: { selected in if let item = model.generation.models(for: role, provider: provider).first(where: { $0.id == selected }) { model.generation.selectModel(item, for: role) } })) { ForEach(model.generation.models(for: role, provider: provider)) { Text($0.label).tag($0.id) } }
    }
  }
}
