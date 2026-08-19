export function mergeProviderRegistry(fallback, registry) {
  if (!registry?.defaults || !Array.isArray(registry.models)) return fallback

  const optionsForRole = (role) => registry.models
    .filter((model) => Array.isArray(model.roles) && model.roles.includes(role))
    .map((model) => [model.id, model.label || model.id])

  const mainModels = optionsForRole('main')
  const imageModels = optionsForRole('image')
  const visionModels = optionsForRole('vision')
  if (!mainModels.length || !imageModels.length || !visionModels.length) return fallback

  return {
    ...fallback,
    mainModel: registry.defaults.main || mainModels[0][0],
    imageModel: registry.defaults.image || imageModels[0][0],
    visionModel: registry.defaults.vision || visionModels[0][0],
    mainModels,
    imageModels,
    visionModels,
    registryModels: registry.models,
  }
}

export function uniqueRegistryModels(models) {
  const seen = new Set()
  return (models || []).filter((model) => {
    const key = `${model?.id || ''}\n${model?.protocol || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
