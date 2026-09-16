// Selection is relevance driven. Limits are ceilings, never target counts.
export function distinctReferenceCandidates<T extends { id: string; imageObjectKey?: string; imageUrl?: string; title?: string; summary?: string }>(items: T[]): T[] {
  const ids = new Set<string>(), images = new Set<string>(), descriptions = new Set<string>()
  return items.filter(item => {
    const image = item.imageObjectKey || String(item.imageUrl || '').split('?')[0]
    const description = `${item.title || ''} ${item.summary || ''}`.toLowerCase().replace(/[\s\p{P}]+/gu, '')
    if (!item.id || ids.has(item.id) || image && images.has(image) || description && descriptions.has(description)) return false
    ids.add(item.id); if (image) images.add(image); if (description) descriptions.add(description)
    return true
  })
}
export function relevantReferenceSelection<T extends { id: string; imageObjectKey?: string; imageUrl?: string; title?: string; summary?: string }>(answer: any, candidates: T[], limit: number): T[] {
  if (!Array.isArray(answer?.selections)) return []
  const byId = new Map(distinctReferenceCandidates(candidates).map(item => [item.id, item]))
  const contributions = new Set<string>(), ids = new Set<string>()
  return answer.selections.filter((row: any) => typeof row?.id === 'string' && byId.has(row.id)
    && typeof row.relevance === 'number' && row.relevance >= 0.6 && row.relevance <= 1
    && row.visualFit === true && typeof row.contribution === 'string' && row.contribution.trim())
    .sort((a: any, b: any) => b.relevance - a.relevance)
    .filter((row: any) => {
      const contribution = row.contribution.toLowerCase().replace(/[\s\p{P}]+/gu, '')
      if (ids.has(row.id) || contributions.has(contribution)) return false
      ids.add(row.id); contributions.add(contribution); return true
    }).slice(0, Math.max(0, limit)).map((row: any) => byId.get(row.id)!)
}
