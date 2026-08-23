export interface ReferenceLibraryQuery {
  query?: string
  visualCategory?: string
  researchDomain?: string
  taskName?: 'diagram' | 'plot' | string
  page?: number
}

export interface ReferenceLibraryItem {
  id: string
  title: string
  summary: string
  imageUrl: string
  taskName: string
  visualCategory: string
  researchDomain: string
}

export interface ReferenceFacet { value: string; count: number }
export interface ReferenceLibraryPage {
  references: ReferenceLibraryItem[]
  totalItems: number
  totalPages: number
  page: number
  pageSize: number
  facets: { visualCategories: ReferenceFacet[]; researchDomains: ReferenceFacet[] }
  corpusVersion: string
}

export function buildReferenceLibraryRequest(query: ReferenceLibraryQuery): Record<string, unknown> {
  return {
    action: 'referenceLibrary',
    scope: 'bench',
    query: String(query.query || '').trim(),
    visualCategory: String(query.visualCategory || '').trim(),
    researchDomain: String(query.researchDomain || '').trim(),
    taskName: query.taskName === 'plot' ? 'plot' : 'diagram',
    page: positiveInteger(query.page, 1),
    pageSize: 12,
  }
}

export function normalizeReferenceLibraryPage(input: unknown): ReferenceLibraryPage {
  const source = record(input)
  const references = Array.isArray(source.references) ? source.references.map(normalizeReferenceItem) : []
  const pageSize = positiveInteger(source.pageSize, 12)
  const totalItems = nonNegativeInteger(source.totalItems, references.length)
  const totalPages = positiveInteger(source.totalPages, Math.max(1, Math.ceil(totalItems / pageSize)))
  const facets = record(source.facets)
  return {
    references,
    totalItems,
    totalPages,
    page: Math.min(positiveInteger(source.page, 1), totalPages),
    pageSize,
    facets: {
      visualCategories: normalizeFacets(facets.visualCategories),
      researchDomains: normalizeFacets(facets.researchDomains),
    },
    corpusVersion: text(source.corpusVersion),
  }
}

export function toggleReferenceSelection(ids: string[], id: string, limit: number): { ids: string[]; error: string } {
  const normalizedId = id.trim()
  if (!normalizedId) return { ids: [...ids], error: '参考图片无效。' }
  if (ids.includes(normalizedId)) return { ids: ids.filter((value) => value !== normalizedId), error: '' }
  if (ids.length >= limit) return { ids: [...ids], error: `最多选择 ${limit} 个参考案例。` }
  return { ids: [...ids, normalizedId], error: '' }
}

function normalizeReferenceItem(input: unknown): ReferenceLibraryItem {
  const item = record(input)
  return {
    id: text(item.id) || text(item._id),
    title: text(item.titleZh) || text(item.title) || text(item.visualIntent),
    summary: text(item.shortIntroZh) || text(item.summary) || text(item.content),
    imageUrl: text(item.imageUrl) || text(item.image_url) || text(item.url),
    taskName: text(item.taskName) || text(item.task_name) || 'diagram',
    visualCategory: text(item.visualCategory),
    researchDomain: text(item.researchDomain),
  }
}

function normalizeFacets(input: unknown): ReferenceFacet[] {
  if (!Array.isArray(input)) return []
  return input.map((value) => {
    const facet = record(value)
    return { value: text(facet.value) || text(facet.label), count: nonNegativeInteger(facet.count, 0) }
  }).filter((facet) => Boolean(facet.value))
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function positiveInteger(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : fallback
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : fallback
}
