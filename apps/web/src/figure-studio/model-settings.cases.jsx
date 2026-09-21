import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ModelSettings } from './ModelPanel.jsx';
import { studioModelRegistry, studioModelSelection } from './modelSettings.js';
import { loadPresentedModelRegistry } from '../lib/modelCatalog.js';

const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });
const capabilities = { modelPlanning: true, supportedModelModes: ['api-key'], supportedProviders: ['openai', 'minimax'], unsupportedProviders: ['tokendance', 'custom'] };
const main = (id, label, extra = {}) => ({ id, label, vendor: 'OpenAI', roles: ['main'], selectable: true, ...extra });
function registryFixture() {
  return { code: 0, routeContractVersion: 1, providerRegionContractVersion: 1, providers: {
    openai: { accessKind: 'direct', models: [main('older-api-id', 'Older fixture', { releasedAt: '2025-01-01' }), main('exact-api-id', 'Latest fixture', { releasedAt: '2026-09-01', version: { kind: 'fixed', id: 'version-20260901', checkedAt: '2026-09-21', sourceUrl: 'https://example.com/model' } }), { id: 'image-only', roles: ['image'], selectable: true }] },
    minimax: { accessKind: 'direct', models: [main('same-regional-id', 'Region fixture', { vendor: 'MiniMax', regions: ['global', 'cn'] }), main('global-only', 'Global fixture', { vendor: 'MiniMax', regions: ['global'] })] },
    tokendance: { accessKind: 'aggregator', models: [main('td-id', 'TD fixture')] },
    custom: { accessKind: 'direct', models: [main('custom-id', 'Custom fixture')] },
    anthropic: { accessKind: 'direct', models: [main('claude-id', 'Claude fixture')] },
  } };
}
function mockCatalog(getRegistry = () => registryFixture()) {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ url, body });
    if (body?.action === 'modelRegistry') {
      const data = await getRegistry();
      return new Response(JSON.stringify(data), { status: data.code ? 503 : 200 });
    }
    return new Response(JSON.stringify({ runtime: 'laf', ok: true }));
  };
  return requests;
}
function Harness({ initial = { provider: '', modelId: '', key: '', valid: false }, caps = capabilities, onSignIn, signedIn = false }) {
  const [value, onChange] = useState(initial);
  return <><ModelSettings value={value} onChange={onChange} capabilities={caps} onSignIn={onSignIn} signedIn={signedIn} /><output data-testid="selection">{JSON.stringify(value)}</output></>;
}
const selection = () => JSON.parse(screen.getByTestId('selection').textContent);
async function openSettings() {
  fireEvent.click(screen.getByRole('button', { name: '规划与编辑模型设置' }));
  await waitFor(() => assert.equal(screen.getByRole('button', { name: '刷新目录' }).disabled, false));
}

test('shared catalog loader retains exact IDs and version evidence while applying the common newest-first presentation', async () => {
  const requests = mockCatalog();
  const result = await loadPresentedModelRegistry('https://catalog.example', { backendMode: 'gateway' });
  assert.deepEqual(result.providers.openai.models.filter((model) => model.roles.includes('main')).map((model) => model.id), ['exact-api-id', 'older-api-id']);
  assert.equal(result.providers.openai.models.find((model) => model.id === 'exact-api-id').version.id, 'version-20260901');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.action, 'modelRegistry');
});

test('Figure uses the shared searchable picker and guides without auto-selecting or exposing unsupported channels', async () => {
  const requests = mockCatalog();
  render(<Harness />);
  await openSettings();
  assert.equal(selection().provider, '');
  fireEvent.click(screen.getByRole('button', { name: '主模型' }));
  assert.ok(screen.getByRole('group', { name: '模型厂商' }));
  assert.equal(screen.queryByRole('button', { name: '观猹 TokenDance' }), null);
  assert.equal(screen.queryByRole('button', { name: 'Anthropic Claude' }), null);
  assert.equal(screen.queryByRole('button', { name: '选择 image-only' }), null);
  fireEvent.click(screen.getByRole('button', { name: 'OpenAI', exact: true }));
  fireEvent.change(screen.getByRole('searchbox', { name: '搜索主模型' }), { target: { value: 'exact-api-id' } });
  assert.match(screen.getByText(/已核对版本：version-20260901/).textContent, /2026-09-21/);
  fireEvent.click(screen.getByRole('button', { name: '选择 Latest fixture' }));
  await waitFor(() => assert.equal(selection().valid, true));
  assert.equal(selection().modelId, 'exact-api-id');
  assert.equal(selection().provider, 'openai');
  assert.ok(screen.getByText('API Key 申请指南'));
  fireEvent.change(screen.getByLabelText('OpenAI 接入密钥'), { target: { value: 'memory-only-fixture' } });
  assert.equal(selection().key, 'memory-only-fixture');
  assert.equal(requests.filter((request) => request.body && request.body.action !== 'modelRegistry').length, 0);
  assert.doesNotMatch(JSON.stringify(requests), /memory-only-fixture/);
});

