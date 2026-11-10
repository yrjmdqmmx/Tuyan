import assert from 'node:assert/strict'
import evidence from '../config/channel-audit/tokendance-rendered-pages-20261110.json' with { type: 'json' }
import historical from '../config/channel-audit/tokendance-historical-links-20261110.json' with { type: 'json' }
export { evidence, historical }
export const expectedTokenDanceSources = id => evidence.pages.find(row => row.id === id)?.verified
  ? ['https://tokendance.space/models/' + id] : historical.rows[id]?.sources || []
export function assertReviewedLinks(get) {
  assert.equal(evidence.pages.length, 74)
  assert.equal(evidence.pages.filter(row => row.verified).length, 67)
  for (const row of evidence.pages) {
    assert.match(row.evidenceSha256, /^[a-f0-9]{64}$/)
    assert.equal(row.checkedAt, '2026-11-10')
    const card = get(row.id), urls = card.sources || (card.sourceUrl ? [card.sourceUrl] : [])
    assert.equal(urls[0], expectedTokenDanceSources(row.id)[0], row.id)
    if (!row.verified) assert.ok(urls.every(url => !url.startsWith('https://tokendance.space/models/')), row.id)
  }
}
