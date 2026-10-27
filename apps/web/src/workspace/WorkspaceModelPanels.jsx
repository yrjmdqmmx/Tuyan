import WorkspaceBailianConnection, {cleanBailianConnection} from './WorkspaceBailianConnection.jsx';
import WorkspaceModelCatalog, {catalogRows} from './WorkspaceModelCatalog.jsx';
import WorkspaceModelPicker from './WorkspaceModelPicker.jsx';
import {ModelBrandLogo} from '../components/ModelBrandLogo.jsx';
import WorkspaceApiSetup from './WorkspaceApiSetup.jsx';
import ThinkingSettings from '../components/ThinkingSettings.jsx';
import {workspaceThinking} from './workspaceThinking.js';
import WorkspaceCustomModel, {CustomConnectionFields,cleanCustomConnection} from './WorkspaceCustomModel.jsx';
import {universalModelEntry} from '../lib/universalContract.js';
import { useState } from 'react';
import { Plus, KeyRound, Link2, RefreshCw } from 'lucide-react';
import { orderModelChannels } from '../lib/modelPresentation.js';
import { providerDefaultRoutes } from '../lib/modelRouting.js';
import { ROLE_NAMES, modelOption, selectedModelReference, libraryModelMissingFromCatalog } from './workspaceModels.js';
import WorkspaceDialog from './WorkspaceDialog.jsx';
import TokenDancePanel from '../components/TokenDancePanel.jsx';
import WorkspaceChannelPicker, { channelLabel } from './WorkspaceChannelPicker.jsx';

