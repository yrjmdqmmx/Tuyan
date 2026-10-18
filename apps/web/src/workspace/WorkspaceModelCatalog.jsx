import { useMemo, useState } from 'react';
import { Search, Plus, Check, ChevronDown, ArrowRight, Boxes } from 'lucide-react';
import { ModelBrandLogo } from '../components/ModelBrandLogo.jsx';
import { ModelSpecifications } from '../components/ModelSpecifications.jsx';
import { MODEL_CHANNEL_LABELS, modelDeveloper, orderModelChannels } from '../lib/modelPresentation.js';
import { modelUnavailableForSelection, modelMissingFromCatalog } from '../lib/modelRegistry.js';
import { ROLE_NAMES } from './workspaceModels.js';
import WorkspaceDialog from './WorkspaceDialog.jsx';

const PAGE_SIZE = 24;
const channelName = (id, registry) => MODEL_CHANNEL_LABELS[id] || registry?.providers?.[id]?.label || id;
export function catalogRows(registry, { provider = '', role = '', query = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return orderModelChannels(Object.keys(registry?.providers || {})).flatMap(id => {
    if (provider && id !== provider) return [];
    return (registry.providers[id].models || []).filter(model => !modelMissingFromCatalog(registry, id, model)).filter(model => !role || model.roles?.includes(role))
      .filter(model => !needle || [model.id, model.label, model.vendor, model.developerName, channelName(id, registry), ...(model.roles || []).map(r => ROLE_NAMES[r])].join(' ').toLocaleLowerCase().includes(needle))
      .map(model => ({ provider: id, model }));
  });
}

export default function WorkspaceModelCatalog({ models, onConnection }) {
  const { registry, library, busy, ready, registryStatus } = models;
  const [provider, setProvider] = useState(''), [role, setRole] = useState(''), [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE), [adding, setAdding] = useState(null), [connectionId, setConnectionId] = useState('');
  const [saveError, setSaveError] = useState('');
  const providers = orderModelChannels(Object.keys(registry?.providers || {}));
  const rows = useMemo(() => catalogRows(registry, { provider, role, query }), [registry, provider, role, query]);
  const connections = adding ? library.connections.filter(c => c.provider === adding.provider && !c.disabled) : [];
  const connection = connections.find(c => c.id === connectionId);
  const duplicate = adding && library.models.some(m => m.connectionId === connectionId && m.modelId === adding.model.id);
  const available = adding && !modelMissingFromCatalog(registry, adding.provider, adding.model.id) && registry?.providers?.[adding.provider]?.models.find(m => m.id === adding.model.id);
  function openAdd(row) {
    const matches = library.connections.filter(c => c.provider === row.provider && !c.disabled);
    setAdding(row); setConnectionId(matches.length === 1 ? matches[0].id : ''); setSaveError('');
  }
  async function add() {
    if (!connection || !available || duplicate || modelUnavailableForSelection(available) || !ready || busy || registryStatus !== 'ready') return;
    const saved = await models.save({ ...library, models: [...library.models, { id: crypto.randomUUID(), connectionId: connection.id, modelId: available.id, disabled: false }] });
    if (saved) setAdding(null); else setSaveError('添加未完成，请检查连接状态后重试。');
  }
  return <section className="tw-catalog" aria-label="模型目录">
    <aside className="tw-catalog-channels" aria-label="模型渠道筛选">
      <p>接入渠道</p>
      <button aria-pressed={!provider} onClick={() => { setProvider(''); setLimit(PAGE_SIZE); }}><Boxes size={17}/><span>全部渠道</span><small>{catalogRows(registry).length}</small></button>
      {providers.map(id => <button key={id} aria-pressed={provider === id} onClick={() => { setProvider(id); setLimit(PAGE_SIZE); }}><ModelBrandLogo brand={id} channel/><span>{channelName(id, registry)}</span><small>{catalogRows(registry, { provider: id }).length}</small></button>)}
    </aside>
    <div className="tw-catalog-content">
      <div className="tw-catalog-filters">
        <label className="tw-catalog-search"><Search size={18}/><input aria-label="搜索模型目录" placeholder="搜索模型名称、ID 或厂商" value={query} onChange={e => { setQuery(e.target.value); setLimit(PAGE_SIZE); }}/></label>
        <label className="tw-catalog-role"><span className="sr-only">模型角色</span><select aria-label="模型角色" value={role} onChange={e => { setRole(e.target.value); setLimit(PAGE_SIZE); }}><option value="">全部角色</option>{Object.entries(ROLE_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      </div>
      <div className="tw-catalog-caption"><span>{provider ? channelName(provider, registry) : '全部渠道'} <strong>{rows.length}</strong> 个型号</span><span>同一模型在不同渠道分别列出</span></div>
      <div className="tw-catalog-grid">
        {rows.slice(0, limit).map(({ provider: id, model }) => {
          const added = library.models.filter(m => m.modelId === model.id && library.connections.some(c => c.id === m.connectionId && c.provider === id)).length;
          const unavailable = modelUnavailableForSelection(model);
          const developer = modelDeveloper(id, model);
          return <article className="tw-catalog-card" key={`${id}:${model.id}`}>
            <div className="tw-catalog-card-head"><span className="tw-catalog-logo"><ModelBrandLogo brand={developer.id}/></span><div><h3>{model.label || model.id}</h3><p>{developer.label || model.vendor || channelName(id, registry)}<span> / </span>{channelName(id, registry)}</p></div>{added > 0 && <span className="tw-catalog-added"><Check size={12}/>已添加</span>}</div>
            <code>{model.id}</code>
            <div className="tw-catalog-tags">{(model.roles || []).filter(r => ROLE_NAMES[r]).map(r => <span key={r}>{ROLE_NAMES[r]}</span>)}{!model.roles?.length && <span>角色待确认</span>}{unavailable && <span className="is-unavailable">{model.disabledReason || '当前不可选'}</span>}</div>
            <div className="tw-catalog-card-actions"><details><summary>规格与来源 <ChevronDown size={13}/></summary><ModelSpecifications provider={id} model={model}/></details><button disabled={!ready || busy || registryStatus !== 'ready' || unavailable} aria-label={`添加 ${model.label || model.id} · ${channelName(id, registry)}`} onClick={() => openAdd({ provider: id, model })}><Plus size={15}/><span>添加</span></button></div>
          </article>;
        })}
      </div>
      {!rows.length && <div className="tw-catalog-empty"><Search size={25}/><h3>{registry ? '没有匹配的模型' : registryStatus==='loading' ? '正在准备模型目录' : '暂时无法读取模型目录'}</h3><p>{registry ? '试试精确型号，或调整渠道与角色。' : registryStatus==='loading' ? '读取完成后将显示当前服务的模型列表。' : '可点击刷新目录重试，已有连接与模型仍保留。'}</p>{registry && <button onClick={() => { setProvider(''); setRole(''); setQuery(''); setLimit(PAGE_SIZE); }}>清除筛选</button>}</div>}
      {rows.length > limit && <button className="tw-catalog-more" onClick={() => setLimit(limit + PAGE_SIZE)}>继续显示 {Math.min(PAGE_SIZE, rows.length - limit)} 个型号 <ChevronDown size={15}/></button>}
    </div>
    {adding && <WorkspaceDialog title="添加到模型库" onClose={() => setAdding(null)}><div className="tw-catalog-add"><h3>{adding.model.label || adding.model.id}</h3><code>{adding.model.id}</code><p>通过 {channelName(adding.provider, registry)} 接入，选择要绑定的连接。</p>
      {connections.length ? <label>所属连接<select value={connectionId} onChange={e => setConnectionId(e.target.value)}><option value="">选择连接</option>{connections.map(c => <option key={c.id} value={c.id}>{c.label} · {c.id.slice(0, 8)}{library.models.some(m => m.connectionId === c.id && m.modelId === adding.model.id) ? ' · 已添加' : ''}</option>)}</select></label> : <div className="tw-info">还没有此渠道的连接。<button onClick={() => { onConnection(adding.provider); setAdding(null); }}>配置 {channelName(adding.provider, registry)} <ArrowRight size={14}/></button></div>}
      <p className="tw-muted">添加后可在任务的“模型配置”中选用。是否能调用取决于连接凭据、授权与该型号的权限。</p>
      {(saveError || models.error) && <p role="alert">{saveError || models.error}</p>}
      {connections.length > 0 && <button className="tw-primary" disabled={!connection || duplicate || busy || !ready || registryStatus !== 'ready' || !available || modelUnavailableForSelection(available)} onClick={add}>{duplicate ? '此连接已添加该型号' : busy ? '正在添加…' : '确认添加'}</button>}
    </div></WorkspaceDialog>}
  </section>;
}
