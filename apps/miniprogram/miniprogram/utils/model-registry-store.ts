import { requestJson } from './api'
import { normalizeModelRegistry, type ModelRegistry } from './model-registry'

export interface ModelRegistryState {
  registry: ModelRegistry | null
  loading: boolean
  error: string
}

type Listener = (state: ModelRegistryState) => void
let state: ModelRegistryState = { registry: null, loading: false, error: '' }
let currentRequest: Promise<ModelRegistryState> | null = null
const listeners = new Set<Listener>()

export function getModelRegistryState(): ModelRegistryState {
  return state
}

export function subscribeModelRegistry(listener: Listener): () => void {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

export function loadModelRegistry(force = false): Promise<ModelRegistryState> {
  if (!force && state.registry) return Promise.resolve(state)
  if (!force && currentRequest) return currentRequest
  setState({ ...state, loading: true, error: '' })
  currentRequest = requestJson<unknown>({ action: 'modelRegistry' }, { auth: false })
    .then((response) => {
      const registry = normalizeModelRegistry(response)
      setState({ registry, loading: false, error: '' })
      return state
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error || '模型目录不可用')
      setState({ registry: null, loading: false, error: message })
      return state
    })
    .finally(() => {
      currentRequest = null
    })
  return currentRequest
}

function setState(next: ModelRegistryState): void {
  state = next
  listeners.forEach((listener) => listener(state))
}
