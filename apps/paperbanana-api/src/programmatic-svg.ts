import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker } from 'node:worker_threads'

/** Dedicated bounded renderer for fixed scientific plots and mixed compositions.
 * Does not change the stricter model-generated SVG review policy.
 * Bounds apply to the exact source and the real raster, never a truncated proxy. */
export const PROGRAMMATIC_SVG_LIMITS = Object.freeze({
  maxBytes: 5 * 1024 * 1024,
  maxEdge: 4096,
  maxPixels: 8_000_000,
  maxElements: 20_000,
  maxDepth: 64,
  maxAttributes: 80,
  maxExpandedElements: 50_000,
  maxTextCharacters: 100_000,
  maxWasmMemoryBytes: 256 * 1024 * 1024,
  timeoutMs: 15_000,
  maxConcurrent: 2,
  maxQueued: 12,
})

export interface ProgrammaticSvgRender {
  svg: string
  svgHash: string
  png: Buffer
  pngHash: string
  width: number
  height: number
  codeIssues: string[]
  renderer: string
  fontInfo: {
    families: string[]
    sha256: Record<string, string>
    requestedFamilies: string[]
  }
}

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')

function workerPath(): string {
  // The existing server bundle replaces import.meta.url for benchmark code. CWD
  // roots intentionally come first so CJS/temp fixture bundles use packaged assets.
  const candidates = [
    path.resolve(process.cwd(), 'assets/svg-review/programmatic-worker.cjs'),
    path.resolve(process.cwd(), 'apps/paperbanana-api/assets/svg-review/programmatic-worker.cjs'),
  ]
  if (import.meta.url?.startsWith('file:')) {
    candidates.push(fileURLToPath(new URL('../assets/svg-review/programmatic-worker.cjs', import.meta.url)))
  }
  const located = candidates.find(candidate => existsSync(candidate))
  if (!located) throw new Error('PROGRAMMATIC_SVG_RUNTIME_UNAVAILABLE: packaged SVG renderer/fonts are missing')
  return located
}

let active = 0
const queue: Array<() => void> = []

async function acquireSlot(): Promise<() => void> {
  if (active >= PROGRAMMATIC_SVG_LIMITS.maxConcurrent) {
    if (queue.length >= PROGRAMMATIC_SVG_LIMITS.maxQueued) throw new Error('PROGRAMMATIC_SVG_BUSY: renderer queue is full')
    await new Promise<void>((resolve, reject) => {
      const enter = () => { clearTimeout(timer); resolve() }
      const timer = setTimeout(() => {
        const index = queue.indexOf(enter)
        if (index >= 0) queue.splice(index, 1)
        reject(new Error('PROGRAMMATIC_SVG_TIMEOUT: waiting for a renderer slot'))
      }, PROGRAMMATIC_SVG_LIMITS.timeoutMs)
      queue.push(enter)
    })
  } else {
    active++
  }
  return () => {
    const next = queue.shift()
    if (next) next()
    else active--
  }
}

/** Does not certify visual quality. codeIssues are structural hints for the critic. */
export async function renderProgrammaticSvg(svg: string): Promise<ProgrammaticSvgRender> {
  if (typeof svg !== 'string' || !svg.trim() || Buffer.byteLength(svg, 'utf8') > PROGRAMMATIC_SVG_LIMITS.maxBytes) {
    throw new Error('PROGRAMMATIC_SVG_SIZE: SVG must contain 1–5242880 UTF-8 bytes')
  }
  const filename = workerPath()
  const release = await acquireSlot()
  let worker: Worker | undefined
  try {
    const rendered = await new Promise<Omit<ProgrammaticSvgRender, 'svg' | 'svgHash' | 'pngHash'>>((resolve, reject) => {
      worker = new Worker(filename, {
        workerData: { svg, limits: PROGRAMMATIC_SVG_LIMITS },
        // V8 heap/stack bound in addition to source, geometry and wall-time caps.
        // The worker also gives the WASM module a real 256MiB memory maximum.
        // Neither limit is a total-process RSS/OS sandbox limit.
        resourceLimits: { maxOldGenerationSizeMb: 192, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 },
        execArgv: [],
      })
      const timeout = setTimeout(() => {
        finish(new Error('PROGRAMMATIC_SVG_TIMEOUT: SVG parsing/rendering exceeded 15000ms'))
        void worker?.terminate()
      }, PROGRAMMATIC_SVG_LIMITS.timeoutMs)
      let settled = false
      const finish = (error?: Error, result?: Omit<ProgrammaticSvgRender, 'svg' | 'svgHash' | 'pngHash'>) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (error) reject(error)
        else resolve(result!)
      }
      worker.once('message', message => {
        if (!message?.ok) {
          finish(new Error(typeof message?.error === 'string' ? message.error : 'PROGRAMMATIC_SVG_RENDER_FAILED'))
          return
        }
        const png = Buffer.from(message.png)
        if (!Number.isSafeInteger(message.width) || !Number.isSafeInteger(message.height)
          || message.width < 1 || message.height < 1
          || message.width > PROGRAMMATIC_SVG_LIMITS.maxEdge || message.height > PROGRAMMATIC_SVG_LIMITS.maxEdge
          || message.width * message.height > PROGRAMMATIC_SVG_LIMITS.maxPixels
          || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
          finish(new Error('PROGRAMMATIC_SVG_RENDER_FAILED: invalid renderer output'))
          return
        }
        finish(undefined, { png, width: message.width, height: message.height,
          codeIssues: message.codeIssues, renderer: message.renderer, fontInfo: message.fontInfo })
      })
      worker.once('error', error => {
        const code = (error as Error & { code?: string }).code === 'ERR_WORKER_OUT_OF_MEMORY'
          ? 'PROGRAMMATIC_SVG_RESOURCE_LIMIT' : 'PROGRAMMATIC_SVG_RENDER_FAILED'
        finish(new Error(`${code}: ${error.message}`))
      })
      worker.once('exit', code => finish(new Error(`PROGRAMMATIC_SVG_RENDER_FAILED: worker exited (${code}) before returning a raster`)))
    })
    return { ...rendered, svg, svgHash: sha256(svg), pngHash: sha256(rendered.png) }
  } finally {
    // Wait for termination before releasing capacity; a timed-out worker cannot
    // continue consuming CPU while new work enters the slot.
    if (worker) await worker.terminate()
    release()
  }
}
