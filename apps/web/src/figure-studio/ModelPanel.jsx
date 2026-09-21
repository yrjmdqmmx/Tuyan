import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Send, Settings2 } from 'lucide-react';
import { getModels } from './api.js';
import { appPath } from '../appPaths.js';

export function ModelSettings({ value, onChange, capabilities }) {
  const [registry, setRegistry] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  async function refresh() {
    setLoading(true); setError('');
    try { setRegistry(await getModels()); } catch (error) { setError(error.message || '无法读取模型目录。'); } finally { setLoading(false); }
  }
  useEffect(() => { if (open && !registry && !loading) refresh(); }, [open]);
  const providers = Object.entries(registry?.providers || {}).filter(([id, provider]) => capabilities?.supportedProviders?.includes(id) && !['tokendance', 'custom', ...(capabilities?.unsupportedProviders || [])].includes(id) && provider.models?.some((model) => model.roles?.includes('main')));
  const models = (registry?.providers?.[value.provider]?.models || []).filter((model) => model.roles?.includes('main'));
  const selected = models.find((model) => model.id === value.modelId);
  useEffect(() => {
    onChange((previous) => ({ ...previous, valid: selected?.selectable === true && selected.roles?.includes('main') }));
  }, [selected?.id, selected?.selectable]);
  return <div className="fs-model-settings"><button className="fs-settings-toggle" onClick={() => setOpen(!open)} aria-expanded={open}><Settings2 size={15} /><span>{value.modelId || '选择规划与编辑模型'}</span><ChevronDown size={14} /></button>{open && <div className="fs-model-settings-body">
    <p className="fs-muted">使用已有渠道目录。密钥仅保留在当前页面，关闭或刷新后清除。</p>
    <label className="fs-field"><span>接入渠道</span><select value={value.provider} onChange={(event) => onChange({ provider: event.target.value, modelId: '', key: '', valid: false })}><option value="">请选择渠道</option>{providers.map(([id, provider]) => <option key={id} value={id}>{provider.label || provider.name || id}</option>)}</select></label>
    <label className="fs-field"><span>主文本模型</span><select value={value.modelId} onChange={(event) => { const model = models.find((item) => item.id === event.target.value); onChange({ ...value, modelId: event.target.value, valid: model?.selectable === true }); }}><option value="">请选择模型</option>{value.modelId && !selected && <option value={value.modelId} disabled>{value.modelId} · 目录中不可用</option>}{models.map((model) => <option key={model.id} value={model.id} disabled={model.selectable !== true}>{model.label || model.id}{model.selectable !== true ? ' · 不可用' : ''}</option>)}</select></label>
    {selected?.disabledReason && <p className="fs-error">{selected.disabledReason}</p>}
    <label className="fs-field"><span>API Key</span><input type="password" autoComplete="off" value={value.key} onChange={(event) => onChange({ ...value, key: event.target.value })} placeholder="仅此页临时使用" /></label>
    <button disabled={loading} onClick={refresh}>{loading ? <Loader2 size={14} className="fs-spin" /> : null}刷新目录</button>
    {error && <p className="fs-error">{error} <a href={appPath('/?auth=sign-in')}>前往登录</a></p>}
    <p className="fs-micro">当前仅支持自行提供密钥的已登记原生模型；托管观猹与通用 API 尚未接入此页。发起请求可能产生渠道费用。</p>
  </div>}</div>;
}

