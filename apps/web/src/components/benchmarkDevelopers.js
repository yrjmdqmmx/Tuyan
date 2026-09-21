import { modelDeveloper, modelDeveloperAliases, modelDeveloperName } from '../lib/modelPresentation.js'

// Resolve the developer from the reviewed workbench namespace/alias map. An API
// channel is never a developer fallback. Preserve each original record and ID.
export function benchmarkDeveloper(model) {
  const id = model.modelId || model.canonicalModelId || ''
  const namespace = modelDeveloper('', { id })
  const declared = modelDeveloper('', { id: '', vendor: model.developer })
  const conflict = namespace.id !== 'unconfirmed' && declared.id !== 'unconfirmed' && namespace.id !== declared.id
  return { id: conflict ? 'unconfirmed' : namespace.id !== 'unconfirmed' ? namespace.id : declared.id,
    original: model.developer || '', conflict }
}

export function benchmarkDeveloperName(model, locale = 'zh-CN') {
  return modelDeveloperName(benchmarkDeveloper(model).id, locale)
}

export function matchesBenchmarkModel(model, query = '', developer = '') {
  const resolved = benchmarkDeveloper(model)
  if (developer && resolved.id !== developer) return false
  const text = [model.displayName, model.modelId, model.canonicalModelId, resolved.original,
    ...modelDeveloperAliases(resolved.id)].join(' ').toLowerCase()
  // Search both human spacing and exact ID punctuation consistently in all views.
  const normalize = value => value.toLowerCase().replace(/[\s\/_:-]+/g, ' ').trim()
  return normalize(text).includes(normalize(query))
}

export function benchmarkDeveloperOptions(models, locale = 'zh-CN') {
  return [...new Set(models.map(model => benchmarkDeveloper(model).id))].sort()
    .map(id => ({ id, label: modelDeveloperName(id, locale) }))
}

// Profile identity keeps separate versions/channel runs individually selectable.
export const benchmarkRecordKey = model => model.profileId || model.modelId || model.canonicalModelId
