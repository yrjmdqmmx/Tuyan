import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const generator = readFileSync(new URL('../scripts/generate-runtime-secrets.sh', import.meta.url), 'utf8');

test('the Mongo entrypoint user can read its root password file', () => {
  assert.match(generator, /chown 0:999 "\$secret_dir\/mongo-root-password"/);
  assert.match(generator, /chmod 0440 "\$secret_dir\/mongo-root-password"/);
});
