import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import WorkspaceModelCatalog from '../src/workspace/WorkspaceModelCatalog.jsx';
import { WorkspaceModelConfig } from '../src/workspace/WorkspaceModelPanels.jsx';
import WorkspaceModelPicker from '../src/workspace/WorkspaceModelPicker.jsx';
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js';
import { formatContextLimit } from '../src/lib/modelPresentation.js';
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js';
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx';

beforeEach(t => t.mock.method(Date, 'now', () => Date.parse('2026-11-09')));
afterEach(cleanup);
const makeModels = pairs => ({
  registry: { providers: STATIC_MODEL_REGISTRY }, ready: true, busy: false, registryStatus: 'ready',
  library: { connections: [...new Set(pairs.map(p => p[0]))].map(provider => ({ id: provider, provider, label: provider, hasCredential: true })),
    models: pairs.map(([connectionId, modelId], i) => ({ id: 'm' + i, connectionId, modelId })) },
  save: async () => true,
});
const ref = (models, i = 0) => { const m = models.library.models[i]; return { libraryModelId: m.id, connectionId: m.connectionId, accessProvider: m.connectionId, modelId: m.modelId }; };

function Config({ models, initial, changed = () => {} }) {
  const [settings, setSettings] = useState(initial);
  return React.createElement(WorkspaceModelConfig, { models, draft: { mode: 'simple', settings: { simple: settings } }, path: 'png', onChange: next => { changed(next); setSettings(next); } });
}

test('applying StepFun defaults leaves the image slot empty with an explicit helper, including after reopening', () => {
  const models = makeModels([['stepfun', STATIC_MODEL_REGISTRY.stepfun.defaults.main]]);
  let latest;
  const view = render(React.createElement(Config, { models, initial: { models: {} }, changed: s => { latest = s; } }));
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name: 'stepfun' }));
  fireEvent.click(screen.getByRole('button', { name: '应用此连接的默认组合' }));
  assert.equal(latest.models.image, undefined);
  assert.equal(screen.getByRole('button', { name: '绘图模型' }).textContent, '请选择');
  assert.ok(screen.getByText('此连接暂无默认绘图模型'));
  assert.equal(STATIC_MODEL_REGISTRY.stepfun.models.some(m => m.roles.includes('image')), false);
  view.unmount();
  render(React.createElement(Config, { models, initial: latest }));
  assert.ok(screen.getByText('此连接暂无默认绘图模型'));
});

test('removed notices follow channel and vendor filters, including channels with only removed entries', () => {
  const models = makeModels([['bailian','qwen3.5-plus'], ['xiaomi','mimo-v2.5'], ['xiaomi','mimo-v2.5-pro'], ['fireworks','accounts/fireworks/models/glm-5p2'], ['fireworks','accounts/fireworks/models/deepseek-v4-flash-0731']]);
  const before = structuredClone(models.library);
  const { container } = render(React.createElement(WorkspaceModelCatalog, { models, mode: 'library' }));
  const channels = screen.getByRole('complementary', { name: '模型渠道筛选' });
  fireEvent.click(within(channels).getByRole('button', { name: /阿里云百炼/ }));
  assert.equal(container.querySelector('.tw-catalog-scroll .tw-info'), null);
  fireEvent.click(within(channels).getByRole('button', { name: /小米 MiMo/ }));
  const notice = container.querySelector('details.tw-info');
  assert.equal(notice.querySelector('summary').textContent, '2 个已保存型号已不可用');
  assert.equal(notice.hasAttribute('open'), false);
  assert.deepEqual([...notice.querySelectorAll('p')].map(p => p.textContent), ['MiMo-v2.5：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Flash', 'MiMo-v2.5-pro：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Pro']);
  assert.equal(notice.querySelectorAll('p').length, 2);
  assert.equal(container.querySelectorAll('article').length, 0);
  fireEvent.click(within(channels).getByRole('button', { name: /Fireworks/ }));
  const vendors = screen.getByRole('complementary', { name: '模型厂商筛选' });
  fireEvent.click(within(vendors).getByRole('button', { name: /智谱/ }));
  const hint = container.querySelector('.tw-catalog-scroll .tw-info');
  assert.equal(hint.querySelector('span').textContent, 'GLM 5.2：原型号已不可用，请重新选择。推荐：GLM 5.3');
  assert.doesNotMatch(hint.textContent, /deepseek|accounts\/fireworks\/models\/glm-5p3/);
  fireEvent.click(within(channels).getByRole('button', { name: /阿里云百炼/ }));
  assert.equal(container.querySelector('.tw-catalog-scroll .tw-info'), null);
  assert.deepEqual(models.library, before);
});

test('replacement uses verified display names even when dynamic labels are shared', () => {
  const models = makeModels([['fireworks','accounts/fireworks/models/glm-5p2']]);
  models.registry = structuredClone(models.registry);
  models.registry.providers.fireworks.models = [{id:'accounts/fireworks/models/glm-5p3',label:'Same'}, {id:'second',label:'Same'}];
  render(React.createElement(WorkspaceModelCatalog, { models, mode: 'library' }));
  assert.match(screen.getByRole('status').textContent, /推荐：GLM 5.3/);
});

