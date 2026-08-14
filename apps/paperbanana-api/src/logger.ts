import { redactLogValue } from './redaction.js'
import type { ServiceLogger } from './server.js'

type Sink = (line: string) => void

export function createLogger(
  sink: Sink = (line) => process.stdout.write(`${line}\n`),
): ServiceLogger {
  function write(level: string, message: string, fields?: unknown) {
    sink(JSON.stringify(redactLogValue({
      timestamp: new Date().toISOString(),
      level,
      message,
      fields,
    })))
  }

  return {
    info(message, fields) { write('info', message, fields) },
    warn(message, fields) { write('warn', message, fields) },
    error(message, fields) { write('error', message, fields) },
  }
}
