import Foundation

struct ReferenceImageAsset: Codable, Identifiable, Equatable, Hashable {
  var filename: String
  var mimeType: String
  var size: Int
  var objectKey: String
  var uploadToken: String?
  var url: String?
  var storage: String?

  var id: String {
    objectKey.isEmpty ? filename : objectKey
  }

  var displayFormat: String {
    if mimeType.contains("svg") || filename.lowercased().hasSuffix(".svg") { return "svg" }
    if mimeType.contains("jpeg") || mimeType.contains("jpg") || filename.lowercased().hasSuffix(".jpg") || filename.lowercased().hasSuffix(".jpeg") { return "jpg" }
    if mimeType.contains("webp") || filename.lowercased().hasSuffix(".webp") { return "webp" }
    return "png"
  }

  init(
    filename: String,
    mimeType: String,
    size: Int,
    objectKey: String,
    uploadToken: String? = nil,
    url: String? = nil,
    storage: String? = nil
  ) {
    self.filename = filename
    self.mimeType = mimeType
    self.size = size
    self.objectKey = objectKey
    self.uploadToken = uploadToken
    self.url = url
    self.storage = storage
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    filename = container.string("filename", default: "reference")
    mimeType = container.string("mime_type", "mimeType", default: "")
    size = container.int("size")
    objectKey = container.string("object_key", "objectKey")
    uploadToken = container.optionalString("upload_token", "uploadToken")
    url = container.optionalString("url")
    storage = container.optionalString("storage")
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: DynamicCodingKey.self)
    try container.encode(filename, forKey: .key("filename"))
    try container.encode(mimeType, forKey: .key("mimeType"))
    try container.encode(size, forKey: .key("size"))
    try container.encode(objectKey, forKey: .key("objectKey"))
    try container.encodeIfPresent(uploadToken, forKey: .key("uploadToken"))
    try container.encodeIfPresent(url, forKey: .key("url"))
    try container.encodeIfPresent(storage, forKey: .key("storage"))
  }

  var dictionary: [String: Any] {
    var result: [String: Any] = [
      "filename": filename,
      "mimeType": mimeType,
      "size": size,
      "objectKey": objectKey
    ]
    if let uploadToken { result["uploadToken"] = uploadToken }
    return result
  }
}

struct PendingReferenceImage: Identifiable, Equatable {
  let id: String
  let filename: String
  let mimeType: String
  let data: Data

  var size: Int { data.count }
}

enum ReferenceImageLimits {
  static let maxCount = 3
  static let maxBytes = 5 * 1024 * 1024
  static let acceptedMimeTypes: Set<String> = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml"
  ]

  static func normalizedMimeType(filename: String, mimeType: String?) -> String {
    let value = (mimeType ?? "").lowercased()
    if acceptedMimeTypes.contains(value) { return value }
    let ext = (filename as NSString).pathExtension.lowercased()
    switch ext {
    case "png": return "image/png"
    case "jpg", "jpeg": return "image/jpeg"
    case "webp": return "image/webp"
    case "svg": return "image/svg+xml"
    default: return value
    }
  }

  static func isAccepted(filename: String, mimeType: String?, size: Int) -> Bool {
    guard size > 0, size <= maxBytes else { return false }
    return acceptedMimeTypes.contains(normalizedMimeType(filename: filename, mimeType: mimeType))
  }
}

struct ReferenceLibraryItem: Decodable, Identifiable, Equatable {
  let id: String
  let taskName: TaskName
  let title: String
  let summary: String
  let imageURL: String
  let imageObjectKey: String
  let source: String
  let shortZh: String
  let shortEn: String
  let detailZh: String
  let detailEn: String

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: DynamicCodingKey.self)
    id = container.string("id", "_id")
    taskName = TaskName(rawValue: container.string("task_name", "taskName", default: "diagram")) ?? .diagram
    title = container.string("title", "visualIntent", "caption")
    summary = container.string("summary", "content", "methodExcerpt")
    imageURL = container.string("image_url", "imageUrl", "url")
    imageObjectKey = container.string("image_object_key", "imageObjectKey", "objectKey")
    source = container.string("source", default: "paperbanana-bench")
    shortZh = container.string("shortZh", "short_zh", "titleZh", "title_zh", default: title)
    shortEn = container.string("shortEn", "short_en", "titleEn", "title_en", default: title)
    detailZh = container.string("detailZh", "detail_zh", "summaryZh", "summary_zh", default: summary)
    detailEn = container.string("detailEn", "detail_en", "summaryEn", "summary_en", default: summary)
  }
}

