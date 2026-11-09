import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js';
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx';
import WorkspaceModelCatalog, { catalogRows } from '../src/workspace/WorkspaceModelCatalog.jsx';
import { tokenDanceLibraryAddition } from '../src/workspace/tokenDanceLibrary.js';

afterEach(cleanup);
const additions = [
  ['together', 'reflection/Beam-1.0-501B-A23B'],
  ['fireworks', 'accounts/fireworks/models/deepseek-v4p1-flash-1017'],
  ['qianfan', 'deepseek-v4.1-flash-1017'],
  ['tokendance', 'deepseek-v4.1-flash-1017'],
];
const registry = { providers: STATIC_MODEL_REGISTRY };
const savedModels = (provider, modelId) => ({
  registry, registryStatus: 'ready', ready: true, busy: false,
  summary: { tokenDance: { connected: true } },
  library: {
    revision: 1,
    connections: [{ id: 'existing-connection', provider, label: 'Existing connection', scope: provider === 'tokendance' ? 'authorization' : 'browser', hasCredential: true }],
    models: [{ id: 'saved-model', connectionId: 'existing-connection', modelId, disabled: false }],
  },
});

for (const [provider, modelId] of additions) {
  test(`v35 ${provider} uses the existing picker and preserves the exact saved route`, () => {
    const models = savedModels(provider, modelId);
    const model = registry.providers[provider].models.find(m => m.id === modelId);
    let selected;
    render(React.createElement(WorkspaceModelPicker, { models, role: 'main', path: 'svg', onChange: value => { selected = value; } }));
    fireEvent.click(screen.getByRole('button', { name: '主模型', exact: true }));
    assert.ok(screen.getByRole('dialog').classList.contains('model-route-drawer'));
    assert.equal(screen.getAllByRole('article').length, 1, 'unadded catalog models must stay out of the task picker');
    assert.ok(screen.getByLabelText('官方文档规格'));
    const choice = screen.getByRole('button', { name: `选择 ${model.label || model.id}`, exact: true });
    assert.equal(choice.disabled, false);
    fireEvent.click(choice);
    assert.deepEqual(selected, { libraryModelId: 'saved-model', connectionId: 'existing-connection', accessProvider: provider, modelId });
    assert.equal(model.verified, false, 'a selectable catalog identity is not a real-call verification');
  });
}

test('v35 catalog preserves channel-specific vision roles and renders Reflection in the existing cards', () => {
  for (const [provider, modelId] of additions) {
    const matches = catalogRows(registry, { provider, role: 'vision', query: modelId });
    assert.equal(matches.some(row => row.model.id === modelId), ['fireworks', 'qianfan'].includes(provider));
  }
  const models = { ...savedModels(...additions[0]), library: { revision: 0, connections: [], models: [] } };
  render(React.createElement(WorkspaceModelCatalog, { models, onConnection: () => {} }));
  fireEvent.click(within(screen.getByLabelText('模型渠道筛选')).getByRole('button', { name: /^Together AI/ }));
  fireEvent.click(within(screen.getByLabelText('模型厂商筛选')).getByRole('button', { name: /^Reflection/ }));
  fireEvent.change(screen.getByRole('textbox', { name: '搜索模型目录' }), { target: { value: additions[0][1] } });
  const card = screen.getByRole('article');
  assert.ok(card.classList.contains('tw-catalog-card'));
  assert.match(card.textContent, /Reflection/);
  assert.ok(card.querySelector('img[src="/brand/catalog/reflection.png"]'));
  assert.ok(within(card).getByLabelText('官方文档规格'));
  assert.equal(within(card).queryByText('规格与来源'), null);
  assert.equal(within(card).getByRole('button', { name: /添加/ }).disabled, false);
});

test('v35 TokenDance import adds the new exact identity once and preserves the existing disabled choice', () => {
  const id = 'deepseek-v4.1-flash-1017';
  const connection = { id: 'td-existing', provider: 'tokendance', label: 'TokenDance', scope: 'authorization' };
  const library = { revision: 7, connections: [connection], models: registry.providers.tokendance.models.filter(m => m.id !== id).map((m, i) => ({ id: `old-${i}`, connectionId: connection.id, modelId: m.id, disabled: i === 0 })) };
  const before = structuredClone(library);
  const next = tokenDanceLibraryAddition(library, registry, () => 'v35-added');
  assert.deepEqual(library, before);
  assert.deepEqual(next.models.slice(0, -1), before.models);
  assert.deepEqual(next.connections, before.connections);
  assert.deepEqual(next.models.at(-1), { id: 'v35-added', connectionId: connection.id, modelId: id, disabled: false });
  assert.equal(tokenDanceLibraryAddition(next, registry), null);
});

test('v35 retired Ark identity remains visible and disabled without replacing a saved selection', () => {
  const modelId = 'deepseek-v4-flash-260425';
  const models = savedModels('ark', modelId);
  const current = { libraryModelId: 'saved-model', connectionId: 'existing-connection', accessProvider: 'ark', modelId };
  const changes = [];
  render(React.createElement(WorkspaceModelPicker, { models, role: 'main', path: 'svg', current, onChange: value => changes.push(value) }));
  fireEvent.click(screen.getByRole('button', { name: '主模型', exact: true }));
  const card = screen.getByRole('article');
  assert.match(card.textContent, /2026-09-21/);
  assert.equal(within(card).getByRole('button', { name: /^选择 / }).disabled, true);
  fireEvent.click(card);
  assert.deepEqual(changes, []);
  assert.equal(models.library.models[0].modelId, modelId);
});
