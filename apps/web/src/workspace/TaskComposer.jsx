import { useId, useRef } from 'react';
import { ArrowUp, Plus, SlidersHorizontal, Boxes, Sparkles, X, FileText, CornerUpLeft } from 'lucide-react';
import { getFigureType } from '../../../../packages/figure-taxonomy/src/index.js';
import { JOURNALS } from '../../../../packages/api/src/journal-rules.js';
import { MATERIAL_ACCEPT } from '../lib/materials.js';
import WorkspaceSegments from './WorkspaceSegments.jsx';
import { currentTask, currentBranch, currentDraft, refinementTarget, selectedVersion, activeRun, versionLabel, PATHS, submitIssue, hasRequirements } from './workspaceState.js';

export default function TaskComposer({ state, dispatch, onSubmit, onFiles, busy, uploadError, missingOriginal, onRestoreOriginal, onModels, onSettings, onOptimize, optimizing, optimizationContent, saveStatus }) {
  const t = currentTask(state), b = currentBranch(state), d = currentDraft(state), target = refinementTarget(state), shown = selectedVersion(state), run = activeRun(state);
  const inputId = useId(), fileRef = useRef(), restoreRef=useRef();
  const source=d.attachments.find(a=>a.purpose==='source'), editing=!!(target||source), pngEditing=editing&&t.path==='png';
  const mismatch = target && shown && target.id !== shown.id;
  const issue = busy ? '正在准备提交，请稍候' : submitIssue(state);
  const sendLabel = target ? `修改 ${target.candidateLabel} · v${target.number}` : source ? '修改原图' : t.path === 'png' ? '生成图像' : '生成矢量图';
  const edit = patch => dispatch({ type: 'EDIT_DRAFT', patch });
  const settings = d.settings[d.mode];
  function submit(e) { e.preventDefault(); if (!issue) onSubmit(); }
  return <section className="tw-composer-region" aria-label="任务输入区">
    {mismatch && <div className="tw-target-mismatch" role="status">正在查看 {versionLabel(shown)}；待修改 {versionLabel(target)}<button type="button" onClick={() => dispatch({ type: 'REFINE', versionId: shown.id })}>改为修改当前版本</button></div>}
    {target ? <div className="tw-target"><img src={target.url} alt="修改目标缩略图" /><span><small>修改对象</small><strong>基于{versionLabel(target, true)}修改</strong></span><button type="button" className="tw-text-button" onClick={() => dispatch({ type: 'VIEW', versionId: target.id })}>返回目标</button><button type="button" className="tw-icon" aria-label="退出修改" onClick={() => dispatch({ type: 'EXIT_REFINE' })}><X size={17} /></button></div>
      : <div className="tw-composer-intent"><span>{source ? `修改对象：${source.filename}` : run ? '下一次操作草稿' : '新方案'} · {PATHS[t.path]}</span>{b.lastTargetId && (b.refinements[b.lastTargetId]?.text || b.refinements[b.lastTargetId]?.attachments.length > 0) && <button type="button" onClick={() => dispatch({ type: 'REFINE', versionId: b.lastTargetId })}>继续未完成修改</button>}</div>}
    <form className="tw-composer" onSubmit={submit}>
      <label className="tw-sr" htmlFor={inputId}>{target ? '修改要求' : '绘图要求'}</label>
      <textarea id={inputId} value={d.text} maxLength={100000} rows={3} placeholder={target ? '说明希望修改什么，以及哪些内容需要保持…' : '描述研究内容、绘图目标，以及需要保留或避免的细节…'} onChange={e => edit({ text: e.target.value })} onKeyDown={e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing && e.keyCode !== 229) submit(e);
      }} />
      {!!d.attachments.length && <div className="tw-attachments">{d.attachments.map(a => <div className="tw-attachment" key={a.id}><FileText size={17} /><span title={a.filename}>{a.filename}</span><select aria-label={`${a.filename} 的用途`} value={a.purpose || ''} onChange={e => edit({ attachments: d.attachments.map(item => item.id === a.id ? { ...item, purpose: e.target.value } : item) })}>
        <option value="">确认用途</option><option value="research">研究材料</option><option value="reference">参考图片</option><option value="source">待修改原图</option>
      </select>{pngEditing && a.purpose === 'reference' && <select aria-label={`${a.filename} 的参考目的`} value={a.referencePurpose || ''} onChange={e => edit({attachments:d.attachments.map(item => item.id===a.id ? {...item,referencePurpose:e.target.value} : item)})}><option value="">确认参考目的</option><option value="content">内容</option><option value="layout">布局</option><option value="color">配色</option><option value="style">风格</option></select>}<button type="button" className="tw-icon" aria-label={`移除 ${a.filename}`} onClick={() => edit({ attachments: d.attachments.filter(item => item.id !== a.id) })}><X size={15} /></button></div>)}</div>}
      {(d.caption || d.avoid) && <div className="tw-supplements"><label>指定图注<input value={d.caption} onChange={e => edit({ caption: e.target.value })} /></label><label>避免出现<input value={d.avoid} onChange={e => edit({ avoid: e.target.value })} /></label></div>}
      <div className="tw-composer-toolbar">
        <input className="tw-sr" type="file" tabIndex={-1} ref={fileRef} accept={MATERIAL_ACCEPT} multiple onChange={e => { const files = [...e.target.files]; e.target.value = ''; onFiles(files); }} />
        <button type="button" className="tw-icon tw-upload" aria-label="添加附件" disabled={busy} onClick={() => fileRef.current?.click()}><Plus size={22} /></button>
        <WorkspaceSegments className="tw-mode" label="设置深度" value={d.mode} onChange={mode => edit({ mode })} options={[{ value: 'simple', label: '普通' }, { value: 'advanced', label: '专业' }]} />
        <div className="tw-toolbar-spacer" />
        <div className="tw-composer-actions">
        {onOptimize && <button type="button" className="tw-tool" disabled={busy || !!run || optimizing} onClick={onOptimize}><Sparkles size={17} /><span>{optimizing ? '优化中…' : '优化输入'}</span></button>}
        <button type="button" className="tw-tool" onClick={onModels}><Boxes size={17} /><span>模型配置</span></button>
        <button type="button" className="tw-tool" onClick={onSettings}><SlidersHorizontal size={17} /><span>绘图设置</span></button>
        <button type="submit" className="tw-send" disabled={!!issue} aria-label={sendLabel} title={issue || sendLabel} aria-describedby={`${inputId}-status`}><ArrowUp size={21} /><span>{sendLabel}</span></button>
        </div>
      </div>
    </form>
    <div className="tw-composer-summary"><button className="tw-composer-settings-summary" type="button" onClick={onSettings}>{settings.journalSelection && `${JOURNALS.find(j => j.id === settings.journalSelection.journalId)?.name || settings.journalSelection.journalId} · `}{settings.figureTypeId && `${getFigureType(settings.figureTypeId)?.label || settings.figureTypeId} · `}比例 {settings.ratio === 'auto' ? '自动' : settings.ratio} · {pngEditing ? '单张精修 · 执行后评审' : <>{editing ? '版本修改' : `${settings.candidates} 个候选`} · {settings.reviews} 轮评审</>}{t.path === 'png' && settings.imageSize ? ` · ${settings.imageSize}` : ''}{!target && settings.retrievalSetting === 'none' ? ' · 不检索' : ''}{!target && settings.pipelineMode === 'planner_critic' ? ' · 快速生成' : ''}</button></div>
    <div className="tw-composer-foot" id={`${inputId}-status`}><span role="status">{uploadError || (busy ? '正在准备提交，请稍候…' : issue && (d.text || run) ? issue : saveStatus)}</span>
      {missingOriginal && <><input ref={restoreRef} className="tw-sr" type="file" tabIndex={-1} aria-label="选择补传原件" accept={MATERIAL_ACCEPT} onChange={e=>{const file=e.target.files[0];e.target.value='';onRestoreOriginal?.(file);}}/><button type="button" disabled={busy} onClick={()=>restoreRef.current?.click()}>补传 {missingOriginal.filename}</button></>}
      {!target && t.runs.some(r => r.kind === 'generate' && r.path === t.path) && !hasRequirements(d) && <button type="button" onClick={() => dispatch({ type: 'REUSE' })}><CornerUpLeft size={13} />复用上次要求</button>}
    </div>
    {optimizationContent}
  </section>;
}
