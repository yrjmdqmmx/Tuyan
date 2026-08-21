import SwiftUI

struct FeaturedTemplateStudio: View {
  @Bindable var model: AppModel
  @State private var selected: FeaturedTemplate?
  @State private var isLibraryPresented = false
  @State private var isConfirmPresented = false
  @State private var appliedBaseline: FeaturedTemplate?
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass

  var body: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            SectionHeader(title: "从真实研究图示开始", systemImage: "sparkles.rectangle.stack")
            Text("精选模板来自研究参考图库；套用后仍可完整改写方法、图注与排除项。")
              .font(.footnote).foregroundStyle(.secondary)
          }
          Spacer()
          Button("浏览模板", systemImage: "rectangle.grid.2x2") { isLibraryPresented = true }
            .buttonStyle(.borderedProminent)
            .accessibilityIdentifier("generate.featured.browse")
        }
        if horizontalSizeClass == .regular {
          LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Theme.Spacing.sm), count: 3), spacing: Theme.Spacing.sm) {
            ForEach(model.generation.featuredTemplateArtworks) { artwork in TemplateArtworkCard(artwork: artwork) { selected = artwork.template; isLibraryPresented = true } }
          }
        } else {
          TabView {
            ForEach(model.generation.featuredTemplateArtworks) { artwork in TemplateArtworkCard(artwork: artwork) { selected = artwork.template; isLibraryPresented = true } }
          }
          .tabViewStyle(.page(indexDisplayMode: .automatic))
          .frame(height: 188)
        }
      }
    }
    .task { await model.generation.loadFeaturedTemplates() }
    .sheet(isPresented: $isLibraryPresented) { FeaturedTemplateLibrary(selected: $selected, artworks: model.generation.featuredTemplateArtworks, apply: requestApply) }
    .alert("替换输入内容？", isPresented: $isConfirmPresented) {
      Button("取消", role: .cancel) { isLibraryPresented = true }
      Button("确认替换", role: .destructive) { if let selected { apply(selected) } }
    } message: { Text("你已修改方法内容、目标图注或负向提示词。继续会同时替换这三项内容。") }
  }

  private func requestApply(_ template: FeaturedTemplate) {
    selected = template
    isLibraryPresented = false
    if FeaturedTemplateApplyDecision.requiresConfirmation(draft: model.generation.draft, baseline: appliedBaseline) { isConfirmPresented = true } else { apply(template) }
  }

  private func apply(_ template: FeaturedTemplate) {
    model.generation.draft.infographicCategoryID = template.category
    model.generation.draft.methodContent = template.methodContent
    model.generation.draft.caption = template.caption
    model.generation.draft.setNegativePrompt(template.negativePrompt)
    appliedBaseline = template
  }
}

private struct FeaturedTemplateLibrary: View {
  @Binding var selected: FeaturedTemplate?
  let artworks: [FeaturedTemplateArtwork]
  let apply: (FeaturedTemplate) -> Void
  @Environment(\.dismiss) private var dismiss
  var body: some View {
    NavigationStack {
      ScrollView {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 165), spacing: Theme.Spacing.md)], spacing: Theme.Spacing.md) {
          ForEach(artworks) { artwork in
            Button { selected = artwork.template } label: { TemplateArtworkCard(artwork: artwork, selected: selected?.id == artwork.id, action: {}) }
              .buttonStyle(.plain)
          }
        }.padding()
        if let selected {
          VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text(selected.title).font(.headline)
            Text(selected.summary).font(.footnote).foregroundStyle(.secondary)
            Text(selected.caption).font(.footnote)
            Button("套用到输入区", systemImage: "wand.and.stars") { apply(selected) }.buttonStyle(.borderedProminent)
          }.padding().frame(maxWidth: .infinity, alignment: .leading).background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control))
        }
      }
      .navigationTitle("精选模板库")
      .toolbar { ToolbarItem(placement: .confirmationAction) { Button("完成") { dismiss() } } }
    }.presentationDetents([.large])
  }
}

private struct TemplateArtworkCard: View {
  let artwork: FeaturedTemplateArtwork
  var selected = false
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
        Group {
          if let url = URL(string: artwork.imageURL), !artwork.imageURL.isEmpty {
            DownsampledAsyncImage(url: url, maxDimension: 480) { phase in
              if case .success(let image) = phase { image.resizable().scaledToFill() } else { placeholder }
            }
          } else { placeholder }
        }
        .frame(height: 104).frame(maxWidth: .infinity).clipShape(RoundedRectangle(cornerRadius: 12))
        Text(artwork.template.title).font(.caption.weight(.semibold)).foregroundStyle(.primary).lineLimit(1)
        Text(artwork.template.summary).font(.caption2).foregroundStyle(.secondary).lineLimit(2)
      }.padding(Theme.Spacing.sm).frame(maxWidth: .infinity, alignment: .leading)
      .background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control))
      .overlay { RoundedRectangle(cornerRadius: Theme.Radius.control).strokeBorder(selected ? Theme.Palette.paperGreen : Theme.Palette.paperBorder, lineWidth: selected ? 2 : 1) }
    }.buttonStyle(.plain).accessibilityLabel("预览模板 \(artwork.template.title)")
  }
  private var placeholder: some View { VStack(spacing: 8) { Image(systemName: "rectangle.3.group").font(.title2); Text("结构预览").font(.caption) }.frame(maxWidth: .infinity, maxHeight: .infinity).foregroundStyle(Theme.Palette.paperGreenText).background(Theme.Palette.paperGreenWell) }
}
