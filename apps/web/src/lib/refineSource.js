export function normalizeRefineSource(url, image = {}) {
  return {
    url: String(url || ''),
    objectKey: String(image.objectKey || image.object_key || ''),
  }
}

export function refineRequestSource(source = {}) {
  if (source.objectKey) return { sourceImageObjectKey: source.objectKey }
  return source.url ? { sourceImageUrl: source.url } : {}
}
