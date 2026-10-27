import MenuSelect from '../components/MenuSelect.jsx';
import WorkspaceExecutionDetails from './WorkspaceExecutionDetails.jsx';
import { useEffect, useId, useRef, useState } from 'react';
import { History, Columns2, Download, LoaderCircle, FileImage, AlertCircle, ArrowRight } from 'lucide-react';
import WorkspaceDialog from './WorkspaceDialog.jsx';
import RatioCanvas from './RatioCanvas.jsx';
import FigureViewport from './FigureViewport.jsx';
import GenerationCanvas from './GenerationCanvas.jsx';
import GenerationProgressPanel from './GenerationProgressPanel.jsx';
import { currentTask, currentBranch, selectedVersion, groupLabel, versionLabel, locateVersion, activeRun, currentDraft, canRestoreRun, PATHS } from './workspaceState.js';

function Preview({ version, className = '' }) {
  const [failed, setFailed] = useState(false);
  return <div className={`tw-image-view ${className}`}>{version.loadError?<p role="status">{version.loadError}</p>:failed ? <p role="alert">此版本预览加载失败，原记录仍保留。<button type="button" onClick={() => setFailed(false)}>重新载入</button></p> : <img key={version.id} src={version.url} alt={versionLabel(version, true)} onError={() => setFailed(true)} />}</div>;
}
export default function ResultWorkspace({ state, dispatch, renderSvgEditor, onDownload, onCloseUnaccepted, userId, renderRecovery, executionProgress }) {
  const t = currentTask(state), b = currentBranch(state), v = selectedVersion(state), running = activeRun(state);
  const [panel, setPanel] = useState(null), [compareId, setCompareId] = useState('');
  const [downloading,setDownloading]=useState(false);
  const [progressOpen,setProgressOpen]=useState(false);
  const progressTrigger = useRef(null), progressPanelId = useId();
  const currentRun = running?.path === t.path && (running.groupId === b.groupId || !running.accepted && !v) ? running : null;
  const showGeneration = currentRun && !v;
  const editableCanvas = !showGeneration && t.path === 'svg' && !!renderSvgEditor && !v?.loadError;
  useEffect(() => setProgressOpen(false), [t.id, t.path, currentRun?.id]);
  function closeProgress(restoreFocus) { setProgressOpen(false); if (restoreFocus) progressTrigger.current?.focus({ preventScroll: true }); }
  async function download(){if(downloading)return;setDownloading(true);try{await onDownload(v);}finally{setDownloading(false);}}
  const group = b.groups.find(g => g.id === b.groupId);
  const candidate = group?.candidates.find(c => c.id === b.candidateId);
  const latest = running || t.runs.filter(r => r.path === t.path).at(-1);
  const versions = Object.values(t.branches).flatMap(branch => branch.groups.flatMap(g => g.candidates.flatMap(c => c.versions.map(v => locateVersion(t, v.id)))));
  const compare = versions.find(item => item.id === compareId && item.id !== v?.id) || versions.find(item => item.id === v?.parentId) || versions.find(item => item.id !== v?.id);
  function open(next) { setProgressOpen(false); dispatch({ type: 'INTERACT' }); setPanel(next); }
  function showVersion(id) { dispatch({ type: 'VIEW', versionId: id }); setPanel(null); }
  const status = latest?.status === 'failed' ? latest.error : running ? `${PATHS[running.path]} · ${running.stage}` : latest ? latest.kind === 'edit' ? latest.stage || '手工编辑已保存' : '本次执行完成' : '';
  const restoreConflict = !canRestoreRun(t, latest);
  const expected = group?.expected || 0;
  const missing = Math.max(0, expected - (group?.candidates.length || 0));
  const availableVersionId=b.unreadVersionId||group?.candidates[0]?.versions.at(-1)?.id;
  return <section className={`tw-results ${editableCanvas ? 'is-editing' : ''}`} aria-label="绘图结果">
    {latest && latest.kind !== 'edit' && <div className={`tw-run-status ${latest.status === 'failed' ? 'is-error' : ''}`} role="status">{running ? <LoaderCircle size={16} className="tw-spin" /> : latest.status === 'failed' ? <AlertCircle size={16} /> : <span className="tw-status-dot" />}<span>{status}</span>{running?.accepted && (running.path !== t.path || running.groupId !== b.groupId) && <button type="button" onClick={() => { dispatch({ type: 'SET_PATH', path: running.path }); dispatch({ type: 'VIEW_GROUP', id: running.groupId }); }}>查看本次结果</button>}{b.unreadVersionId && <button type="button" className="tw-new-version" onClick={() => showVersion(b.unreadVersionId)}>有新版本可查看<ArrowRight size={14} /></button>}{running?.execution && !running.accepted && !running.execution.jobId && onCloseUnaccepted && <button type="button" onClick={onCloseUnaccepted}>取消未接收提交</button>}{currentRun && <button type="button" ref={progressTrigger} className="tw-stage-trigger" aria-expanded={progressOpen} aria-controls={progressPanelId} onClick={() => setProgressOpen(value => !value)}>阶段记录</button>}<button type="button" onClick={() => open('execution')}>执行详情</button></div>}
    {latest?.status === 'failed' && <div className="tw-run-status"><button type="button" disabled={restoreConflict} onClick={() => dispatch({ type: 'RESTORE_RUN', runId: latest.id })}>恢复本次输入</button><span>{restoreConflict ? '当前草稿已有新内容；原要求保留在执行详情，不会覆盖。' : '先恢复草稿，再由你决定是否重新执行。'}</span></div>}
    <div className="tw-result-toolbar">
      {!!b.groups.length && <label><span className="tw-sr">生成组</span><MenuSelect aria-label="生成组" value={b.groupId || ''} onChange={e => dispatch({ type: 'VIEW_GROUP', id: e.target.value })}>{b.groups.map(g => <option value={g.id} key={g.id}>{groupLabel(t, g)}</option>)}</MenuSelect></label>}
      {v && <span className="tw-version-label">{versionLabel(v)}<small>{v.format.toUpperCase()}</small></span>}
      <div className="tw-toolbar-spacer" />
      {v && !v.loadError && <div className="tw-result-actions">
        {latest?.kind === 'edit' && <button type="button" onClick={() => open('execution')}><span>执行详情</span></button>}
        <button type="button" onClick={() => open('versions')}><History size={16} /><span>版本</span></button>
        <button type="button" onClick={() => open('compare')} disabled={versions.length < 2}><Columns2 size={16} /><span>比较</span></button>
        {onDownload ? <button type="button" disabled={downloading} onClick={download}><Download size={16} /><span>{downloading?'准备下载…':`下载 ${v.format.toUpperCase()}`}</span></button> : <a href={v.url} download={`Tuyan-${v.candidateLabel}-v${v.number}.${v.format}`}><Download size={16} /><span>下载 {v.format.toUpperCase()}</span></a>}
      </div>}
    </div>
    {!latest && b.unreadVersionId && <button type="button" className="tw-new-version" onClick={() => showVersion(b.unreadVersionId)}>有新版本可查看<ArrowRight size={14} /></button>}
    <div className={`tw-canvas ${v ? 'has-figure' : ''} ${editableCanvas ? 'is-editing' : ''} ${showGeneration ? 'is-generating' : ''}`}>
      {showGeneration ? <GenerationCanvas key={currentRun.id} run={currentRun} taskId={t.id} progress={executionProgress} /> : editableCanvas ? renderSvgEditor(v) : v?.loadError ? <div className="tw-preview-failure" role="alert">{v.loadError}</div> : v ? <FigureViewport key={v.id} version={v} interactionKey={running?.id} onInteract={() => dispatch({ type: 'INTERACT' })} onFullscreen={() => open('fullscreen')} />
        : <RatioCanvas ratio={(running?.path === t.path ? running.input : currentDraft(state)).settings[(running?.path === t.path ? running.input : currentDraft(state)).mode].ratio}><div className="tw-canvas-empty">{running?.path === t.path ? <LoaderCircle className="tw-spin" size={28} /> : <FileImage size={32} />}<h2>{availableVersionId?'已有结果可查看':running?.path === t.path ? '图像正在形成' : '此路径尚无结果'}</h2>{availableVersionId?<button type="button" onClick={()=>showVersion(availableVersionId)}>查看已生成版本</button>:<p>{running?.path === t.path ? '候选返回后会显示在这里。你可以继续准备下一次操作。' : '在下方描述绘图目标，开始一个新方案。'}</p>}</div></RatioCanvas>}
      {progressOpen && currentRun && <GenerationProgressPanel key={currentRun.id} id={progressPanelId} run={currentRun} taskId={t.id} progress={executionProgress} triggerRef={progressTrigger} onClose={closeProgress} />}
    </div>
    {group && <nav className={`tw-candidates ${expected === 1 ? 'is-single' : ''}`} aria-label="候选图">
      {group.candidates.map(c => { const cv = c.versions.find(v => v.id === c.viewedVersionId) || c.versions.at(-1); return <button type="button" className={`tw-candidate ${b.candidateId === c.id ? 'is-selected' : ''}`} key={c.id} aria-pressed={b.candidateId === c.id} aria-label={`查看候选 ${c.label} · v${cv.number}`} onClick={() => showVersion(cv.id)}>
        {expected !== 1 && !cv.loadError && <img src={cv.url} alt="" />}{cv.loadError&&<span className="tw-muted">{cv.loadError}</span>}<span>候选 {c.label}<small>v{cv.number}{c.versions.at(-1).id !== cv.id ? ' · 有更新' : ''}</small></span>
      </button>; })}
      {Array.from({ length: missing }, (_, i) => <div className="tw-candidate-placeholder" key={i}>{running?.groupId === group.id ? <LoaderCircle size={15} className="tw-spin" /> : <AlertCircle size={15} />}<span>候选 {String.fromCharCode(65 + group.candidates.length + i)}<small>{running?.groupId === group.id ? '等待结果' : '未产生结果'}</small></span></div>)}
    </nav>}
    {panel === 'versions' && v && <WorkspaceDialog title="版本记录" onClose={() => setPanel(null)}><p className="tw-muted">{groupLabel(t, group)} · 候选 {candidate.label}。选择版本后，下方输入将基于该版本继续修改。</p><div className="tw-version-list">{[...candidate.versions].reverse().map(item => <button type="button" key={item.id} aria-pressed={item.id === v.id} onClick={() => showVersion(item.id)}><strong>v{item.number} · {item.origin}</strong><span>{item.parentId ? `基于 v${locateVersion(t, item.parentId)?.number}` : '初始版本'} · {item.review}</span></button>)}</div></WorkspaceDialog>}
    {panel === 'fullscreen' && v && <WorkspaceDialog fullscreen title={versionLabel(v, true)} onClose={() => setPanel(null)}>{v.loadError?<p role="status">{v.loadError}</p>:<FigureViewport key={v.id} version={v} fullscreen onFullscreen={() => setPanel(null)} />}</WorkspaceDialog>}
    {panel === 'compare' && v && compare && <WorkspaceDialog wide title="版本比较" onClose={() => setPanel(null)}><label className="tw-compare-picker">与哪个版本比较<MenuSelect value={compare.id} onChange={e => setCompareId(e.target.value)}>{versions.filter(item => item.id !== v.id).map(item => <option value={item.id} key={item.id}>{versionLabel(item, true)}</option>)}</MenuSelect></label><div className="tw-compare"><figure><figcaption>{versionLabel(v, true)}</figcaption><Preview version={v} /></figure><figure><figcaption>{versionLabel(compare, true)}</figcaption><Preview key={compare.id} version={compare} /></figure></div><p className="tw-muted">比较仅用于查看，底部输入区的修改对象保持不变。</p></WorkspaceDialog>}
    {panel === 'execution' && <WorkspaceDialog className="tw-execution-dialog" title="执行详情" onClose={() => setPanel(null)}><WorkspaceExecutionDetails task={t} dispatch={dispatch} userId={userId} renderRecovery={renderRecovery} onShowVersion={showVersion}/></WorkspaceDialog>}
  </section>;
}
