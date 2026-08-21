import Foundation

/// A server-controlled role. Like ProviderID, this stays extensible so a newer
/// registry can still be cached and displayed by an older client.
struct ModelRole: RawRepresentable, Codable, Hashable, Sendable, Identifiable {
  let rawValue: String

  init(rawValue: String) { self.rawValue = rawValue }
  var id: String { rawValue }

  static let main = ModelRole(rawValue: "main")
  static let image = ModelRole(rawValue: "image")
  static let vision = ModelRole(rawValue: "vision")
}

struct ModelRoute: Codable, Equatable, Hashable, Sendable {
  let accessProvider: ProviderID
  let modelId: String
}

struct ModelRoutes: Codable, Equatable, Hashable, Sendable {
  let main: ModelRoute
  let image: ModelRoute
  let vision: ModelRoute

  subscript(role: ModelRole) -> ModelRoute? {
    switch role {
    case .main: main
    case .image: image
    case .vision: vision
    default: nil
    }
  }
}

struct ModelCapabilities: Codable, Equatable {
  let referenceImages: Bool
  let imageGeneration: Bool
  let imageEditing: Bool
  let imageEditMode: String
  /// nil means an older registry omitted the field; [] means the server
  /// expressly denies every value.
  let resolutions: [ImageSize]?
  let refineResolutions: [ImageSize]?
  let aspectRatios: [String]?
  let refineAspectRatios: [String]?
  let outputFormats: [String]?

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    referenceImages = container.bool("referenceImages")
    imageGeneration = container.bool("imageGeneration")
    imageEditing = container.bool("imageEditing")
    imageEditMode = container.string("imageEditMode", default: "none")
    resolutions = Self.imageSizes(container, key: "resolutions")
    refineResolutions = Self.imageSizes(container, key: "refineResolutions")
    aspectRatios = try container.decodeIfPresent([String].self, forKey: .key("aspectRatios"))
    refineAspectRatios = try container.decodeIfPresent([String].self, forKey: .key("refineAspectRatios"))
    outputFormats = try container.decodeIfPresent([String].self, forKey: .key("outputFormats"))
  }

  private static func imageSizes(_ container: KeyedDecodingContainer<DynamicCodingKey>, key: String) -> [ImageSize]? {
    guard let raw = try? container.decodeIfPresent([String].self, forKey: .key(key)) else { return nil }
    return raw.compactMap(ImageSize.init(rawValue:))
  }
}

struct RegistryModel: Codable, Equatable, Identifiable {
  let id: String
  let label: String
  let vendor: String
  /// Kept as raw strings so unknown server states decode safely.
  let lifecycle: String
  let recommended: Bool
  let requiresEntitlement: Bool
  let entitlement: String?
  let inputModalities: [String]
  let outputModalities: [String]
  let verified: Bool
  let verificationState: String
  let selectable: Bool
  let releasedAt: String?
  let officialSourceURL: String?
  let disabledReason: String?
  let roles: [ModelRole]
  let roleReasons: [ModelRole: String]
  let capabilities: ModelCapabilities
  let protocolName: String
  let availabilityNotes: String

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    id = container.string("id")
    label = container.string("label", default: id)
    vendor = container.string("vendor")
    lifecycle = container.string("lifecycle", default: "unknown")
    recommended = container.bool("recommended")
    requiresEntitlement = container.bool("requiresEntitlement")
    entitlement = container.optionalString("entitlement")
    inputModalities = container.stringArray("inputModalities")
    outputModalities = container.stringArray("outputModalities")
    verified = container.bool("verified")
    verificationState = container.string("verificationState", default: "unverified")
    selectable = container.bool("selectable", default: true)
    releasedAt = container.optionalString("releasedAt")
    officialSourceURL = container.optionalString("officialSourceUrl")
    disabledReason = container.optionalString("disabledReason")
    roles = container.decodeArray("roles")
    let rawRoleReasons = (try? container.decodeIfPresent([String: String].self, forKey: .key("roleReasons"))) ?? [:]
    roleReasons = Dictionary(uniqueKeysWithValues: rawRoleReasons.map { (ModelRole(rawValue: $0.key), $0.value) })
    capabilities = (try? container.decode(ModelCapabilities.self, forKey: .key("capabilities")))
      ?? ModelCapabilities(referenceImages: false, imageGeneration: false, imageEditing: false, imageEditMode: "none")
    protocolName = container.string("protocol")
    availabilityNotes = container.string("availabilityNotes")
  }
}

private extension ModelCapabilities {
  init(referenceImages: Bool, imageGeneration: Bool, imageEditing: Bool, imageEditMode: String) {
    self.referenceImages = referenceImages
    self.imageGeneration = imageGeneration
    self.imageEditing = imageEditing
    self.imageEditMode = imageEditMode
    resolutions = nil
    refineResolutions = nil
    aspectRatios = nil
    refineAspectRatios = nil
    outputFormats = nil
  }
}

