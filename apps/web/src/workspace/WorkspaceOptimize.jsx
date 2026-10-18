import { useEffect, useRef, useState } from 'react';
import { X, Check, Undo2 } from 'lucide-react';
import { modelOption, selectedModelReference, browserCredentialKey } from './workspaceModels.js';
import { API_BASE_DEFAULT } from '../config.js';
import { uid, currentTask, currentBranch, currentDraft } from './workspaceState.js';
import { withOptimizationMaterials } from './workspaceOptimization.js';

export default function WorkspaceOptimize({ stateRef, models, userId, health, sync, dispatch, children }) {
  const pending = useRef(false), alive = useRef(true), request = useRef(null);
  const [result, setResult] = useState(null), [progress, setProgress] = useState(''), [error, setError] = useState('');
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  function addressedDraft(address) {
    const task = stateRef.current.tasks.find(t => t.id === address.taskId), branch = task?.branches[address.path];
    return address.draftTargetId ? branch?.refinements[address.draftTargetId] : branch?.draft;
  }
  async function optimize() {
    if (pending.current) return;
    const s = stateRef.current, address = { taskId: currentTask(s).id, path: currentTask(s).path, draftTargetId: currentBranch(s).targetId };
    const draft = structuredClone(currentDraft(s));
    const isCurrent = () => alive.current && currentTask(stateRef.current).id === address.taskId && currentTask(stateRef.current).path === address.path && currentBranch(stateRef.current).targetId === address.draftTargetId && !currentTask(stateRef.current).activeRunId;
    pending.current = true; setError(''); setResult(null); setProgress('正在准备优化…');
    try {
      if (!draft.text.trim() && !draft.attachments.length) throw Error('请先填写绘图要求或添加附件。');
      if (address.draftTargetId && !draft.text.trim()) throw Error('请先填写希望修改的内容。');
      if (draft.attachments.length && !health?.simulation && health?.inputOptimizationMaterialsVersion !== 1) throw Error('当前服务尚未支持附件优化，请更新服务后再试。');
      if (!userId) throw Error('请先登录并配置主模型。');
      if (!isCurrent()) throw Error('本任务已有活动执行，请完成后再优化输入。');
      if (!health?.simulation && !health?.executionEnabled) throw Error('当前服务未开放执行。');
      const settings = draft.settings[draft.mode], entry = models.library.models.find(m => m.id === settings.models?.main?.libraryModelId);
      if (!entry) throw Error('请先在模型配置选择主模型。');
      const option = modelOption(entry, models.library, models.registry, 'main', address.path, false, models.summary?.tokenDance);
      if (option.reason) throw Error(option.reason);
      const c = option.connection, route = { accessProvider: c.provider, modelId: entry.modelId, ...(c.provider === 'custom' ? { custom: { ...entry.custom, ...c.custom } } : {}) };
      if (!health.simulation && health.executionMode !== 'production' && !health.allowedProviders?.includes(c.provider)) throw Error('当前真实验收未开放该渠道。');
      const target = address.draftTargetId ? 'editInstruction' : 'methodContent';
      const fingerprint = JSON.stringify({ address, draft, route });
      if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, runId: uid() };
      const runId = request.current.runId;
      await sync.ensureSynced();
      const data = await withOptimizationMaterials({ base: API_BASE_DEFAULT, attachments: draft.attachments, simulation: health.simulation, isCurrent, onProgress: value => { if (alive.current) setProgress(value); } }, async materialFiles => {
        if (!isCurrent()) throw Error('任务已切换，未开始优化。');
        const response = await fetch(API_BASE_DEFAULT + '/paperbanana-api', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Workspace-Account': userId }, body: JSON.stringify({
          action: 'optimizeInputs', target,
          inputs: { methodContent: draft.text, caption: draft.caption, negativePrompt: draft.avoid, ...(address.draftTargetId ? { editInstruction: draft.text } : {}) },
          ...(materialFiles.length ? { materialFiles } : {}), mainRoute: route, modelRoutes: { main: route },
          ...(c.provider === 'minimax' ? { providerRegions: { minimax: c.region } } : {}),
          workspaceExecution: { version: 1, taskId: address.taskId, runId, libraryRevision: models.library.revision, models: { main: selectedModelReference(option) }, browserCredentials: !health.simulation && c.scope === 'browser' ? { [c.id]: localStorage.getItem(browserCredentialKey(API_BASE_DEFAULT, userId, c)) || '' } : {} },
        }), signal: AbortSignal.timeout(materialFiles.length ? 130000 : 65000) });
        const data = await response.json();
        if (!response.ok || data.code || data.target !== target || typeof data.optimizedText !== 'string' || !data.optimizedText.trim()) throw Error(data.error || '优化未完成，原文保留。');
        return data;
      });
      request.current = null;
      if (isCurrent()) setResult({ address, original: draft.text, candidate: data.optimizedText, applied: false, warnings: data.materialWarnings || [] });
    } catch (e) { if (alive.current) setError(e.message); }
    finally { pending.current = false; if (alive.current) setProgress(''); }
  }
  function apply(undo = false) {
    const current = addressedDraft(result.address), expected = undo ? result.candidate : result.original;
    if (!current || current.text !== expected) { setError('要求已修改，请手动合并优化稿；不会覆盖最新文字。'); return; }
    dispatch({ type: 'EDIT_DRAFT', ...result.address, patch: { text: undo ? result.original : result.candidate } });
    setResult({ ...result, applied: !undo }); setError('');
  }
  const content = (progress || error || result) && <section className="tw-optimization" aria-label="输入优化结果" aria-busy={!!progress}>
    {progress && <p role="status">{progress}</p>}
    {error && <p role="alert">{error}</p>}
    {result && <><header><strong>{result.applied ? '已采用优化稿' : '优化稿'}</strong><button type="button" className="tw-icon" aria-label="收起优化结果" onClick={() => { setResult(null); setError(''); }}><X size={16}/></button></header>
      {!result.applied && <textarea aria-label="优化后的绘图要求" value={result.candidate} readOnly rows={5}/>}
      {!!result.warnings.length && <details><summary>附件读取说明</summary>{result.warnings.map((warning, i) => <p key={i}>{warning}</p>)}</details>}
      <div className="tw-optimization-actions">{result.applied ? <button type="button" className="tw-tool" onClick={() => apply(true)}><Undo2 size={16}/>撤销采用</button> : <button type="button" className="tw-tool" onClick={() => apply()}><Check size={16}/>采用优化稿</button>}</div>
    </>}
  </section>;
  return children({ start: optimize, optimizing: !!progress, content });
}
