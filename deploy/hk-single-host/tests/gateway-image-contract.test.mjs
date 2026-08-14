import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const dockerfile = readFileSync(new URL('../../../apps/auth-gateway/Dockerfile', import.meta.url), 'utf8');

test('the read-only gateway image starts Node without a runtime Corepack download', () => {
  assert.match(dockerfile, /CMD \["node", "src\/server\.js"\]/);
  assert.doesNotMatch(dockerfile, /CMD \["pnpm", "start"\]/);
});