struct ProviderRegistry: Codable, Equatable {
  struct Defaults: Codable, Equatable {
    let main: String
    let image: String
    let vision: String
  }

  let accessKind: String
  let routeContractVersion: Int
  let accountCatalogRequired: Bool
  let defaults: Defaults
  let models: [RegistryModel]

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    accessKind = container.string("accessKind")
    routeContractVersion = container.int("routeContractVersion")
    accountCatalogRequired = container.bool("accountCatalogRequired")
    defaults = try container.decode(Defaults.self, forKey: .key("defaults"))
    models = container.decodeArray("models")
  }
}

struct ModelRegistry: Codable, Equatable {
  let code: Int
  let registryVersion: String
  let routeContractVersion: Int
  let supportsModelRoutes: Bool
  var providers: [ProviderID: ProviderRegistry]
  let unavailableProviders: [ProviderID: String]

  private static let preferredOrder: [ProviderID] = [.openrouter, .gemini, .openai, .bailian, .ark]
  private static let fallbackAspectRatios = ["16:9", "21:9", "3:2", "1:1"]

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    code = container.int("code")
    registryVersion = container.string("registryVersion")
    routeContractVersion = container.int("routeContractVersion")
    supportsModelRoutes = container.bool("supportsModelRoutes")
    let rawProviders = (try? container.decode([String: ProviderRegistry].self, forKey: .key("providers"))) ?? [:]
    providers = Dictionary(uniqueKeysWithValues: rawProviders.map { (ProviderID(rawValue: $0.key), $0.value) })
    let rawUnavailable = (try? container.decode([String: String].self, forKey: .key("unavailableProviders"))) ?? [:]
    unavailableProviders = Dictionary(uniqueKeysWithValues: rawUnavailable.map { (ProviderID(rawValue: $0.key), $0.value) })
  }

  var orderedProviders: [ProviderID] {
    let live = Set(providers.keys)
    let preferred = Self.preferredOrder.filter(live.contains)
    let unknown = providers.keys.filter { !Self.preferredOrder.contains($0) }.sorted { $0.rawValue < $1.rawValue }
    return preferred + unknown
  }

  func models(for provider: ProviderID, role: ModelRole) -> [RegistryModel] {
    (providers[provider]?.models ?? []).filter { $0.selectable && $0.roles.contains(role) }
  }

  func model(for route: ModelRoute) -> RegistryModel? {
    providers[route.accessProvider]?.models.first { $0.id == route.modelId }
  }

  func defaultRoutes(for provider: ProviderID) -> ModelRoutes? {
    guard let defaults = providers[provider]?.defaults,
          !defaults.main.isEmpty, !defaults.image.isEmpty, !defaults.vision.isEmpty else { return nil }
    return ModelRoutes(
      main: ModelRoute(accessProvider: provider, modelId: defaults.main),
      image: ModelRoute(accessProvider: provider, modelId: defaults.image),
      vision: ModelRoute(accessProvider: provider, modelId: defaults.vision)
    )
  }

  func mainModelCanReadReferenceImages(for route: ModelRoute) -> Bool {
    model(for: route)?.capabilities.referenceImages == true
  }

  func generationResolutions(for route: ModelRoute) -> [ImageSize] {
    model(for: route)?.capabilities.resolutions ?? [.twoK]
  }

  func refineResolutions(for route: ModelRoute) -> [ImageSize] {
    model(for: route)?.capabilities.refineResolutions ?? [.twoK]
  }

  func generationAspectRatios(for route: ModelRoute) -> [String] {
    let values = model(for: route)?.capabilities.aspectRatios
    return values == nil ? Self.fallbackAspectRatios : (values?.isEmpty == true ? ["auto"] : values!)
  }

  func refineAspectRatios(for route: ModelRoute) -> [String] {
    let values = model(for: route)?.capabilities.refineAspectRatios
    return values == nil ? Self.fallbackAspectRatios : (values?.isEmpty == true ? ["auto"] : values!)
  }
}

struct ProviderAccountCatalogResult: Decodable, Equatable {
  struct ProbeResult: Decodable, Equatable {
    let role: ModelRole
    let modelId: String
    let state: String
  }

  let provider: ProviderID
  let accountCatalogAvailable: Bool
  let probeResults: [ProbeResult]

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    provider = ProviderID(rawValue: container.string("provider", default: "ark"))
    accountCatalogAvailable = container.bool("accountCatalogAvailable")
    probeResults = container.decodeArray("probeResults")
  }
}
