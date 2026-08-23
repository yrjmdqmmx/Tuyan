import SwiftUI

/// 外链行（指南"相关资源"与设置"关于"共用）：
/// 默认是独立可交互玻璃卡；玻璃面板内嵌时退为 thinMaterial 井底（玻璃不叠玻璃）。
struct GuideResourceRow: View {
  let resource: GuideResource
  /// true：已在 GlassPanel 内，使用 fieldWell 井底；false：独立玻璃卡。
  var embeddedInPanel = false
  var accessibilityIdentifier: String?

  var body: some View {
    if embeddedInPanel {
      linkContent
        .fieldWell()
        .accessibilityHint("在浏览器中打开")
    } else {
      linkContent
        .background(Theme.Palette.paperPanel, in: RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous))
        .overlay {
          RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous)
            .strokeBorder(Theme.Palette.paperBorder, lineWidth: 1)
        }
        .paperGlass(.interactive)
        .accessibilityHint("在浏览器中打开")
    }
  }

  private var linkContent: some View {
    Link(destination: resource.url) {
      HStack(spacing: Theme.Spacing.md) {
        Image(systemName: resource.systemImage)
          .font(.body.weight(.semibold))
          .foregroundStyle(Theme.Palette.banana)
          .frame(width: 28)
          .accessibilityHidden(true)
        VStack(alignment: .leading, spacing: 2) {
          Text(resource.title)
            .font(.callout.weight(.semibold))
          Text(resource.subtitle)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        Spacer(minLength: Theme.Spacing.sm)
        Image(systemName: "safari")
          .font(.callout)
          .foregroundStyle(.secondary)
          .accessibilityHidden(true)
      }
      .padding(embeddedInPanel ? 0 : Theme.Spacing.lg)
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(.rect)
    }
    .buttonStyle(.plain)
    .accessibilityIdentifier(accessibilityIdentifier ?? "guide.\(resource.id)")
  }
}
