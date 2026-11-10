import assert from 'node:assert/strict'
import review from '../../config/channel-audit/review-r28-20261110.json' with {type:'json'}

// Source-only review: preserve values, state, provenance and execution records.
export function applyEvidenceR28(data, evidence = review) {
  const intern = (list, value) => {
    const index = list.findIndex(item => JSON.stringify(item) === JSON.stringify(value))
    return index < 0 ? list.push(value) - 1 : index
  }
  const seen = new Set()
  for (const row of evidence.fields) {
    const key = row.identity + '/' + row.field, index = data.fields.indexOf(row.field)
    assert.ok(!seen.has(key) && row.identity.startsWith('fal/') && index >= 0, key)
    seen.add(key)
    const fact = data.facts[data.rows[row.identity][index]]
    assert.deepEqual(fact.slice(0, 3), [row.before.value, row.before.state, row.before.provenance], key)
    assert.ok([evidence.catalogUrl, row.sourceUrl].includes(data.sources[fact[3]]), key)
    assert.equal(row.candidateUrl, 'https://fal.ai/models/' + row.identity.slice(4) + '/api')
    if (row.decision === 'moved') {
      const page = evidence.pages[row.candidateUrl]
      assert.equal(page.status, 200); assert.equal(page.curlExitCode, 0)
      assert.equal(page.method, 'GET'); assert.equal(page.authenticated, false)
      assert.equal(page.finalUrl, row.candidateUrl); assert.equal(row.sourceUrl, row.candidateUrl)
      assert.match(page.sha256, /^[a-f0-9]{64}$/)
      assert.equal(row.verifiedAt, page.fetchedAtAsiaShanghai.slice(0, 10))
      assert.ok(page.excerpts.includes(row.identityQuote) && row.identityQuote.includes('"' + row.identity.slice(4) + '"'))
      assert.deepEqual(row.evidence.map(item => item.modality), fact[0])
      for (const item of row.evidence) {
        assert.equal(item.section, row.field === 'inputModalities' ? 'Input' : 'Output')
        assert.ok(page.excerpts.includes(item.quote))
        assert.match(item.quote, row.field === 'outputModalities' ? /^images? (?:list< [^>]+ >|Image)/
          : item.modality === 'text' ? /^(?:prompt|instruction) string\b/ : /^image_urls? (?:string|list< string >)/)
      }
      data.rows[row.identity][index] = intern(data.facts, [...fact.slice(0, 3), intern(data.sources, row.sourceUrl)])
      const detail = data.details[row.identity] ||= {}
      ;(detail.fieldVerifiedAt ||= {})[row.field] = row.verifiedAt
      ;(detail.fieldSources ||= {})[row.field] = row.sourceUrl
    } else {
      assert.equal(row.decision, 'kept'); assert.equal(row.sourceUrl, evidence.catalogUrl)
      ;((data.details[row.identity] ||= {}).fieldSources ||= {})[row.field] = evidence.catalogUrl
    }
  }
  return data
}
