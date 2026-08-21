import Foundation

/// A refinement source is deliberately created only from an already-owned Job result.
struct RefineSource: Equatable, Identifiable {
  let jobID: String
  let previewURL: String
  let objectKey: String
  let filename: String
  let candidateID: Int

  init(jobID: String, image: ResultImage) {
    self.jobID = jobID
    previewURL = image.url
    objectKey = image.objectKey
    filename = image.filename
    candidateID = image.candidateID
  }

  var id: String { "\(jobID):\(candidateID):\(filename)" }
  var isLegacyURLCompatibility: Bool { objectKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
  var requestBody: [String: String] {
    if !objectKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return ["sourceImageObjectKey": objectKey] }
    return previewURL.isEmpty ? [:] : ["sourceImageUrl": previewURL]
  }
}

struct RefineDraft: Equatable {
  var source: RefineSource?
  var instruction: String
  var aspectRatio: String
  var imageSize: ImageSize?

  init(source: RefineSource? = nil, instruction: String = "", aspectRatio: String = "auto", imageSize: ImageSize? = .twoK) {
    self.source = source
    self.instruction = instruction
    self.aspectRatio = aspectRatio
    self.imageSize = imageSize
  }

  var trimmedInstruction: String { instruction.trimmingCharacters(in: .whitespacesAndNewlines) }

  func normalized(refineAspectRatios: [String]?, refineResolutions: [ImageSize]?) -> RefineDraft {
    var value = self
    let ratios = refineAspectRatios == nil ? ["16:9", "21:9", "3:2", "1:1"] : (refineAspectRatios?.isEmpty == true ? ["auto"] : refineAspectRatios!)
    if !ratios.contains(value.aspectRatio) { value.aspectRatio = "auto" }
    let sizes = refineResolutions ?? [.twoK]
    if !sizes.contains(value.imageSize ?? .twoK) { value.imageSize = sizes.first }
    return value
  }
}

struct RefineCapability: Equatable {
  let imageEditMode: String
  init(imageEditMode: String) { self.imageEditMode = imageEditMode }
  var isSupported: Bool { imageEditMode == "direct-edit" || imageEditMode == "analyze-redraw" }
  var requiredRoles: [ModelRole] { imageEditMode == "direct-edit" ? [.image] : imageEditMode == "analyze-redraw" ? [.vision, .image] : [] }
  var title: String { imageEditMode == "direct-edit" ? "直接精修" : imageEditMode == "analyze-redraw" ? "分析后重绘" : "当前模型不支持精修" }
}
