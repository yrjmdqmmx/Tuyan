import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Linux CI explicitly runs retained client-platform and mini-program checks', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(workflow, /name: Run retained client-platform contracts\s+run: node --test tests\/client-platform\/\*\.test\.mjs/);
  assert.match(workflow, /pnpm --filter @paperbanana\/miniprogram check/);
  assert.match(workflow, /node --test apps\/miniprogram\/tests\/\*\.test\.cjs/);
  assert.doesNotMatch(workflow, /@paperbanana\/android|apps\/android|xcodebuild|dotnet build/);
});
