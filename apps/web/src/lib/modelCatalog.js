import { fetchBackendHealth, modelRegistryRequest } from '@paperbanana/api';
import { presentRegistryModel, sortModelsNewestFirst } from './modelPresentation.js';

/** One presentation path for every Web consumer of the server catalog. */
export function presentModelCatalog(registry) {
  return {
    ...registry,
    providers: Object.fromEntries(Object.entries(registry.providers || {}).map(([id, entry]) => [id, {
      ...entry,
      models: sortModelsNewestFirst(entry.models.map((model) => presentRegistryModel(id, model))),
    }])),
  };
}

export async function loadPresentedModelRegistry(apiBase, health) {
  const backend = health || await fetchBackendHealth(apiBase);
  return presentModelCatalog(await modelRegistryRequest(apiBase, backend));
}
