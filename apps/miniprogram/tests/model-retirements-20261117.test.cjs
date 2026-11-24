const test = require('node:test');
const assert = require('node:assert/strict');
const { loadComponent } = require('./helpers/component.cjs');
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js');
const { removedModel, auditedModelLifecycle } = require('../miniprogram/utils/model-audit.js');
const batch = require('../../../config/channel-audit/retirements-20261117.json');
for (const [provider, modelId, developer, hint, replacement] of [
  ...['MiniMax-M2.5','MiniMax-M2.5-highspeed','MiniMax-M2.7','MiniMax-M2.7-highspeed'].map(id => ['minimax',id,'MiniMax',id.replace('MiniMax-', 'MiniMax ')+'：原型号已不可用，请重新选择。','']),
  ['openai', 'o1', 'OpenAI', 'o1：原型号已不可用，请重新选择。', ''],
  ['antling', 'Ling-2.6-1T', '蚂蚁集团', 'Ling 2.6-1T：原型号已不可用，请重新选择。推荐：Ling-3.1-flash', 'Ling-3.1-flash'],
  ['siliconflow', 'zai-org/GLM-4.5V', '智谱', 'GLM-4.5V：原型号已不可用，请重新选择。', ''],
]) {
  test(`batch 1 mini saved ${provider}/${modelId} preset is retained with unavailable guidance`, t => {
    t.mock.method(Date, 'now', () => Date.parse('2026-11-24T12:00:00+08:00'));
    const store = require('../miniprogram/utils/model-registry-store.js').getModelRegistryState();
    const previous = store.registry; store.registry = { providers: STATIC_MODEL_REGISTRY };
    t.after(() => { store.registry = previous; });
    const settings = { configurationMode: 'advanced', simpleProvider: provider, modelRoutes: { main: { accessProvider: provider, modelId }, image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' }, vision: { accessProvider: '', modelId: '' } }, outputFormat: 'svg', imageSize: '2K', aspectRatio: '1:1', providerRegions: {} };
    const saved = JSON.stringify(settings);
    for (let reopen = 0; reopen < 2; reopen++) {
      const original = JSON.parse(saved);
      const sheet = loadComponent('components/generation-settings-sheet/generation-settings-sheet.js');
      Object.assign(sheet.instance.properties, { settings: original, purpose: 'create', executionRoles: [], apiKeys: {}, manualReferenceIds: [] });
      sheet.instance.resetDraft();
      assert.equal(sheet.instance.data.routeRows[0].removedHint, hint);
      assert.equal(sheet.instance.data.routeRows[0].replacement, replacement);
      assert.equal(sheet.instance.data.routeRows[0].modelLabel, '请选择');
      assert.equal(JSON.stringify(sheet.instance.data.draft.modelRoutes), JSON.stringify(original.modelRoutes));
      assert.equal(JSON.stringify(original), saved);
      assert.equal(sheet.events.length, 0);
      const picker = loadComponent('components/model-picker/model-picker.js');
      picker.instance.getRegistry = () => ({ providers: STATIC_MODEL_REGISTRY });
      Object.assign(picker.instance.properties, { selectedProvider: provider, selectedModel: modelId, role: 'main', outputFormat: 'svg' });
      picker.instance.resetFlow();
      assert.equal(picker.instance.data.removedHint, hint);
      assert.equal(picker.instance.data.savedReplacement, replacement);
      assert.equal(picker.instance.data.activeProvider, provider);
      assert.equal(picker.instance.data.activeVendor, developer);
      picker.instance.selectProvider({ currentTarget: { dataset: { provider } } });
      assert.equal(picker.instance.data.activeVendor, developer);
      assert.equal(picker.instance.data.removedHint, hint);
      assert.equal(picker.instance.properties.selectedModel, modelId);
      assert.equal(picker.events.length, 0);
      assert.equal(STATIC_MODEL_REGISTRY[provider].models.some(row => row.id === modelId), false);
    }
  });
}
test('mini opens with the saved notice even when there are no selectable models', t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-17T12:00:00+08:00'));
  const picker = loadComponent('components/model-picker/model-picker.js');
  picker.instance.getRegistry = () => ({ providers: {} });
  Object.assign(picker.instance.properties, { selectedProvider: 'openai', selectedModel: 'o1', role: 'main' });
  picker.instance.resetFlow();
  assert.equal(picker.instance.data.step, 'providers');
  assert.equal(picker.instance.data.providerCards.length, 0);
  assert.equal(picker.instance.data.removedHint, 'o1：原型号已不可用，请重新选择。');
  assert.equal(picker.instance.data.savedReplacement, '');
  assert.equal(picker.events.length, 0);
});

test('batch 1 mini upcoming deadlines match exact UTC or UTC+8 instants', () => {
  for (const row of batch.upcoming.filter(row => row.provider !== 'minimax')) {
    const stop = Date.parse(row.time || row.date);
    assert.ok(STATIC_MODEL_REGISTRY[row.provider].models.find(m => m.id === row.id));
    assert.equal(removedModel(row.provider, row.id, stop - 1), null);
    assert.equal(auditedModelLifecycle(row.provider, row.id, stop - 1).label, '将下线');
    assert.equal(removedModel(row.provider, row.id, stop).stopDate, row.time || row.date);
  }
});

test('Mini selectable Gemini routing notes and dated retirement use the Shanghai deadline', async t => {
  const {normalizeModelRegistry} = require('../miniprogram/utils/model-registry.js');
  const provider = 'gemini', id = 'gemini-3.1-flash-lite';
  const stop = Date.parse('2027-05-07T00:00:00+08:00');
  const clock = t.mock.method(Date,'now',() => stop-1);
  const {coreProducts} = await import('../../../test-support/execution-capability.mjs');
  const normalized = normalizeModelRegistry((await coreProducts()).registry);
  for (const registry of [STATIC_MODEL_REGISTRY,normalized.providers]) {
    for (const [alias,target] of [['gemini-2.5-pro','gemini-3.8-flash'],['gemini-2.5-flash','gemini-3.5-flash-lite']]) {
      const model = registry.gemini.models.find(m => m.id === alias);
      assert.ok(model.routingNotice.text.includes(target));
      assert.equal(model.routingNotice.sourceUrl,'https://ai.google.dev/gemini-api/docs/deprecations');
      assert.equal(removedModel(provider,alias),null);
    }
  }
  assert.equal(auditedModelLifecycle(provider,id).stopDate,'2027-05-07T00:00:00+08:00');
  clock.mock.mockImplementation(() => stop);
  assert.equal(auditedModelLifecycle(provider,id),null);
  assert.ok(removedModel(provider,id));
});
