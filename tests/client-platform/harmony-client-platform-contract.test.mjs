import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Harmony create and feedback requests share the exact harmony platform constant', () => {
  const payload = read('apps/harmony/Stage/src/main/ets/utils/Payload.ets');
  const api = read('apps/harmony/Stage/src/main/ets/services/ApiClient.ets');
  assert.match(payload, /export const CLIENT_PLATFORM: string = 'harmony'/);
  assert.match(payload, /clientPlatform:\s*CLIENT_PLATFORM/);
  assert.match(api, /import \{ CLIENT_PLATFORM \} from '\.\.\/utils\/Payload'/);
  assert.match(api, /platform:\s*CLIENT_PLATFORM/);
  assert.doesNotMatch(api, /platform:\s*'harmony'/);
});

test('Harmony normalizes both task aliases and renders canonical Chinese source labels with a missing fallback', () => {
  const normalize = read('apps/harmony/Stage/src/main/ets/utils/Normalize.ets');
  const format = read('apps/harmony/Stage/src/main/ets/utils/Format.ets');
  const view = read('apps/harmony/Stage/src/main/ets/pages/Index.ets');
  assert.match(normalize, /job\.client_platform \|\| job\.clientPlatform/);
  for (const [platform, label] of [
    ['web', 'Web 网页'], ['miniprogram', '微信小程序'], ['android', 'Android'], ['ios', 'iOS'],
    ['windows', 'Windows'], ['macos', 'macOS'], ['harmony', 'HarmonyOS'],
  ]) {
    assert.match(format, new RegExp(`value === '${platform}'\\) return '${label}'`));
  }
  assert.match(format, /return '未记录'/);
  assert.match(view, /任务来源：\$\{formatClientPlatform\(job\.client_platform\)\}/);
});