extension ReferenceLibraryItem {
  static let empty = ReferenceLibraryItem(id: "", taskName: .diagram, title: "", summary: "", imageURL: "", imageObjectKey: "", source: "")
  init(id: String, taskName: TaskName, title: String, summary: String, imageURL: String, imageObjectKey: String, source: String, shortZh: String? = nil, shortEn: String? = nil, detailZh: String? = nil, detailEn: String? = nil) { self.id = id; self.taskName = taskName; self.title = title; self.summary = summary; self.imageURL = imageURL; self.imageObjectKey = imageObjectKey; self.source = source; self.shortZh = shortZh ?? title; self.shortEn = shortEn ?? title; self.detailZh = detailZh ?? summary; self.detailEn = detailEn ?? summary }
}

struct ReferenceFacet: Decodable, Equatable, Identifiable {
  let value: String; let count: Int; let labelZh: String; let labelEn: String
  var id: String { value }
  init(value: String, count: Int, labelZh: String, labelEn: String) { self.value = value; self.count = count; self.labelZh = labelZh; self.labelEn = labelEn }
  init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicCodingKey.self); value = c.string("value", "id", "key"); count = c.int("count", "total"); labelZh = c.string("labelZh", "label_zh", "titleZh", "title_zh", default: value); labelEn = c.string("labelEn", "label_en", "titleEn", "title_en", default: value) }
}
struct ReferenceLibraryFacets: Decodable, Equatable {
  let visualCategories: [ReferenceFacet]; let researchDomains: [ReferenceFacet]
  init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicCodingKey.self); visualCategories = c.decodeArray("visualCategories", "visual_categories"); researchDomains = c.decodeArray("researchDomains", "research_domains") }
  static let empty = ReferenceLibraryFacets(visualCategories: [], researchDomains: [])
  init(visualCategories: [ReferenceFacet], researchDomains: [ReferenceFacet]) { self.visualCategories = visualCategories; self.researchDomains = researchDomains }
}
struct ReferenceLibraryPage: Decodable, Equatable {
  let references: [ReferenceLibraryItem]; let total: Int; let page: Int; let pageSize: Int; let totalPages: Int; let facets: ReferenceLibraryFacets
  init(references: [ReferenceLibraryItem], total: Int, page: Int, pageSize: Int, totalPages: Int, facets: ReferenceLibraryFacets) { self.references = references; self.total = total; self.page = page; self.pageSize = pageSize; self.totalPages = totalPages; self.facets = facets }
  init(from decoder: Decoder) throws { let c = try decoder.container(keyedBy: DynamicCodingKey.self); references = c.decodeArray("references"); total = c.int("total", default: references.count); page = max(1, c.int("page", default: 1)); pageSize = max(1, c.int("pageSize", "page_size", default: 12)); totalPages = max(1, c.int("totalPages", "total_pages", default: Int(ceil(Double(max(total, 1)) / Double(pageSize))))) ; facets = (try? c.decode(ReferenceLibraryFacets.self, forKey: .key("facets"))) ?? .empty }
}
struct ReferenceLibraryPageRequest: Equatable {
  var page: Int = 1
  var query = ""
  var visualCategory: String?
  var researchDomain: String?

  mutating func setQuery(_ newQuery: String) {
    query = newQuery
    page = 1
  }
}
enum ReferenceLibrarySelectionError: LocalizedError { case maximumReached; var errorDescription: String? { "最多只能选择 10 张参考图。" } }
struct ReferenceLibrarySelection: Equatable {
  private(set) var selectedIDs: [String] = []; private var cache: [String: ReferenceLibraryItem] = [:]
  var selectedItems: [ReferenceLibraryItem] { selectedIDs.compactMap { cache[$0] } }
  mutating func toggle(_ item: ReferenceLibraryItem) throws { if let index = selectedIDs.firstIndex(of: item.id) { selectedIDs.remove(at: index); return }; guard selectedIDs.count < 10 else { throw ReferenceLibrarySelectionError.maximumReached }; selectedIDs.append(item.id); cache[item.id] = item }
  mutating func clear() { selectedIDs = []; cache = [:] }
}
