import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Gateway image includes the workspace knowledge package at install and runtime', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.match(dockerfile, /COPY packages\/tuyan-knowledge\/package\.json packages\/tuyan-knowledge\/package\.json/);
  assert.match(dockerfile, /COPY --chown=node:node packages\/tuyan-knowledge packages\/tuyan-knowledge/);
  assert.ok(
    dockerfile.indexOf('packages/tuyan-knowledge/package.json') < dockerfile.indexOf('pnpm install'),
    'workspace package manifest must exist before frozen install',
  );
});
