import MenuSelect from '../components/MenuSelect.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Check, ChevronDown, ArrowRight } from 'lucide-react';
import { ModelBrandLogo } from '../components/ModelBrandLogo.jsx';
import { ModelSpecifications } from '../components/ModelSpecifications.jsx';
import { MODEL_CHANNEL_LABELS, modelDeveloper, modelDeveloperAliases, orderModelChannels } from '../lib/modelPresentation.js';
import { modelUnavailableForSelection, modelMissingFromCatalog, modelRetiredFromCatalog } from '../lib/modelRegistry.js';
import { universalModelEntry } from '../lib/universalContract.js';
import { ROLE_NAMES, libraryModelMissingFromCatalog } from './workspaceModels.js';
import WorkspaceDialog from './WorkspaceDialog.jsx';
import WorkspaceRoleFilter from './WorkspaceRoleFilter.jsx';

const PAGE_SIZE = 24;
const channelName = (id, registry) => MODEL_CHANNEL_LABELS[id] || registry?.providers?.[id]?.label || (id === 'custom' ? '自定义 API' : id);
export function catalogRows(registry, { provider = '', developer = '', role = '', query = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return orderModelChannels(Object.keys(registry?.providers || {})).flatMap(id => {
    if (provider && id !== provider) return [];
    return (registry.providers[id].models || []).filter(model => model.roles?.some(role => ROLE_NAMES[role])).filter(model => !modelMissingFromCatalog(registry, id, model) && !modelRetiredFromCatalog(model)).filter(model => !role || model.roles?.includes(role))
      .filter(model => !developer || modelDeveloper(id, model).id === developer)
      .filter(model => !needle || [model.id, model.label, model.vendor, model.developerName, ...modelDeveloperAliases(modelDeveloper(id, model).id), channelName(id, registry), ...(model.roles || []).map(r => ROLE_NAMES[r])].join(' ').toLocaleLowerCase().includes(needle))
      .map(model => ({ provider: id, model }));
  });
}

// Keep the saved identity and connection even when multiple connections use the same model.
export function libraryRows(library, registry) {
  return library.models.filter(entry => !libraryModelMissingFromCatalog(entry, library, registry)).map(entry => {
    const connection = library.connections.find(item => item.id === entry.connectionId);
    const provider = connection?.provider || 'custom';
    const model = entry.custom
      ? universalModelEntry({ accessProvider: 'custom', modelId: entry.modelId, custom: { ...entry.custom, ...connection?.custom } })
      : registry?.providers?.[provider]?.models?.find(item => item.id === entry.modelId);
    return { provider, model: model || { id: entry.modelId, roles: [] }, entry, connection };
  });
}

function matchesRow({ provider, model, connection }, { developer, role, query }, registry) {
  const identity = modelDeveloper(provider, model);
  const needle = query.trim().toLocaleLowerCase();
  return (!developer || identity.id === developer) && (!role || model.roles?.includes(role)) &&
    (!needle || [model.id, model.label, model.vendor, identity.label, ...modelDeveloperAliases(identity.id), channelName(provider, registry), connection?.label, connection?.id, ...(model.roles || []).map(id => ROLE_NAMES[id])].join(' ').toLocaleLowerCase().includes(needle));
}

export default function WorkspaceModelCatalog({ models, onConnection, mode = 'catalog', onBrowse, onEditCustom }) {
  const { registry, library, busy, ready, registryStatus } = models;
  const [provider, setProvider] = useState(''), [role, setRole] = useState(''), [query, setQuery] = useState('');
  const [developer, setDeveloper] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE), [adding, setAdding] = useState(null), [connectionId, setConnectionId] = useState('');
  const [saveError, setSaveError] = useState('');
  const saved = mode === 'library';
  const scrollRef = useRef(null);
  const allRows = useMemo(() => saved ? libraryRows(library, registry) : catalogRows(registry), [saved, library, registry]);
  const providers = orderModelChannels(saved ? [...new Set(allRows.map(row => row.provider))] : Object.keys(registry?.providers || {}));
  const channelCounts = useMemo(() => allRows.reduce((counts, row) => {
    counts[row.provider] = (counts[row.provider] || 0) + 1;
    return counts;
  }, {}), [allRows]);
  const providerId = providers.includes(provider) ? provider : providers.find(id => channelCounts[id]) || providers[0] || '';
  const channelRows = useMemo(() => allRows.filter(row => row.provider === providerId), [allRows, providerId]);
  const developers = useMemo(() => {
    const groups = new Map();
    for (const row of channelRows) {
      const identity = modelDeveloper(row.provider, row.model);
      if (!groups.has(identity.id)) groups.set(identity.id, { ...identity, count: 0 });
      groups.get(identity.id).count++;
    }
    return [...groups.values()];
  }, [channelRows]);
  const activeDeveloper = developers.find(item => item.id === developer) || developers[0];
  const developerId = activeDeveloper?.id || '';
  const rows = useMemo(() => channelRows.filter(row => matchesRow(row, { developer: developerId, role, query }, registry)), [channelRows, registry, developerId, role, query]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [providerId, developerId, role, query]);
  function chooseProvider(id) {
    setProvider(id);
    setDeveloper(developerId && allRows.some(row => row.provider === id && modelDeveloper(row.provider, row.model).id === developerId) ? developerId : '');
    setLimit(PAGE_SIZE);
  }
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
  return <section className="tw-catalog" aria-label={saved ? '我的模型' : '模型目录'}>
    <aside className="tw-catalog-rail tw-catalog-channels" aria-label="模型渠道筛选" tabIndex={0}>
      <p>接入渠道</p>
      {providers.map(id => <button key={id} aria-pressed={providerId === id} onClick={() => chooseProvider(id)}><ModelBrandLogo brand={id} channel/><span>{channelName(id, registry)}</span><small>{channelCounts[id] || 0}</small></button>)}
    </aside>
    <aside className="tw-catalog-rail tw-catalog-developers" aria-label="模型厂商筛选" tabIndex={0}>
      <p>模型厂商</p>
      {developers.map(item => <button key={item.id} aria-pressed={developerId === item.id} onClick={() => { setDeveloper(item.id); setLimit(PAGE_SIZE); }}><ModelBrandLogo brand={item.id}/><span>{item.label}</span><small>{item.count}</small></button>)}
    </aside>
    <div className="tw-catalog-content">
      <div className="tw-catalog-filters">
        <label className="tw-catalog-search"><Search size={18}/><input aria-label={saved ? '搜索已添加模型' : '搜索模型目录'} placeholder={saved ? '搜索型号、厂商或连接名称' : '搜索模型名称、ID 或厂商'} value={query} onChange={e => { setQuery(e.target.value); setLimit(PAGE_SIZE); }}/></label>
        <WorkspaceRoleFilter value={role} onChange={value => { setRole(value); setLimit(PAGE_SIZE); }}/>
      </div>
      <div className="tw-catalog-caption"><span>{providerId ? channelName(providerId, registry) : '模型目录'}{activeDeveloper && ` / ${activeDeveloper.label}`} <strong>{rows.length}</strong> 个型号</span>{saved ? <button className="tw-text-button" onClick={onBrowse}><Plus size={14}/>从目录添加</button> : <span>同一模型在不同渠道分别列出</span>}</div>
      <div className="tw-catalog-scroll" ref={scrollRef} tabIndex={0} aria-label={saved ? '已添加模型卡片' : '模型目录卡片'}>
      <div className="tw-catalog-grid">
        {rows.slice(0, limit).map(({ provider: id, model, entry, connection: savedConnection }) => {
          const added = library.models.filter(m => m.modelId === model.id && library.connections.some(c => c.id === m.connectionId && c.provider === id)).length;
          const unavailable = modelUnavailableForSelection(model);
          const developer = modelDeveloper(id, model);
          return <article className="tw-catalog-card" key={entry?.id || `${id}:${model.id}`}>
            <div className="tw-catalog-card-head"><span className="tw-catalog-logo"><ModelBrandLogo brand={developer.id}/></span><div><h3 title={model.label || model.id}>{model.label || model.id}</h3><p title={`${developer.label || model.vendor || channelName(id, registry)} / ${channelName(id, registry)}`}>{developer.label || model.vendor || channelName(id, registry)}<span> / </span>{channelName(id, registry)}</p></div></div>
            <div className="tw-catalog-card-meta">
              <code title={model.id}>{model.id}</code>
              <div className="tw-catalog-tags">{(model.roles || []).filter(r => ROLE_NAMES[r]).map(r => <span key={r}>{ROLE_NAMES[r]}</span>)}{!model.roles?.length && <span>角色待确认</span>}</div>
            </div>
            {saved && <div className="tw-catalog-connection" title={`${savedConnection?.label || '连接不存在'} · ${entry.connectionId}`}><span>{savedConnection?.label || '连接不存在'} · {entry.connectionId.slice(0, 8)}</span>{entry.custom && <button onClick={() => onEditCustom(entry)}>配置能力</button>}</div>}
            <ModelSpecifications provider={id} model={model} compactSources footerActions={<div className="tw-catalog-card-actions">
              {saved ? <><span className={entry.disabled || unavailable || savedConnection?.disabled || !savedConnection ? 'tw-catalog-unavailable' : 'tw-catalog-added'} title={model.disabledReason || '已添加不代表调用已验证；停用保留任务记录'}>{entry.disabled ? '已停用' : !savedConnection ? '连接不存在' : savedConnection.disabled ? '连接已停用' : unavailable ? '暂不可用' : '已添加'}</span><button disabled={!ready || busy} aria-label={`${entry.disabled ? '启用' : '停用'} ${model.label || model.id} · ${savedConnection?.label || entry.connectionId}`} onClick={() => models.save({ ...library, models: library.models.map(item => item.id === entry.id ? { ...item, disabled: !item.disabled } : item) })}>{entry.disabled ? '启用' : '停用'}</button></> : <>{unavailable ? <span className="tw-catalog-unavailable" title={model.disabledReason || '当前不可选'}>暂不可用</span> : added > 0 && <span className="tw-catalog-added"><Check size={12}/>已添加</span>}
              <button disabled={!ready || busy || registryStatus !== 'ready' || unavailable} aria-label={`添加 ${model.label || model.id} · ${channelName(id, registry)}`} onClick={() => openAdd({ provider: id, model })}><Plus size={15}/><span>添加</span></button></>}
            </div>}/>
          </article>;
        })}
      </div>
      {!rows.length && <div className="tw-catalog-empty"><Search size={25}/><h3>{saved && !allRows.length ? '还没有添加模型' : registry ? '没有匹配的模型' : registryStatus==='loading' ? '正在准备模型目录' : '暂时无法读取模型目录'}</h3><p>{saved && !allRows.length ? '从模型目录添加后，可在这里查看规格、筛选和管理。' : registry ? '试试精确型号，或调整渠道、厂商与角色。' : registryStatus==='loading' ? '读取完成后将显示当前服务的模型列表。' : '可点击刷新目录重试，已有连接与模型仍保留。'}</p>{registry && <button onClick={() => { setRole(''); setQuery(''); setLimit(PAGE_SIZE); }}>清除筛选</button>}</div>}
      {rows.length > limit && <button className="tw-catalog-more" onClick={() => setLimit(limit + PAGE_SIZE)}>继续显示 {Math.min(PAGE_SIZE, rows.length - limit)} 个型号 <ChevronDown size={15}/></button>}
      </div>
    </div>
    {adding && <WorkspaceDialog title="添加到模型库" onClose={() => setAdding(null)}><div className="tw-catalog-add"><h3>{adding.model.label || adding.model.id}</h3><code>{adding.model.id}</code><p>通过 {channelName(adding.provider, registry)} 接入，选择要绑定的连接。</p>
      {connections.length ? <label>所属连接<MenuSelect value={connectionId} onChange={e => setConnectionId(e.target.value)}><option value="">选择连接</option>{connections.map(c => <option key={c.id} value={c.id}>{c.label} · {c.id.slice(0, 8)}{library.models.some(m => m.connectionId === c.id && m.modelId === adding.model.id) ? ' · 已添加' : ''}</option>)}</MenuSelect></label> : <div className="tw-info">还没有此渠道的连接。<button onClick={() => { onConnection(adding.provider); setAdding(null); }}>配置 {channelName(adding.provider, registry)} <ArrowRight size={14}/></button></div>}
      <p className="tw-muted">添加后可在任务的“模型配置”中选用。是否能调用取决于连接凭据、授权与该型号的权限。</p>
      {(saveError || models.error) && <p role="alert">{saveError || models.error}</p>}
      {connections.length > 0 && <button className="tw-primary" disabled={!connection || duplicate || busy || !ready || registryStatus !== 'ready' || !available || modelUnavailableForSelection(available)} onClick={add}>{duplicate ? '此连接已添加该型号' : busy ? '正在添加…' : '确认添加'}</button>}
    </div></WorkspaceDialog>}
  </section>;
}
