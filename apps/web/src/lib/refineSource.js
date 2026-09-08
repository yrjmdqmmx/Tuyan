export function normalizeRefineSource(url, image = {}) {
  return {
    url: String(url || ''),
    objectKey: String(image.objectKey || image.object_key || ''),
  }
}

export function refineRequestSource(source = {}) {
  if (source.uploaded && source.objectKey) return { sourceImageUpload: { objectKey: source.objectKey } }
  if (source.objectKey) return { sourceImageObjectKey: source.objectKey }
  if (source.url?.startsWith('blob:')) return {}
  return source.url ? { sourceImageUrl: source.url } : {}
}