export function PlanPanel({ materials, setMaterials, plan, setPlan, busy, onPlan, onConfirm, limits }) {
  return <div className="fs-panel-content fs-plan-panel">
    <div className="fs-section-heading"><h3>先确定图示结构</h3><span className="fs-step">01</span></div>
    <p className="fs-muted">写清研究对象、步骤与因果关系。先核对逻辑，再生成可编辑的图稿。</p>
    <label className="fs-field"><span>研究材料与制图目标</span><textarea rows={9} maxLength={limits?.materialsChars || 24000} value={materials} onChange={(event) => setMaterials(event.target.value)} placeholder="例如：展示材料 A 在不同温度下的制备流程，包含取样、处理和测试三个阶段。请保留……" /></label>
    <button className="fs-primary fs-wide" disabled={busy || !materials.trim()} onClick={onPlan}>{busy ? <Loader2 size={15} className="fs-spin" /> : <Send size={15} />} {busy ? '正在梳理结构…' : '生成结构方案'}</button>
    {plan && <div className="fs-plan-review"><div className="fs-section-heading"><h3>确认方案</h3><span className="fs-step">02</span></div><p className="fs-muted">修改下面的标题与节点，再确认生成。科学含义与关系由你把关。</p>
      <label className="fs-field"><span>图稿标题</span><input value={plan.title} onChange={(event) => setPlan({ ...plan, title: event.target.value })} /></label>
      <label className="fs-field"><span>图示说明</span><textarea rows={3} value={plan.summary || ''} onChange={(event) => setPlan({ ...plan, summary: event.target.value })} /></label>
      <ol className="fs-plan-nodes">{plan.nodes?.map((node, index) => <li key={node.id}><label><span>{index + 1}</span><input aria-label={`节点 ${index + 1}`} value={node.label} onChange={(event) => setPlan({ ...plan, nodes: plan.nodes.map((item) => item.id === node.id ? { ...item, label: event.target.value } : item) })} /></label><label className="fs-field"><span>节点 {index + 1} 说明</span><textarea rows={2} value={node.detail || ''} onChange={(event) => setPlan({ ...plan, nodes: plan.nodes.map((item) => item.id === node.id ? { ...item, detail: event.target.value } : item) })} /></label></li>)}</ol>
      <h4>连接关系</h4>{plan.edges?.length ? <div className="fs-plan-edges">{plan.edges.map((edge, index) => <div className="fs-plan-edge" key={index}>
        <div className="fs-field-grid">{['from', 'to'].map((side) => <label className="fs-field" key={side}><span>{side === 'from' ? '起点' : '终点'}</span><select aria-label={`连接 ${index + 1} ${side === 'from' ? '起点' : '终点'}`} value={edge[side]} onChange={(event) => setPlan({ ...plan, edges: plan.edges.map((item, at) => at === index ? { ...item, [side]: event.target.value } : item) })}>{plan.nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>)}</div>
        <label className="fs-field"><span>连接说明</span><input value={edge.label || ''} onChange={(event) => setPlan({ ...plan, edges: plan.edges.map((item, at) => at === index ? { ...item, label: event.target.value } : item) })} /></label><button onClick={() => setPlan({ ...plan, edges: plan.edges.filter((_, at) => at !== index) })}>移除此连接</button>
      </div>)}</div> : <p className="fs-muted">方案没有连接关系。</p>}
      {plan.nodes?.length > 1 && plan.edges?.length < 36 && <button onClick={() => setPlan({ ...plan, edges: [...plan.edges, { from: plan.nodes[0].id, to: plan.nodes[1].id }] })}>添加连接</button>}
      {plan.notes?.length > 0 && <div className="fs-note">{plan.notes.join('；')}</div>}
      <button className="fs-primary fs-wide" onClick={onConfirm}>确认结构，生成图稿</button><p className="fs-micro">根据当前方案在本机排版，不再调用模型。当前画布将替换，可撤销。</p>
    </div>}
  </div>;
}

export function EditPanel({ instruction, setInstruction, selected, scope, busy, onEdit, patch, onApply, onDismiss, revision, limits }) {
  return <div className="fs-panel-content"><h3>用语言修改图稿</h3><p className="fs-muted">{selected ? `本次针对所选对象：${selected.text?.slice(0, 30) || selected.type}。` : '请先在画布中选择一个已有对象。'}修改会进入同一份图稿与撤销历史。新增、删除与分组请用画布工具。</p>
    {selected?.type === 'panel' && <div className="fs-note">编辑作用域：所选面板及其 {scope?.relatedCount || 0} 个相关子对象，共 {scope?.objectIds?.length || 1} 个对象。移动面板会同步移动全部子对象。</div>}
    {scope?.error && selected && <p className="fs-error" role="alert">{scope.error}</p>}
    <label className="fs-field"><span>修改要求</span><textarea rows={5} value={instruction} maxLength={limits?.instructionChars || 2000} onChange={(event) => setInstruction(event.target.value)} placeholder="例如：把所选文字改为 7 pt，将输出模块向右移动 5 mm，其他对象保持不变。" /></label>
    <button className="fs-primary fs-wide" disabled={busy || !instruction.trim() || !selected || !!scope?.error} onClick={onEdit}>{busy ? <Loader2 size={15} className="fs-spin" /> : <Send size={15} />}{busy ? '正在提出修改…' : '提出修改方案'}</button>
    {patch && <div className="fs-plan-review"><h4>待应用的修改</h4><p className="fs-muted">基于版本 {patch.baseRevision}，共 {patch.commands.length} 项修改{patch.objectIds?.length ? `；请求作用域为 ${patch.objectIds.length} 个对象` : ''}。</p><ol className="fs-command-list">{patch.commands.map((command, index) => <li key={index}><strong>{({ update: '更新对象', add: '添加对象', remove: '删除对象', canvas: '调整画布', rule: '调整工作规则', title: '修改标题', reorder: '调整图层' })[command.type] || command.type}</strong><span>{command.id || command.element?.id || command.title || ''}</span>{command.patch && <pre>{JSON.stringify(command.patch, null, 2)}</pre>}</li>)}</ol>
      {revision !== patch.baseRevision && <p className="fs-error">图稿已更新。此修改方案已过期，请重新提出修改。</p>}
      <div className="fs-button-row"><button className="fs-primary" disabled={revision !== patch.baseRevision} onClick={onApply}>确认应用</button><button onClick={onDismiss}>放弃方案</button></div>
    </div>}
  </div>;
}
