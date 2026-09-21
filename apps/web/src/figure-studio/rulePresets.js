import { createDocument } from '@paperbanana/figure-core';

export const RULE_PRESETS_KEY = 'tuyan.figure-studio.rule-presets.v1';
const MAX_PRESET_BYTES = 128 * 1024;
export function presetFromDocument(document, name) {
  const trimmed = String(name).trim();
  if (!trimmed || trimmed.length > 60) throw new Error('预设名称须为 1–60 个字符。');
  const checked = createDocument({ profileId: document.profileId, ruleOverrides: document.ruleOverrides, customRules: document.customRules });
  return { id: `preset-${crypto.randomUUID()}`, name: trimmed, profileId: checked.profileId, ruleOverrides: checked.ruleOverrides, customRules: checked.customRules };
}
export function loadRulePresets(storage = globalThis.localStorage) {
  const raw = storage?.getItem(RULE_PRESETS_KEY);
  if (!raw) return [];
  if (new TextEncoder().encode(raw).length > MAX_PRESET_BYTES) throw new Error('本机规则预设超过容量限制，未加载。');
  const values = JSON.parse(raw);
  if (!Array.isArray(values) || values.length > 20) throw new Error('本机规则预设结构无效，原缓存未修改。');
  return values.map((value) => {
    if (!value || typeof value !== 'object' || Object.keys(value).some((key) => !['id', 'name', 'profileId', 'ruleOverrides', 'customRules'].includes(key)) || typeof value.id !== 'string' || !value.id.startsWith('preset-')) throw new Error('本机规则预设结构无效。');
    const preset = presetFromDocument(value, value.name);
    return { ...preset, id: value.id };
  });
}
export function saveRulePresets(presets, storage = globalThis.localStorage) {
  if (presets.length > 20) throw new Error('最多保存 20 个本机预设，请先删除不再使用的预设。');
  const safe = presets.map((preset) => ({ id: preset.id, name: preset.name, profileId: preset.profileId, ruleOverrides: preset.ruleOverrides, customRules: preset.customRules }));
  const serialized = JSON.stringify(safe);
  if (new TextEncoder().encode(serialized).length > MAX_PRESET_BYTES) throw new Error('规则预设超过本机 128 KiB 容量限制。');
  storage.setItem(RULE_PRESETS_KEY, serialized);
}
