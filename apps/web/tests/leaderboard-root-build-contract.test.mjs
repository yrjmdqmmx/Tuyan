import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { build } from 'vite'

import config from '../vite.config.js'

test('root Vite build emits the standalone leaderboard methodology entry', async () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'paperbanana-root-build-'))
  try {
    await build({
      ...config,
      base: '/',
      logLevel: 'silent',
      build: { ...config.build, outDir: outputDir, emptyOutDir: true },
    })
    const methodologyEntry = join(outputDir, 'leaderboard/methodology/index.html')
    assert.equal(existsSync(methodologyEntry), true)
    const html = readFileSync(methodologyEntry, 'utf8')
    assert.match(html, /图研Tuyan 排行榜方法说明/u)
    assert.match(html, /src="\/assets\/[^"]+\.js"/u)
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }
})
