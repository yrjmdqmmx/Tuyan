import { pathToFileURL } from 'node:url'

const recommendationPolicy = [
  { id: 'openai/gpt-5.6-sol', catalog: 'text' as const },
  { id: 'sourceful/riverflow-v2.5-pro', catalog: 'image' as const },
  { id: 'google/gemini-3.7-flash', catalog: 'text' as const },
]

type CatalogModel = string | { id?: string; supported_parameters?: any }

function catalogModelId(model: CatalogModel) {
  return typeof model === 'string' ? model : String(model?.id || '')
}

export function hasExplicitPngOrSvgOutputFormat(model: CatalogModel) {
  if (typeof model === 'string') return false
  const values = model?.supported_parameters?.output_format?.values
  return Array.isArray(values) && values.some((value: any) => ['png', 'svg'].includes(String(value).trim().toLowerCase()))
}

export function buildOpenRouterDriftReport(textModels: CatalogModel[], imageModels: CatalogModel[]) {
  const textById = new Map<string, CatalogModel>(
    textModels.map((model): [string, CatalogModel] => [catalogModelId(model), model]).filter(([id]) => Boolean(id)),
  )
  const imageById = new Map<string, CatalogModel>(
    imageModels.map((model): [string, CatalogModel] => [catalogModelId(model), model]).filter(([id]) => Boolean(id)),
  )
  const catalog = new Set([...textById.keys(), ...imageById.keys()])
  const recommendedModelIds = recommendationPolicy.map(({ id }) => id)
  const recommendations = new Set(recommendedModelIds)
  const missingRecommendations = recommendationPolicy
    .filter(({ id, catalog }) => !(catalog === 'image' ? imageById : textById).has(id))
    .map(({ id }) => id)
  const nonRuntimeSelectableRecommendations = recommendationPolicy
    .filter(({ id, catalog }) => catalog === 'image' && imageById.has(id) && !hasExplicitPngOrSvgOutputFormat(imageById.get(id)!))
    .map(({ id }) => id)
  const unreviewedCatalogAdditions = [...catalog].filter((id) => !recommendations.has(id)).sort()
  return {
    checkedAt: new Date().toISOString(),
    status: missingRecommendations.length || nonRuntimeSelectableRecommendations.length ? 'warning' : 'ok',
    catalogCounts: { text: textModels.length, image: imageModels.length, unique: catalog.size },
    recommendations: [...recommendedModelIds],
    missingRecommendations,
    nonRuntimeSelectableRecommendations,
    unreviewedCatalogAdditions,
    autoPromotions: [] as string[],
    policy: 'Report only. Catalog additions require human review before recommendation.',
  }
}

async function fetchCatalog(url: string) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  const data: any = await response.json()
  return Array.isArray(data?.data) ? data.data : []
}

async function main() {
  const [textModels, imageModels] = await Promise.all([
    fetchCatalog('https://openrouter.ai/api/v1/models'),
    fetchCatalog('https://openrouter.ai/api/v1/images/models'),
  ])
  const report = buildOpenRouterDriftReport(textModels, imageModels)
  console.log(JSON.stringify(report, null, 2))
  if (report.missingRecommendations.length) {
    console.warn(`OpenRouter recommendation drift: ${report.missingRecommendations.join(', ')}`)
  }
  if (report.nonRuntimeSelectableRecommendations.length) {
    console.warn(`OpenRouter recommendations are not runtime-selectable: ${report.nonRuntimeSelectableRecommendations.join(', ')}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.warn(`OpenRouter drift check could not complete: ${error?.message || String(error)}`)
  })
}
