import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../../../.github/workflows/deploy-hk.yml', import.meta.url), 'utf8');

test('deployment stages the image lock outside the checkout before installing it', () => {
  assert.match(workflow, /REMOTE_LOCK="\/tmp\/paperbanana-image-lock-\$\{GITHUB_RUN_ID\}"/);
  assert.match(workflow, /scp\s+"\$image_lock"\s+"\$DEPLOY_USER@\$DEPLOY_HOST:\$REMOTE_LOCK"/);
  assert.match(workflow, /git checkout --detach '\$\{GITHUB_SHA\}'[\s\S]*install -m 0600 '\$REMOTE_LOCK' deploy\/hk-single-host\/\.env/);
  assert.doesNotMatch(workflow, /scp\s+"\$image_lock"[^\n]*\/opt\/paperbanana\/repo\/deploy\/hk-single-host/);
});