export function WorkspaceModelManager({ models, onSignIn, health, onUseApi, initialView }) {
  const { library, registry, summary, busy, error, ready } = models;
  const [form, setForm] = useState(null), [secret, setSecret] = useState(''), [formError, setFormError] = useState('');
  const [connectionId, setConnectionId] = useState(''), [role, setRole] = useState('main'), [tab, setTab] = useState(['library','connections'].includes(initialView) ? initialView : 'catalog');
  const connection = library.connections.find(c => c.id === connectionId && !c.disabled);
  const visibleModels = library.models.filter(entry => !libraryModelMissingFromCatalog(entry, library, registry));
  const providers = orderModelChannels([...new Set([...Object.keys(registry?.providers || {}), 'custom'])]);
  const [query, setQuery] = useState(''),[editingCustom,setEditingCustom]=useState(null);
  const [channelOpen,setChannelOpen]=useState(false), [apiSetup,setApiSetup]=useState(initialView === 'api');
  async function saveConnection(e) {
    e.preventDefault(); setFormError('');
    if (!form.label.trim()) { setFormError('请填写连接名称'); return; }
    if (form.scope === 'account' && !models.userId) { setFormError('请先登录图研'); return; }
    let normalized;try{normalized=cleanBailianConnection(cleanCustomConnection(form));}catch(e){setFormError(e.message);return;}
    const previous = library.connections.find(c => c.id === form.id);
    if (previous && (previous.scope !== form.scope || previous.region !== form.region || JSON.stringify(previous.custom)!==JSON.stringify(normalized.custom) || JSON.stringify(previous.bailian)!==JSON.stringify(normalized.bailian)) && !secret.trim()) { setFormError('更换保存位置、服务地区或业务空间时，请重新输入要使用的密钥。已有密钥不会自动复制。'); return; }
    if (await models.save({ ...library, connections: [...library.connections.filter(c => c.id !== form.id), { ...normalized, label: form.label.trim() }] }, { id: form.id, value: secret })) { setForm(null); setSecret(''); }
  }
  const openConnection = (c, provider) => { setForm(c || { id: crypto.randomUUID(), provider: provider || providers.find(p => p !== 'tokendance') || 'openai', label: '', scope: 'browser', region: 'global', disabled: false }); setSecret(''); setFormError(''); };
  async function useAuthorization() {
    const existing = library.connections.find(c => c.provider === 'tokendance');
    if (existing) { setConnectionId(existing.id); return; }
    const c = { id: crypto.randomUUID(), provider: 'tokendance', label: '观猹 TokenDance', scope: 'authorization', region: 'global', disabled: false };
    if (await models.save({ ...library, connections: [...library.connections, c] })) setConnectionId(c.id);
  }
  return <div className="tw-model-management">
    <div className="tw-page-intro tw-model-intro"><div><span className="tw-model-eyebrow">模型与连接</span><h2>找到适合研究的模型</h2><p>浏览模型能力，接入常用渠道，再为每个任务选择合适的分工。</p></div><div className="tw-model-top-actions"><button className="tw-text-button" disabled={busy} onClick={() => { models.refresh(); models.retry(); }}><RefreshCw size={16}/>刷新目录</button><button className="tw-primary" disabled={!ready || busy} onClick={() => openConnection()}><Plus size={16}/>添加连接</button></div></div>
    <nav className="tw-model-tabs" aria-label="模型管理视图">{[['catalog','模型目录',catalogRows(registry).length],['library','我的模型',visibleModels.length],['connections','渠道连接',library.connections.length]].map(([id,label,count])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}<span>{count}</span></button>)}<button className="tw-model-custom-link" disabled={!ready||busy} onClick={()=>setApiSetup(true)}>自定义 API 与导入</button></nav>
    {!models.userId && <p className="tw-info">当前为浏览器模型库。<button onClick={onSignIn}>登录图研</button>后可保存账号连接；现有浏览器密钥不会自动上传。</p>}
    {(error || models.registryStatus !== 'ready') && <p role="status">{error || (models.registryStatus === 'loading' ? '正在读取现有模型目录…' : '模型目录暂时不可用，已有配置仍保留。')}</p>}
    {tab==='catalog' && <WorkspaceModelCatalog models={models} onConnection={provider=>{setTab('connections');if(provider!=='tokendance')openConnection(null,provider);}}/>}
    {tab==='connections' && <><section className="tw-management-section"><div className="tw-section-heading"><h3><Link2 size={18}/>渠道连接</h3><button className="tw-text-button" disabled={!ready || busy} onClick={() => openConnection()}><Plus size={16}/>添加连接</button></div>
      <div className="tw-connection-card"><span className="tw-connection-logo"><ModelBrandLogo brand="tokendance" channel/></span><div className="tw-connection-identity"><strong>观猹 TokenDance</strong><small>{summary?.tokenDance?.connected ? '已读取现有授权，无需 API 密钥' : summary?.error || (models.userId ? '未连接或正在检查授权' : '登录后读取已有授权')}</small></div><div className="tw-connection-actions"><button onClick={()=>setChannelOpen(true)}>授权与钱包</button><button disabled={!models.userId || !summary?.tokenDance?.connected || !ready || busy} onClick={useAuthorization}>复用已有授权</button></div></div>
      {library.connections.map(c => <div className="tw-connection-card" key={c.id}><span className="tw-connection-logo"><ModelBrandLogo brand={c.provider} channel/></span><div className="tw-connection-identity"><strong>{c.label}</strong><small>{channelLabel(c.provider)} · {c.scope === 'browser' ? '当前浏览器' : c.scope === 'account' ? '图研账号' : '已有授权'} · {c.id.slice(0, 8)}</small></div><span className="tw-connection-status">{c.disabled ? '已停用' : c.scope === 'authorization' ? (summary?.tokenDance?.connected ? '授权已连接' : '需重新确认授权') : c.hasCredential ? '密钥已保存 · 调用结果见执行记录' : '缺少密钥'}</span>{c.scope !== 'authorization' && <div className="tw-connection-actions"><button onClick={() => openConnection(c)}>配置</button></div>}</div>)}
      {!library.connections.length && <p className="tw-muted">还没有添加连接。只保存配置不会调用模型。</p>}
    </section>
    <section className="tw-management-section"><h3>自定义模型</h3><p className="tw-muted">标准渠道的型号可直接从模型目录添加。自定义连接可在此填写精确型号及能力。</p><div className="tw-library-controls"><label>自定义连接<select value={connection?.provider==='custom'?connection.id:''} onChange={e => setConnectionId(e.target.value)}><option value="">选择连接</option>{library.connections.filter(c => !c.disabled && c.provider==='custom').map(c => <option key={c.id} value={c.id}>{c.label} · {c.id.slice(0, 8)}</option>)}</select></label><label>模型角色<select value={role} onChange={e => setRole(e.target.value)}>{Object.entries(ROLE_NAMES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
      {connection?.provider==='custom' && <WorkspaceCustomModel key={`${connection.id}-${role}`} connection={connection} role={role} models={models}/>}
    </section></>}
    {tab==='library' && <section className="tw-management-section tw-saved-models"><div className="tw-section-heading"><h3>已添加模型 · {visibleModels.length}</h3><button onClick={()=>setTab('catalog')}><Plus size={16}/>从目录添加</button></div><p className="tw-muted">这些型号会出现在任务的模型配置中；停用会保留已有任务记录。</p><input className="tw-search-input" aria-label="搜索已添加模型" placeholder="搜索型号或连接名称" value={query} onChange={e => setQuery(e.target.value)}/>
      {visibleModels.filter(m => `${m.modelId} ${library.connections.find(c => c.id === m.connectionId)?.label}`.toLowerCase().includes(query.toLowerCase())).map(m => {
        const c = library.connections.find(c => c.id === m.connectionId), model = m.custom ? universalModelEntry({accessProvider:'custom',modelId:m.modelId,custom:{...m.custom,...c.custom}}) : registry?.providers?.[c?.provider]?.models.find(x => x.id === m.modelId);
        return <div className="tw-library-model" key={m.id}><span className="tw-catalog-logo"><ModelBrandLogo brand={c?.provider} channel/></span><div><strong>{model?.label || m.modelId}</strong><small>{m.modelId} · {c?.label} · {c?.id.slice(0, 8)}</small><p>{model?.roles?.map(r => ROLE_NAMES[r]).filter(Boolean).join(' / ') || '当前目录尚未确认角色'} · {m.disabled ? '已停用' : model?.disabledReason || (model?.selectable === false ? '当前不可用' : '已添加 · 添加不代表调用已验证')}</p></div>{m.custom&&<button onClick={()=>setEditingCustom(m)}>配置能力</button>}<button disabled={busy} onClick={() => models.save({ ...library, models: library.models.map(item => item.id === m.id ? { ...item, disabled: !item.disabled } : item) })}>{m.disabled ? '启用' : '停用'}</button></div>;
      })}{!visibleModels.length && <p className="tw-muted">添加后，可在任务内按主模型、绘图模型和视觉理解分别选择。</p>}
    </section>}
    {apiSetup&&<WorkspaceDialog wide title="自定义 API 高级配置" onClose={()=>setApiSetup(false)}><WorkspaceApiSetup models={models} health={health} onUse={onUseApi} onSaved={()=>setApiSetup(false)}/></WorkspaceDialog>}
    {channelOpen&&<WorkspaceDialog wide title="TokenDance 授权与钱包" onClose={()=>{setChannelOpen(false);void models.refresh();}}><TokenDancePanel controller={models.tokenDance}/></WorkspaceDialog>}
    {editingCustom&&<WorkspaceDialog wide title="自定义模型能力" onClose={()=>setEditingCustom(null)}><WorkspaceCustomModel entry={editingCustom} connection={library.connections.find(c=>c.id===editingCustom.connectionId)} role={editingCustom.custom.capabilities.imageGeneration?'image':'main'} models={models} onSaved={()=>setEditingCustom(null)}/></WorkspaceDialog>}
    {form && <WorkspaceDialog className="tw-connection-dialog" title="配置渠道连接" onClose={() => { setForm(null); setSecret(''); }}><form className="tw-connection-form" onSubmit={saveConnection}>
      <div className="tw-connection-fields">
      <div className="tw-connection-basics">
      <label>连接名称<input required maxLength={100} placeholder="例如：科研项目" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}/></label>
      <WorkspaceChannelPicker value={form.provider} providers={providers.filter(p => p !== 'tokendance')} disabled={library.connections.some(c => c.id === form.id)} onChange={provider => setForm({ ...form, provider, ...(provider==='custom'?{custom:{version:1,connectionId:form.id,protocol:'openai-chat',baseUrl:'',auth:'bearer',catalogFormat:'none'}}:{}) })}/>
      </div>
      {form.provider==='custom'?<CustomConnectionFields value={form} onChange={next=>{setForm(next);setSecret('');}}/>:<p className="tw-muted tw-connection-hint">使用该渠道的官方 API 地址。</p>}
      {form.provider === 'bailian' && <WorkspaceBailianConnection value={form} onChange={next=>{setForm(next);setSecret('');}}/>}
      {form.provider === 'minimax' && <label>服务区域<select value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}><option value="global">国际</option><option value="cn">国内</option></select></label>}
      <fieldset><legend>密钥保存位置</legend>{[['browser', '保存在当前浏览器', '仅此浏览器可用；清除网站数据后需重新填写。'], ['account', '绑定图研账号', models.userId ? '同一图研账号可用；密钥在服务端加密保存。' : '登录图研后可用；密钥在服务端加密保存。']].map(([value, title, description]) => <label className={`tw-storage-option ${form.scope === value ? 'is-selected' : ''}`} key={value}><input type="radio" name="scope" checked={form.scope === value} disabled={value === 'account' && !models.userId} onChange={() => { setForm({ ...form, scope: value }); setSecret(''); }}/><span><strong>{title}</strong><small>{description}</small></span></label>)}</fieldset>
      <label><span><KeyRound size={16} aria-hidden="true"/> API 密钥</span><input aria-label="API 密钥" type="password" autoComplete="off" value={secret} onChange={e => setSecret(e.target.value)} placeholder="输入 API 密钥" maxLength={16384}/><small className="tw-connection-hint">留空保留同一保存位置的已有密钥。切换位置不会自动复制或上传密钥。</small></label>
      <p className="tw-muted tw-connection-hint">保存仅记录连接配置，不会调用模型或验证调用权限。</p>
      </div>
      <div className="tw-connection-footer">
        {(formError || error) && <p role="alert">{formError || error}</p>}
        <div><button type="button" onClick={() => { setForm(null); setSecret(''); }}>取消</button><button className="tw-primary" disabled={busy} type="submit">{busy ? '正在保存…' : '保存连接'}</button></div>
      </div>
    </form></WorkspaceDialog>}
  </div>;
}

