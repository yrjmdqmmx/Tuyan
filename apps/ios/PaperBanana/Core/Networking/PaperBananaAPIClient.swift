import Foundation

final class PaperBananaAPIClient {
  private let session: URLSession
  private let decoder = JSONDecoder()

  init(session: URLSession = .shared) {
    self.session = session
  }

  func fetchBackendHealth(apiBase: String) async throws -> BackendHealth {
    let base = AppDefaults.normalizedAPIBase(apiBase)
    let candidates: [(BackendMode, URL, String, [String: Any]?)] = [
      (.gateway, try endpoint(apiBase: base, path: "health"), "GET", nil),
      (.gateway, try lafEndpoint(apiBase: base), "GET", nil),
      (.gateway, try lafEndpoint(apiBase: base), "POST", ["action": "health"]),
      (.fastapi, try endpoint(apiBase: base, path: "api/health"), "GET", nil)
    ]

    var lastError: Error?
    for (expectedMode, url, method, body) in candidates {
      do {
        let envelope: HealthEnvelope = try await requestJSON(url, method: method, body: body)
        if let health = envelope.toBackendHealth(expectedMode: expectedMode) {
          return health
        }
        throw PaperBananaAPIError.server("当前地址不是 PaperBanana 后端。")
      } catch {
        lastError = error
      }
    }
    throw lastError ?? PaperBananaAPIError.server("后端暂时不可用。")
  }

