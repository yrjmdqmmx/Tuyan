import assert from 'node:assert/strict'
import before from './fixtures/catalog-version-before-57bc2ad0.json' with {type:'json'}
import versions from '../config/model-version-audit.json' with {type:'json'}
const correctedKeys = new Set(Object.values(before).flat())
export const correctedVersions = new Map(versions.models.filter(row => correctedKeys.has(row.channel+'/'+row.apiModelId))
  .map(row => [row.channel+'/'+row.apiModelId, {kind:row.kind, id:row.versionId, checkedAt:row.checkedAt, sourceUrl:row.sourceUrls[0]}]))

// Reconstruct only the pre-review version fields for the immutable November 17 hashes.
export function catalogBeforeVersionReview(catalog) {
  const copy = structuredClone(catalog)
  for (const [provider, entry] of Object.entries(copy)) for (const model of entry.models) {
    const key = provider+'/'+model.id
    if (!correctedKeys.has(key)) continue
    assert.deepEqual(model.version, correctedVersions.get(key), key)
    if (before.absent.includes(key)) delete model.version
    else if (before.nullId.includes(key)) model.version.id = null
    else delete model.version.id
  }
  return copy
}
// The historical card reports include Mini's two version strings. Verify their
// current render before comparing the full cards to their pre-review snapshots.
export function cardsBeforeVersionReview(rows) {
  const previous = {...rows}
  for (const key of before.absent) {
    const row = rows[key]
    const card = row.mini.card
    const version = correctedVersions.get(key)
    const rolling = key === 'siliconflow/deepseek-ai/DeepSeek-V4.1-Flash'
    const label = rolling ? '滚动别名' : '版本待确认'
    const target = rolling ? '已核对版本：deepseek-v4.1-flash-1017' : '具体版本未知'
    assert.equal(card.versionLabel, label, key)
    assert.equal(card.versionText, label+' · '+target+' · 核对于 '+version.checkedAt, key)
    previous[key] = {...row, mini:{...row.mini, card:{...card, versionLabel:'版本待确认', versionText:'版本待确认 · 具体版本未知'}}}
  }
  return previous
}
