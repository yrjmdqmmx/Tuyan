import type { LegacyHandler } from './server.js'

declare const handler: LegacyHandler
export function configureRuntimeFetch(fetchImpl?: typeof fetch): void
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
export default handler
