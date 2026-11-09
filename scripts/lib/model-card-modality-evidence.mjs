// Only captured channel-owned evidence. This module never supplies UI facts.
import fs from 'node:fs'
import path from 'node:path'
const modalityFields = ['inputModalities', 'outputModalities']
import { channelOwns } from '../../apps/web/src/lib/modelCardSources.js'
export { channelOwns }
export function readModalityEvidence(root) {
  const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
  const index = new Map(), references = new Map(), files = new Set(), ambiguousTables = []
  function add(key, field, value, sourceUrl, file, priority, extra = {}) {
    const channel = key.split('/')[0]
    if (!modalityFields.includes(field) || !Array.isArray(value) || !value.length || !channelOwns(channel, sourceUrl)) return
    files.add(file)
    const sourceSet = references.get(key) || new Set(); sourceSet.add(sourceUrl); references.set(key, sourceSet)
    const entry = index.get(key) || {}; index.set(key, entry)
    const next = { value: [...new Set(value)].sort(), sourceUrl, file, priority, ...extra }
    if (!entry[field] || priority > entry[field].priority) entry[field] = next
  }
  const fieldSpecs = (key, specs, file, priority, fallbackUrls = []) => {
    if (!specs) return
    const urls = specs.sourceUrls || fallbackUrls
    for (const [i, field] of modalityFields.entries()) {
      let value = specs[['officialInputModalities', 'officialOutputModalities'][i]] || specs[field]
      // Two captured channel notes explicitly name PDF input; omitting file
      // from their short modality array is not evidence against file support.
      if (i === 0 && Array.isArray(value) && specs.notes?.some(note => /官方支持 PDF 文件输入|\bpdf_url\b/.test(note))) value = [...value, 'file']
      for (const url of urls) add(key, field, value, url, file, priority)
    }
  }
  // Official from/to task labels prove positive modality support, but are not
  // exhaustive input lists (image-to-image may also accept a text prompt).
  // Retain that distinction instead of calling unmentioned inputs unsupported.
  const runwareFile = 'config/channel-audit/runware-directory.json'
  for (const row of read(runwareFile)) {
    const transitions = row.officialCapabilities.flatMap(value => {
      const match = /^(text|image|audio|video)-to-(text|image|audio|video)$/.exec(value)
      return match ? [match.slice(1)] : []
    })
    for (const [i, field] of modalityFields.entries()) add('runware/' + row.apiModelId, field, transitions.map(pair => pair[i]), row.source, runwareFile, 5,
      { positiveOnly: true, officialCapabilities: row.officialCapabilities })
  }
  for (const source of ['config/channel-audit/v24/openrouter-grok.json', 'config/channel-audit/2026-09-23/openrouter-models.json']) {
    const data = read(source)
    for (const row of data.models) for (const [i, field] of modalityFields.entries())
      add('openrouter/' + row.id, field, row.architecture?.[['input_modalities', 'output_modalities'][i]], data.source, source, 10)
  }
  // Exact identities only. Native vendor pages cannot establish a hosted channel.
  for (const file of ['specific-model-page-overrides.json', 'model-page-followup-20261016.json']) {
    const source = 'config/channel-audit/' + file
    for (const row of read(source)) for (const key of row.keys) fieldSpecs(key, row.specifications, source, 20)
  }
  for (const file of ['catalog-20261009-evidence.json', 'catalog-20261009-followup-evidence.json']) {
    const source = 'config/channel-audit/' + file
    for (const row of read(source).catalogDelta.added) fieldSpecs(row.key || row.provider + '/' + row.id, row.specifications, source, 30)
  }
  for (const file of fs.readdirSync(path.join(root, 'config/channel-audit/v24')).filter(f => f.endsWith('.json')).sort()) {
    const source = 'config/channel-audit/v24/' + file, data = read(source)
    if (!data.provider || !Array.isArray(data.models)) continue
    for (const row of data.models) fieldSpecs(data.provider + '/' + row.id, row, source, 10, row.specifications?.sourceUrls || [])
  }
  const review = read('config/channel-audit/review-r6a-20261109.json')
  const withdrawn = new Set(review.conflicts.filter(row => row.decision === 'fallback').map(row => row.channel + '/' + row.id + '/' + row.field))
  const inputFile = 'config/channel-audit/input-20261109.json'
  for (const row of read(inputFile).pairs) {
    const key = row.channel + '/' + row.apiModelId
    for (const field of modalityFields) {
      const provenance = row.fieldProvenance?.[field]
      if (provenance?.kind === 'channel-published' && !withdrawn.has(key + '/' + field)) add(key, field, row[field], provenance.sourceUrl, inputFile, 40)
    }
  }
  const generatedFile = 'config/model-audit.generated.json', audit = read(generatedFile)
  for (const [key, row] of Object.entries(audit.rows)) for (const [i, field] of modalityFields.entries()) {
    const [value, state, scope, source] = audit.facts[row[i]]
    if (state === 'known' && scope === 'channel') add(key, field, value, audit.sources[source], generatedFile, 50, { unsupported: audit.details[key]?.unsupportedModalities?.[field] || [] })
  }
  // R10's newer explicit tables supersede older arrays. When one page contains
  // different variant tables, use their union for omissions and flag ambiguity;
  // never interpret the narrower table as an explicit exclusion for every ID.
  const tableFile = 'config/channel-audit/modality-table-review-r10-20261109.json'
  for (const page of read(tableFile).pages) {
    const fieldValues = modalityFields.map((_, i) => page.quotes.flatMap(quote => {
      const match = new RegExp((i === 0 ? '输入' : '输出') + '模态\\s*\\|([^|]+)').exec(quote)
      return match ? [(match[1].match(/Text|Image|Audio|Video/gi) || []).map(v => v.toLowerCase()).sort()] : []
    }))
    for (const [key, urls] of references) {
      if (key.split('/')[0] !== page.channel || !urls.has(page.sourceUrl)) continue
      for (const [i, field] of modalityFields.entries()) {
        const values = fieldValues[i]
        if (new Set(values.map(v => JSON.stringify(v))).size > 1) ambiguousTables.push({ key, field, sourceUrl: page.sourceUrl, variants: values })
        add(key, field, values.flat(), page.sourceUrl, tableFile, 60, { quotes: page.quotes, ambiguous: new Set(values.map(v => JSON.stringify(v))).size > 1 })
      }
    }
  }
  return { index, files: [...files].sort(), ambiguousTables }
}
export function modalityDisagreements(channel, modelId, field, icons, evidence) {
  if (!evidence) return []
  return icons.flatMap(icon => {
    const listed = evidence.value.includes(icon.id)
    if (!(['supported', 'conditional'].includes(icon.state) && !listed && !evidence.positiveOnly || ['unsupported', 'unlisted'].includes(icon.state) && listed)) return []
    return [{ channel, modelId, field: (field === 'inputModalities' ? 'input/' : 'output/') + icon.id,
      cardValue: icon.state === 'conditional' ? '有条件支持' : icon.state === 'supported' ? '支持' : '不支持',
      officialValue: listed ? '列为支持' : evidence.unsupported?.includes(icon.id) ? '明确不支持' : '未列支持（不等于明确不支持）',
      sourceUrl: evidence.sourceUrl, evidenceFile: evidence.file, officialModalities: evidence.value,
      ...(evidence.ambiguous ? { evidenceNote: '同页多组模态表，取并集；未按变体外推排除' } : {}) }]
  })
}
