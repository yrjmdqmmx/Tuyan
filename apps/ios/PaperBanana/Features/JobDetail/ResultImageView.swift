import SwiftUI

/// 单张候选结果卡：缩略图（点击进全屏查看器）+ 分享 / 精修操作。
struct ResultImageView: View {
  @Bindable var model: AppModel
  let image: ResultImage
  let outputFormat: OutputFormat
  let job: Job

  @State private var isViewerPresented = false
  @Namespace private var zoomNamespace

  private var resolvedURL: URL? {
    model.resolvedImageURL(image.url)
  }

  /// 仅远端 URL 可直接 ShareLink；data: 等来源走 ExportCenter。
  private var shareableURL: URL? {
    guard let url = resolvedURL, let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http" else {
      return nil
    }
    return url
  }

  var body: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      thumbnail
      footer
    }
    .padding(Theme.Spacing.md)
    .paperGlass(.panel)
    .fullScreenCover(isPresented: $isViewerPresented) {
      if let url = resolvedURL {
        ImageViewer(
          content: image.format == "svg" ? .svg(url) : .raster(url),
          title: "候选 \(image.candidateID + 1)",
          shareURL: shareableURL
        )
        .navigationTransition(.zoom(sourceID: image.id, in: zoomNamespace))
      }
    }
  }

  private var thumbnail: some View {
    Button {
      guard resolvedURL != nil else { return }
      isViewerPresented = true
    } label: {
      Group {
        if image.format == "svg" {
          SVGPreviewCard(url: resolvedURL)
        } else if let url = resolvedURL {
          // 网格卡缩略图：降采样解码（细节看全屏 ImageViewer，那边保持全量解码）。
          DownsampledAsyncImage(url: url, maxDimension: 480) { phase in
            switch phase {
            case .success(let loaded):
              loaded.resizable().scaledToFit()
            case .failure:
              Image(systemName: "photo.badge.exclamationmark")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            default:
              ProgressView()
            }
          }
          .frame(maxWidth: .infinity, minHeight: 140)
          .background(.thinMaterial, in: RoundedRectangle(cornerRadius: Theme.Radius.control))
          .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.control))
        } else {
          Label("结果图不可预览", systemImage: "photo")
            .frame(maxWidth: .infinity, minHeight: 140)
        }
      }
      .contentShape(.rect)
    }
    .buttonStyle(.plain)
    .matchedTransitionSource(id: image.id, in: zoomNamespace)
    .accessibilityLabel("候选图 \(image.candidateID + 1)")
    .accessibilityHint("点按全屏查看，可捏合缩放")
  }

  private var footer: some View {
    HStack(spacing: Theme.Spacing.sm) {
      Text("\(outputFormat.rawValue.uppercased()) · 候选 \(image.candidateID + 1)")
        .font(.caption)
        .foregroundStyle(.secondary)
      Spacer()
      Button {
        Task { await model.exports.exportResultImage(image, outputFormat: outputFormat) }
      } label: {
        Image(systemName: model.exports.exportingResultImageID == image.id ? "hourglass" : "square.and.arrow.up")
      }
      .paperGlassButton()
      .controlSize(.small)
      .disabled(model.exports.exportingResultImageID == image.id || image.url.isEmpty)
      .accessibilityLabel("保存或分享候选图 \(image.candidateID + 1)")
      Button { model.beginRefine(job: job, image: image) } label: {
        Image(systemName: "slider.horizontal.3")
      }
      .paperGlassButton()
      .controlSize(.small)
      .accessibilityLabel("精修候选图 \(image.candidateID + 1)")
      .accessibilityIdentifier("result.refine.\(image.candidateID)")
    }
  }
}
