import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { finished } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const bridge = fileURLToPath(new URL('../../../../scripts/figures/render-json.py', import.meta.url))

export async function renderPlot(wire: unknown) {
  const python = process.env.TUYAN_QA_PYTHON || 'python3'
  const child = spawn(python, [bridge])
  const output: Buffer[] = []
  const errors: Buffer[] = []
  child.stdout.on('data', (chunk: Buffer) => output.push(chunk))
  child.stderr.on('data', (chunk: Buffer) => errors.push(chunk))
  const completion = Promise.all([once(child, 'close'), finished(child.stdin)])
  child.stdin.end(JSON.stringify(wire))
  const [[code, signal]] = await completion
  if (code !== 0) throw new Error(`Plot worker exited with ${signal ?? code}: ${Buffer.concat(errors).toString()}`)
  return JSON.parse(Buffer.concat(output).toString())
}
