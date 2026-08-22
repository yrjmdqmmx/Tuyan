import SwiftUI

@main
struct PaperBananaApp: App {
  @State private var model = AppModel()
  @Environment(\.scenePhase) private var scenePhase

  init() {
    // 共享 URLCache：结果图等重复下载直接命中缓存，免流量。
    URLCache.shared = URLCache(
      memoryCapacity: 50 * 1024 * 1024,
      diskCapacity: 200 * 1024 * 1024
    )
  }

  var body: some Scene {
    WindowGroup {
      RootView(model: model)
        .transaction { transaction in
          #if DEBUG
          if DebugPreviewConfiguration.isUITesting { transaction.animation = nil }
          #endif
        }
        .task {
          await model.bootstrap()
        }
        .onChange(of: scenePhase) { _, newPhase in
          switch newPhase {
          case .background:
            model.jobs.pausePolling()
          case .active:
            model.jobs.resumePolling()
          default:
            break
          }
        }
    }
  }
}
