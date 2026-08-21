export const CANONICAL_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1'] as const
export type CanonicalAspectRatio = typeof CANONICAL_ASPECT_RATIOS[number]
export type AspectRatioValue = CanonicalAspectRatio | 'auto'
export type ResolutionValue = '1K' | '2K' | '4K'

export interface AspectRatioOption {
  value: AspectRatioValue
  label: string
  disabled: boolean
  reason: string
}

export function buildAspectRatioOptions(input: {
  capabilities: Record<string, unknown>
  capabilityField: 'aspectRatios' | 'refineAspectRatios'
  modelLabel?: string
}): AspectRatioOption[] {
  const declared = Array.isArray(input.capabilities[input.capabilityField])
    ? input.capabilities[input.capabilityField] as unknown[]
    : []
  const supported = new Set(declared.map(String))
  const modelLabel = input.modelLabel || '当前图像模型'
  return [
    { value: 'auto', label: '自动', disabled: false, reason: '' },
    ...CANONICAL_ASPECT_RATIOS.map((value) => ({
      value,
      label: value,
      disabled: !supported.has(value),
      reason: supported.has(value) ? '' : `${modelLabel} 不支持 ${value} 比例`,
    })),
  ]
}

export function normalizeSelectedAspectRatio(value: string, options: AspectRatioOption[]): AspectRatioValue {
  if (value === 'auto') return 'auto'
  const option = options.find((item) => item.value === value)
  return option && !option.disabled ? option.value : 'auto'
}

export function buildResolutionOptions(
  capabilities: Record<string, unknown>,
  capabilityField: 'resolutions' | 'refineResolutions',
): Array<{ value: ResolutionValue; label: string }> {
  const declared = Array.isArray(capabilities[capabilityField]) ? capabilities[capabilityField] as unknown[] : []
  const supported = new Set(declared.map(String))
  const labels: Record<ResolutionValue, string> = { '1K': '1K（标准）', '2K': '2K（高清）', '4K': '4K（超清）' }
  return (['1K', '2K', '4K'] as ResolutionValue[])
    .filter((value) => supported.has(value))
    .map((value) => ({ value, label: labels[value] }))
}
