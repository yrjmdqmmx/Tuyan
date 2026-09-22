import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ArrowUpRight, Circle, Download, FilePlus2, FolderOpen, Image, Layers3, Maximize2, Minimize2, MousePointer2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Redo2, Save, Square, SquareDashed, Type, Undo2, X } from 'lucide-react';
import { applyCommands, createDocument, createExampleDocument, documentFromPlan } from '@paperbanana/figure-core';
import { API_BASE_DEFAULT, BACKEND_MODE } from '../config.js';
import SitePageShell from '../components/SitePageShell.jsx';
import FigureCanvas from './FigureCanvas.jsx';
import Inspector, { TYPE_LABELS } from './Inspector.jsx';
import RulesPanel from './RulesPanel.jsx';
import { EditPanel, ModelSettings, PlanPanel } from './ModelPanel.jsx';
import ExportDialog from './ExportDialog.jsx';
import { getCapabilities, requestEdit, requestPlan } from './api.js';
import { downloadBlob, filename, historyReducer, initialHistory, makeElement, MAX_SOURCE_BYTES, parseSource, STORAGE_KEY } from './state.js';
import { validateSourceAssets } from './sourceAssets.js';
import { selectedEditScope } from './editScope.js';
import { figureAuthAccess } from './authAccess.js';

const EMPTY_MODEL = Object.freeze({ provider: '', modelId: '', key: '', valid: false });

