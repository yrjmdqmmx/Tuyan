import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, KeyRound, Loader2, Send, Settings2 } from 'lucide-react';
import { API_BASE_DEFAULT } from '../config.js';
import { PROVIDERS } from '../constants.js';
import GenerationSettingsDrawer from '../components/GenerationSettingsDrawer.jsx';
import ModelPicker from '../components/ModelPicker.jsx';
import NativeCredentialFields from '../components/NativeCredentialFields.jsx';
import useModelCatalog from '../hooks/useModelCatalog.js';
import { regionApiKeySlot } from '../lib/providerRegions.js';
import { studioModelRegistry, studioModelSelection } from './modelSettings.js';

export function ModelSettings({ value, onChange, capabilities }) {
  const [open, setOpen] = useState(false);
  const { registry, error, loading, refresh } = useModelCatalog({ apiBase: API_BASE_DEFAULT, enabled: open || Boolean(value.provider) });
  const keyRing = useRef({});
  const selectedRegistry = useMemo(() => studioModelRegistry(registry, capabilities, value.providerRegions), [registry, capabilities, value.providerRegions]);
  const selection = studioModelSelection(value, registry, capabilities, { loading, error });
  const selected = registry?.providers?.[value.provider]?.models?.find((model) => model.id === value.modelId);
  const nativeProvider = value.provider && !['tokendance', 'custom'].includes(value.provider);

  useEffect(() => {
    onChange((previous) => previous.valid === selection.valid ? previous : { ...previous, valid: selection.valid });
  }, [selection.valid, value.valid, onChange]);
  useEffect(() => {
    if (value.provider) keyRing.current[regionApiKeySlot(value.provider, value.providerRegions)] = value.key || '';
  }, [value.provider, value.providerRegions, value.key]);

  function changeRoute(route) {
    if (value.provider) keyRing.current[regionApiKeySlot(value.provider, value.providerRegions)] = value.key || '';
    onChange((previous) => ({ ...previous, provider: route.accessProvider, modelId: route.modelId,
      key: keyRing.current[regionApiKeySlot(route.accessProvider, previous.providerRegions)] || '', valid: false }));
  }
  function changeKey(key) {
    keyRing.current[regionApiKeySlot(value.provider, value.providerRegions)] = key;
    onChange((previous) => ({ ...previous, key }));
  }
  function changeMiniMaxRegion(minimax) {
    keyRing.current[regionApiKeySlot('minimax', value.providerRegions)] = value.key || '';
    const providerRegions = { ...value.providerRegions, minimax };
    onChange((previous) => ({ ...previous, providerRegions,
      key: keyRing.current[regionApiKeySlot('minimax', providerRegions)] || '', valid: false }));
  }

  return <div className="fs-model-settings">
    <button type="button" className="fs-settings-toggle" onClick={() => setOpen(true)} aria-expanded={open} aria-label="规划与编辑模型设置">
      <Settings2 size={15} /><span>{selected?.label || value.modelId || '选择规划与编辑模型'}</span><ChevronDown size={14} />
    </button>
    {selection.reason && !open && <p className="fs-micro" role="status">{selection.reason}</p>}
    <GenerationSettingsDrawer open={open} onClose={() => setOpen(false)}>
      <p className="fs-muted">为结构规划与自然语言编辑选择主模型。共用工作台的渠道目录、厂商与版本信息。</p>
      <ModelPicker label="主模型" role="main" route={{ accessProvider: value.provider, modelId: value.modelId }}
        registry={selectedRegistry} providerConfigs={PROVIDERS} onRouteChange={changeRoute} focusSetting="main-model" />
      {selection.reason && <p className="route-contract-warning" role="status">{selection.reason}</p>}
      <details className="api-keys-panel access-credentials" data-focus-setting="api-key" open>
        <summary><KeyRound size={17} /> 接入凭据</summary>
        <p>自行填写所选渠道密钥，仅保留在当前页面内存中，退出账号或刷新后清除。</p>
        {nativeProvider ? <NativeCredentialFields provider={value.provider} providerConfig={PROVIDERS[value.provider]}
          value={value.key} onChange={changeKey} providerRegions={value.providerRegions} onMiniMaxRegionChange={changeMiniMaxRegion}
          regionContractSupported={Boolean(registry?.providerRegionContractVersion)} /> : <p className="credential-empty">请明确选择图稿支持的原生渠道与主模型。</p>}
      </details>
      <div className="fs-button-row">
      <button type="button" className="generation-settings-trigger" disabled={loading} onClick={refresh}>{loading ? <Loader2 size={14} className="fs-spin" /> : null}刷新目录</button>
      </div>
      {error && <p className="fs-error" role="alert">{error}</p>}
      <p className="fs-micro">图稿模型功能当前仅支持用户自带 Key 的原生渠道。观猹 TokenDance 和通用 API 暂不可用；目录可见不代表当前图稿服务可调用。发起模型请求可能产生渠道费用。</p>
    </GenerationSettingsDrawer>
  </div>;
}

