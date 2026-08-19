import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReferencePageRequest, toggleReferenceSelection } from './referenceGallery.js'

test('gallery requests the bench corpus with server pagination and no taskName filter', () => {
  const request = buildReferencePageRequest({
    page: 3,
    query: 'attention',
    visualCategory: 'diagram',
    researchDomain: 'computer-vision',
  })
  assert.deepEqual(request, {
    scope: 'bench',
    page: 3,
    pageSize: 12,
    query: 'attention',
    visualCategory: 'diagram',
    researchDomain: 'computer-vision',
  })
  assert.equal('taskName' in request, false)
})

test('cross-page selection persists in order and is capped at ten unique references', () => {
  let selected = []
  for (let index = 1; index <= 10; index += 1) {
    selected = toggleReferenceSelection(selected, { id: `page-${index}`, titleZh: `案例 ${index}` })
  }
  assert.equal(selected.length, 10)
  assert.throws(() => toggleReferenceSelection(selected, { id: 'page-11' }), /最多选择 10 个/u)
  assert.deepEqual(toggleReferenceSelection(selected, { id: 'page-3' }).map((item) => item.id), [
    'page-1', 'page-2', 'page-4', 'page-5', 'page-6', 'page-7', 'page-8', 'page-9', 'page-10',
  ])
})
