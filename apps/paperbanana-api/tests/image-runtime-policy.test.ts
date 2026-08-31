import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('benchmark image runtime keeps bounded PNG JPEG and WebP buffer decoding available', () => {
  const script = String.raw`
    import sharp from 'sharp'

    const inputs = {
      png: await sharp({ create: { width: 16, height: 9, channels: 4, background: '#123456' } }).png().toBuffer(),
      jpeg: await sharp({ create: { width: 16, height: 9, channels: 3, background: '#654321' } }).jpeg().toBuffer(),
      webp: await sharp({ create: { width: 16, height: 9, channels: 4, background: '#abcdef' } }).webp().toBuffer(),
    }

    sharp.block({ operation: ['VipsForeignLoad'] })
    sharp.unblock({ operation: ['VipsForeignLoadWebpBuffer'] })
    const { enableScientificBenchmarkRasterDecoders } = await import('./src/image-runtime-sharp-policy.ts')
    enableScientificBenchmarkRasterDecoders()

    for (const [format, bytes] of Object.entries(inputs)) {
      const metadata = await sharp(bytes, { failOn: 'error', limitInputPixels: 1_000_000 }).metadata()
      if (metadata.format !== format || metadata.width !== 16 || metadata.height !== 9) {
        throw new Error('IMAGE_RUNTIME_RASTER_POLICY_MISMATCH')
      }
    }

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"><rect width="16" height="9"/></svg>')
    let svgBlocked = false
    try { await sharp(svg).metadata() } catch { svgBlocked = true }
    if (!svgBlocked) throw new Error('IMAGE_RUNTIME_SVG_MUST_REMAIN_BLOCKED')
  `
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: packageRoot,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
})
