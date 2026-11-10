import {visibleSourceTitle} from '../packages/api/src/card-presentation.mjs'
import assert from 'node:assert/strict'

export const conditions = {
  '图像（需视觉组件）': '需启用视觉组件',
  '音频（有限支持）': '仅部分音频功能',
  '音频（需开启音频模式）': '需开启音频模式',
  '图像（需编辑接口）': '仅编辑接口',
}
export const patterns = [
  /^支持(文本|图像|视频|音频)(输入|输出)(（[^（）]+）)?$/,
  /^此渠道不支持(文本|图像|视频|音频)(输入|输出)$/,
  /^该模型不支持(文本|图像|视频|音频)(输入|输出)$/,
  /^官方资料未说明是否支持(文本|图像|视频|音频)(输入|输出)$/,
]
export const obsoleteStatus = /未标注|渠道未开放|暂不支持|渠道未标注此模态|有条件支持/
// Visible status labels, not the preserved non-modality note 模型页未标注最大输出.
export const obsoleteVisibleStatus = /渠道未开放|暂不支持|渠道未标注此模态|有条件支持|(?:^|[：；\n])未标注(?:$|[ ·；\n])/
export function expectedSentence(icon, fact, direction) {
  const phrase = icon.label + (direction === 'output' ? '输出' : '输入')
  if (icon.state === 'conditional') {
    assert.ok(conditions[icon.detail], 'Unreviewed conditional qualifier: ' + icon.detail)
    return '支持' + phrase + '（' + conditions[icon.detail] + '）'
  }
  return (icon.state === 'supported' ? '支持' : icon.state === 'unsupported'
    ? fact?.provenance === 'channel' ? '此渠道不支持' : '该模型不支持' : '官方资料未说明是否支持') + phrase
}
export function expectedIcons(icons, fact, direction) {
  return icons.filter(icon => icon.id !== 'file').map(icon => {
    const tooltip = expectedSentence(icon, fact, direction)
    return {...icon, tooltip, accessibleLabel:tooltip}
  })
}
export function forbiddenAttribution(rows) {
  const terms = new Set()
  for (const row of Object.values(rows)) {
    for (const source of [...row.web.sources, ...row.mini.card.specSources, ...Object.values(row.web.data.fields).filter(f => f.sourceUrl).map(f => ({label:visibleSourceTitle(f.sourceUrl)}))]) {
      terms.add(source.label)
      const site = source.label.split(' · ')[1]
      if (site) terms.add(site)
    }
    for (const text of [row.mini.card.channelLabel, row.mini.card.vendorLabel, row.web.data.note, row.mini.audit.note,
      ...Object.values(row.web.data.fields).flatMap(f => [f.channelNote, f.note])]) if (text) terms.add(text)
  }
  return [...terms]
}
export function assertSentence(icon, fact, direction, terms = []) {
  assert.equal(icon.tooltip, expectedSentence(icon, fact, direction))
  assert.equal(icon.accessibleLabel, icon.tooltip)
  assert.equal(patterns.filter(p => p.test(icon.tooltip)).length, 1)
  assert.doesNotMatch(icon.tooltip, /\d{4}-\d{2}-\d{2}|核实日期/)
  assert.doesNotMatch(icon.tooltip, obsoleteStatus)
  for (const term of terms) assert.ok(!icon.tooltip.toLowerCase().includes(term.toLowerCase()), 'Attribution leaked: ' + term)
}
export function assertAllSentences(rows) {
  assert.equal(Object.keys(rows).length, 1064)
  const terms = forbiddenAttribution(rows), counts = {}, qualifiers = new Set()
  for (const [key, row] of Object.entries(rows)) for (const [index, direction] of ['input','output'].entries()) {
    const fact = row.web.data[direction + 'Fact'], icons = row.web[direction + 'Icons']
    assert.deepEqual(icons.map(i => i.id), ['text','image','video','audio'], key)
    const presentation = list => list.map(({detail, ...icon}) => icon)
    assert.deepEqual(presentation(row.mini.card.specRows[index].icons), presentation(icons), key + ' Web/Mini parity')
    for (const icon of icons) {
      assertSentence(icon, fact, direction, terms)
      const state = icon.state === 'unsupported' ? fact.provenance === 'channel' ? 'channel-unsupported' : 'vendor-unsupported' : icon.state
      counts[state] = (counts[state] || 0) + 1
      if (icon.state === 'conditional') qualifiers.add(icon.detail)
    }
  }
  assert.deepEqual(counts, {supported:2847, unknown:5163, 'channel-unsupported':501, conditional:1})
  assert.deepEqual([...qualifiers], ['图像（需视觉组件）'])
  return counts
}
