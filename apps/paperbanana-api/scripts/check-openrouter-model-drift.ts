import { pathToFileURL } from 'node:url'

const recommendationPolicy = [
  { id: 'openai/gpt-5.6-sol', catalog: 'text' as const },
  { id: 'sourceful/riverflow-v2.5-pro', catalog: 'image' as const },
  { id: 'google/gemini-3.7-flash', catalog: 'text' as const },
]

export const openRouterNormalizedImageProfileIds = [
  'bytedance-seed/seedream-4.5',
  'bytedance-seed/seedream-5-0-lite',
  'bytedance-seed/seedream-5-0-pro',
  'google/gemini-2.5-flash-image',
  'google/gemini-3-pro-image',
  'google/gemini-3-pro-image-preview',
  'google/gemini-3.1-flash-image',
  'google/gemini-3.1-flash-image-preview',
  'google/gemini-3.1-flash-lite-image',
  'krea/krea-2-large',
  'krea/krea-2-medium',
  'krea/krea-2-medium-turbo',
  'microsoft/mai-image-2.5',
  'microsoft/mai-image-2.5-pro',
  'openai/gpt-5-image',
  'openai/gpt-5-image-mini',
  'openai/gpt-5.4-image-2',
  'openai/gpt-image-1',
  'openai/gpt-image-1-mini',
  'openai/gpt-image-2',
  'qwen/qwen-image-3',
  'qwen/qwen-image-3-pro',
  'recraft/recraft-v3',
  'recraft/recraft-v4',
  'recraft/recraft-v4-pro',
  'recraft/recraft-v4.1',
  'recraft/recraft-v4.1-pro',
  'recraft/recraft-v4.1-utility',
  'recraft/recraft-v4.1-utility-pro',
  'sourceful/riverflow-v2-fast',
  'sourceful/riverflow-v2-pro',
  'sourceful/riverflow-v2.5-fast',
  'x-ai/grok-imagine-image-2.0',
  'x-ai/grok-imagine-image-quality',
] as const

const openRouterNormalizedImageProfiles = new Set<string>(openRouterNormalizedImageProfileIds)
const openRouterNormalizedImageMinimumResolutions = new Map<string, string[]>([
  ['bytedance-seed/seedream-4.5', ['2K', '4K']],
])

type CatalogModel = string | { id?: string; supported_parameters?: any }

function catalogModelId(model: CatalogModel) {
  return typeof model === 'string' ? model : String(model?.id || '')
}

export function hasExplicitPngOrSvgOutputFormat(model: CatalogModel) {
  if (typeof model === 'string') return false
  const values = model?.supported_parameters?.output_format?.values
  return Array.isArray(values) && values.some((value: any) => ['png', 'svg'].includes(String(value).trim().toLowerCase()))
}

export function isRuntimeSelectableImageModel(model: CatalogModel) {
  const id = catalogModelId(model)
  return hasExplicitPngOrSvgOutputFormat(model) || openRouterNormalizedImageProfiles.has(id)
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
    .filter(({ id, catalog }) => catalog === 'image' && imageById.has(id) && !isRuntimeSelectableImageModel(imageById.get(id)!))
    .map(({ id }) => id)
  const missingNormalizedImageProfiles = openRouterNormalizedImageProfileIds
    .filter((id) => !imageById.has(id))
  const degradedNormalizedImageProfiles = [...openRouterNormalizedImageMinimumResolutions]
    .filter(([id, accepted]) => {
      const model = imageById.get(id)
      if (!model || typeof model === 'string') return false
      const values = model.supported_parameters?.resolution?.values
      return !Array.isArray(values) || !values.some((value: any) => accepted.includes(String(value)))
    })
    .map(([id]) => id)
  const unreviewedCatalogAdditions = [...catalog].filter((id) => !recommendations.has(id)).sort()
  return {
    checkedAt: new Date().toISOString(),
    status: missingRecommendations.length || nonRuntimeSelectableRecommendations.length || missingNormalizedImageProfiles.length || degradedNormalizedImageProfiles.length ? 'warning' : 'ok',
    catalogCounts: { text: textModels.length, image: imageModels.length, unique: catalog.size },
    recommendations: [...recommendedModelIds],
    missingRecommendations,
    nonRuntimeSelectableRecommendations,
    missingNormalizedImageProfiles,
    degradedNormalizedImageProfiles,
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
  if (report.missingNormalizedImageProfiles.length) {
    console.warn(`OpenRouter paid-verified normalization profiles disappeared: ${report.missingNormalizedImageProfiles.join(', ')}`)
  }
  if (report.degradedNormalizedImageProfiles.length) {
    console.warn(`OpenRouter paid-verified normalization capabilities degraded: ${report.degradedNormalizedImageProfiles.join(', ')}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.warn(`OpenRouter drift check could not complete: ${error?.message || String(error)}`)
  })
}
