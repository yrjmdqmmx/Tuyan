import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommands, createExampleDocument } from '@paperbanana/figure-core';
import { loadRulePresets, presetFromDocument, RULE_PRESETS_KEY, saveRulePresets } from './rulePresets.js';

test('personal presets contain only working rules, never source content or credentials', () => {
  const document = createExampleDocument();
  document.ruleOverrides['text-size'] = { value: { min: 6, max: 9 } };
  document.customRules = [{ id: 'custom-dpi', kind: 'min-dpi', label: '课题组图片', value: 450 }];
  const preset = presetFromDocument({ ...document, apiKeys: { openai: 'should-not-persist' }, materials: 'private research' }, '课题组');
  assert.deepEqual(Object.keys(preset).sort(), ['customRules', 'id', 'name', 'profileId', 'ruleOverrides']);
  let saved = '';
  saveRulePresets([preset], { setItem(key, value) { assert.equal(key, RULE_PRESETS_KEY); saved = value; } });
  assert.equal(saved.includes('should-not-persist'), false);
  assert.equal(saved.includes('private research'), false);
  assert.equal(saved.includes('plan-title'), false);
  const [restored] = loadRulePresets({ getItem: () => saved });
  assert.deepEqual(restored, preset);
});

test('applying a named preset changes only rules and remains reversible through core commands', () => {
  const original = createExampleDocument();
  const preset = presetFromDocument({ ...original, customRules: [{ id: 'review-scale', label: '核对比例尺', kind: 'manual', message: '按原始数据核对' }] }, '投稿检查');
  const changed = applyCommands(original, [{ type: 'rule-preset', profileId: preset.profileId, ruleOverrides: preset.ruleOverrides, customRules: preset.customRules }]);
  assert.deepEqual(changed.elements, original.elements);
  assert.deepEqual(changed.canvas, original.canvas);
  assert.equal(changed.customRules[0].id, 'review-scale');
  assert.equal(original.customRules.length, 0);
});

test('malformed and unsafe saved presets are rejected without replacing storage', () => {
  assert.throws(() => loadRulePresets({ getItem: () => '[{"id":"preset-one","name":"invalid","apiKeys":"leak"}]' }), /无效/);
  assert.throws(() => presetFromDocument(createExampleDocument(), ' '), /名称/);
});
