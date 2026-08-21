import Foundation

enum AppTab: String, CaseIterable, Identifiable, Hashable {
  case generate
  case refine
  case records
  case guide
  case settings

  var id: String { rawValue }

  var title: String {
    switch self {
    case .generate: "生成"
    case .refine: "精修"
    case .records: "记录"
    case .guide: "指南"
    case .settings: "设置"
    }
  }

  var symbol: String {
    switch self {
    case .generate: "wand.and.stars"
    case .refine: "slider.horizontal.3"
    case .records: "clock.arrow.circlepath"
    case .guide: "book"
    case .settings: "gearshape"
    }
  }
}
