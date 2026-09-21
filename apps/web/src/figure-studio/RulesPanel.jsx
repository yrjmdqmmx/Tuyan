import { useMemo, useState } from 'react';
import { Check, CircleHelp, ExternalLink, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import { evaluateRules, PROFILES } from '@paperbanana/figure-core';
import { Field } from './Inspector.jsx';
import { loadRulePresets, presetFromDocument, saveRulePresets } from './rulePresets.js';

const STATUS_TEXT = { pass: '通过', passed: '通过', problem: '需调整', fail: '需调整', failed: '需调整', warning: '需留意', warn: '需留意', manual: '待人工确认', unknown: '未核验', unverified: '未核验', disabled: '已停用', skipped: '未启用' };

export default function RulesPanel({ document, onCommands, readOnly = false }) {
  const [scope, setScope] = useState('baseline');
  const [editing, setEditing] = useState(false);
  const [presets, setPresets] = useState(() => { try { return loadRulePresets(); } catch { return []; } });
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [presetMessage, setPresetMessage] = useState('');
  const [customName, setCustomName] = useState('');
  const [customKind, setCustomKind] = useState('min-dpi');
  const [customValue, setCustomValue] = useState(450);
  const [customMessage, setCustomMessage] = useState('');
  const report = useMemo(() => evaluateRules(document), [document]);
  const profile = PROFILES.find((item) => item.id === document.profileId) || PROFILES[0];
  const results = report[scope] || [];
  const changes = Object.keys(document.ruleOverrides || {}).length;
  const editableRules = [...profile.rules.filter((rule) => rule.level !== 'manual'), ...document.customRules];
  function savePreset() {
    try {
      const existing = loadRulePresets();
      const preset = presetFromDocument(document, presetName);
      const next = [...existing.filter((item) => item.name !== preset.name), preset];
      saveRulePresets(next); setPresets(next); setSelectedPreset(preset.id); setPresetName(''); setPresetMessage('规则预设已保存在此浏览器，不含图稿内容或密钥。');
    } catch (error) { setPresetMessage(error.message || '本机预设保存失败。'); }
  }
  function applyPreset() {
    const preset = presets.find((item) => item.id === selectedPreset);
    if (preset && onCommands([{ type: 'rule-preset', profileId: preset.profileId, ruleOverrides: preset.ruleOverrides, customRules: preset.customRules }])) setPresetMessage('已应用工作规则，可撤销。官方基线继续独立检查。');
  }
  function deletePreset() {
    try {
      const next = presets.filter((item) => item.id !== selectedPreset);
      saveRulePresets(next); setPresets(next); setSelectedPreset(''); setPresetMessage('已删除此本机预设，当前图稿规则保持不变。');
    } catch (error) { setPresetMessage(error.message); }
  }
  function addRule() {
    const rule = { id: `custom-${crypto.randomUUID()}`, label: customName.trim(), kind: customKind, enabled: true, ...(customKind === 'manual' ? { message: customMessage.trim() || '请作者确认此项要求。' } : { value: Number(customValue) }) };
    if (onCommands([{ type: 'custom-rule', rule }])) { setCustomName(''); setCustomMessage(''); }
  }
  return <div className="fs-rules fs-panel-content">
    <h3>{profile.label}</h3><p className="fs-muted">{profile.scope}</p>
    <div className="fs-rule-scopes" aria-label="检查依据"><button className={scope === 'baseline' ? 'active' : ''} onClick={() => setScope('baseline')}>官方基线</button><button className={scope === 'working' ? 'active' : ''} onClick={() => setScope('working')}>我的工作规则{changes ? ` · ${changes}` : ''}</button></div>
    <p className="fs-rule-caption">{scope === 'baseline' ? '始终按已记录的官方基线检查，修改工作规则不会覆盖这里的结果。' : '仅用于当前图稿。符合工作规则不代表符合官方要求。'}</p>
    {scope === 'working' && !readOnly && <button className="fs-wide fs-subtle" onClick={() => setEditing(!editing)}><SlidersHorizontal size={14} />{editing ? '收起规则设置' : '调整工作规则'}</button>}
    {scope === 'working' && !readOnly && <details className="fs-preset-tools"><summary>本机个人预设</summary><label className="field fs-field"><span>保存当前规则为</span><input value={presetName} maxLength={60} onChange={(event) => setPresetName(event.target.value)} placeholder="例如：课题组投稿检查" /></label><button className="fs-wide" disabled={!presetName.trim()} onClick={savePreset}>保存当前工作规则</button>{presets.length > 0 && <><label className="field fs-field"><span>已保存预设</span><select value={selectedPreset} onChange={(event) => setSelectedPreset(event.target.value)}><option value="">选择本机预设</option>{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label><div className="fs-button-row"><button disabled={!selectedPreset} onClick={applyPreset}>应用预设</button><button disabled={!selectedPreset} onClick={deletePreset}>删除预设</button></div></>}{presetMessage && <p role="status" className="fs-micro">{presetMessage}</p>}<p className="fs-micro">仅保存规则，不保存研究材料、画布内容或密钥。同名保存会更新已有预设。</p></details>}
    {editing && scope === 'working' && !readOnly && <div className="fs-rule-editor">{editableRules.map((rule) => {
      const override = document.ruleOverrides?.[rule.id] || {};
      const setValue = (value) => onCommands([{ type: 'rule', id: rule.id, override: { ...override, value } }]);
      const currentValue = override.value ?? rule.value;
      return <div key={rule.id}><label className="fs-check"><input type="checkbox" checked={(override.enabled ?? rule.enabled) !== false} onChange={(event) => onCommands([{ type: 'rule', id: rule.id, override: { ...override, enabled: event.target.checked } }])} />{rule.label}</label>
        {typeof rule.value === 'number' && <Field label="工作规则值" type="number" value={currentValue} onCommit={setValue} />}
        {Array.isArray(rule.value) && <Field label="工作规则值（逗号分隔）" value={currentValue.join(', ')} onCommit={(value) => setValue(value.split(/[,，]/).map((item) => typeof rule.value[0] === 'number' ? Number(item.trim()) : item.trim()))} />}
        {rule.kind === 'text-size' && <div className="fs-field-grid"><Field label="最小字号 / pt" type="number" value={currentValue.min} onCommit={(min) => setValue({ ...currentValue, min })} /><Field label="最大字号 / pt" type="number" value={currentValue.max} onCommit={(max) => setValue({ ...currentValue, max })} /></div>}
        {document.customRules.some((item) => item.id === rule.id) && <button className="fs-rule-remove" onClick={() => onCommands([{ type: 'remove-custom-rule', id: rule.id }])}>删除自定义项</button>}
      </div>;
    })}<div className="fs-custom-rule"><h4>添加工作规则</h4><label className="field fs-field"><span>名称</span><input value={customName} maxLength={120} onChange={(event) => setCustomName(event.target.value)} placeholder="例如：位图最低分辨率" /></label><label className="field fs-field"><span>检查方式</span><select value={customKind} onChange={(event) => setCustomKind(event.target.value)}><option value="min-dpi">最低图片 DPI</option><option value="manual">人工确认项</option></select></label>{customKind === 'min-dpi' ? <Field label="最低 DPI" type="number" min={1} max={2400} value={customValue} onCommit={setCustomValue} /> : <label className="field fs-field"><span>确认说明</span><textarea value={customMessage} rows={3} maxLength={1000} onChange={(event) => setCustomMessage(event.target.value)} placeholder="记录需要作者核对的具体事项" /></label>}<button className="fs-wide" disabled={!customName.trim()} onClick={addRule}>添加此工作规则</button></div></div>}
    <div className="fs-rule-list">{results.map((result) => {
      const passed = ['pass', 'passed'].includes(result.status);
      const failed = ['problem', 'fail', 'failed', 'warning', 'warn'].includes(result.status);
      const Icon = passed ? Check : failed ? TriangleAlert : CircleHelp;
      return <div className={`fs-rule-result ${passed ? 'passed' : failed ? 'attention' : 'pending'}`} key={result.id}><Icon size={15} /><div><div className="fs-rule-result-title"><strong>{result.label}</strong><span>{STATUS_TEXT[result.status] || '待核验'}</span></div><p>{result.message}</p>{result.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noreferrer">官方来源 <ExternalLink size={10} /></a>}</div></div>;
    })}</div>
    <div className="fs-note">规则核对日期：{profile.checkedAt}。此处检查技术属性；研究事实、AI 使用政策和最终视觉效果仍需作者确认。</div>
  </div>;
}