export function WorkspaceModelConfig({ models, draft, path, editing, onChange, onManage }) {
  const { library, registry, summary } = models, settings = draft.settings[draft.mode], selected = settings.models || {};
  const roles = path === 'png' ? ['main', 'image', 'vision'] : ['main', 'vision'];
  const [preset, setPreset] = useState('');
  const thinking=workspaceThinking(settings,models,path,editing);
  function applyPreset() {
    const c = library.connections.find(c => c.id === preset); if (!c) return;
    const defaults = providerDefaultRoutes(c.provider, registry, {}), next = {};
    for (const role of roles) {
      const entry = library.models.find(m => m.connectionId === c.id && m.modelId === defaults?.[role]?.modelId);
      const option = entry && modelOption(entry, library, registry, role, path, editing, summary?.tokenDance);
      if (option && !option.reason) next[role] = selectedModelReference(option);
    }
    // A multimodal main model can inspect the actual image in the planning and
    // review call itself. Do not default to a second pass through the same model.
    if (next.main && next.vision?.libraryModelId === next.main.libraryModelId) delete next.vision;
    onChange({ ...settings, models: next, presetConnectionId: c.id });
  }
  return <div className="tw-model-config">{models.error && <p role="alert">{models.error}</p>}
    {draft.mode === 'simple' && <section><label className="tw-field">普通预设<select value={preset} onChange={e => setPreset(e.target.value)}><option value="">选择连接</option>{library.connections.filter(c => !c.disabled).map(c => <option value={c.id} key={c.id}>{c.label}</option>)}</select></label><button disabled={!preset || models.registryStatus !== 'ready'} onClick={applyPreset}>应用此连接的默认组合</button><small>只使用该连接已添加且符合条件的默认型号，缺少角色会明确保留为空。</small></section>}
    {roles.map(role => {
      const options = library.models.map(m => modelOption(m, library, registry, role, path, editing, summary?.tokenDance));
      const current = selected[role], option = options.find(o => o.id === current?.libraryModelId);
      const main = selected.main && library.models.find(m => m.id === selected.main.libraryModelId);
      const mainVision = main && modelOption(main, library, registry, 'vision', path, editing, summary?.tokenDance);
      return <div className="tw-role-card" key={role}><WorkspaceModelPicker models={models} role={role} path={path} editing={editing} current={current} onManage={onManage} onChange={reference => onChange({ ...settings, models: { ...selected, [role]: reference } })}/>

        {option?.reason && <p role="status">{option.reason}。请在模型管理中处理，系统不会替换型号。</p>}{role === 'vision' && !current && <p className="tw-muted">{mainVision && !mainVision.reason ? '当前主模型具备视觉角色能力；需要视觉处理时可复用主模型。' : '需要视觉分析时须补充符合条件的模型。无视觉步骤时不会调用。'}</p>}
        {draft.mode==='advanced' && current && <ThinkingSettings role={role} settings={thinking} registry={registry} operation={editing?'editing':'generation'} onChange={(role,value)=>onChange({...settings,thinking:{...settings.thinking,[role]:{libraryModelId:selected[role].libraryModelId,options:value.options}}})}/>}
      </div>;
    })}<button className="tw-text-button" onClick={onManage}>前往模型管理，添加型号或配置连接 →</button></div>;
}
