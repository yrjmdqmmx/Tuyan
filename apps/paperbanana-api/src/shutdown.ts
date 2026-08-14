import type { ServiceLogger } from './server.js'

type ClosableServer = {
  close(callback: (error?: Error) => void): void
}

export function createGracefulShutdown({
  server,
  stopAdmission,
  drainJobs,
  closeRuntime,
  logger,
  forceExit,
}: {
  server: ClosableServer
  stopAdmission(): void
  drainJobs(): Promise<void>
  closeRuntime(): Promise<void>
  logger: ServiceLogger
  forceExit(code: number): void
}) {
  let completion: Promise<void> | undefined

  return function shutdown(signal: string): Promise<void> {
    if (completion) {
      logger.warn('second shutdown signal received; forcing exit', { signal })
      forceExit(1)
      return completion
    }

    logger.info('shutdown requested', { signal })
    // This is synchronous so no request can reserve a new job in the gap
    // before the listening socket stops accepting traffic.
    stopAdmission()
    completion = (async () => {
      let failure: unknown
      try {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve())
        })
      } catch (error) {
        failure = error
      }
      try {
        await drainJobs()
      } catch (error) {
        failure ||= error
      }
      try {
        await closeRuntime()
      } catch (error) {
        failure ||= error
      }
      if (failure) throw failure
    })()
    return completion
  }
}