function useReadOnlyViewport() {
  const [readOnly, setReadOnly] = useState(() => globalThis.matchMedia?.('(max-width: 900px)').matches ?? false);
  useEffect(() => {
    const media = globalThis.matchMedia?.('(max-width: 900px)');
    if (!media) return undefined;
    const update = () => setReadOnly(media.matches);
    media.addEventListener('change', update); update();
    return () => media.removeEventListener('change', update);
  }, []);
  return readOnly;
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('图片读取失败。'));
    reader.onload = () => {
      const image = new globalThis.Image();
      image.onload = () => resolve({ dataUrl: reader.result, pixelWidth: image.naturalWidth, pixelHeight: image.naturalHeight, mimeType: file.type });
      image.onerror = () => reject(new Error('这不是可读取的 PNG、JPEG 或 WebP 图片。'));
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function FigureStudio() {
  return <SitePageShell section="figure-studio" apiBase={API_BASE_DEFAULT} backendMode={BACKEND_MODE || 'gateway'} className="figure-site-shell">
    {(page) => <FigureStudioEditor {...page} />}
  </SitePageShell>;
}

export function FigureStudioEditor({ auth, currentUser, authGeneration, onSignIn }) {
  const authIdentity = `${currentUser?.id || 'anonymous'}:${authGeneration}`;
  const authIdentityRef = useRef(authIdentity); authIdentityRef.current = authIdentity;
  useEffect(() => {
    authIdentityRef.current = authIdentity;
    return () => { authIdentityRef.current = null; };
  }, [authIdentity]);
  const [history, dispatch] = useReducer(historyReducer, undefined, () => initialHistory());
  const { document: doc } = history;
  const documentRef = useRef(doc); documentRef.current = doc;
  const documentSession = useRef(0);
  const readOnly = useReadOnlyViewport();
  const [selectedId, setSelectedId] = useState(null);
  const [leftTab, setLeftTab] = useState('plan');
  const [rightTab, setRightTab] = useState('properties');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const previousPanels = useRef(null);
  const expandButton = useRef(null);
  const authAccess = figureAuthAccess(auth, currentUser);

  function toggleExpanded() {
    if (expanded) {
      setLeftCollapsed(previousPanels.current?.left || false);
      setRightCollapsed(previousPanels.current?.right || false);
      setExpanded(false);
      expandButton.current?.focus();
    } else {
      previousPanels.current = { left: leftCollapsed, right: rightCollapsed };
      setLeftCollapsed(true); setRightCollapsed(true); setExpanded(true);
    }
  }
  useEffect(() => {
    if (!expanded) return undefined;
    const exit = (event) => {
      if (event.key === 'Escape' && !event.target?.closest?.('[role="dialog"]')) { event.preventDefault(); toggleExpanded(); }
    };
    window.addEventListener('keydown', exit);
    return () => window.removeEventListener('keydown', exit);
  }, [expanded]);
  const [materials, setMaterials] = useState('');
  const [plan, setPlan] = useState(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [patch, setPatch] = useState(null);
  const [model, setModel] = useState(EMPTY_MODEL);
  // A newly mounted settings panel must never see the previous account's key,
  // including the render before the account-change cleanup effect runs.
  const safeModel = model.authIdentity === authIdentity ? model : EMPTY_MODEL;
  const updateModel = useCallback((next) => setModel((previous) => {
    if (authIdentityRef.current !== authIdentity) return previous;
    const current = previous.authIdentity === authIdentity ? previous : EMPTY_MODEL;
    const updated = typeof next === 'function' ? next(current) : next;
    return updated === current && current === previous ? previous : { ...updated, authIdentity };
  }), [authIdentity]);
  const [capabilityState, setCapabilities] = useState(null);
  const capabilities = capabilityState?.authIdentity === authIdentity ? capabilityState.value : null;
  const [serviceError, setServiceError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saveStatus, setSaveStatus] = useState('尚未保存');
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileRules, setMobileRules] = useState(false);
  const sourceInput = useRef(null);
  const imageInput = useRef(null);
  const selected = doc.elements.find((element) => element.id === selectedId);
  const editScope = selectedEditScope(doc, selectedId, capabilities?.limits?.maxSelectedObjects);

  useEffect(() => { document.title = '论文画布 · 图研 Tuyan'; }, []);
  useEffect(() => {
    setModel({ ...EMPTY_MODEL, authIdentity });
    setPlan(null); setPatch(null); setPlanBusy(false); setEditBusy(false); setExportOpen(false);
  }, [authIdentity]);
  useEffect(() => {
    setCapabilities(null);
    if (auth.isPending || !currentUser?.id) { setServiceError(''); return undefined; }
    const controller = new AbortController();
    getCapabilities({ signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted && authIdentityRef.current === authIdentity) { setCapabilities({ authIdentity, value: result }); setServiceError(''); }
    }).catch(() => {
      if (!controller.signal.aborted && authIdentityRef.current === authIdentity) setServiceError('论文画布服务暂不可用。可继续本机编辑与导出 SVG；请稍后重试。');
    });
    return () => controller.abort();
  }, [auth.isPending, authIdentity, currentUser?.id]);
  useEffect(() => {
    if (history.recoveryError) { setError(history.recoveryError); return; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(doc)); setSaveStatus('已保存在此浏览器'); }
    catch { setSaveStatus('本机保存失败，请下载源稿'); }
  }, [doc, history.recoveryError]);
  useEffect(() => { if (selectedId && !selected) setSelectedId(null); }, [selectedId, selected]);

  function commands(items, baseRevision = documentRef.current.revision) {
    if (readOnly) return false;
    try {
      applyCommands(documentRef.current, items, { baseRevision });
      dispatch({ type: 'commands', commands: items, baseRevision }); setError(''); return true;
    } catch (error) { setError(error.message || '这次修改未应用。'); return false; }
  }
  function select(id) { setSelectedId(id); if (id) setRightTab('properties'); }
  function removeSelected() { if (selectedId && commands([{ type: 'remove', id: selectedId }])) setSelectedId(null); }
  useEffect(() => {
    if (readOnly) return undefined;
    const keydown = (event) => {
      const target = event.target;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); dispatch({ type: event.shiftKey ? 'redo' : 'undo' }); }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected(); }
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [readOnly, selectedId]);

  function saveSource() {
    downloadBlob(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), filename(doc.title, 'tuyan.json'));
    setNotice('源稿已下载。可用「打开源稿」恢复完整对象与图片。');
  }
  function openDocument(document, message) {
    documentSession.current += 1;
    dispatch({ type: 'open', document }); setSelectedId(null); setPatch(null); setPlan(null); setError(''); setNotice(message);
  }
  async function importSource(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    const current = { id: doc.id, revision: doc.revision, session: documentSession.current };
    try {
      if (file.size > MAX_SOURCE_BYTES) throw new Error('源稿不能超过 12 MB。');
      const document = parseSource(await file.text());
      await validateSourceAssets(document);
      if (current.id !== documentRef.current.id || current.revision !== documentRef.current.revision || current.session !== documentSession.current) throw new Error('读取源稿期间当前图稿已更改，请重新打开文件。');
      if (doc.elements.length) saveSource();
      openDocument(document, doc.elements.length ? '源稿已打开。已发起原图稿备份下载，请确认文件已保存。' : '源稿已打开。');
    } catch (error) { setError(`无法打开源稿：${error.message} 当前图稿保持不变。`); }
  }
  function newDocument(example = false) {
    if (doc.elements.length) saveSource();
    openDocument(example ? createExampleDocument() : createDocument({ title: '未命名图稿' }), example ? '已打开示例图稿，用于体验对象编辑；不是模型生成结果。' : '已新建空白图稿。');
  }
  function addObject(type) {
    const element = makeElement(type, doc.elements.length);
    if (type === 'text') {
      const size = doc.ruleOverrides['text-size'];
      if (size?.enabled !== false && size?.value) element.fontSize = Math.max(size.value.min, Math.min(size.value.max, element.fontSize));
      const font = doc.ruleOverrides['standard-font'];
      if (font?.enabled !== false && font?.value?.length) element.fontFamily = font.value[0];
    }
    if (commands([{ type: 'add', element }])) { select(element.id); setLeftTab('layers'); }
  }
  async function uploadImage(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    const current = { id: doc.id, revision: doc.revision, session: documentSession.current };
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('仅支持 PNG、JPEG 和 WebP。');
      if (file.size > 5 * 1024 * 1024) throw new Error('单张图片请控制在 5 MB 内。');
      const asset = await readImage(file);
      const assetId = `asset-${crypto.randomUUID()}`;
      await validateSourceAssets({ assets: { ...doc.assets, [assetId]: asset } });
      if (current.id !== documentRef.current.id || current.revision !== documentRef.current.revision || current.session !== documentSession.current) throw new Error('读取图片期间图稿已更改，请重新添加图片。');
      const element = { id: `image-${crypto.randomUUID()}`, type: 'image', assetId, x: 15, y: 15, width: 60, height: 60 * asset.pixelHeight / asset.pixelWidth };
      if (commands([{ type: 'asset', id: assetId, asset }, { type: 'add', element }])) select(element.id);
    } catch (error) { setError(error.message); }
  }
  function context() {
    if (authIdentityRef.current !== authIdentity || !currentUser?.id || auth.isPending) throw new Error('请先登录图研，再使用模型规划或语言编辑。');
    if (!capabilities?.modelPlanning) throw new Error('论文画布模型服务尚不可用，请稍后重试。');
    if (!safeModel.valid || !safeModel.provider || !safeModel.modelId) throw new Error('请展开下方模型设置，从当前目录中明确选择可用的主文本模型。');
    if (!safeModel.key.trim()) throw new Error('请填写所选渠道的 API Key。密钥只在当前页面使用。');
    return { mainRoute: { accessProvider: safeModel.provider, modelId: safeModel.modelId }, apiKeys: { [safeModel.provider]: safeModel.key.trim() }, ...(safeModel.provider === 'minimax' ? { providerRegions: safeModel.providerRegions } : {}) };
  }
  function requireModelSession() {
    if (authAccess.state === 'authenticated') return true;
    if (authAccess.state === 'pending') { setNotice(authAccess.notice); return false; }
    setError(''); onSignIn(); return false;
  }
  async function buildPlan() {
    if (!requireModelSession()) return;
    let payload;
    try { payload = { materials, ...context() }; } catch (error) { setError(error.message); return; }
    const requestDocument = { id: doc.id, revision: doc.revision, session: documentSession.current, authIdentity };
    setPlanBusy(true); setError('');
    try {
      const result = await requestPlan(payload);
      if (authIdentityRef.current !== requestDocument.authIdentity) return;
      if (documentSession.current !== requestDocument.session || documentRef.current.id !== requestDocument.id || documentRef.current.revision !== requestDocument.revision) { setNotice('请求期间图稿已更改，旧结构方案未写入。当前图稿已保留。'); return; }
      setPlan(result.plan); setNotice('结构方案已返回。请核对节点与关系，确认后再生成图稿。');
    }
    catch (error) { if (authIdentityRef.current === requestDocument.authIdentity) setError(modelError(error)); } finally { if (authIdentityRef.current === requestDocument.authIdentity) setPlanBusy(false); }
  }
  function confirmPlan() {
    try {
      const next = documentFromPlan(plan, { profileId: doc.profileId, canvas: doc.canvas, ruleOverrides: doc.ruleOverrides, customRules: doc.customRules });
      if (commands([{ type: 'replace-content', title: next.title, elements: next.elements, assets: next.assets }])) { setPlan(null); setSelectedId(null); setLeftTab('layers'); setNotice('已按确认的结构生成对象图稿，可继续编辑或撤销。'); }
    } catch (error) { setError(error.message); }
  }
  async function buildEdit() {
    if (!requireModelSession()) return;
    let payload;
    try {
      if (!selectedId) throw new Error('请先选择一个已有对象。当前语言编辑仅修改所选对象，新增与删除请使用画布工具。');
      const scope = selectedEditScope(doc, selectedId, capabilities?.limits?.maxSelectedObjects);
      if (scope.error) throw new Error(scope.error);
      payload = { document: doc, instruction, objectIds: scope.objectIds, baseRevision: doc.revision, ...context() };
    } catch (error) { setError(error.message); return; }
    const requestSession = documentSession.current;
    const requestAuthIdentity = authIdentity;
    setEditBusy(true); setError(''); setPatch(null);
    try {
      const result = await requestEdit(payload);
      if (authIdentityRef.current !== requestAuthIdentity) return;
      if (documentSession.current !== requestSession || documentRef.current.id !== payload.document.id) { setNotice('请求期间已切换图稿，旧修改方案已丢弃。'); return; }
      if (result.baseRevision !== payload.baseRevision) throw new Error('修改方案的版本不匹配，未应用。');
      applyCommands(payload.document, result.commands, { baseRevision: result.baseRevision });
      setPatch({ ...result, documentId: payload.document.id, objectIds: payload.objectIds }); setNotice('修改方案已返回。确认应用后才会改变当前图稿。');
    } catch (error) { if (authIdentityRef.current === requestAuthIdentity) setError(modelError(error)); } finally { if (authIdentityRef.current === requestAuthIdentity) setEditBusy(false); }
  }

  return <div className={`figure-studio ${readOnly ? 'fs-readonly' : ''} ${expanded ? 'is-expanded' : ''}`} data-expanded={expanded}>

    <div className="fs-document-bar"><div className="fs-document-name"><input aria-label="图稿标题" readOnly={readOnly} key={`${doc.id}-${doc.title}`} defaultValue={doc.title} onBlur={(event) => { if (event.target.value.trim() && event.target.value !== doc.title) commands([{ type: 'title', title: event.target.value.trim() }]); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><span className={saveStatus.includes('失败') ? 'fs-error' : ''}>{saveStatus}</span></div><div className="fs-document-actions"><button ref={expandButton} aria-label={expanded ? '还原编辑区' : '展开编辑区'} aria-pressed={expanded} title={expanded ? '还原编辑区（Esc）' : '展开编辑区，集中查看图稿'} onClick={toggleExpanded}>{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}<span>{expanded ? '还原编辑区' : '展开编辑区'}</span></button>{!readOnly && <><button aria-label="撤销" title="撤销 ⌘Z" disabled={!history.past.length} onClick={() => dispatch({ type: 'undo' })}><Undo2 size={17} /></button><button aria-label="重做" title="重做 ⇧⌘Z" disabled={!history.future.length} onClick={() => dispatch({ type: 'redo' })}><Redo2 size={17} /></button><span className="fs-separator" /></>}<button onClick={() => sourceInput.current.click()}><FolderOpen size={16} /><span>打开源稿</span></button><button className="fs-source-save" onClick={saveSource}><Save size={16} /><span>保存源稿</span></button><button className="primary-button fs-primary" onClick={() => setExportOpen(true)}><Download size={16} />导出</button></div></div>
    <input className="fs-file-input" type="file" ref={sourceInput} accept=".json,.tuyan.json,application/json" onChange={importSource} />
    <input className="fs-file-input" type="file" ref={imageInput} accept="image/png,image/jpeg,image/webp" onChange={uploadImage} />
    {(error || notice) && <div className={`fs-banner ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}><span>{error || notice}</span><button aria-label="关闭提示" onClick={() => { setError(''); setNotice(''); }}><X size={14} /></button></div>}
    {readOnly && <div className="fs-mobile-notice">手机支持查看与导出。对象编辑请在宽屏电脑上进行。<button onClick={() => setMobileRules(!mobileRules)}>{mobileRules ? '收起检查' : '查看规则检查'}</button></div>}
    <main className={`fs-workspace ${leftCollapsed ? 'is-left-collapsed' : ''} ${rightCollapsed ? 'is-right-collapsed' : ''}`}>{!readOnly && <aside id="figure-material-panel" aria-label="材料与对象面板" className="fs-left-panel" hidden={leftCollapsed}><div className="fs-panel-tabs" role="tablist" aria-label="图稿工作流程">{[['plan', '材料与结构'], ['layers', '对象'], ['edit', '语言编辑']].map(([id, label]) => <button role="tab" aria-selected={leftTab === id} className={leftTab === id ? 'active' : ''} key={id} onClick={() => setLeftTab(id)}>{label}</button>)}</div><div className="fs-panel-scroll">
      {leftTab === 'plan' && <PlanPanel materials={materials} setMaterials={setMaterials} plan={plan} setPlan={setPlan} busy={planBusy} onPlan={buildPlan} onConfirm={confirmPlan} limits={capabilities?.limits} />}
      {leftTab === 'layers' && <div className="fs-panel-content"><div className="fs-section-heading"><h3>对象与图层</h3><span>{doc.elements.length}</span></div><p className="fs-muted">点击选择对象。在画布中拖动，或在右侧精确调整。</p>{!doc.elements.length && <div className="fs-empty-list"><Layers3 size={25} /><p>还没有对象</p><span>用上方工具添加第一个对象。</span></div>}<ol className="fs-layers">{[...doc.elements].reverse().map((element) => <li key={element.id}><button className={selectedId === element.id ? 'selected' : ''} onClick={() => select(element.id)}><span className="fs-layer-type">{TYPE_LABELS[element.type]}</span><span>{element.text || (element.type === 'panel' ? '分组面板' : element.id.slice(-6))}</span>{element.parentId && <span className="fs-layer-child">↳</span>}</button></li>)}</ol></div>}
      {leftTab === 'edit' && <EditPanel instruction={instruction} setInstruction={setInstruction} selected={selected} scope={editScope} busy={editBusy} onEdit={buildEdit} patch={patch} onApply={() => { if (patch.documentId !== doc.id) { setError('修改方案属于另一份图稿，未应用。'); setPatch(null); return; } if (commands(patch.commands, patch.baseRevision)) { setPatch(null); setNotice('修改已应用，可使用撤销恢复。'); } }} onDismiss={() => setPatch(null)} revision={doc.revision} limits={capabilities?.limits} />}
      <div hidden={leftTab === 'layers'}><ModelSettings key={authIdentity} value={safeModel} onChange={updateModel} capabilities={capabilities} /></div>
      {(authAccess.notice || serviceError) && leftTab !== 'layers' && <p className="fs-service-note">{authAccess.notice || serviceError}</p>}
    </div><div className="fs-local-footer"><button onClick={() => newDocument()}><FilePlus2 size={14} />空白图稿</button><button onClick={() => newDocument(true)}>打开示例</button><p>仅保存在此浏览器 · 不会同步到云端</p></div></aside>}
    <div className="fs-center-panel">{!readOnly && <div className="fs-tool-bar" aria-label="添加对象"><button className="fs-panel-toggle" aria-label={leftCollapsed ? '展开材料面板' : '收起材料面板'} aria-expanded={!leftCollapsed} aria-controls="figure-material-panel" title={leftCollapsed ? '展开材料面板' : '收起材料面板'} onClick={() => setLeftCollapsed(!leftCollapsed)}>{leftCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button><div className="fs-insert-tools"><span className="fs-tool-select"><MousePointer2 size={17} /></span>{[["text", Type, "文字"], ["rect", Square, "矩形"], ["ellipse", Circle, "椭圆"], ["arrow", ArrowUpRight, "箭头"], ["line", MinusLine, "线段"], ["panel", SquareDashed, "面板"]].map(([type, Icon, label]) => <button key={type} aria-label={`添加${label}`} title={`添加${label}`} onClick={() => addObject(type)}><Icon size={17} /><span>{label}</span></button>)}<button onClick={() => imageInput.current.click()}><Image size={17} /><span>图片</span></button></div><button className="fs-panel-toggle" aria-label={rightCollapsed ? '展开属性面板' : '收起属性面板'} aria-expanded={!rightCollapsed} aria-controls="figure-properties-panel" title={rightCollapsed ? '展开属性面板' : '收起属性面板'} onClick={() => setRightCollapsed(!rightCollapsed)}>{rightCollapsed ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}</button></div>}<FigureCanvas document={doc} selectedId={selectedId} onSelect={select} onCommands={commands} readOnly={readOnly} /></div>
    {(!readOnly || mobileRules) && <aside id="figure-properties-panel" aria-label="属性与规则面板" className="fs-right-panel" hidden={!readOnly && rightCollapsed}>{!readOnly && <div className="fs-panel-tabs" role="tablist" aria-label="图稿属性与检查"><button role="tab" aria-selected={rightTab === 'properties'} className={rightTab === 'properties' ? 'active' : ''} onClick={() => setRightTab('properties')}>属性</button><button role="tab" aria-selected={rightTab === 'rules'} className={rightTab === 'rules' ? 'active' : ''} onClick={() => setRightTab('rules')}>期刊规则</button></div>}<div className="fs-panel-scroll">{rightTab === 'properties' && !readOnly ? <Inspector document={doc} selectedId={selectedId} onCommands={commands} onDelete={removeSelected} /> : <RulesPanel document={doc} onCommands={commands} readOnly={readOnly} />}</div></aside>}
    </main><ExportDialog key={authIdentity} open={exportOpen} onClose={() => setExportOpen(false)} document={doc} capabilities={capabilities} saveSource={saveSource} auth={auth} currentUser={currentUser} onSignIn={onSignIn} />
  </div>;
}

function MinusLine({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M4 20 20 4" /></svg>; }
function modelError(error) {
  const message = error.message || '模型请求未完成。';
  const state = error.details?.requestState || error.details?.callState || error.details?.billingState || error.details?.providerCallState;
  return state === 'unknown' ? `${message} 渠道结果未知，未自动重试；请先核对渠道记录。当前图稿已保留。` : state === 'not_sent' ? `${message} 尚未发送至模型。当前图稿已保留。` : `${message} 当前图稿已保留，未自动重试。`;
}
