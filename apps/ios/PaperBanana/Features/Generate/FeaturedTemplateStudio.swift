import SwiftUI

private enum GenerateTemplateDestination: Identifiable {
  case featuredLibrary(FeaturedTemplate)
  case savedLibrary
  var id: String { switch self { case .featuredLibrary(let t): "featured-\(t.id)"; case .savedLibrary: "saved" } }
}
private enum PendingTemplateApply: Identifiable {
  case featured(FeaturedTemplate)
  case saved(SavedGenerationTemplate)
  var id: String { switch self { case .featured(let t): "featured-\(t.id)"; case .saved(let t): "saved-\(t.id)" } }
}

struct FeaturedTemplateStudio: View {
  @Bindable var model: AppModel
  @State private var destination: GenerateTemplateDestination?
  @State private var pendingApply: PendingTemplateApply?
  @State private var appliedFeaturedBaseline: FeaturedTemplate?
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass

  var body: some View {
    VStack(spacing: Theme.Spacing.md) { featuredPanel; savedTemplatesPanel }
      .task { await model.generation.loadFeaturedTemplates() }
      .sheet(item: $destination) { destination in
        switch destination {
        case .featuredLibrary(let selected): FeaturedTemplateLibrary(initialTemplate: selected, artworks: model.generation.featuredTemplateArtworks, apply: { requestApply(.featured($0)) })
        case .savedLibrary: SavedTemplateLibrary(model: model, apply: { requestApply(.saved($0)) })
        }
      }
      .alert("替换输入内容？", isPresented: Binding(get: { pendingApply != nil }, set: { if !$0 { cancelApply() } })) {
        Button("取消", role: .cancel) { cancelApply() }
        Button("确认替换", role: .destructive) { if let pendingApply { apply(pendingApply) } }
      } message: { Text("你已修改方法内容、目标图注或负向提示词。继续会同时替换这三项内容。") }
  }

  private var featuredPanel: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: Theme.Spacing.xs) { SectionHeader(title: "从真实研究图示开始", systemImage: "sparkles.rectangle.stack"); Text("精选模板来自研究参考图库；套用后仍可完整改写方法、图注与排除项。").font(.footnote).foregroundStyle(.secondary) }
          Spacer()
          Button("浏览模板", systemImage: "rectangle.grid.2x2") { destination = .featuredLibrary(FeaturedTemplateCatalog.templates[0]) }.buttonStyle(.borderedProminent).accessibilityIdentifier("generate.featured.browse")
        }
        if horizontalSizeClass == .regular {
          LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Theme.Spacing.sm), count: 3), spacing: Theme.Spacing.sm) { ForEach(model.generation.featuredTemplateArtworks) { artwork in TemplateArtworkCard(artwork: artwork) { destination = .featuredLibrary(artwork.template) } } }
        } else {
          TabView { ForEach(model.generation.featuredTemplateArtworks) { artwork in TemplateArtworkCard(artwork: artwork) { destination = .featuredLibrary(artwork.template) } } }.tabViewStyle(.page(indexDisplayMode: .automatic)).frame(height: 188)
        }
      }
    }
  }

  private var savedTemplatesPanel: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
        HStack { SectionHeader(title: "已保存模板", systemImage: "tray.full"); Spacer(); Button("浏览全部") { destination = .savedLibrary }.buttonStyle(.bordered).accessibilityIdentifier("generate.savedTemplates.browse") }
        if model.templates.templates.isEmpty { Text("暂无保存的配置模板。填写内容后可用上方“保存当前模板”随时复用。").font(.footnote).foregroundStyle(.secondary) }
        else { ForEach(model.templates.templates.prefix(2)) { template in HStack { VStack(alignment: .leading) { Text(template.displayTitle).font(.subheadline.weight(.semibold)); Text(template.configuration.caption).font(.caption).foregroundStyle(.secondary).lineLimit(1) }; Spacer(); Button("套用") { requestApply(.saved(template)) }.buttonStyle(.borderedProminent).accessibilityIdentifier("generate.savedTemplate.apply.\(template.id)"); Button(role: .destructive) { model.templates.delete(template) } label: { Image(systemName: "trash") }.accessibilityLabel("删除模板 \(template.displayTitle)") } } }
      }
    }
  }

  private func requestApply(_ request: PendingTemplateApply) {
    destination = nil
    let dirty: Bool
    switch request { case .featured: dirty = FeaturedTemplateApplyDecision.requiresConfirmation(draft: model.generation.draft, baseline: appliedFeaturedBaseline); case .saved(let t): dirty = FeaturedTemplateApplyDecision.requiresConfirmation(draft: model.generation.draft, baseline: t.configuration) }
    if dirty { pendingApply = request } else { apply(request) }
  }
  private func apply(_ request: PendingTemplateApply) {
    switch request {
    case .featured(let t): model.generation.draft.infographicCategoryID = t.category; model.generation.draft.setMethodContent(t.methodContent); model.generation.draft.setCaption(t.caption); model.generation.draft.setNegativePrompt(t.negativePrompt); appliedFeaturedBaseline = t
    case .saved(let t): model.generation.applyTemplate(t.configuration)
    }
    pendingApply = nil
  }
  private func cancelApply() {
    guard let pendingApply else { return }
    switch pendingApply { case .featured(let t): destination = .featuredLibrary(t); case .saved: destination = .savedLibrary }
    self.pendingApply = nil
  }
}

