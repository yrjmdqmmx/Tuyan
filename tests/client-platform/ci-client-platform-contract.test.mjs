import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Linux CI explicitly runs client-platform contracts and feasible mini-program and Android checks', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(workflow, /name: Run Linux-feasible client-platform contracts\s+run: node --test tests\/client-platform\/\*\.test\.mjs/);
  assert.match(workflow, /pnpm --filter @paperbanana\/miniprogram check/);
  assert.match(workflow, /node --test apps\/miniprogram\/tests\/\*\.test\.cjs/);
  assert.match(workflow, /pnpm --filter @paperbanana\/android typecheck/);
  assert.match(workflow, /node --test apps\/android\/tests\/\*\.test\.mjs/);
});
