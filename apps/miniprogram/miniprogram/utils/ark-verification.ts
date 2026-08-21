import { arkVerificationKey, type ArkProbe } from './model-routing'

const verification: Record<string, string> = {}

export function getArkVerification(): Record<string, string> { return { ...verification } }
export function setArkProbeResults(results: Array<{ role?: string; modelId?: string; state?: string }>): void {
  for (const result of results) {
    if ((result.role === 'main' || result.role === 'image' || result.role === 'vision') && result.modelId) {
      verification[arkVerificationKey({ role: result.role, modelId: result.modelId } as ArkProbe)] = result.state === 'verified' ? 'verified' : 'failed'
    }
  }
}
export function clearArkVerification(): void { for (const key of Object.keys(verification)) delete verification[key] }
