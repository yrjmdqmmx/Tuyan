import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx';
import WorkspaceModelCatalog, { catalogRows } from '../src/workspace/WorkspaceModelCatalog.jsx';
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js';
import { auditedModelLifecycle, removedModel } from '../src/lib/modelAudit.js';
import batch from '../../../config/channel-audit/retirements-20261117.json' with { type: 'json' };

beforeEach(t => t.mock.method(Date, 'now', () => Date.parse('2026-11-17T12:00:00+08:00')));
afterEach(cleanup);
for (const [provider, modelId] of [['openai', 'o1'], ['antling', 'Ling-2.6-1T']]) {
  test(`batch 1 saved ${provider}/${modelId} preset survives reopening and shows unavailable guidance`, () => {
    const preset = { name: 'Saved research preset', models: { main: { libraryModelId: 'old', connectionId: 'c', accessProvider: provider, modelId } } };
    const library = { connections: [{ id: 'c', provider, label: 'Saved connection', hasCredential: true }], models: [{ id: 'old', connectionId: 'c', modelId }] };
    const saved = JSON.stringify({ preset, library });
    const key = `retirement-preset-${provider}`;
    window.localStorage.setItem(key, saved);
    try {
      for (let reopen = 0; reopen < 2; reopen++) {
        const restored = JSON.parse(window.localStorage.getItem(key));
        const models = { registry: { providers: STATIC_MODEL_REGISTRY }, library: restored.library, ready: true, busy: false, registryStatus: 'ready', save: () => assert.fail('No implicit library save') };
        const picker = render(React.createElement(WorkspaceModelPicker, { models, role: 'main', path: 'svg', current: restored.preset.models.main, onChange: () => assert.fail('No automatic preset rewrite') }));
        assert.match(screen.getByRole('status').textContent, /原型号已不可用，请重新选择/);
        assert.equal(screen.getByRole('button', { name: '主模型' }).textContent, '请选择');
        fireEvent.click(screen.getByRole('button', { name: '主模型' }));
        assert.equal(catalogRows(models.registry).some(row => row.provider === provider && row.model.id === modelId), false);
        picker.unmount();
        const listing = render(React.createElement(WorkspaceModelCatalog, { models, mode: 'library' }));
        assert.match(screen.getByRole('status').textContent, /原型号已不可用，请重新选择/);
        listing.unmount();
        assert.equal(JSON.stringify(restored), saved);
        assert.equal(window.localStorage.getItem(key), saved);
      }
    } finally { window.localStorage.removeItem(key); }
  });
}
test('batch 1 ten upcoming models remain listed and selectable until their explicit deadline', t => {
  for (const row of batch.upcoming) {
    const { provider, id } = row, stop = Date.parse(row.time || row.date);
    const model = STATIC_MODEL_REGISTRY[provider].models.find(model => model.id === id);
    assert.ok(model, provider + '/' + id);
    assert.notEqual(model.selectable, false);
    t.mock.method(Date, 'now', () => stop - 1);
    assert.equal(auditedModelLifecycle(provider, id).label, '将下线');
    assert.equal(auditedModelLifecycle(provider, id).sourceUrl, row.source);
    assert.equal(removedModel(provider, id), null);
    assert.equal(catalogRows({ providers: { [provider]: { models: [model] } } }).length, 1);
    Date.now.mock.mockImplementation(() => stop);
    assert.equal(auditedModelLifecycle(provider, id), null);
    assert.equal(removedModel(provider, id).stopDate, row.time || row.date);
    assert.equal(catalogRows({ providers: { [provider]: { models: [model] } } }).length, 0);
  }
});
