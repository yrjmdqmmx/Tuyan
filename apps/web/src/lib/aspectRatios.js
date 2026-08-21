export const CANONICAL_ASPECT_RATIOS = Object.freeze([
  '1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1',
])

export const LEGACY_SAFE_ASPECT_RATIOS = Object.freeze(['16:9', '21:9', '3:2', '1:1'])

export function buildAspectRatioOptions({ capabilities, capabilityField, modelLabel }) {
  const declared = capabilities && Object.prototype.hasOwnProperty.call(capabilities, capabilityField)
    ? (Array.isArray(capabilities[capabilityField]) ? capabilities[capabilityField] : [])
    : LEGACY_SAFE_ASPECT_RATIOS
  const supported = new Set(declared)
  const label = String(modelLabel || '当前图像模型')
  return [
    { value: 'auto', label: '自动', disabled: false, reason: '' },
    ...CANONICAL_ASPECT_RATIOS.map((value) => ({
      value,
      label: value,
      disabled: !supported.has(value),
      reason: supported.has(value) ? '' : `${label} 不支持 ${value} 比例`,
    })),
  ]
}

export function normalizeSelectedAspectRatio(value, options) {
  if (value === 'auto') return 'auto'
  return options.some((option) => option.value === value && !option.disabled) ? value : 'auto'
}
