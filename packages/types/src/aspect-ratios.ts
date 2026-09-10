export const CANONICAL_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1', '1:2', '2:1', '4:5', '5:4', '1:8', '8:1', '5:2', '2:5', '9:21', '6:10', '14:10', '10:14', '19.5:9', '9:19.5', '20:9', '9:20', '1:3', '3:1', '5:8', '8:5', '9:22', '22:9', '9:23', '23:9', '3:8', '8:3', '5:12', '12:5', '10:16', '16:10', '2.35:1', '7:5', '5:7', '3:5', '5:3'] as const
export type CanonicalAspectRatio = typeof CANONICAL_ASPECT_RATIOS[number]
export type AspectRatioValue = CanonicalAspectRatio | 'auto' | ''
export type ResolutionValue = '512' | '1K' | '1.5K' | '2K' | '3K' | '4K' | 'auto'

export interface AspectRatioOption {
  value: AspectRatioValue
  label: string
  disabled: boolean
  reason: string
}

export function buildAspectRatioOptions(input: {
  capabilities: Record<string, unknown>
  capabilityField: 'aspectRatios' | 'refineAspectRatios'
  resolution?: string
  modelLabel?: string
}): AspectRatioOption[] {
  const capabilities = input.capabilities || {}
  const byResolution = capabilities[`${input.capabilityField}ByResolution`] as Record<string, string[]> | undefined
  const resolutionField = input.capabilityField === 'refineAspectRatios' ? 'refineResolutions' : 'resolutions'
  const resolutions = capabilities[resolutionField] as string[] | undefined
  if (input.resolution && Array.isArray(resolutions) && !resolutions.includes(input.resolution)) return []
  // A present but empty map means this operation is unavailable. A missing key
  // means the selected resolution is unavailable, including automatic sizing.
  if (byResolution && (!input.resolution || !Object.prototype.hasOwnProperty.call(byResolution, input.resolution))) return []
  const declared = byResolution ? byResolution[input.resolution!] : capabilities[input.capabilityField]
  if (!Array.isArray(declared)) return []
  const supported = new Set(declared.map(String))
  return [
    { value: 'auto', label: '自动', disabled: false, reason: '' },
    ...CANONICAL_ASPECT_RATIOS.filter((value) => supported.has(value)).map((value) => ({ value, label: value, disabled: false, reason: '' })),
  ]
}

export function normalizeSelectedAspectRatio(value: string, options: AspectRatioOption[]): AspectRatioValue {
  return options.find((option) => option.value === value && !option.disabled)?.value
    || options.find((option) => option.value === 'auto' && !option.disabled)?.value
    || options.find((option) => !option.disabled)?.value || ''
}

export function buildResolutionOptions(
  capabilities: Record<string, unknown>,
  capabilityField: 'resolutions' | 'refineResolutions',
): Array<{ value: ResolutionValue; label: string }> {
  const declared = Array.isArray(capabilities[capabilityField]) ? capabilities[capabilityField] as unknown[] : []
  const supported = new Set(declared.map(String))
  const labels: Record<ResolutionValue, string> = { '512': '512（预览）', 'auto': '原生尺寸', '1K': '1K（标准）', '1.5K': '1.5K', '3K': '3K', '2K': '2K（高清）', '4K': '4K（超清）' }
  return (['512', '1K', '1.5K', '2K', '3K', '4K', 'auto'] as ResolutionValue[])
    .filter((value) => supported.has(value))
    .map((value) => ({ value, label: labels[value] }))
}
