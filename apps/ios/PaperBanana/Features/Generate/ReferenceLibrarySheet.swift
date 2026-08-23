import SwiftUI

struct ReferenceLibrarySheet: View {
  @Bindable var model: AppModel
  @Environment(\.dismiss) private var dismiss
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass
  @State private var query = ""
  @State private var visualCategory = ""
  @State private var researchDomain = ""
  @State private var requestedPage = 1
  @State private var preview: ReferenceLibraryItem?
  @State private var searchDebouncer = ReferenceLibrarySearchDebouncer<ReferenceLibraryPageRequest>()

  private var page: ReferenceLibraryPage? { model.generation.referenceLibraryPage }
  private var request: ReferenceLibraryPageRequest { .init(page: requestedPage, query: query, visualCategory: visualCategory.isEmpty ? nil : visualCategory, researchDomain: researchDomain.isEmpty ? nil : researchDomain) }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        filters
        if model.generation.referenceLibraryLoading { ProgressView().padding() }
        if !model.generation.referenceLibraryError.isEmpty { ContentUnavailableView("参考图库暂不可用", systemImage: "exclamationmark.triangle", description: Text(model.generation.referenceLibraryError)).overlay(alignment: .bottom) { Button("重试") { reload() }.padding() } }
        ScrollView {
          LazyVGrid(columns: galleryColumns, spacing: Theme.Spacing.md) {
            ForEach(page?.references ?? []) { item in galleryCard(item) }
          }.padding()
        }
        footer
      }
      .navigationTitle("参考图库")
      .task(id: "\(requestedPage)|\(query)|\(visualCategory)|\(researchDomain)") {
        #if DEBUG
        if DebugPreviewConfiguration.isUITesting {
          if DebugPreviewConfiguration.usesReferenceLibraryPreview {
            await model.generation.loadReferenceLibraryPage(request)
          }
          return
        }
        #endif
        searchDebouncer.schedule(request, operation: { request in
          await model.generation.loadReferenceLibraryPage(request)
        }, onError: { _ in })
      }
      .onDisappear { searchDebouncer.cancel() }
      .toolbar { ToolbarItem(placement: .confirmationAction) { Button("完成") { dismiss() } } }
      .sheet(item: $preview) { ReferenceLibraryPreview(item: $0, imageURL: model.resolvedImageURL($0.imageURL)) }
    }
    .presentationDetents([.large])
  }

  private var filters: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      HStack(spacing: Theme.Spacing.sm) {
        Image(systemName: "magnifyingglass")
          .foregroundStyle(.secondary)
        TextField("搜索主题、图示或论文", text: Binding(get: { query }, set: updateQuery))
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
          .accessibilityIdentifier("reference.search")
        if !query.isEmpty {
          Button { updateQuery("") } label: { Image(systemName: "xmark.circle.fill") }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
            .accessibilityLabel("清空搜索")
        }
      }
      .padding(.horizontal, Theme.Spacing.md)
      .frame(minHeight: 44)
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))

      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: Theme.Spacing.sm) {
          Menu(visualCategory.isEmpty ? "视觉类别" : visualCategory) { Button("全部") { visualCategory = ""; requestedPage = 1 }.accessibilityIdentifier("reference.facet.visual.all"); ForEach(page?.facets.visualCategories ?? []) { facet in Button("\(facet.labelZh) / \(facet.labelEn) (\(facet.count))") { visualCategory = facet.value; requestedPage = 1 }.accessibilityIdentifier("reference.facet.visual.\(facet.value)") } }.buttonStyle(.bordered).accessibilityIdentifier("reference.facet.visual")
          Menu(researchDomain.isEmpty ? "研究领域" : researchDomain) { Button("全部") { researchDomain = ""; requestedPage = 1 }.accessibilityIdentifier("reference.facet.domain.all"); ForEach(page?.facets.researchDomains ?? []) { facet in Button("\(facet.labelZh) / \(facet.labelEn) (\(facet.count))") { researchDomain = facet.value; requestedPage = 1 }.accessibilityIdentifier("reference.facet.domain.\(facet.value)") } }.buttonStyle(.bordered).accessibilityIdentifier("reference.facet.domain")
          if !query.isEmpty || !visualCategory.isEmpty || !researchDomain.isEmpty { Button("清空") { query = ""; visualCategory = ""; researchDomain = ""; requestedPage = 1 }.font(.caption).accessibilityIdentifier("reference.filters.clear") }
        }
      }
    }
    .padding(.horizontal)
    .padding(.vertical, Theme.Spacing.sm)
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var galleryColumns: [GridItem] {
    horizontalSizeClass == .compact
      ? [GridItem(.flexible(), spacing: Theme.Spacing.sm), GridItem(.flexible(), spacing: Theme.Spacing.sm)]
      : [GridItem(.adaptive(minimum: 220), spacing: Theme.Spacing.md)]
  }

  private func galleryCard(_ item: ReferenceLibraryItem) -> some View {
    let isSelected = model.generation.referenceSelection.selectedIDs.contains(item.id)
    return VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      Button { preview = item } label: {
        AspectRatioMedia(ratio: 4.0 / 3.0) {
          Group { if let url = model.resolvedImageURL(item.imageURL) { DownsampledAsyncImage(url: url, maxDimension: 480) { phase in if case .success(let image) = phase { image.resizable().scaledToFill().accessibilityIdentifier("reference.image.loaded.\(item.id)") } else { placeholder } } } else { placeholder } }
        }
          .clipShape(RoundedRectangle(cornerRadius: 12))
      }.buttonStyle(.plain).accessibilityLabel("预览参考图 \(item.shortZh)")
      Text(item.shortZh.isEmpty ? "参考图 \(item.id)" : item.shortZh)
        .font(.caption.weight(.semibold))
        .foregroundStyle(.primary)
        .lineLimit(2, reservesSpace: true)
      HStack(spacing: Theme.Spacing.xs) {
        Button("详情") { preview = item }
          .font(.caption)
          .buttonStyle(.borderless)
        Spacer(minLength: 0)
        Button { model.generation.toggleManualReference(item) } label: {
          Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
            .font(.title3)
            .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
        .foregroundStyle(isSelected ? Theme.Palette.paperGreenText : .secondary)
        .accessibilityLabel("\(isSelected ? "取消选择" : "选择")参考图 \(item.shortZh)")
        .accessibilityIdentifier("reference.item.\(item.id)")
      }
    }.padding(Theme.Spacing.sm).frame(maxWidth: .infinity, alignment: .leading).background(Theme.Palette.paperWell, in: RoundedRectangle(cornerRadius: Theme.Radius.control)).overlay { RoundedRectangle(cornerRadius: Theme.Radius.control).strokeBorder(isSelected ? Theme.Palette.paperGreen : Theme.Palette.paperBorder, lineWidth: isSelected ? 2 : 1) }
  }
  private var placeholder: some View { Image(systemName: "photo.on.rectangle.angled").frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.Palette.paperGreenWell).foregroundStyle(Theme.Palette.paperGreenText) }
  private var footer: some View {
    VStack(spacing: Theme.Spacing.sm) {
      HStack { Text("已选 \(model.generation.referenceSelection.selectedIDs.count)/10").accessibilityIdentifier("reference.selectionCount"); Text(rangeText).accessibilityIdentifier("reference.page.range") }.font(.footnote).foregroundStyle(.secondary)
      HStack { Button("上一页") { requestedPage = max(1, requestedPage - 1) }.disabled((page?.page ?? 1) <= 1); Spacer(); Button("下一页") { requestedPage = min(page?.totalPages ?? 1, requestedPage + 1) }.disabled((page?.page ?? 1) >= (page?.totalPages ?? 1)).accessibilityIdentifier("reference.nextPage") }
    }.padding().background(.bar)
  }
  private var rangeText: String { guard let page, page.total > 0 else { return "0 / 0" }; let start = (page.page - 1) * page.pageSize + 1; return "\(start)-\(min(start + page.references.count - 1, page.total)) / \(page.total)" }
  private func updateQuery(_ newQuery: String) {
    var updatedRequest = request
    updatedRequest.setQuery(newQuery)
    query = updatedRequest.query
    requestedPage = updatedRequest.page
  }
  private func reload() { Task { await model.generation.loadReferenceLibraryPage(request) } }
}

private struct ReferenceLibraryPreview: View {
  let item: ReferenceLibraryItem
  let imageURL: URL?
  @Environment(\.dismiss) private var dismiss
  var body: some View { NavigationStack { ScrollView { VStack(alignment: .leading, spacing: Theme.Spacing.md) { Group { if let imageURL { DownsampledAsyncImage(url: imageURL, maxDimension: 1600) { phase in if case .success(let image) = phase { image.resizable().scaledToFit() } else { ProgressView().frame(maxWidth: .infinity, minHeight: 260) } } } else { Image(systemName: "photo").font(.largeTitle).frame(maxWidth: .infinity, minHeight: 260) } }.clipShape(RoundedRectangle(cornerRadius: Theme.Radius.control)); Text(item.shortZh).font(.headline); if item.shortEn != item.shortZh { Text(item.shortEn).font(.subheadline).foregroundStyle(.secondary) }; Text(item.detailZh).font(.body); if item.detailEn != item.detailZh { Text(item.detailEn).font(.footnote).foregroundStyle(.secondary) } }.padding() }.navigationTitle("参考图预览").toolbar { ToolbarItem(placement: .confirmationAction) { Button("完成") { dismiss() } } } }.presentationDetents([.large]) }
}
