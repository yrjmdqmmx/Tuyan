import type { ModelProviderId } from './model-registry'

const keys: Partial<Record<ModelProviderId, string>> = {}

export function getApiKeys(): Record<string, string> {
  return { ...keys }
}

export function setApiKey(provider: ModelProviderId, value: string): void {
  const key = String(value || '').trim()
  if (key) keys[provider] = key
  else delete keys[provider]
}

export function replaceApiKeys(input: Record<string, string>): void {
  clearApiKeys()
  for (const [provider, value] of Object.entries(input)) {
    if (isProvider(provider)) setApiKey(provider, value)
  }
}

export function clearApiKeys(): void {
  for (const provider of Object.keys(keys)) delete keys[provider as ModelProviderId]
}

function isProvider(value: string): value is ModelProviderId {
  return value === 'gemini' || value === 'openai' || value === 'bailian' || value === 'ark' || value === 'openrouter'
}