  func createJob(apiBase: String, payload: JobCreatePayload) async throws -> (id: String, status: String) {
    let response: CreateJobEnvelope = try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: payload.paperBananaBody()
    )
    return (response.jobID ?? response.id ?? "", response.status ?? "queued")
  }

  func refineImage(apiBase: String, payload: RefineImagePayload) async throws -> (id: String, status: String) {
    let response: CreateJobEnvelope = try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: payload.paperBananaBody()
    )
    return (response.jobID ?? response.id ?? "", response.status ?? "queued")
  }

  func prepareReferenceUpload(apiBase: String, files: [ReferenceUploadFile]) async throws -> [PreparedReferenceUpload] {
    let encodedFiles = try files.map { try dictionary(from: $0) }
    let response: UploadEnvelope = try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: ["action": "prepareReferenceUpload", "files": encodedFiles]
    )
    return response.uploads
  }

  func uploadReference(data: Data, mimeType: String, uploadURL: String) async throws {
    guard let url = URL(string: uploadURL) else { throw PaperBananaAPIError.invalidURL(uploadURL) }
    var request = URLRequest(url: url, timeoutInterval: 90)
    request.httpMethod = "PUT"
    request.httpBody = data
    request.setValue(mimeType, forHTTPHeaderField: "Content-Type")
    let (_, response) = try await session.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse else { throw PaperBananaAPIError.invalidResponse }
    guard (200..<300).contains(httpResponse.statusCode) else {
      throw PaperBananaAPIError.server("参考图上传失败：HTTP \(httpResponse.statusCode)")
    }
  }

  func finalizeReferenceUploads(apiBase: String, uploads: [ReferenceImageAsset]) async throws {
    try await referenceUploadLifecycle(apiBase: apiBase, action: "finalizeReferenceUpload", uploads: uploads)
  }

  func abortReferenceUploads(apiBase: String, uploads: [ReferenceImageAsset]) async throws {
    try await referenceUploadLifecycle(apiBase: apiBase, action: "abortReferenceUpload", uploads: uploads)
  }

  private func referenceUploadLifecycle(apiBase: String, action: String, uploads: [ReferenceImageAsset]) async throws {
    let encodedUploads = try uploads.map { try dictionary(from: $0) }
    let _: EmptyEnvelope = try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: ["action": action, "uploads": encodedUploads]
    )
  }

  func referenceLibrary(apiBase: String, taskName: TaskName, query: String = "", limit: Int = 24) async throws -> [ReferenceLibraryItem] {
    let response: ReferenceLibraryEnvelope = try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: [
        "action": "referenceLibrary",
        "taskName": taskName.rawValue,
        "query": query,
        "limit": limit
      ]
    )
    return response.references
  }

  func modelCapability(apiBase: String, provider: ProviderID, model: String) async throws -> ModelCapability {
    try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: ["action": "modelCapability", "provider": provider.rawValue, "model": model]
    )
  }

  func modelRegistry(apiBase: String) async throws -> ModelRegistry {
    try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: ["action": "modelRegistry"]
    )
  }

  /// Ark has no browser-safe account catalogue. The server accepts only its
  /// inference key and a bounded set of explicitly selected routes.
  func providerAccountCatalog(
    apiBase: String,
    arkKey: String,
    routes: ModelRoutes,
    requiredRoles: [ModelRole],
    confirmPaidImageProbe: Bool
  ) async throws -> ProviderAccountCatalogResult {
    var seen = Set<String>()
    let probes = requiredRoles.compactMap { role -> [String: String]? in
      guard let route = routes[role], route.accessProvider == .ark else { return nil }
      let fingerprint = "\(role.rawValue):\(route.modelId)"
      guard seen.insert(fingerprint).inserted else { return nil }
      return ["role": role.rawValue, "modelId": route.modelId]
    }
    guard probes.count <= 3 else { throw PaperBananaAPIError.server("Ark 探测最多支持 3 条路线。") }
    return try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: [
        "action": "providerAccountCatalog",
        "provider": "ark",
        "apiKeys": ["ark": arkKey],
        "probes": probes,
        "confirmPaidImageProbe": confirmPaidImageProbe
      ]
    )
  }

  func getJob(apiBase: String, jobID: String) async throws -> Job {
    let response: JobEnvelope = try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: ["action": "getJob", "jobId": jobID]
    )
    guard let job = response.job else { throw PaperBananaAPIError.server("后端没有返回任务详情。") }
    return job
  }

  func userJobs(apiBase: String) async throws -> [Job] {
    let response: JobsEnvelope = try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: ["action": "myJobs", "limit": 50]
    )
    return await hydrateRecordImages(apiBase: apiBase, jobs: response.jobs)
  }

  func submitFeedback(apiBase: String, message: String, category: FeedbackCategory, jobID: String?, contact: String?) async throws {
    var body: [String: Any] = [
      "action": "submitFeedback",
      "message": message,
      "category": category.rawValue,
      "platform": "ios",
      "clientVersion": AppDefaults.clientVersion
    ]
    if let jobID, !jobID.isEmpty { body["jobId"] = jobID }
    if let contact, !contact.isEmpty { body["contact"] = contact }

    let _: EmptyEnvelope = try await requestJSON(
      try lafEndpoint(apiBase: apiBase),
      method: "POST",
      body: body
    )
  }

  func getSession(apiBase: String) async throws -> CurrentUser? {
    let response: SessionEnvelope = try await requestJSON(
      try endpoint(apiBase: apiBase, path: "api/auth/get-session"),
      method: "GET",
      body: nil
    )
    return response.user
  }

  func signIn(apiBase: String, email: String, password: String) async throws {
    let _: EmptyEnvelope = try await requestJSON(
      try endpoint(apiBase: apiBase, path: "api/auth/sign-in/email"),
      method: "POST",
      body: ["email": email, "password": password]
    )
  }

  func signUp(apiBase: String, email: String, password: String, name: String) async throws {
    let _: EmptyEnvelope = try await requestJSON(
      try endpoint(apiBase: apiBase, path: "api/auth/sign-up/email"),
      method: "POST",
      body: ["email": email, "password": password, "name": name]
    )
  }

  func signOut(apiBase: String) async {
    let _: EmptyEnvelope? = try? await requestJSON(
      try endpoint(apiBase: apiBase, path: "api/auth/sign-out"),
      method: "POST",
      body: [:]
    )
  }

  /// 永久删除账号（App Store 5.1.1(v)）。带 session cookie，body 含当前邮箱与重新输入的密码。
  /// 与 signIn 一样必抛——失败要让调用方拿到错误展示给用户，不能像 signOut 那样吞掉。
  func deleteAccount(apiBase: String, email: String, password: String) async throws {
    let _: EmptyEnvelope = try await requestJSON(
      try endpoint(apiBase: apiBase, path: "api/account/delete"),
      method: "POST",
      body: ["email": email, "password": password]
    )
  }

  func resolvedImageURL(apiBase: String, url: String) -> URL? {
    guard !url.isEmpty else { return nil }
    if url.hasPrefix("http://") || url.hasPrefix("https://") || url.hasPrefix("data:") {
      return URL(string: url)
    }
    let base = AppDefaults.normalizedAPIBase(apiBase)
    return URL(string: "\(base)\(url.hasPrefix("/") ? "" : "/")\(url)")
  }

  private func lafEndpoint(apiBase: String) throws -> URL {
    let base = AppDefaults.normalizedAPIBase(apiBase)
    if base.hasSuffix("/paperbanana-api") {
      guard let url = URL(string: base) else { throw PaperBananaAPIError.invalidURL(base) }
      return url
    }
    return try endpoint(apiBase: base, path: "paperbanana-api")
  }

  private func endpoint(apiBase: String, path: String) throws -> URL {
    let base = AppDefaults.normalizedAPIBase(apiBase)
    guard var components = URLComponents(string: base) else { throw PaperBananaAPIError.invalidURL(base) }
    let cleanPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
    let existingPath = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    components.path = "/" + [existingPath, cleanPath].filter { !$0.isEmpty }.joined(separator: "/")
    guard let url = components.url else { throw PaperBananaAPIError.invalidURL(base) }
    return url
  }

  private func requestJSON<T: Decodable>(_ url: URL, method: String = "GET", body: [String: Any]? = nil) async throws -> T {
    var request = URLRequest(url: url, timeoutInterval: 60)
    request.httpMethod = method
    request.httpShouldHandleCookies = true
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue(AppDefaults.webOrigin, forHTTPHeaderField: "Origin")
    request.setValue("\(AppDefaults.webOrigin)/", forHTTPHeaderField: "Referer")
    if let body {
      request.httpBody = try JSONSerialization.data(withJSONObject: body)
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }

    let (data, response) = try await session.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse else { throw PaperBananaAPIError.invalidResponse }

    // 防御性解析（对齐小程序端 coerceJsonResponse，SYNC 2026-06-10）：
    // 原始 payload 不是合法 JSON 且清洗有改动时，envelope 失败检查与解码整体换用
    // 清洗后的数据——与小程序一致（coerceJsonResponse 先清洗，再跑 code/statusCode 检查）。
    // 必须在两者之前换，不能等"解码失败后再重试"：JSONDecoder 对字符串值内的裸控制
    // 字节是惰性校验，EmptyEnvelope 或 try? 宽松字段根本不会触发解码失败——否则损坏的
    // 错误 envelope（{"code":1,…} + 裸控制字节）会被误报为成功，损坏字段会被静默置空。
    var payload = data.isEmpty ? Data("{}".utf8) : data
    var parsed = try? JSONSerialization.jsonObject(with: payload)
    var didSanitize = false
    if parsed == nil, let sanitized = Self.strippingBareControlCharacters(payload) {
      payload = sanitized
      didSanitize = true
      parsed = try? JSONSerialization.jsonObject(with: sanitized)
    }

    let object = parsed as? [String: Any] ?? [:]
    let isHTTPError = !(200..<300).contains(httpResponse.statusCode)
    let isEnvelopeFailure = objectIndicatesFailure(object)
    if isHTTPError || isEnvelopeFailure {
      throw PaperBananaAPIError.http(ServerErrorDetails(
        statusCode: httpResponse.statusCode,
        code: serverErrorCode(from: object),
        message: serverErrorMessage(from: object)
      ))
    }
    do {
      return try decoder.decode(T.self, from: payload)
    } catch {
      // 带标注前缀区分两条失败路径，便于排障（Minor #3）。
      throw PaperBananaAPIError.decoding(
        didSanitize
          ? "清洗控制字符后仍解码失败：\(error.localizedDescription)"
          : error.localizedDescription
      )
    }
  }

  /// 清洗裸控制字节，语义对齐小程序端 coerceJsonResponse
  /// （apps/miniprogram/miniprogram/utils/api.ts）：
  /// - \t(0x09) \n(0x0A) \r(0x0D) → 替换为空格（0x20 在 JSON 字符串内外都合法，
  ///   能修复字符串值内混入裸换行的损坏模式，如 logs_tail 事故场景）；
  /// - 其余 0x00-0x08、0x0B、0x0C、0x0E-0x1F → 移除。
  /// 字符串内的合法转义（如 "\n"）是两个 ASCII 字符，不含裸控制字节，不受影响。
  /// 没有任何改动时返回 nil（替换不改变 count，不能用长度判断是否清洗过）。
  private static func strippingBareControlCharacters(_ data: Data) -> Data? {
    var sanitized = Data(capacity: data.count)
    var didChange = false
    for byte in data {
      if byte >= 0x20 {
        sanitized.append(byte)
      } else if byte == 0x09 || byte == 0x0A || byte == 0x0D {
        sanitized.append(0x20)
        didChange = true
      } else {
        didChange = true
      }
    }
    return didChange ? sanitized : nil
  }

  private func dictionary<T: Encodable>(from value: T) throws -> [String: Any] {
    let data = try JSONEncoder().encode(value)
    return (try JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
  }

  /// 并发拉取记录详情（并发上限 4），输出顺序与输入保持一致；
  /// 单条失败时回退为原始摘要。
  private func hydrateRecordImages(apiBase: String, jobs: [Job]) async -> [Job] {
    let pending = jobs.enumerated().filter { $0.element.needsFreshRecordDetail }
    guard !pending.isEmpty else { return jobs }

    var hydrated = jobs
    await withTaskGroup(of: (Int, Job).self) { group in
      let maxConcurrent = 4
      var nextIndex = 0

      func addNextTask() {
        guard nextIndex < pending.count else { return }
        let (index, job) = pending[nextIndex]
        nextIndex += 1
        group.addTask {
          let detail = (try? await self.getJob(apiBase: apiBase, jobID: job.id)) ?? job
          return (index, detail)
        }
      }

      for _ in 0..<min(maxConcurrent, pending.count) {
        addNextTask()
      }
      for await (index, job) in group {
        hydrated[index] = job
        addNextTask()
      }
    }
    return hydrated
  }

  private func objectIndicatesFailure(_ object: [String: Any]) -> Bool {
    if let code = object["code"] {
      return String(describing: code) != "0"
    }
    if let ok = object["ok"] as? Bool {
      return !ok
    }
    if let success = object["success"] as? Bool {
      return !success
    }
    return false
  }

  private func serverErrorMessage(from object: [String: Any]) -> String? {
    if let error = object["error"] as? String, !error.isEmpty { return error }
    if let detail = object["detail"] as? String, !detail.isEmpty { return detail }
    if let message = object["message"] as? String, !message.isEmpty { return message }
    if let error = object["error"] as? [String: Any], let message = error["message"] as? String, !message.isEmpty { return message }
    if let data = object["data"] as? [String: Any] {
      if let error = data["error"] as? String, !error.isEmpty { return error }
      if let message = data["message"] as? String, !message.isEmpty { return message }
    }
    return nil
  }

  private func serverErrorCode(from object: [String: Any]) -> String? {
    if let code = object["code"] as? String, !code.isEmpty { return code }
    if let error = object["error"] as? [String: Any], let code = error["code"] as? String, !code.isEmpty { return code }
    return nil
  }
}
