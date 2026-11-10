import evidence from './card-data/modality-evidence.json' with { type: 'json' }
import { sourceTitle } from './card-presentation.mjs'
import tokenDancePages from './card-data/tokendance-pages.json' with { type: 'json' }

export function historicalChannelIds(pages) {
  return new Set(Object.keys(pages).filter(id => pages[id].verified === false))
}
const historicalIds = historicalChannelIds(tokenDancePages)

const modalities = ['文本', '图像', '视频', '音频'].map((label, i) => ({ id: ['text', 'image', 'video', 'audio'][i], label }))
// Presentation only. An omitted channel listing never proves a model exclusion.
export function modalityIconStates(value, fact, provider, modelId, missingIds = historicalIds) {
  let states
  if (fact?.state === 'known' && fact.displayValue) {
    states = modalityIconStates(fact.displayValue).map(item => item.state === 'unlisted' ? { ...item, state: 'unknown' } : item)
  } else if (fact) {
    states = modalities.map(item => ({ ...item, detail: '', state: fact.state === 'unsupported' ? 'unsupported'
      : fact.state !== 'known' ? 'unknown' : fact.value?.includes(item.id) ? 'supported' : fact.unsupportedModalities?.includes(item.id) ? 'unsupported' : 'unknown' }))
  } else {
    const known = typeof value === 'string' && modalities.some(({ label }) => value.includes(label))
    states = (value?.includes('文件') ? [...modalities, { id: 'file', label: '文件' }] : modalities).map(item => {
      const segment = known ? value.split(/[、；]/).find(part => part.includes(item.label)) : null
      return { ...item, state: !known ? 'unknown' : !segment ? (value.includes('其他模态待确认') ? 'unknown' : 'unlisted') : /有限|需/.test(segment) ? 'conditional' : 'supported', detail: segment || '' }
    })
  }
  return states.map(item => {
    const channel = fact?.provenance === 'channel'
    const wording = { supported: '支持', unsupported: channel ? '渠道未开放' : '不支持', unknown: '未知', unlisted: '官方未列支持', conditional: '有条件支持' }[item.state]
    const group = channel && evidence.find(([prefix, date]) => fact.sourceUrl?.startsWith(prefix) && date === fact.verifiedAt)
    const subject = group && fact.sourceUrl.slice(group[0].length) + (provider === 'bailian' ? '#' + modelId : '')
    const quote = group && group[2].find(([, ids]) => ids.split('|').includes(subject))?.[0]
    const date = fact?.verifiedAt
    const source = { channel: '渠道资料', vendor: '原厂资料', catalog: '图研既有核实', product: '图研输入要求' }[fact?.provenance]
    const attribution = source ? `${source}${fact.sourceUrl ? ` · ${sourceTitle(fact.sourceUrl)}` : ''}${date ? `（${date}）` : ''}` : '暂无官方资料'
    const tooltip = ['unknown', 'unlisted'].includes(item.state)
      ? (channel || provider === 'tokendance' || fact?.modalityMasks?.includes(item.id) ? `${provider === 'tokendance' && missingIds.has(modelId) ? '渠道页无此型号' : '渠道未标注此模态'}${date ? `（核实日期：${date}）` : ''}` : attribution)
      : quote ? `渠道标注：${quote}（${date}）`
        : attribution
    return { ...item, accessibleLabel: `${item.label}：${wording}${item.detail && item.detail !== item.label ? ` · ${item.detail}` : ''}`, tooltip }
  })
}
