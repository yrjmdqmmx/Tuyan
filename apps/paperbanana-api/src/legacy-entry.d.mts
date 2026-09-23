import type { createUniversalRuntime } from './universal-adapters.js'
import type { LegacyHandler } from './server.js'

declare const handler: LegacyHandler
export function configureUniversalRuntime(runtime?: ReturnType<typeof createUniversalRuntime>): void
export function configureRuntimeFetch(fetchImpl?: typeof fetch): void
export function figureStudioTextProviders(): string[]
export function figureStudioTextModel(body: Record<string, any>, system: string, user: string, signal: AbortSignal): Promise<string>
export function callImageModel(
  provider: 'openrouter' | 'gemini' | 'openai' | 'bailian' | 'ark' | 'deepseek' | 'kimi' | 'zhipu' | 'siliconflow' | 'anthropic' | 'recraft' | 'xai' | 'bfl' | 'stability' | 'ideogram' | 'minimax' | 'mistral' | 'together' | 'fireworks' | 'fal' | 'replicate' | 'tokendance',
  model: string,
  apiKey: string,
  prompt: string,
  aspectRatio: string,
  sourceImage?: string,
  imageSize?: string,
  strictImageSize?: boolean,
  region?: 'cn' | 'global',
): Promise<string>
export function configureJobAdmission(config: {
  maxActive: number
  maxPending: number
  maxPerOwner: number
  maxPerIp: number
}): void
export function getJobAdmissionState(): {
  accepting: boolean
  active: number
  queued: number
  reserved: number
  tracked: number
}
export function stopJobAdmission(): void
export function drainJobAdmission(): Promise<void>
export function startAccountDeletionSweep(intervalMs?: number): void
export function stopAccountDeletionSweep(): void
export function configureAccountDeletionDataCleanup(cleanup: (userId: string) => Promise<void>): void
export default handler

export function configureProviderWorkflow(hooks: any): void
export function resumeTokenDanceJob(task: any): Promise<any>

export function requiresTokenDanceCredential(body: Record<string, any>): Promise<boolean>
