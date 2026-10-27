import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ModelPicker from '../src/components/ModelPicker.jsx';
import ThinkingSettings from '../src/components/ThinkingSettings.jsx';
import ThinkingStatus from '../src/components/ThinkingStatus.jsx';
import ModelRoutingSettings from '../src/components/ModelRoutingSettings.jsx';
import WorkspaceModelCatalog, { catalogRows } from '../src/workspace/WorkspaceModelCatalog.jsx';
import { WorkspaceModelManager, WorkspaceModelConfig } from '../src/workspace/WorkspaceModelPanels.jsx';
import { modelMissingFromCatalog } from '../src/lib/modelRegistry.js';
import { modelOption } from '../src/workspace/workspaceModels.js';

afterEach(cleanup);
const roles = ['main', 'image', 'vision'];
const present = { id: 'present', label: 'Present model', vendor: 'OpenAI', roles, selectable: true };
// A current missing_live result overrides an older selectable flag.
const missing = { ...present, id: 'missing', label: 'Missing model' };
const registry = { thinkingContractVersion: 1, providers: { openai: { models: [present, missing] }, tokendance: { models: [{ ...missing, label: 'Other channel model' }] } }, catalogHealth: { openai: { issues: [{ id: 'missing', reason: 'missing_live' }] } } };
const library = { connections: [{ id: 'direct', provider: 'openai', label: 'Direct', hasCredential: true }], models: [present, missing, { id: 'absent' }].map(m => ({ id: `saved-${m.id}`, modelId: m.id, connectionId: 'direct' })) };
const models = { library, registry, ready: true, registryStatus: 'ready', userId: 'test', summary: {}, save() { throw new Error('visibility must not mutate the library'); } };

test('catalog and saved library hide missing entries with accurate counts and retain storage', () => {
  assert.deepEqual(catalogRows(registry).map(row => `${row.provider}:${row.model.id}`).sort(), ['openai:present', 'tokendance:missing']);
  const view = render(React.createElement(WorkspaceModelManager, { models }));
  assert.equal(screen.getByRole('button', { name: /模型目录/ }).textContent, '模型目录2');
  fireEvent.click(screen.getByRole('button', { name: /我的模型/ }));
  assert.equal(document.querySelectorAll('.tw-library-model').length, 1);
  assert.equal(screen.getByRole('button', { name: /我的模型/ }).textContent, '我的模型1');
  assert.equal(Boolean(screen.queryByText('Missing model')), false);
  view.rerender(React.createElement(WorkspaceModelManager, { models: { ...models, registry: null, registryStatus: 'loading' } }));
  assert.equal(document.querySelectorAll('.tw-library-model').length, 3, 'a load failure is not evidence of removal');
  assert.equal(library.models.length, 3);
  view.rerender(React.createElement(WorkspaceModelManager, { models: { ...models, registry: { providers: {} } } }));
  assert.equal(document.querySelectorAll('.tw-library-model').length, 0, 'removed channel has no selectable catalogue entries');
  view.rerender(React.createElement(WorkspaceModelManager, { models: { ...models, registry: { providers: {}, unavailableProviders: { openai: 'temporary failure' } } } }));
  assert.equal(document.querySelectorAll('.tw-library-model').length, 3, 'failed channel read preserves saved identities');
});

test('catalog refresh blocks adding a model removed while its dialog is open', () => {
  const noSaved = { ...models, library: { ...library, models: [] } };
  const view = render(React.createElement(WorkspaceModelCatalog, { models: { ...noSaved, registry: { ...registry, catalogHealth: {} } } }));
  fireEvent.click(screen.getByRole('button', { name: /^OpenAI2$/ }));
  fireEvent.click(screen.getByRole('button', { name: '添加 Missing model · OpenAI' }));
  assert.equal(screen.getByRole('button', { name: '确认添加' }).disabled, false);
  view.rerender(React.createElement(WorkspaceModelCatalog, { models: noSaved }));
  assert.equal(screen.getByRole('button', { name: '确认添加' }).disabled, true);
});

for (const compact of [false, true]) test(`legacy and saved pickers hide missing entries for every role and operation (${compact ? 'mobile' : 'desktop'})`, () => {
  const previous = window.matchMedia;
  window.matchMedia = () => ({ matches: compact, addEventListener() {}, removeEventListener() {} });
  try {
    for (const role of roles) for (const operation of ['generation', 'editing']) {
      let changes = 0;
      render(React.createElement(ModelPicker, { label: '测试模型', role, operation, registry, route: { accessProvider: 'openai', modelId: 'missing' }, onRouteChange() { changes++; } }));
      fireEvent.click(screen.getByRole('button', { name: '测试模型', exact: true }));
      fireEvent.click(screen.getByRole('button', { name: 'OpenAI', exact: true }));
      if (compact) fireEvent.click(screen.getByRole('button', { name: '厂商 OpenAI', exact: true }));
      assert.equal(Boolean(screen.queryByRole('button', { name: '选择 Missing model' })), false);
      assert.ok(screen.getByRole('button', { name: '选择 Present model' }));
      assert.match(screen.getByRole('button', { name: '测试模型', exact: true }).textContent, /Missing model/);
      assert.equal(changes, 0);
      cleanup();
      const selected = { libraryModelId: 'saved-missing', accessProvider: 'openai', modelId: 'missing' };
      const draft = { mode: 'advanced', settings: { advanced: { models: Object.fromEntries(roles.map(r => [r, selected])) } } };
      render(React.createElement(WorkspaceModelConfig, { models, draft, path: 'png', editing: operation === 'editing', onChange() { changes++; } }));
      fireEvent.click(screen.getByRole('button', { name: { main: '主模型', image: '绘图模型', vision: '视觉理解' }[role], exact: true }));
      fireEvent.click(screen.getByRole('button', { name: 'OpenAI', exact: true }));
      if (compact) fireEvent.click(screen.getByRole('button', { name: '厂商 OpenAI', exact: true }));
      assert.equal(Boolean(screen.queryByRole('button', { name: '选择 Missing model' })), false);
      assert.ok(screen.getByRole('button', { name: '选择 Present model' }));
      assert.equal(changes, 0);
      cleanup();
    }
  } finally { window.matchMedia = previous; }
});

