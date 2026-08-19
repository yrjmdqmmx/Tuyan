import Foundation

enum PaperBananaAPIError: LocalizedError {
  case invalidURL(String)
  case invalidResponse
  case server(String)
  case decoding(String)

  var errorDescription: String? {
    switch self {
    case .invalidURL(let value): "无效后端地址：\(value)"
    case .invalidResponse: "后端返回了无效响应。"
    case .server(let message): message
    case .decoding(let message): "响应解析失败：\(message)"
    }
  }
}

final class PaperBananaAPIClient {
  static let createJobClientPlatform = "macos"
  private let session: URLSession
  private let decoder = JSONDecoder()

  init(session: URLSession = .shared) {
    self.session = session
  }

  func fetchBackendHealth(apiBase: String) async throws -> BackendHealth {
    let base = AppDefaults.normalizedAPIBase(apiBase)
    let candidates = [
      try lafEndpoint(apiBase: base),
      try endpoint(apiBase: base, path: "health"),
      try endpoint(apiBase: base, path: "api/health")
    ]

    var lastError: Error?
    for candidate in candidates {
      do {
        let response: HealthEnvelope = try await requestJSON(candidate)
        if let health = response.toBackendHealth(candidateURL: candidate.absoluteString) {
          return health
        }
        throw PaperBananaAPIError.server("当前地址不是 PaperBanana 后端")
      } catch {
        lastError = error
      }
    }
    throw lastError ?? PaperBananaAPIError.server("后端暂时不可用")
  }

  func createJob(apiBase: String, health: BackendHealth?, payload: JobCreatePayload) async throws -> (id: String, status: String) {
    let base = AppDefaults.normalizedAPIBase(apiBase)
    if shouldUsePaperBananaEndpoint(apiBase: base, health: health) {
      let body: [String: Any] = [
        "action": "createJob",
        "clientPlatform": Self.createJobClientPlatform,
        "configurationMode": payload.configurationMode.rawValue,
        "provider": payload.provider.rawValue,
        "apiKeys": payload.apiKeysBody(),
        "methodContent": payload.methodContent,
        "caption": payload.caption,
        "infographicCategory": payload.infographicCategory,
        "mainModelName": payload.mainModelName,
        "imageModelName": payload.imageModelName,
        "pipelineMode": payload.lafPipelineMode,
        "retrievalSetting": payload.retrievalSetting,
        "aspectRatio": payload.aspectRatio,
        "numCandidates": payload.numCandidates,
        "maxCriticRounds": payload.maxCriticRounds,
        "mock": payload.mock
      ]
      let response: CreateJobEnvelope = try await requestJSON(
        try lafEndpoint(apiBase: base),
        method: "POST",
        body: body
      )
      return (response.jobID ?? response.id ?? "", response.status ?? "queued")
    }

    let body: [String: Any] = [
      "clientPlatform": Self.createJobClientPlatform,
      "provider": payload.provider.rawValue,
      "configuration_mode": payload.configurationMode.rawValue,
      "api_keys": payload.apiKeysBody(),
      "task_name": "diagram",
      "method_content": payload.methodContent,
      "caption": payload.caption,
      "infographic_category": payload.infographicCategory,
      "main_model_name": payload.mainModelName,
      "image_gen_model_name": payload.imageModelName,
      "pipeline_mode": payload.pipelineMode,
      "retrieval_setting": payload.retrievalSetting,
      "aspect_ratio": payload.aspectRatio,
      "num_candidates": payload.numCandidates,
      "max_critic_rounds": payload.maxCriticRounds,
      "mock": payload.mock
    ]
    let response: CreateJobEnvelope = try await requestJSON(
      try endpoint(apiBase: base, path: "api/jobs"),
      method: "POST",
      body: body
    )
    return (response.id ?? response.jobID ?? "", response.status ?? "queued")
  }

  func getJob(apiBase: String, health: BackendHealth?, jobID: String) async throws -> Job {
    let base = AppDefaults.normalizedAPIBase(apiBase)
    if shouldUsePaperBananaEndpoint(apiBase: base, health: health) {
      let response: JobEnvelope = try await requestJSON(
        try lafEndpoint(apiBase: base),
        method: "POST",
        body: ["action": "getJob", "jobId": jobID]
      )
      if let job = response.job { return job }
      throw PaperBananaAPIError.server("后端没有返回任务详情。")
    }
    return try await requestJSON(try endpoint(apiBase: base, path: "api/jobs/\(jobID)"))
  }

  func userJobs(apiBase: String, health: BackendHealth?) async throws -> [Job] {
    let base = AppDefaults.normalizedAPIBase(apiBase)
    if health?.backendMode == .gateway || shouldUsePaperBananaEndpoint(apiBase: base, health: health) {
      let response: JobsEnvelope = try await requestJSON(
        try lafEndpoint(apiBase: base),
        method: "POST",
        body: ["action": "myJobs", "limit": 50]
      )
      return response.jobs ?? []
    }
    let response: JobsEnvelope = try await requestJSON(try endpoint(
      apiBase: base,
      path: "api/jobs",
      queryItems: [
        URLQueryItem(name: "scope", value: "mine"),
        URLQueryItem(name: "limit", value: "50")
      ]
    ))
    return response.jobs ?? []
  }

  func getSession(apiBase: String) async throws -> CurrentUser? {
    let response: SessionEnvelope? = try? await requestJSON(try endpoint(apiBase: apiBase, path: "api/auth/get-session"))
    return response?.user
  }

