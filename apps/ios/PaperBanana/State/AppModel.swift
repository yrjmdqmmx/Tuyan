import Foundation
import Observation

/// 组合根：持有各子 store、负责跨 store 协调与少量跨域门面。
@Observable
@MainActor
final class AppModel {
  var selectedTab: AppTab = .generate

  var alertMessage = ""
  var isAlertPresented = false

  // 子 store 引用从不重新赋值；声明为 var 是因为 SwiftUI @Bindable 的
  // dynamic member 链（$model.generation.draft.x）要求中间属性可写。
  var settings: SettingsStore
  var auth: AuthStore
  var jobs: JobsStore
  var modelRegistry: ModelRegistryStore
  var generation: GenerationStore
  var refine: RefineStore
  var exports: ExportCenter
  var templates: SavedTemplateStore

  private let apiClient: PaperBananaAPIClient

  init(apiClient: PaperBananaAPIClient? = nil) {
    let client = apiClient ?? PaperBananaAPIClient()
    self.apiClient = client
    let settings = SettingsStore(apiClient: client)
    let auth = AuthStore(apiClient: client, settings: settings)
    let jobs = JobsStore(apiClient: client, settings: settings, auth: auth)
    self.settings = settings
    self.auth = auth
    self.jobs = jobs
    let modelRegistry = ModelRegistryStore(apiClient: client)
    self.modelRegistry = modelRegistry
    let generationStore = GenerationStore(apiClient: client, settings: settings, jobs: jobs, registryStore: modelRegistry)
    generation = generationStore
    refine = RefineStore(apiClient: client, settings: settings, jobs: jobs, generation: generationStore)
    exports = ExportCenter(apiClient: client, settings: settings)
    templates = SavedTemplateStore()

    settings.currentJobIDProvider = { [weak jobs] in jobs?.currentJob?.id }
    auth.onAuthenticated = { [weak jobs] in await jobs?.loadUserJobs(silent: true) }
    auth.onSignedOut = { [weak jobs] in jobs?.clearForSignOut() }
    auth.onAccountDeleted = { [weak self] in self?.clearAllForAccountDeletion() }
    generation.presentAlert = { [weak self] message in self?.presentAlert(message) }
    exports.presentAlert = { [weak self] message in self?.presentAlert(message) }

    #if DEBUG
    DebugPreviewConfiguration.configure(self)
    // 截图 / QA 走查用：`simctl launch ... -pb-initial-tab records` 直达指定 tab
    // （launch argument 自动桥接进 UserDefaults）。仅 DEBUG，发布构建不带此入口。
    if let raw = UserDefaults.standard.string(forKey: "pb-initial-tab"),
       let tab = AppTab(rawValue: raw) {
      selectedTab = tab
    }
    // 截图 / QA 走查用：`-pb-preview-signed-in YES` 注入一个假登录态，
    // 让设置页展示已登录内容（含删除账号入口）。仅 DEBUG。
    if UserDefaults.standard.bool(forKey: "pb-preview-signed-in") {
      if DebugPreviewConfiguration.isUITesting {
        auth.currentUser = DebugPreviewConfiguration.previewUser
      } else {
        auth.currentUser = try? JSONDecoder().decode(
          CurrentUser.self,
          from: Data(#"{"id":"u-preview","email":"founder@paperbanana.app","name":"Founder"}"#.utf8)
        )
      }
    }
    #endif
  }

  func bootstrap() async {
    #if DEBUG
    if DebugPreviewConfiguration.isUITesting { return }
    #endif
    jobs.loadCachedRecords()
    await settings.refreshHealth()
    await modelRegistry.refresh(apiBase: settings.apiBase)
    generation.normalizeDraftWithLiveRegistry()
    refine.normalizeWithLiveRegistry()
    #if DEBUG
    // 截图 / QA 走查注入的假登录态不走 refreshSession（否则无后端会被覆盖为未登录）。
    if UserDefaults.standard.bool(forKey: "pb-preview-signed-in") { return }
    #endif
    await auth.refreshSession()
    if auth.currentUser != nil {
      await jobs.loadUserJobs(silent: true)
    }
  }

  /// Source is accepted only from an existing result belonging to the current
  /// task or the signed-in user's record list. No arbitrary URL entry exists.
  func beginRefine(job: Job, image: ResultImage) {
    guard jobs.canRefine(jobID: job.id) else {
      presentAlert("只能精修当前生成结果或本账号任务记录中的图片。")
      return
    }
    refine.begin(source: RefineSource(jobID: job.id, image: image))
    selectedTab = .refine
  }

  /// 模板套用：同时更新生成草稿与当前 tab。
  func applyExample(_ example: QuickStartExample) {
    generation.draft.infographicCategoryID = example.categoryID
    generation.draft.methodContent = example.methodContent
    generation.draft.caption = example.caption
    selectedTab = .generate
  }

  @discardableResult
  func saveCurrentTemplate(title: String) -> SavedGenerationTemplate {
    templates.save(draft: generation.draft, title: title)
  }

  func applyTemplate(_ template: SavedGenerationTemplate) {
    generation.applyTemplate(template.configuration)
    selectedTab = .generate
  }

  func resolvedImageURL(_ url: String) -> URL? {
    apiClient.resolvedImageURL(apiBase: settings.apiBase, url: url)
  }

  func presentAlert(_ message: String) {
    alertMessage = message
    isAlertPresented = true
  }

  /// 删除账号后的完整本地清理门面。比退出登录（仅清任务记录缓存）更彻底：
  /// 任务记录 + 本地任务缓存 + 所有 provider 的 Keychain API key + 保存的模板 + 生成草稿。
  /// 由 auth.onAccountDeleted 注入触发；signOut 路径不调用此方法（API key 需保留）。
  private func clearAllForAccountDeletion() {
    jobs.clearForSignOut()
    jobs.clearLocalJobs()
    templates.clearAll()
    generation.clearAllForAccountDeletion()
  }
}
