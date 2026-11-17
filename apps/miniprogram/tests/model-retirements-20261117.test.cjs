const test = require('node:test');
const assert = require('node:assert/strict');
const { loadComponent } = require('./helpers/component.cjs');
const { STATIC_MODEL_REGISTRY } = require('../miniprogram/utils/static-model-catalog.js');
const { removedModel, auditedModelLifecycle } = require('../miniprogram/utils/model-audit.js');
const batch = require('../../../config/channel-audit/retirements-20261117.json');
for (const [provider, modelId] of [['openai', 'o1'], ['antling', 'Ling-2.6-1T']]) {
  test(`batch 1 mini saved ${provider}/${modelId} preset is retained with unavailable guidance`, t => {
    t.mock.method(Date, 'now', () => Date.parse('2026-11-17T12:00:00+08:00'));
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
      assert.match(sheet.instance.data.routeRows[0].removedHint, /原型号已不可用，请重新选择/);
      assert.equal(sheet.instance.data.routeRows[0].modelLabel, '请选择');
      assert.equal(JSON.stringify(sheet.instance.data.draft.modelRoutes), JSON.stringify(original.modelRoutes));
      assert.equal(JSON.stringify(original), saved);
      assert.equal(sheet.events.length, 0);
      const picker = loadComponent('components/model-picker/model-picker.js');
      picker.instance.getRegistry = () => ({ providers: STATIC_MODEL_REGISTRY });
      Object.assign(picker.instance.properties, { selectedProvider: provider, selectedModel: modelId, role: 'main', outputFormat: 'svg' });
      picker.instance.resetFlow();
      assert.match(picker.instance.data.removedHint, /原型号已不可用，请重新选择/);
      assert.equal(picker.instance.properties.selectedModel, modelId);
      assert.equal(picker.events.length, 0);
      assert.equal(STATIC_MODEL_REGISTRY[provider].models.some(row => row.id === modelId), false);
    }
  });
}
test('batch 1 mini upcoming deadlines match exact UTC or UTC+8 instants', () => {
  for (const row of batch.upcoming) {
    const stop = Date.parse(row.time || row.date);
    assert.ok(STATIC_MODEL_REGISTRY[row.provider].models.find(m => m.id === row.id));
    assert.equal(removedModel(row.provider, row.id, stop - 1), null);
    assert.equal(auditedModelLifecycle(row.provider, row.id, stop - 1).label, '将下线');
    assert.equal(removedModel(row.provider, row.id, stop).stopDate, row.time || row.date);
  }
});
