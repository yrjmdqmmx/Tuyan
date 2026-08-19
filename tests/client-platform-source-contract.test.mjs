import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const windowsClient = source('apps/windows/PaperBananaApiClient.cs');
const windowsModel = source('apps/windows/Models.cs');
const windowsView = source('apps/windows/MainWindow.xaml');
const windowsCodeBehind = source('apps/windows/MainWindow.xaml.cs');
assert.match(windowsClient, /\["clientPlatform"\]\s*=\s*"windows"/);
assert.match(windowsModel, /ClientPlatformDisplayName/);
assert.match(windowsView, /\{Binding ClientPlatformDisplayText\}/);
assert.doesNotMatch(windowsView, /Binding\.StringFormat|StringFormat=/);
assert.match(windowsModel, /ClientPlatformDisplayText/);
assert.match(windowsCodeBehind, /ClientPlatform\s*=\s*"windows"/);
assert.match(windowsCodeBehind, /_currentJob\.ClientPlatformDisplayName/);

const androidApi = source('apps/android/src/api.ts');
const androidView = source('apps/android/App.tsx');
assert.match(androidApi, /clientPlatform:\s*CLIENT_PLATFORM/);
assert.match(androidView, /formatClientPlatform\(.*client_platform/);

const harmonyPayload = source('apps/harmony/Stage/src/main/ets/utils/Payload.ets');
const harmonyView = source('apps/harmony/Stage/src/main/ets/pages/Index.ets');
assert.match(harmonyPayload, /clientPlatform:\s*'harmony'/);
assert.match(harmonyView, /formatClientPlatform\(job\.client_platform\)/);

const iosSmoke = source('apps/ios/Scripts/e2e-gateway-smoke.mjs');
assert.match(iosSmoke, /action:\s*"createJob",\s*clientPlatform:\s*"ios"/);

const miniprogramRecords = source('apps/miniprogram/miniprogram/pages/records/records.wxml');
assert.match(miniprogramRecords, /history-meta[^\n]*client_platform_text/);

const laf = source('apps/laf-functions/paperbanana-api.ts');
assert.match(laf, /type ClientPlatform = 'web' \| 'miniprogram' \| 'android' \| 'ios' \| 'windows' \| 'macos' \| 'harmony'/);
assert.match(laf, /clientPlatform:\s*normalizeClientPlatform\(body\.clientPlatform\)/);
assert.match(laf, /clientPlatform:\s*normalizeClientPlatform\(job\.clientPlatform \|\| job\.client_platform\)/);
assert.match(laf, /Invalid clientPlatform/);

console.log('client-platform-source-contract.test.mjs passed');