export function PlanPanel({ materials, setMaterials, plan, setPlan, busy, onPlan, onConfirm, limits }) {
  return <div className="fs-panel-content fs-plan-panel">
    <div className="fs-section-heading"><h3>先确定图示结构</h3><span className="fs-step">01</span></div>
    <p className="fs-muted">写清研究对象、步骤与因果关系。先核对逻辑，再生成可编辑的图稿。</p>
    <label className="field fs-field"><span>研究材料与制图目标</span><textarea rows={9} maxLength={limits?.materialsChars || 24000} value={materials} onChange={(event) => setMaterials(event.target.value)} placeholder="例如：展示材料 A 在不同温度下的制备流程，包含取样、处理和测试三个阶段。请保留……" /></label>
    <button className="primary-button fs-primary fs-wide" disabled={busy || !materials.trim()} onClick={onPlan}>{busy ? <Loader2 size={15} className="fs-spin" /> : <Send size={15} />} {busy ? '正在梳理结构…' : '生成结构方案'}</button>
    {plan && <div className="fs-plan-review"><div className="fs-section-heading"><h3>确认方案</h3><span className="fs-step">02</span></div><p className="fs-muted">修改下面的标题与节点，再确认生成。科学含义与关系由你把关。</p>
      <label className="field fs-field"><span>图稿标题</span><input value={plan.title} onChange={(event) => setPlan({ ...plan, title: event.target.value })} /></label>
      <label className="field fs-field"><span>图示说明</span><textarea rows={3} value={plan.summary || ''} onChange={(event) => setPlan({ ...plan, summary: event.target.value })} /></label>
      <ol className="fs-plan-nodes">{plan.nodes?.map((node, index) => <li key={node.id}><label><span>{index + 1}</span><input aria-label={`节点 ${index + 1}`} value={node.label} onChange={(event) => setPlan({ ...plan, nodes: plan.nodes.map((item) => item.id === node.id ? { ...item, label: event.target.value } : item) })} /></label><label className="field fs-field"><span>节点 {index + 1} 说明</span><textarea rows={2} value={node.detail || ''} onChange={(event) => setPlan({ ...plan, nodes: plan.nodes.map((item) => item.id === node.id ? { ...item, detail: event.target.value } : item) })} /></label></li>)}</ol>
      <h4>连接关系</h4>{plan.edges?.length ? <div className="fs-plan-edges">{plan.edges.map((edge, index) => <div className="fs-plan-edge" key={index}>
        <div className="fs-field-grid">{['from', 'to'].map((side) => <label className="field fs-field" key={side}><span>{side === 'from' ? '起点' : '终点'}</span><select aria-label={`连接 ${index + 1} ${side === 'from' ? '起点' : '终点'}`} value={edge[side]} onChange={(event) => setPlan({ ...plan, edges: plan.edges.map((item, at) => at === index ? { ...item, [side]: event.target.value } : item) })}>{plan.nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>)}</div>
        <label className="field fs-field"><span>连接说明</span><input value={edge.label || ''} onChange={(event) => setPlan({ ...plan, edges: plan.edges.map((item, at) => at === index ? { ...item, label: event.target.value } : item) })} /></label><button onClick={() => setPlan({ ...plan, edges: plan.edges.filter((_, at) => at !== index) })}>移除此连接</button>
      </div>)}</div> : <p className="fs-muted">方案没有连接关系。</p>}
      {plan.nodes?.length > 1 && plan.edges?.length < 36 && <button onClick={() => setPlan({ ...plan, edges: [...plan.edges, { from: plan.nodes[0].id, to: plan.nodes[1].id }] })}>添加连接</button>}
      {plan.notes?.length > 0 && <div className="fs-note">{plan.notes.join('；')}</div>}
      <button className="primary-button fs-primary fs-wide" onClick={onConfirm}>确认结构，生成图稿</button><p className="fs-micro">根据当前方案在本机排版，不再调用模型。当前画布将替换，可撤销。</p>
    </div>}
  </div>;
}

export function EditPanel({ instruction, setInstruction, selected, scope, busy, onEdit, patch, onApply, onDismiss, revision, limits }) {
  return <div className="fs-panel-content"><h3>用语言修改图稿</h3><p className="fs-muted">{selected ? `本次针对所选对象：${selected.text?.slice(0, 30) || selected.type}。` : '请先在画布中选择一个已有对象。'}修改会进入同一份图稿与撤销历史。新增、删除与分组请用画布工具。</p>
    {selected?.type === 'panel' && <div className="fs-note">编辑作用域：所选面板及其 {scope?.relatedCount || 0} 个相关子对象，共 {scope?.objectIds?.length || 1} 个对象。移动面板会同步移动全部子对象。</div>}
    {scope?.error && selected && <p className="fs-error" role="alert">{scope.error}</p>}
    <label className="field fs-field"><span>修改要求</span><textarea rows={5} value={instruction} maxLength={limits?.instructionChars || 2000} onChange={(event) => setInstruction(event.target.value)} placeholder="例如：把所选文字改为 7 pt，将输出模块向右移动 5 mm，其他对象保持不变。" /></label>
    <button className="primary-button fs-primary fs-wide" disabled={busy || !instruction.trim() || !selected || !!scope?.error} onClick={onEdit}>{busy ? <Loader2 size={15} className="fs-spin" /> : <Send size={15} />}{busy ? '正在提出修改…' : '提出修改方案'}</button>
    {patch && <div className="fs-plan-review"><h4>待应用的修改</h4><p className="fs-muted">基于版本 {patch.baseRevision}，共 {patch.commands.length} 项修改{patch.objectIds?.length ? `；请求作用域为 ${patch.objectIds.length} 个对象` : ''}。</p><ol className="fs-command-list">{patch.commands.map((command, index) => <li key={index}><strong>{({ update: '更新对象', add: '添加对象', remove: '删除对象', canvas: '调整画布', rule: '调整工作规则', title: '修改标题', reorder: '调整图层' })[command.type] || command.type}</strong><span>{command.id || command.element?.id || command.title || ''}</span>{command.patch && <pre>{JSON.stringify(command.patch, null, 2)}</pre>}</li>)}</ol>
      {revision !== patch.baseRevision && <p className="fs-error">图稿已更新。此修改方案已过期，请重新提出修改。</p>}
      <div className="fs-button-row"><button className="primary-button fs-primary" disabled={revision !== patch.baseRevision} onClick={onApply}>确认应用</button><button onClick={onDismiss}>放弃方案</button></div>
    </div>}
  </div>;
}
