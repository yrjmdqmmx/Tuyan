import test from 'node:test'
import assert from 'node:assert/strict'
import { dockerLayout, checkDockerBundles } from './check-docker-bundles.mjs'
test('Docker COPY destinations follow WORKDIR, multiple sources, flags and stage boundaries', () => {
  const layout = dockerLayout('FROM node AS build\nWORKDIR /workspace\nCOPY a b ./rules/\nWORKDIR apps/core\nCOPY --chown=node:node src ./src\nRUN pnpm --filter @paperbanana/core build\nFROM node\nCOPY ignored /app')
  assert.deepEqual(layout.copies, [{ sources: ['a', 'b'], destination: '/workspace/rules', directory: true }, { sources: ['src'], destination: '/workspace/apps/core/src', directory: false }])
  assert.deepEqual(layout.builds, ['@paperbanana/core'])
})
test('Core, benchmark worker and Gateway imports resolve using only actual Docker COPY layouts', () => {
  const results = checkDockerBundles()
  assert.equal(results.length, 3)
  assert.deepEqual(results.map(row => row.builds.reduce((n, build) => n + build.bundles, 0)), [4, 16, 1])
})
