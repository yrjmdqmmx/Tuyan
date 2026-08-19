import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Windows create requests use one exact platform constant on both transports', () => {
  const client = read('apps/windows/PaperBananaApiClient.cs');
  assert.match(client, /internal const string ClientPlatform = "windows";/);
  assert.equal((client.match(/\["clientPlatform"\] = ClientPlatform/g) || []).length, 2);
  assert.doesNotMatch(client, /\["clientPlatform"\] = "[^"]+"/);
});

test('Windows task detail and records map both aliases and every canonical Chinese source label', () => {
  const models = read('apps/windows/Models.cs');
  const window = read('apps/windows/MainWindow.xaml.cs');
  const xaml = read('apps/windows/MainWindow.xaml');
  assert.match(models, /GetString\(element, "client_platform", "clientPlatform"\)/);
  for (const [platform, label] of [
    ['web', 'Web 网页'], ['miniprogram', '微信小程序'], ['android', 'Android'], ['ios', 'iOS'],
    ['windows', 'Windows'], ['macos', 'macOS'], ['harmony', 'HarmonyOS'],
  ]) {
    assert.match(models, new RegExp(`"${platform}"\\s*=>\\s*"${label}"`));
  }
  assert.match(models, /_ => "未记录"/);
  assert.match(window, /_currentJob\.ClientPlatformDisplayName/);
  assert.match(xaml, /\{Binding ClientPlatformDisplayText\}/);
});
