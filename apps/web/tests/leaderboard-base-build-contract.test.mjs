import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { build } from 'vite'

import config from '../vite.config.js'

function builtScript(outputDir, relativeHtml) {
  const html = readFileSync(join(outputDir, relativeHtml), 'utf8')
  const source = html.match(/<script[^>]+src="(\/paperbanana\/assets\/[^"]+\.js)"/u)?.[1]
  assert.ok(source, `${relativeHtml} should load a base-prefixed JavaScript entry`)
  return readFileSync(join(outputDir, source.slice('/paperbanana/'.length)), 'utf8')
}

test('non-root Vite build keeps every leaderboard entry and runtime fallback under BASE_URL', async () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'paperbanana-base-build-'))
  try {
    await build({
      ...config,
      base: '/paperbanana/',
      logLevel: 'silent',
      build: { ...config.build, outDir: outputDir, emptyOutDir: true },
    })
    for (const relativeHtml of [
      '404.html',
      'bench/index.html',
      'leaderboard/index.html',
      'leaderboard/methodology/index.html',
      'leaderboard/faithfulness/index.html',
      'leaderboard/conciseness/index.html',
      'leaderboard/readability/index.html',
      'leaderboard/aesthetics/index.html',
      'leaderboard/text-accuracy/index.html',
      'leaderboard/topology/index.html',
      'leaderboard/instruction-adherence/index.html',
      'leaderboard/submit-prompt/index.html',
      'leaderboard/admin/prompt-submissions/index.html',
    ]) builtScript(outputDir, relativeHtml)

    assert.match(builtScript(outputDir, 'leaderboard/index.html'), /(?:\/paperbanana\/|appPaths-)/u)
    assert.match(builtScript(outputDir, 'leaderboard/methodology/index.html'), /(?:\/paperbanana\/|appPaths-)/u)
    assert.match(builtScript(outputDir, '404.html'), /(?:\/paperbanana\/|appPaths-)/u)
    const runtime = readdirSync(join(outputDir, 'assets'))
      .filter((name) => name.endsWith('.js'))
      .map((name) => readFileSync(join(outputDir, 'assets', name), 'utf8'))
      .join('\n')
    assert.match(runtime, /\/paperbanana\//u)
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }
})
