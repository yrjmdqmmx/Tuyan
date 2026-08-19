import { pathToFileURL } from 'node:url'

const recommendedModelIds = [
  'openai/gpt-5.5',
  'openai/gpt-image-2',
  'google/gemini-3.6-flash',
]

export function buildOpenRouterDriftReport(textModelIds: string[], imageModelIds: string[]) {
  const catalog = new Set([...textModelIds, ...imageModelIds].map(String).filter(Boolean))
  const recommendations = new Set(recommendedModelIds)
  const missingRecommendations = recommendedModelIds.filter((id) => !catalog.has(id))
  const unreviewedCatalogAdditions = [...catalog].filter((id) => !recommendations.has(id)).sort()
  return {
    checkedAt: new Date().toISOString(),
    status: missingRecommendations.length ? 'warning' : 'ok',
    catalogCounts: { text: textModelIds.length, image: imageModelIds.length, unique: catalog.size },
    recommendations: [...recommendedModelIds],
    missingRecommendations,
    unreviewedCatalogAdditions,
    autoPromotions: [] as string[],
    policy: 'Report only. Catalog additions require human review before recommendation.',
  }
}

async function fetchCatalogIds(url: string) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  const data: any = await response.json()
  return Array.isArray(data?.data) ? data.data.map((model: any) => String(model?.id || '')).filter(Boolean) : []
}

async function main() {
  const [textModelIds, imageModelIds] = await Promise.all([
    fetchCatalogIds('https://openrouter.ai/api/v1/models'),
    fetchCatalogIds('https://openrouter.ai/api/v1/images/models'),
  ])
  const report = buildOpenRouterDriftReport(textModelIds, imageModelIds)
  console.log(JSON.stringify(report, null, 2))
  if (report.missingRecommendations.length) {
    console.warn(`OpenRouter recommendation drift: ${report.missingRecommendations.join(', ')}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.warn(`OpenRouter drift check could not complete: ${error?.message || String(error)}`)
  })
}
