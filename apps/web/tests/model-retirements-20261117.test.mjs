import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx';
import WorkspaceModelCatalog, { catalogRows } from '../src/workspace/WorkspaceModelCatalog.jsx';
import { WorkspaceModelManager } from '../src/workspace/WorkspaceModelPanels.jsx';
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js';
import { auditedModelLifecycle, removedModel } from '../src/lib/modelAudit.js';
import batch from '../../../config/channel-audit/retirements-20261117.json' with { type: 'json' };

beforeEach(t => t.mock.method(Date, 'now', () => Date.parse('2026-11-25T10:00:00+08:00')));
afterEach(cleanup);
for (const [provider, modelId] of [['openai', 'o1'], ['antling', 'Ling-2.6-1T'], ['ark', 'doubao-seed-1-6-250615'], ['bailian', 'qwen3-max'], ['runware', 'openai:1@1'], ['qianfan', 'ernie-5.0'], ['qianfan', 'qwen-image'], ...['MiniMax-M2.5','MiniMax-M2.5-highspeed','MiniMax-M2.7','MiniMax-M2.7-highspeed'].map(id => ['minimax',id])]) {
  test(`batch 1 saved ${provider}/${modelId} preset survives reopening and shows unavailable guidance`, () => {
    const role = provider === 'runware' || modelId === 'qwen-image' ? 'image' : 'main';
    const preset = { name: 'Saved research preset', models: { [role]: { libraryModelId: 'old', connectionId: 'c', accessProvider: provider, modelId } } };
    const library = { connections: [{ id: 'c', provider, label: 'Saved connection', hasCredential: true }], models: [{ id: 'old', connectionId: 'c', modelId }] };
    const saved = JSON.stringify({ preset, library });
    const key = `retirement-preset-${provider}`;
    window.localStorage.setItem(key, saved);
    try {
      for (let reopen = 0; reopen < 2; reopen++) {
        const restored = JSON.parse(window.localStorage.getItem(key));
        const models = { registry: { providers: STATIC_MODEL_REGISTRY }, library: restored.library, ready: true, busy: false, registryStatus: 'ready', save: () => assert.fail('No implicit library save') };
        const picker = render(React.createElement(WorkspaceModelPicker, { models, role, path: role === 'main' ? 'svg' : 'png', current: restored.preset.models[role], onChange: () => assert.fail('No automatic preset rewrite') }));
        assert.match(screen.getByRole('status').textContent, /原型号已不可用，请重新选择/);
        assert.equal(screen.getByRole('button', { name: role === 'main' ? '主模型' : '绘图模型' }).textContent, '请选择');
        fireEvent.click(screen.getByRole('button', { name: role === 'main' ? '主模型' : '绘图模型' }));
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
test('saved notices use the channel’s default developer, count once and preserve the guest library', t => {
  const key = 'tuyan.workspace-models.v1::guest';
  const pairs = [['openai', 'o1'], ['openai', 'gpt-5.1'], ['antling', 'Ling-2.6-1T'],
    ['siliconflow', 'Qwen/Qwen3.8-27B'], ['siliconflow', 'zai-org/GLM-4.5V']];
  const saved = JSON.stringify({
    revision: 7,
    connections: ['openai', 'antling', 'siliconflow'].map(provider => ({ id: provider, provider, label: provider, scope: 'browser' })),
    models: pairs.map(([connectionId, modelId], i) => ({ id: 'm' + i, connectionId, modelId })),
  });
  window.localStorage.setItem(key, saved);
  t.after(() => window.localStorage.removeItem(key));
  const models = { library: JSON.parse(window.localStorage.getItem(key)), registry: { providers: STATIC_MODEL_REGISTRY },
    ready: true, registryStatus: 'ready', save: () => assert.fail('Only an explicit confirmation may save') };
  const { container } = render(React.createElement(WorkspaceModelManager, { models, initialView: 'library' }));
  assert.ok(screen.getByRole('button', { name: /我的模型\s*5/, pressed: true }));
  const channels = within(screen.getByRole('complementary', { name: '模型渠道筛选' }));
  const developers = within(screen.getByRole('complementary', { name: '模型厂商筛选' }));
  function selectChannel(channel, developer, count, channelCount = count) {
    const button = channels.getByRole('button', { name: new RegExp(channel) });
    assert.equal(button.querySelector('small').textContent, String(channelCount));
    fireEvent.click(button);
    assert.equal(developers.getByRole('button', { name: new RegExp(developer), pressed: true }).querySelector('small').textContent, String(count));
    assert.equal(developers.queryByRole('button', { name: /开发方待确认/ }), null);
    assert.ok(container.querySelector('.tw-catalog-caption').textContent.includes(`${channel} / ${developer} ${count} 个型号`));
    return screen.getByRole('status');
  }
  assert.equal(selectChannel('OpenAI', 'OpenAI', 2).textContent, 'o1：原型号已不可用，请重新选择。');
  assert.equal(screen.getAllByRole('article').length, 1);
  assert.ok(within(screen.getByRole('article')).getByText('gpt-5.1'));
  const ling = selectChannel('蚂蚁百灵', '蚂蚁集团', 1);
  fireEvent.click(within(ling).getByRole('button', { name: '改选' }));
  const dialog = screen.getByRole('dialog', { name: '确认切换模型' });
  assert.match(dialog.textContent, /Ling 2\.6-1T → Ling-3\.1-flash/);
  fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
  assert.equal(selectChannel('硅基流动', '智谱', 1, 2).textContent, 'GLM-4.5V：原型号已不可用，请重新选择。');
  assert.equal(screen.queryByRole('button', { name: '改选' }), null);
  assert.equal(screen.queryByRole('article'), null);
  fireEvent.click(developers.getByRole('button', { name: /阿里巴巴/ }));
  assert.equal(screen.queryByRole('status'), null);
  assert.ok(within(screen.getByRole('article')).getByText('Qwen/Qwen3.8-27B'));
  assert.equal(JSON.stringify(models.library), saved);
  assert.equal(window.localStorage.getItem(key), saved);
});

test('a library containing only o1 opens on its notice and counts one saved model', () => {
  const models = { library: { connections: [{ id: 'c', provider: 'openai', label: 'OpenAI' }], models: [{ id: 'saved', connectionId: 'c', modelId: 'o1' }] } };
  const { container } = render(React.createElement(WorkspaceModelCatalog, { models, mode: 'library' }));
  assert.equal(screen.getByRole('status').textContent, 'o1：原型号已不可用，请重新选择。');
  assert.match(container.querySelector('.tw-catalog-caption').textContent, /OpenAI \/ OpenAI 1 个型号/);
  assert.equal(screen.queryByText('还没有添加模型'), null);
});
test('batch 1 remaining upcoming models remain listed and selectable until their explicit deadline', t => {
  for (const row of batch.upcoming.filter(row => row.provider !== 'minimax')) {
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
