/** Pure wire-size contract, also inlined into the standalone backend by catalog sync. */
export type ImageSizeContract = {
  mode: 'pixels' | 'table' | 'ratio' | 'inherit'
  tiers: Record<string, { targetPixels?: number; targetEdge?: number; sizes?: Record<string, string> }>
  ratios?: string[]
  minSide?: number
  maxSide?: number
  minPixels?: number
  maxPixels?: number
  maxRatio?: number
  alignment?: number
  separator?: '*' | 'x'
  auto?: 'omit' | 'tier' | 'square' | 'literal'
}

export type ResolvedImageSize = { size?: string; width?: number; height?: number; aspectRatio?: string; resolution: string }

/** Reject before transport. No silent fallback from unsupported resolution/ratio. */
export function resolveImageSize(contract: ImageSizeContract, ratio: string, resolution: string): ResolvedImageSize {
  const tier = contract.tiers[resolution]
  if (!tier) throw new Error(`Unsupported image resolution: ${resolution}`)
  if (ratio !== 'auto' && !/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(ratio)) throw new Error(`Invalid aspect ratio: ${ratio}`)
  if (contract.mode === 'inherit') {
    if (ratio !== 'auto') throw new Error('This image operation inherits the source aspect ratio')
    return { resolution }
  }
  if (ratio !== 'auto' && contract.ratios && !contract.ratios.includes(ratio)) throw new Error(`Unsupported aspect ratio: ${ratio}`)
  if (ratio === 'auto' && contract.auto === 'omit') return { resolution }
  if (ratio === 'auto' && contract.auto === 'tier') return { resolution, size: resolution }
  if (ratio === 'auto' && contract.auto === 'literal') return { resolution, size: 'auto' }
  const selected = ratio === 'auto' ? '1:1' : ratio
  if (contract.mode === 'ratio') return { resolution, aspectRatio: selected, size: selected }
  if (contract.mode === 'table') {
    const size = tier.sizes?.[selected]
    if (!size) throw new Error(`Unsupported image size combination: ${resolution} ${selected}`)
    const [width, height] = size.split(/[x*]/).map(Number)
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) throw new Error('Invalid fixed image dimensions')
    return { resolution, size, width, height, aspectRatio: selected }
  }
  // Rationalize decimal labels (19.5:9 -> 13:6) before applying alignment.
  const sides = selected.split(':').map(Number)
  if (sides.some((n) => !Number.isFinite(n) || n <= 0 || n > 1000)) throw new Error('Invalid image aspect ratio')
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a
  const denominator = 10 ** Math.max(...selected.split(':').map((part) => part.split('.')[1]?.length || 0))
  const divisor = gcd(Math.round(sides[0] * denominator), Math.round(sides[1] * denominator))
  const [w, h] = sides.map((n) => Math.round(n * denominator) / divisor)
  if (Math.max(w, h) / Math.min(w, h) > (contract.maxRatio ?? Infinity)) throw new Error(`Unsupported aspect ratio: ${ratio}`)
  const alignment = contract.alignment ?? 1
  const minUnit = Math.ceil(Math.max((contract.minSide ?? 1) / Math.min(w, h), Math.sqrt((contract.minPixels ?? 1) / (w * h))) / alignment)
  const maxUnit = Math.floor(Math.min((contract.maxSide ?? 16384) / Math.max(w, h), Math.sqrt((contract.maxPixels ?? 20 * 1024 * 1024) / (w * h))) / alignment)
  if (!Number.isSafeInteger(minUnit) || minUnit > maxUnit) throw new Error(`No legal pixel size for ${resolution} ${ratio}`)
  const target = tier.targetEdge ? tier.targetEdge / Math.max(w, h) : Math.sqrt((tier.targetPixels ?? 1024 ** 2) / (w * h))
  const unit = Math.min(maxUnit, Math.max(minUnit, Math.floor(target / alignment))) * alignment
  const width = w * unit, height = h * unit
  return { resolution, size: `${width}${contract.separator ?? 'x'}${height}`, width, height, aspectRatio: selected }
}

export function imageAspectRatiosByResolution(contract: ImageSizeContract, candidates: readonly string[]): Record<string, string[]> {
  return Object.fromEntries(Object.keys(contract.tiers).map((resolution) => [resolution, candidates.filter((ratio) => {
    try { resolveImageSize(contract, ratio, resolution); return true } catch { return false }
  })]))
}
