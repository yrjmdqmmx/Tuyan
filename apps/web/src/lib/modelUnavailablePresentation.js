import { removedModel } from './modelAudit.js'
import { STATIC_MODEL_REGISTRY } from './staticModelCatalog.js'
import { modelCardName } from './modelCardSpecifications.js'

// Display names only; exact IDs continue to drive selection and persistence.
export function modelDisplayName(provider, id, registry) {
  const model = registry?.providers?.[provider]?.models?.find(m => m.id === id)
    || STATIC_MODEL_REGISTRY[provider]?.models.find(m => m.id === id)
  return modelCardName(provider, model || { id })
}

export function unavailableModelHint(provider, id, registry) {
  const removed = removedModel(provider, id)
  return removed ? `原型号已不可用，请重新选择${removed.replacementApiId ? `。推荐：${modelDisplayName(provider, removed.replacementApiId, registry)}` : ''}` : ''
}

export function modelLifecycleMessage(provider, lifecycle) {
  return lifecycle?.replacement ? lifecycle.message.replace(lifecycle.replacement, modelDisplayName(provider, lifecycle.replacement)) : lifecycle?.message
}
