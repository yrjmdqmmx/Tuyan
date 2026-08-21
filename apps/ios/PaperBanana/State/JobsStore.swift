import Foundation
import Observation

/// 当前任务跟踪（含轮询）与历史任务记录。
@Observable
@MainActor
final class JobsStore {
  var currentJobID = ""
  var currentJob: Job?
  var userJobs: [Job] = []
  var localJobs: [Job] = []
  var recordsError = ""
  var recordsLoading = false
  /// 轮询的结构化失败结果（连续失败 / 超时）转成的可展示文案；为空表示无异常。
  var pollingError = ""
  /// 最近一次成功拿到 currentJob 数据的时刻（轮询或手动刷新），驱动"最后刷新 X 前"。
  var lastPolledAt: Date?
  /// 当前 userJobs 来自本地缓存（尚未被网络刷新覆盖）。
  var isShowingCachedData = false

  /// 当前任务是否仍在进行中（排队 / 生成），驱动全局状态胶囊的显示。
  var hasActiveJob: Bool {
    guard let status = currentJob?.statusKind else { return false }
    return status == .queued || status == .running
  }

  /// 背景漂移等装饰动画的驱动条件：任务进行中且轮询未中断。
  /// 轮询超时 / 连续失败后停止动画省电；状态胶囊仍按 `hasActiveJob` 显示（错误态是恢复入口）。
  var isActivelyGenerating: Bool {
    hasActiveJob && pollingError.isEmpty
  }

  private let apiClient: PaperBananaAPIClient
  private let settings: SettingsStore
  private let auth: AuthStore
  private let poller: JobPoller
  private let recordsCache = RecordsDiskCache()
  private let localRecordsCache = RecordsDiskCache(filename: "local-jobs.json")
  private let refineSourceCache = RefineSourceDiskCache()
  private var refineSources: [String: RefineSource] = [:]

  init(apiClient: PaperBananaAPIClient, settings: SettingsStore, auth: AuthStore, poller: JobPoller? = nil) {
    self.apiClient = apiClient
    self.settings = settings
    self.auth = auth
    self.poller = poller ?? JobPoller()
  }

  /// 开始跟踪一个新建任务并启动轮询。
  func track(jobID: String, status: String, localDraft: Job? = nil) {
    currentJobID = jobID
    currentJob = mergeLocalRefineSource(into: localDraft ?? Job(id: jobID, status: status))
    pollingError = ""
    // 新任务还没拿到过数据：清掉上一个任务的刷新时间，避免"刷新于 X 前"显示旧任务的时刻。
    lastPolledAt = nil
    if let currentJob {
      storeLocalJob(currentJob)
    }
    startPolling(jobID: jobID)
  }

  func registerRefineSource(_ source: RefineSource, for jobID: String) {
    guard !jobID.isEmpty else { return }
    refineSources[jobID] = source
    refineSourceCache.save(refineSources)
  }

  func pausePolling() {
    poller.pause()
  }

  func resumePolling() {
    poller.resume()
  }

  /// 轮询因超时 / 连续失败停止后，由 UI「重新检查」触发的恢复入口：
  /// 清除错误并对当前任务重新启动轮询。
  func retryPolling() {
    guard !currentJobID.isEmpty else { return }
    pollingError = ""
    startPolling(jobID: currentJobID)
  }

  /// 手动"立即刷新"：对当前任务做一次性 getJob，不打断退避轮询节奏。
  /// 单次失败静默（轮询循环自己负责错误上报），成功则更新数据与刷新时间。
  func refreshCurrentJob() async {
    guard !currentJobID.isEmpty else { return }
    let jobID = currentJobID
    do {
      let job = try await apiClient.getJob(apiBase: settings.apiBase, jobID: jobID)
      // await 期间可能已 track 了新任务：旧任务的慢响应不得覆盖新任务的 currentJob。
      guard jobID == currentJobID else { return }
      let merged = mergeLocalRefineSource(into: job)
      currentJob = merged
      storeLocalJob(merged)
      lastPolledAt = Date()
    } catch {
      // 一次性刷新失败不展示错误：常驻错误通道是 pollingError。
    }
  }

