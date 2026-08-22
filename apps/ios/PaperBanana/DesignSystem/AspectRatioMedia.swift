import SwiftUI

/// Gives asynchronously loaded media a finite layout box before the image's
/// intrinsic size becomes available. The overlay cannot affect the parent's
/// measurement, so wide source images never escape a LazyVGrid cell.
struct AspectRatioMedia<Content: View>: View {
  let ratio: CGFloat
  @ViewBuilder let content: () -> Content

  var body: some View {
    Color.clear
      .aspectRatio(ratio, contentMode: .fit)
      .overlay {
        content()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .clipped()
      }
      .clipped()
  }
}
