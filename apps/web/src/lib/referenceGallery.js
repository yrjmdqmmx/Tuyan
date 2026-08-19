export const REFERENCE_PAGE_SIZE = 12
export const REFERENCE_SELECTION_LIMIT = 10

export function buildReferencePageRequest({ page = 1, query = '', visualCategory = '', researchDomain = '' } = {}) {
  return {
    scope: 'bench',
    page: Math.max(1, Number(page) || 1),
    pageSize: REFERENCE_PAGE_SIZE,
    query: String(query || '').trim(),
    visualCategory: String(visualCategory || ''),
    researchDomain: String(researchDomain || ''),
  }
}

export function toggleReferenceSelection(selected, item) {
  const current = selected || []
  const index = current.findIndex((entry) => entry.id === item.id)
  if (index >= 0) return current.filter((_, itemIndex) => itemIndex !== index)
  if (current.length >= REFERENCE_SELECTION_LIMIT) throw new Error(`最多选择 ${REFERENCE_SELECTION_LIMIT} 个参考案例`)
  return [...current, item]
}

export function paginationItems(page, totalPages) {
  const total = Math.max(1, Number(totalPages) || 1)
  const current = Math.min(total, Math.max(1, Number(page) || 1))
  const pages = new Set([1, total, current - 1, current, current + 1])
  return [...pages].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b)
}
