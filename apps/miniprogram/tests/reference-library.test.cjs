const assert = require('node:assert/strict')

const {
  buildReferenceLibraryRequest,
  normalizeReferenceLibraryPage,
  toggleReferenceSelection,
} = require('../miniprogram/utils/reference-library.js')

assert.deepEqual(buildReferenceLibraryRequest({
  query: ' agent ', visualCategory: '架构图', researchDomain: '计算机', taskName: 'diagram', page: 3,
}), {
  action: 'referenceLibrary', scope: 'bench', query: 'agent', visualCategory: '架构图', researchDomain: '计算机', taskName: 'diagram', page: 3, pageSize: 12,
})

const page = normalizeReferenceLibraryPage({
  references: [{ id: 'ref_1', imageUrl: 'https://example/a.png' }],
  totalItems: 306, totalPages: 26, page: 2, pageSize: 12,
  facets: { visualCategories: [{ value: '架构图', count: 10 }], researchDomains: [{ value: '计算机', count: 20 }] },
  corpusVersion: 'zh-CN.v2',
})
assert.equal(page.references[0].id, 'ref_1')
assert.equal(page.totalItems, 306)
assert.equal(page.totalPages, 26)
assert.equal(page.page, 2)
assert.equal(page.corpusVersion, 'zh-CN.v2')

assert.deepEqual(toggleReferenceSelection(['ref_1'], 'ref_2', 10), { ids: ['ref_1', 'ref_2'], error: '' })
assert.deepEqual(toggleReferenceSelection(['ref_1', 'ref_2'], 'ref_1', 10), { ids: ['ref_2'], error: '' })
assert.match(toggleReferenceSelection(Array.from({ length: 10 }, (_, index) => `ref_${index}`), 'ref_10', 10).error, /10/)

console.log('reference-library.test.cjs passed')
