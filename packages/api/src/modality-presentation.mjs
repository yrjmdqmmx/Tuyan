import conditionalQualifiers from './card-data/conditional-qualifiers.json' with { type: 'json' }
export function historicalChannelIds(pages) {
  return new Set(Object.keys(pages).filter(id => pages[id].verified === false))
}

const modalities = ['文本', '图像', '视频', '音频'].map((label, i) => ({ id: ['text', 'image', 'video', 'audio'][i], label }))
// Presentation only. An omitted channel listing never proves a model exclusion.
export function modalityIconStates(value, fact, provider, modelId, direction = 'input') {
  const qualifier = conditionalQualifiers[provider + '/' + modelId + '/' + direction]
  if (fact?.state === 'known' && !fact.displayValue && qualifier?.[1] === fact.sourceUrl)
    fact = { ...fact, displayValue: qualifier[0] }
  let states
  if (fact?.state === 'known' && fact.displayValue) {
    states = modalityIconStates(fact.displayValue).map(item => item.state === 'unlisted' ? { ...item, state: 'unknown' } : item)
  } else if (fact) {
    states = modalities.map(item => ({ ...item, detail: '', state: fact.state === 'unsupported' ? 'unsupported'
      : fact.state !== 'known' ? 'unknown' : fact.value?.includes(item.id) ? 'supported' : fact.unsupportedModalities?.includes(item.id) ? 'unsupported' : 'unknown' }))
  } else {
    const known = typeof value === 'string' && modalities.some(({ label }) => value.includes(label))
    states = modalities.map(item => {
      const segment = known ? value.split(/[、；]/).find(part => part.includes(item.label)) : null
      return { ...item, state: !known ? 'unknown' : !segment ? (value.includes('其他模态待确认') ? 'unknown' : 'unlisted') : /有限|需/.test(segment) ? 'conditional' : 'supported', detail: segment || '' }
    })
  }
  return states.map(item => {
    const phrase = item.label + (direction === 'output' ? '输出' : '输入')
    const prefix = item.state === 'unsupported' ? fact?.provenance === 'channel' ? '此渠道不支持' : '该模型不支持'
      : ['unknown', 'unlisted'].includes(item.state) ? '官方资料未说明是否支持' : '支持'
    const condition = item.state === 'conditional' ? `（${modalityCondition(item.detail)}）` : ''
    const tooltip = prefix + phrase + condition
    return { ...item, accessibleLabel: tooltip, tooltip }
  })
}

// Reviewed qualifiers only: raw source copy must never enter status sentences.
export function modalityCondition(qualifier) {
  return ({'图像（需视觉组件）':'需启用视觉组件', '音频（有限支持）':'仅部分音频功能',
    '音频（需开启音频模式）':'需开启音频模式', '图像（需编辑接口）':'仅编辑接口'})[qualifier] || '需满足接口要求'
}