  func loadUserJobs(silent: Bool) async {
    guard auth.currentUser != nil else { return }
    if !silent {
      recordsError = ""
      recordsLoading = true
    }
    defer { recordsLoading = false }
    do {
      userJobs = try await apiClient.userJobs(apiBase: settings.apiBase).map(mergeLocalRefineSource)
      if let currentJob {
        mergeTrackedJobIntoUserJobs(currentJob)
      }
      isShowingCachedData = false
      // 成功路径必须清掉历史错误：否则旧红卡会赖在新数据上。
      recordsError = ""
      recordsCache.save(userJobs)
    } catch {
      // 静默后台刷新失败不打扰用户（列表数据保持原样即可）；错误卡只服务于显式刷新。
      if !silent {
        recordsError = formatUserFacingError(error)
      }
    }
  }

  /// 启动时先加载本地缓存展示，等网络刷新成功后覆盖。
  func loadCachedRecords() {
    refineSources = refineSourceCache.load()
    if userJobs.isEmpty, let cached = recordsCache.load(), !cached.isEmpty {
      userJobs = cached.map(mergeLocalRefineSource)
      isShowingCachedData = true
    }
    if localJobs.isEmpty, let cached = localRecordsCache.load(), !cached.isEmpty {
      localJobs = Array(cached.map(mergeLocalRefineSource).prefix(10))
    }
  }

  func clearForSignOut() {
    userJobs = []
    isShowingCachedData = false
    recordsCache.clear()
    refineSources = [:]
    refineSourceCache.clear()
  }

  func clearLocalJobs() {
    localJobs = []
    localRecordsCache.clear()
    refineSources = [:]
    refineSourceCache.clear()
  }

  private func startPolling(jobID: String) {
    let apiClient = apiClient
    let settings = settings
    poller.start(
      fetch: { try await apiClient.getJob(apiBase: settings.apiBase, jobID: jobID) },
      onUpdate: { [weak self] job in
        guard let self else { return }
        let merged = self.mergeLocalRefineSource(into: job)
        self.currentJob = merged
        self.storeLocalJob(merged)
        self.lastPolledAt = Date()
      },
      onFinish: { [weak self] termination in
        self?.handlePollingTermination(termination)
      }
    )
  }

  private func handlePollingTermination(_ termination: JobPoller.Termination) {
    switch termination {
    case .reachedTerminalStatus:
      break
    case .timedOut:
      pollingError = "任务轮询已超过 10 分钟，已自动停止刷新；请稍后在任务记录里查看结果。"
    case .repeatedFailures(let message):
      pollingError = message
    }
  }

  private func storeLocalJob(_ job: Job) {
    guard !job.id.isEmpty else { return }
    let existing = localJobs.filter { $0.id != job.id }
    localJobs = Array(([job] + existing).prefix(10))
    localRecordsCache.save(localJobs)
    mergeTrackedJobIntoUserJobs(job)
  }

  private func mergeLocalRefineSource(into job: Job) -> Job {
    guard job.sourceImageObjectKey.isEmpty, job.sourceImageURL.isEmpty,
          let source = refineSources[job.id] else { return job }
    var merged = job
    merged.sourceImageObjectKey = source.objectKey
    merged.sourceImageURL = source.objectKey.isEmpty ? source.previewURL : ""
    return merged
  }

  private func mergeTrackedJobIntoUserJobs(_ job: Job) {
    guard auth.currentUser != nil, !job.id.isEmpty else { return }
    let existing = userJobs.filter { $0.id != job.id }
    userJobs = Array(([job] + existing).prefix(50))
    isShowingCachedData = false
    recordsCache.save(userJobs)
  }
}