private struct FeaturedTemplateLibrary: View {
  let artworks: [FeaturedTemplateArtwork]; let apply: (FeaturedTemplate) -> Void
  @State private var selected: FeaturedTemplate
  @Environment(\.dismiss) private var dismiss
  init(initialTemplate: FeaturedTemplate, artworks: [FeaturedTemplateArtwork], apply: @escaping (FeaturedTemplate) -> Void) { self.artworks = artworks; self.apply = apply; _selected = State(initialValue: initialTemplate) }
  var body: some View { NavigationStack { ScrollView { LazyVGrid(columns: [GridItem(.adaptive(minimum: 165), spacing: Theme.Spacing.md)], spacing: Theme.Spacing.md) { ForEach(artworks) { artwork in TemplateArtworkCard(artwork: artwork, selected: selected.id == artwork.id) { selected = artwork.template } } }.padding(); VStack(alignment: .leading, spacing: Theme.Spacing.sm) { Text(selected.title).font(.headline); Text(selected.summary).font(.footnote).foregroundStyle(.secondary); Text(selected.caption).font(.footnote); Button("套用到输入区", systemImage: "wand.and.stars") { apply(selected) }.buttonStyle(.borderedProminent) }.padding().frame(maxWidth: .infinity, alignment: .leading).background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control)) }.navigationTitle("精选模板库").toolbar { ToolbarItem(placement: .confirmationAction) { Button("完成") { dismiss() } } } }.presentationDetents([.large]) }
}
private struct SavedTemplateLibrary: View {
  @Bindable var model: AppModel; let apply: (SavedGenerationTemplate) -> Void; @Environment(\.dismiss) private var dismiss
  var body: some View { NavigationStack { List { if model.templates.templates.isEmpty { ContentUnavailableView("暂无保存模板", systemImage: "tray") } else { ForEach(model.templates.templates) { template in HStack { VStack(alignment: .leading) { Text(template.displayTitle); Text(template.configuration.caption).font(.caption).foregroundStyle(.secondary).lineLimit(1) }; Spacer(); Button("套用") { apply(template) }.buttonStyle(.borderedProminent) }.swipeActions { Button(role: .destructive) { model.templates.delete(template) } label: { Label("删除", systemImage: "trash") } } } } }.navigationTitle("我的模板").toolbar { ToolbarItem(placement: .confirmationAction) { Button("完成") { dismiss() } } } }.presentationDetents([.large]) }
}
private struct TemplateArtworkCard: View {
  let artwork: FeaturedTemplateArtwork; var selected = false; let action: () -> Void
  var body: some View { Button(action: action) { VStack(alignment: .leading, spacing: Theme.Spacing.xs) { Group { if let url = URL(string: artwork.imageURL), !artwork.imageURL.isEmpty { DownsampledAsyncImage(url: url, maxDimension: 480) { phase in if case .success(let image) = phase { image.resizable().scaledToFill() } else { placeholder } } } else { placeholder } }.frame(height: 104).frame(maxWidth: .infinity).clipShape(RoundedRectangle(cornerRadius: 12)); Text(artwork.template.title).font(.caption.weight(.semibold)).foregroundStyle(.primary).lineLimit(1); Text(artwork.template.summary).font(.caption2).foregroundStyle(.secondary).lineLimit(2) }.padding(Theme.Spacing.sm).frame(maxWidth: .infinity, alignment: .leading).background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control)).overlay { RoundedRectangle(cornerRadius: Theme.Radius.control).strokeBorder(selected ? Theme.Palette.paperGreen : Theme.Palette.paperBorder, lineWidth: selected ? 2 : 1) } }.buttonStyle(.plain).accessibilityLabel("预览模板 \(artwork.template.title)") }
  private var placeholder: some View { VStack(spacing: 8) { Image(systemName: "rectangle.3.group").font(.title2); Text("结构预览").font(.caption) }.frame(maxWidth: .infinity, maxHeight: .infinity).foregroundStyle(Theme.Palette.paperGreenText).background(Theme.Palette.paperGreenWell) }
}
