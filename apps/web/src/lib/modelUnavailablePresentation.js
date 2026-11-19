import { removedModel, removedModelHint, modelDisplayName as catalogModelDisplayName } from './modelAudit.js'
import { STATIC_MODEL_REGISTRY } from './staticModelCatalog.js'
import { modelCardName } from './modelCardSpecifications.js'

// Display names only; exact IDs continue to drive selection and persistence.
export function modelDisplayName(provider, id, registry) {
  const auditedName = catalogModelDisplayName(provider, id)
  if (auditedName !== id || removedModel(provider, id)) return auditedName
  const model = registry?.providers?.[provider]?.models?.find(m => m.id === id)
    || STATIC_MODEL_REGISTRY[provider]?.models.find(m => m.id === id)
  const name = modelCardName(provider, model || { id })
  return name === id ? catalogModelDisplayName(provider, id) : name
}

export function unavailableModelHint(provider, id, registry) {
  return removedModelHint(provider, id)
}

export function modelLifecycleMessage(provider, lifecycle) {
  return lifecycle?.replacement ? lifecycle.message.replace(lifecycle.replacement, modelDisplayName(provider, lifecycle.replacement)) : lifecycle?.message
}