test('ordinary and professional generation and refine settings omit nonadjustable thinking', () => {
  for (const configurationMode of ['simple', 'advanced']) for (const operation of ['generation', 'editing']) {
    const selections = {
      main: { provider: 'tokendance', modelId: 'kimi-k2.7-code', protocol: 'openai-chat-completions', options: {} },
      image: { provider: 'tokendance', modelId: 'seedream-5-0-pro', protocol: 'provider-images', options: {} },
      vision: { provider: 'gemini', modelId: 'gemini-2.5-flash', protocol: 'gemini-generate-content', options: {} },
    };
    const props = { configurationMode, operation, executionRouteRoles: roles, visionMode: 'assist', modelRoutes: Object.fromEntries(Object.entries(selections).map(([role, s]) => [role, { accessProvider: s.provider, modelId: s.modelId }])), modelRegistry: { thinkingContractVersion: 1, providers: {} }, providerConfigs: {}, credentialProviders: [], apiKeys: {}, arkProbes: [], arkVerification: {}, renderThinkingSettings: role => React.createElement(ThinkingSettings, { role, settings: { roles: selections }, registry: { thinkingContractVersion: 1 }, operation, onChange() {} }) };
    const { container } = render(React.createElement(ModelRoutingSettings, props));
    assert.equal(container.querySelectorAll('.model-thinking-controls, .thinking-status').length, 0);
    cleanup();
  }
  for (const status of ['supported', 'fixed', 'unconfirmed', 'unsupported']) for (const compact of [false, true]) {
    const view = render(React.createElement(ThinkingStatus, { profile: { status, controls: [] }, compact }));
    assert.equal(view.container.textContent, ''); cleanup();
  }
});

test('missing channel models cannot expose thinking controls or enter ordinary presets', () => {
  const model = { id: 'gpt-5', roles: ['main'], protocol: 'openai-chat-completions', selectable: true };
  const exactRegistry = { thinkingContractVersion: 1, providers: { openai: { defaults: { main: 'gpt-5' }, models: [model] } }, catalogHealth: { openai: { issues: [{ id: 'gpt-5', reason: 'missing_live' }] } } };
  const settings = { roles: { main: { provider: 'openai', modelId: 'gpt-5', protocol: 'openai-chat-completions', options: {} } } };
  const view = render(React.createElement(ThinkingSettings, { role: 'main', settings, registry: { thinkingContractVersion: 1 }, onChange() {} }));
  assert.ok(screen.getByRole('combobox'));
  view.rerender(React.createElement(ThinkingSettings, { role: 'main', settings, registry: exactRegistry, onChange() {} }));
  assert.equal(Boolean(screen.queryByRole('region')), false);
  assert.match(modelOption({ id: 'saved', connectionId: 'direct', modelId: 'gpt-5' }, library, exactRegistry, 'main', 'png').reason, /未收录/);
  assert.equal(modelMissingFromCatalog(registry, 'tokendance', 'missing'), false);
  assert.equal(modelMissingFromCatalog(registry, 'custom', 'absent'), false);
  assert.equal(modelMissingFromCatalog(null, 'openai', 'absent'), false);
  assert.equal(modelMissingFromCatalog({ providers: { openai: { models: [{ id: 'missing', selectable: false, disabledReason: '当前目录未列出该模型：missing' }] } } }, 'openai', 'missing'), true, 'missing marker still works when issue details were truncated');
});


test('editing without saved overrides has no generation-only thinking recovery block', () => {
  const settings = { roles: { image: { provider: 'bailian', modelId: 'z-image-turbo', protocol: 'bailian-multimodal-generation', options: {} } } };
  const view = render(React.createElement(ThinkingSettings, { role: 'image', settings, operation: 'editing', registry: { thinkingContractVersion: 1 }, onChange() {} }));
  assert.equal(view.container.textContent, '');
});

test('ordinary workspace preset cannot select a missing channel model', () => {
  let changed;
  const presetRegistry = { ...registry, providers: { ...registry.providers, openai: { ...registry.providers.openai, defaults: { main: 'missing', image: 'missing', vision: 'missing' } } } };
  render(React.createElement(WorkspaceModelConfig, { models: { ...models, registry: presetRegistry }, draft: { mode: 'simple', settings: { simple: { models: {} } } }, path: 'png', onChange(value) { changed = value; } }));
  fireEvent.change(screen.getByLabelText('普通预设'), { target: { value: 'direct' } });
  fireEvent.click(screen.getByRole('button', { name: '应用此连接的默认组合' }));
  assert.deepEqual(changed.models, {});
});