test('catalog failure and retired model keep the exact choice and credential but fail closed', async () => {
  let response = registryFixture();
  mockCatalog(() => response);
  render(<Harness initial={{ provider: 'openai', modelId: 'exact-api-id', key: 'retained-key', valid: false }} />);
  await openSettings();
  await waitFor(() => assert.equal(selection().valid, true));
  response = { code: 503, error: '目录暂时不可用' };
  fireEvent.click(screen.getByRole('button', { name: '刷新目录' }));
  assert.match((await screen.findByRole('alert')).textContent, /模型目录读取失败：目录暂时不可用.*请稍后刷新/);
  assert.deepEqual(selection(), { provider: 'openai', modelId: 'exact-api-id', key: 'retained-key', valid: false });
  response = registryFixture();
  response.providers.openai.models[1] = { ...response.providers.openai.models[1], selectable: false, disabledReason: '此精确版本已停用' };
  fireEvent.click(screen.getByRole('button', { name: '刷新目录' }));
  await waitFor(() => assert.equal(screen.getByRole('button', { name: '刷新目录' }).disabled, false));
  assert.ok(screen.getAllByText('此精确版本已停用').length);
  assert.equal(selection().modelId, 'exact-api-id');
  assert.equal(selection().key, 'retained-key');
  assert.equal(selection().valid, false);
});

test('MiniMax keys are isolated by region and a region switch preserves the exact model', async () => {
  mockCatalog();
  render(<Harness initial={{ provider: 'minimax', modelId: 'same-regional-id', key: 'global-secret', valid: false }} />);
  await openSettings();
  // A finished catalog request and its derived selection effect are separate
  // React updates; interact only after the selected route is actually admitted.
  await waitFor(() => assert.equal(selection().valid, true));
  const key = screen.getByLabelText('MiniMax 接入密钥');
  fireEvent.change(screen.getByLabelText('MiniMax 区域'), { target: { value: 'cn' } });
  assert.equal(key.value, '');
  assert.equal(selection().modelId, 'same-regional-id');
  assert.deepEqual(selection().providerRegions, { minimax: 'cn' });
  fireEvent.change(key, { target: { value: 'cn-secret' } });
  fireEvent.change(screen.getByLabelText('MiniMax 区域'), { target: { value: 'global' } });
  assert.equal(key.value, 'global-secret');
  fireEvent.change(screen.getByLabelText('MiniMax 区域'), { target: { value: 'cn' } });
  assert.equal(key.value, 'cn-secret');
  await waitFor(() => assert.equal(selection().valid, true));
  assert.equal(screen.getByRole('link', { name: /打开 MiniMax/ }).href, 'https://platform.minimaxi.com/user-center/basic-information/interface-key');
});

test('unconfirmed capabilities permit catalog inspection but never submission; unsupported selections stay intact', async () => {
  const registry = registryFixture();
  const native = { provider: 'openai', modelId: 'exact-api-id', key: 'key', valid: true };
  assert.equal(studioModelSelection(native, registry, null).valid, false);
  assert.ok(studioModelRegistry(registry, null).providers.openai);
  assert.equal(studioModelRegistry(registry, null).providers.tokendance, undefined);
  mockCatalog();
  render(<Harness initial={{ provider: 'tokendance', modelId: 'td-id', key: '', valid: true }} />);
  await openSettings();
  assert.equal(selection().provider, 'tokendance');
  assert.equal(selection().modelId, 'td-id');
  assert.equal(selection().valid, false);
  assert.ok(screen.getByText(/暂不支持观猹 TokenDance 或通用 API/));
  assert.equal(screen.queryByLabelText(/接入密钥/), null);
});

test('regional catalog compatibility never replaces an unavailable model and requires the actual region contract', () => {
  const registry = registryFixture();
  const value = { provider: 'minimax', modelId: 'global-only', key: 'cn', providerRegions: { minimax: 'cn' } };
  assert.equal(studioModelSelection(value, registry, capabilities).valid, false);
  assert.deepEqual(studioModelRegistry(registry, capabilities, value.providerRegions).providers.minimax.models.map((model) => model.id), ['same-regional-id']);
  delete registry.providerRegionContractVersion;
  assert.match(studioModelSelection({ ...value, modelId: 'same-regional-id' }, registry, capabilities).reason, /不支持 MiniMax 中国大陆区域/);
  assert.equal(value.modelId, 'global-only');
});

test('account remount clears the private regional key ring and a late catalog response cannot restore validity', async () => {
  let resolveOld;
  const old = new Promise((resolve) => { resolveOld = resolve; });
  let calls = 0;
  mockCatalog(() => ++calls === 1 ? old : registryFixture());
  const view = render(<Harness key="old-account" initial={{ provider: 'minimax', modelId: 'same-regional-id', key: 'old-account-key', valid: false }} />);
  await waitFor(() => assert.equal(calls, 1));
  view.rerender(<Harness key="new-account" />);
  await act(async () => { resolveOld(registryFixture()); await old; });
  assert.deepEqual(selection(), { provider: '', modelId: '', key: '', valid: false });
  await openSettings();
  fireEvent.click(screen.getByRole('button', { name: '主模型' }));
  fireEvent.click(screen.getByRole('button', { name: 'MiniMax', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: '选择 Region fixture' }));
  assert.equal(screen.getByLabelText('MiniMax 接入密钥').value, '');
});

test('sign-in uses the current page callback while the shared settings drawer closes', async () => {
  mockCatalog();
  let signIns = 0;
  render(<Harness onSignIn={() => signIns++} />);
  await openSettings();
  fireEvent.click(screen.getByRole('button', { name: '登录图研' }));
  assert.equal(signIns, 1);
  assert.equal(screen.queryByRole('dialog', { name: '生成设置' }), null);
});

test('signed-in model settings do not offer a sign-in action', async () => {
  mockCatalog();
  render(<Harness signedIn onSignIn={() => assert.fail('must not reopen sign-in')} />);
  await openSettings();
  assert.equal(screen.queryByRole('button', { name: '登录图研' }), null);
});