  func signIn(apiBase: String, email: String, password: String) async throws {
    try await requestVoid(
      try endpoint(apiBase: apiBase, path: "api/auth/sign-in/email"),
      method: "POST",
      body: ["email": email, "password": password]
    )
  }

  func signUp(apiBase: String, email: String, password: String, name: String) async throws {
    try await requestVoid(
      try endpoint(apiBase: apiBase, path: "api/auth/sign-up/email"),
      method: "POST",
      body: ["email": email, "password": password, "name": name]
    )
  }

  func signOut(apiBase: String) async {
    try? await requestVoid(
      try endpoint(apiBase: apiBase, path: "api/auth/sign-out"),
      method: "POST",
      body: [:]
    )
  }

  private func shouldUsePaperBananaEndpoint(apiBase: String, health: BackendHealth?) -> Bool {
    if health?.backendMode == .fastapi { return false }
    return true
  }

  private func lafEndpoint(apiBase: String) throws -> URL {
    let base = AppDefaults.normalizedAPIBase(apiBase)
    if base.hasSuffix("/paperbanana-api") {
      guard let url = URL(string: base) else { throw PaperBananaAPIError.invalidURL(base) }
      return url
    }
    return try endpoint(apiBase: base, path: "paperbanana-api")
  }

  private func endpoint(apiBase: String, path: String, queryItems: [URLQueryItem]? = nil) throws -> URL {
    let base = AppDefaults.normalizedAPIBase(apiBase)
    guard var components = URLComponents(string: base) else {
      throw PaperBananaAPIError.invalidURL(base)
    }
    let cleanPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
    let existingPath = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    let joinedPath = [existingPath, cleanPath]
      .filter { !$0.isEmpty }
      .joined(separator: "/")
    components.path = "/" + joinedPath
    components.queryItems = queryItems
    guard let url = components.url else { throw PaperBananaAPIError.invalidURL(base) }
    return url
  }

  private func requestVoid(_ url: URL, method: String, body: [String: Any]?) async throws {
    let _: EmptyEnvelope = try await requestJSON(url, method: method, body: body)
  }

  private func requestJSON<T: Decodable>(_ url: URL, method: String = "GET", body: [String: Any]? = nil) async throws -> T {
    var request = URLRequest(url: url, timeoutInterval: 30)
    request.httpMethod = method
    request.httpShouldHandleCookies = true
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    if let body {
      request.httpBody = try JSONSerialization.data(withJSONObject: body)
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }

    let (data, response) = try await session.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse else {
      throw PaperBananaAPIError.invalidResponse
    }

    if let serverMessage = serverErrorMessage(from: data), !serverMessage.isEmpty {
      if httpResponse.statusCode < 200 || httpResponse.statusCode >= 300 || serverMessage != "0" {
        throw PaperBananaAPIError.server(serverMessage)
      }
    }

    guard httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw PaperBananaAPIError.server("HTTP \(httpResponse.statusCode)")
    }

    if data.isEmpty {
      return try decoder.decode(T.self, from: Data("{}".utf8))
    }

    do {
      return try decoder.decode(T.self, from: data)
    } catch {
      throw PaperBananaAPIError.decoding(error.localizedDescription)
    }
  }

  private func serverErrorMessage(from data: Data) -> String? {
    guard !data.isEmpty,
          let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return nil }
    if let code = object["code"] {
      let codeString = String(describing: code)
      if codeString != "0" {
        return object["error"] as? String
          ?? object["detail"] as? String
          ?? object["message"] as? String
          ?? codeString
      }
    }
    if let error = object["error"] as? [String: Any], let message = error["message"] as? String {
      return message
    }
    if let error = object["error"] as? String {
      return error
    }
    return nil
  }
}

private struct EmptyEnvelope: Decodable {}

private struct CreateJobEnvelope: Decodable {
  let id: String?
  let jobID: String?
  let status: String?

  private enum CodingKeys: String, CodingKey {
    case id
    case jobID = "jobId"
    case status
  }
}

private struct JobEnvelope: Decodable {
  let job: Job?
}

private struct JobsEnvelope: Decodable {
  let jobs: [Job]?
}

private struct SessionEnvelope: Decodable {
  let user: CurrentUser?
}

private struct HealthEnvelope: Decodable {
  let ok: Bool?
  let runtime: String?
  let mockEnabled: Bool?
  let laf: NestedHealth?

  private enum CodingKeys: String, CodingKey {
    case ok
    case runtime
    case mockEnabled = "mock_enabled"
    case laf
  }

  func toBackendHealth(candidateURL: String) -> BackendHealth? {
    if runtime == "gateway" {
      return BackendHealth(
        backendMode: .gateway,
        runtime: "gateway",
        mockEnabled: mockEnabled ?? laf?.mockEnabled ?? false,
        detail: laf?.runtime == "laf" ? "Gateway -> Laf" : candidateURL
      )
    }
    if runtime == "laf" {
      return BackendHealth(
        backendMode: .laf,
        runtime: "laf",
        mockEnabled: mockEnabled ?? false,
        detail: candidateURL
      )
    }
    if ok == true {
      return BackendHealth(
        backendMode: .fastapi,
        runtime: runtime ?? "fastapi",
        mockEnabled: mockEnabled ?? false,
        detail: candidateURL
      )
    }
    return nil
  }
}

private struct NestedHealth: Decodable, Equatable {
  let ok: Bool?
  let runtime: String?
  let mockEnabled: Bool?

  private enum CodingKeys: String, CodingKey {
    case ok
    case runtime
    case mockEnabled = "mock_enabled"
  }
}