test('removed slot has one helper and placeholder; cancel is inert and confirmation changes only that role', async () => {
  const models = makeModels([['xiaomi','mimo-v2.5']]);
  let writes = 0, latest;
  models.save = async () => { writes++; return true; };
  const initial = { models: { main: ref(models), vision: ref(models), image: { accessProvider:'bailian', modelId:'wan2.7-image-pro' } } };
  const { container } = render(React.createElement(Config, { models, initial, changed: s => { latest = s; } }));
  const main = screen.getByRole('button', { name: '主模型' }).closest('.tw-role-card');
  assert.equal(within(main).getByRole('button', { name: '主模型' }).textContent, '请选择');
  assert.equal(within(main).getAllByRole('status').length, 1);
  assert.equal(within(main).getByRole('status').firstChild.textContent, 'MiMo-v2.5：原型号已不可用，请重新选择。推荐：MiMo-V2.6-Flash');
  assert.doesNotMatch(main.textContent, /所选模型当前不可用/);
  assert.equal(writes, 0); assert.equal(latest, undefined);
  fireEvent.click(within(main).getByRole('button', { name:'改选' }));
  fireEvent.click(screen.getByRole('button', { name:'取消' }));
  assert.equal(writes, 0); assert.equal(latest, undefined);
  fireEvent.click(within(main).getByRole('button', { name:'改选' }));
  fireEvent.click(screen.getByRole('button', { name:'确认切换' }));
  await waitFor(() => assert.equal(latest.models.main.modelId, 'mimo-v2.6-flash'));
  assert.equal(writes, 1); assert.deepEqual(latest.models.vision, initial.models.vision); assert.deepEqual(latest.models.image, initial.models.image);
  assert.equal(container.querySelectorAll('.tw-role-card').length, 3);
});

test('a replacement that cannot serve the slot does not offer an action, and no replacement has exactly one helper', () => {
  for (const [provider, id, role] of [['xiaomi','mimo-v2.5','image'], ['stepfun','step-2x-large','image']]) {
    const models = makeModels([[provider,id]]);
    const view = render(React.createElement(WorkspaceModelPicker, { models, role, path:'png', current:ref(models), onChange: () => assert.fail('No automatic change') }));
    assert.equal(screen.queryByRole('button', { name:'改选' }), null);
    assert.equal(screen.getAllByRole('status').length, 1);
    if (provider === 'stepfun') assert.equal(screen.getByRole('status').textContent, 'Step 2x Large：原型号已不可用，请重新选择。');
    view.unmount();
  }
});

test('production compact formatter is shared by both numeric rows and exact values remain on hover', () => {
  assert.equal(formatContextLimit(1000000), '1M');
  assert.equal(formatContextLimit(262144), '≈ 262K');
  assert.equal(formatContextLimit(384000), '384K');
  const data = modelCardSpecifications('tokendance', {id:'deepseek-v4-pro'});
  assert.equal(data.context, '≈ 1M tokens'); assert.equal(data.maxOutput, '384K tokens');
  const { container } = render(React.createElement(ModelSpecifications, {provider:'tokendance',model:{id:'deepseek-v4-pro'}}));
  assert.equal(screen.getByText(data.context).title, '1,048,576 tokens');
  assert.equal(screen.getByText(data.maxOutput).title, '384K tokens');
  const source = screen.getByRole('link'); assert.ok(source.title.includes(source.href));
  assert.equal(container.querySelectorAll('dl > div').length, 4);
});

test('scheduled badge is beside the title, preserves full IDs, and tap opens date and replacement', () => {
  for (const [provider, id, date, replacement] of [['bailian','qwen3.5-plus-2026-04-20','2027-01-19','Qwen3.8 Flash'], ['antling','Ling-2.6-flash','2026-11-15 00:00 (UTC+8)','Ling-3.1-flash']]) {
    const models = makeModels([[provider,id]]);
    const view = render(React.createElement(WorkspaceModelCatalog, { models, mode:'library' }));
    const badge = screen.getByRole('button', { name:/将下线：/ });
    assert.ok(badge.closest('.tw-catalog-title'));
    assert.equal(view.container.querySelector('.tw-catalog-card-meta code').textContent,id);
    assert.doesNotMatch(view.container.querySelector('.tw-catalog-card-meta').textContent,/将下线/);
    assert.ok(badge.title.includes(date)); assert.ok(badge.title.includes(replacement));
    fireEvent.click(badge);
    assert.ok(screen.getByRole('dialog').textContent.includes(date));
    view.unmount();
  }
});

test('tapping a scheduled badge inside the picker never selects that model', () => {
  const models = makeModels([['antling','Ling-2.6-flash']]);
  render(React.createElement(WorkspaceModelPicker, {models,role:'main',path:'svg',current:ref(models),onChange:()=>assert.fail('Badge is not a selection')}));
  fireEvent.click(screen.getByRole('button', {name:'主模型'}));
  fireEvent.click(screen.getByRole('button', {name:/将下线：/}));
  const dialog = screen.getByRole('dialog', {name:'下线公告'});
  fireEvent.click(within(dialog).getByText(/将于/));
  assert.match(dialog.textContent,/UTC\+8/);
});
