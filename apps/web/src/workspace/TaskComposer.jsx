import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, Plus, SlidersHorizontal, Boxes, Sparkles, Lightbulb, X, FileText, ChevronDown } from 'lucide-react';
import { getFigureType } from '../../../../packages/figure-taxonomy/src/index.js';
import { JOURNALS } from '../../../../packages/api/src/journal-rules.js';
import { MATERIAL_ACCEPT } from '../lib/materials.js';
import WorkspaceSegments from './WorkspaceSegments.jsx';
import { currentTask, currentBranch, currentDraft, refinementTarget, locateVersion, activeRun, versionLabel, PATHS, submitIssue } from './workspaceState.js';

export default function TaskComposer({ state, dispatch, onSubmit, onFiles, busy, uploadError, missingOriginal, onRestoreOriginal, onModels, onSettings, onPromptGuide, onInputStart, onOptimize, optimizing, optimizationContent, saveStatus, mobile = false, toolDialogOpen = false }) {
  const t = currentTask(state), b = currentBranch(state), d = currentDraft(state), target = refinementTarget(state), run = activeRun(state);
  const inputId = useId(), fileRef = useRef(), restoreRef=useRef(), textRef = useRef(), regionRef = useRef();
  const [expanded, setExpanded] = useState(false);
  // A saved or blurred draft still needs a readable, scrollable text area.
  // Only an empty, inactive composer uses the compact single-line layout.
  const multiline = expanded || Boolean(d.text);
  useEffect(() => {
    if (!mobile || !expanded) return;
    // A touch blur may have no relatedTarget, even when the user is tapping a
    // composer control. Keep that control mounted through pointerup/click and
    // collapse only when the user actually interacts outside the editing area.
    const leave = event => {
      if (!toolDialogOpen && !regionRef.current?.contains(event.target)) setExpanded(false);
    };
    document.addEventListener('pointerdown', leave, true);
    document.addEventListener('focusin', leave);
    return () => {
      document.removeEventListener('pointerdown', leave, true);
      document.removeEventListener('focusin', leave);
    };
  }, [mobile, expanded, toolDialogOpen]);
  const source=d.attachments.find(a=>a.purpose==='source'), editing=!!(target||source), pngEditing=editing&&t.path==='png';
  const targets = b.groups.flatMap(g => g.candidates.flatMap(c => [...c.versions].reverse().map(v => locateVersion(t, v.id))));
  const issue = busy ? '正在准备提交，请稍候' : submitIssue(state);
  const sendLabel = target ? `修改 ${target.candidateLabel} · v${target.number}` : source ? '修改原图' : t.path === 'png' ? '生成图像' : '生成矢量图';
  const edit = patch => {
    if ('text' in patch || 'caption' in patch || 'avoid' in patch) onInputStart?.();
    dispatch({ type: 'EDIT_DRAFT', patch });
  };
  const settings = d.settings[d.mode];
  useLayoutEffect(() => {
    const input = textRef.current;
    if (!mobile) { input.style.height = ''; return; }
    const resize = () => {
      if (!multiline) { input.style.height = '44px'; input.scrollTop = 0; input.scrollLeft = 0; return; }
      // Measure a hidden copy so typing/width changes never reset the animated,
      // focused textarea to zero height (which also makes Safari scroll it).
      const measure = input.cloneNode();
      measure.removeAttribute('id');
      measure.setAttribute('aria-hidden', 'true');
      measure.tabIndex = -1;
      measure.value = input.value;
      Object.assign(measure.style, {position:'absolute', visibility:'hidden', pointerEvents:'none',
        height:'0px', minHeight:'0px', maxHeight:'none', width:`${input.clientWidth}px`,
        padding:'10px 9px', lineHeight:'24px', whiteSpace:'pre-wrap', overflowWrap:'anywhere', transition:'none'});
      input.parentNode.appendChild(measure);
      const height = Math.min(136, Math.max(88, measure.scrollHeight));
      measure.remove();
      input.style.height = `${height}px`;
    };
    resize();
    let width = input.clientWidth;
    const observer = new ResizeObserver(() => { if (input.clientWidth !== width) { width = input.clientWidth; resize(); } });
    observer.observe(input);
    return () => observer.disconnect();
  }, [mobile, d.text, multiline]);
  const modeControl = <WorkspaceSegments className="tw-mode" label="设置深度" value={d.mode} onChange={mode => edit({ mode })} options={[{ value: 'simple', label: '普通' }, { value: 'advanced', label: '专业' }]} />;
  const sendButton = <button type="submit" className="tw-send" disabled={!!issue} aria-label={sendLabel} title={issue || sendLabel} aria-describedby={`${inputId}-status`}><ArrowUp size={21} /><span>{sendLabel}</span></button>;
  const statusText = uploadError || (busy ? '正在准备提交，请稍候…' : issue && d.text && !t.activeRunId ? issue : saveStatus);
  const summary = <div className="tw-composer-summary"><button className="tw-composer-settings-summary" type="button" onClick={onSettings}><span className="tw-composer-summary-label">{mobile && <span>{d.mode === 'advanced' ? '专业' : '普通'} · </span>}{settings.journalSelection && `${JOURNALS.find(j => j.id === settings.journalSelection.journalId)?.name || settings.journalSelection.journalId} · `}{settings.figureTypeId && `${getFigureType(settings.figureTypeId)?.label || settings.figureTypeId} · `}比例 {settings.ratio === 'auto' ? '自动' : settings.ratio} · {pngEditing ? '1 个结果 · 执行后评审' : <>{editing ? '版本修改' : `${settings.candidates} 个候选`} · {settings.reviews} 轮评审</>}{t.path === 'png' && settings.imageSize ? ` · ${settings.imageSize}` : ''}{!target && settings.retrievalSetting === 'none' ? ' · 不检索' : ''}{!target && settings.pipelineMode === 'planner_critic' ? ' · 快速生成' : ''}</span>{mobile && <ChevronDown size={12} />}</button></div>;
  function submit(e) { e.preventDefault(); if (!issue) onSubmit(); }
  return <section ref={regionRef} className={`tw-composer-region ${mobile ? 'is-mobile' : ''} ${mobile && multiline ? 'is-multiline' : ''} ${mobile && expanded ? 'is-input-focused' : ''}`} aria-label="任务输入区">
    {target ? <div className="tw-target">
      {!target.loadError && <img src={target.url} alt="修改目标缩略图" />}
      <label className="tw-target-picker"><span>当前修改对象</span><select aria-label="当前修改对象" value={target.id} onChange={e => dispatch({ type: 'VIEW', versionId: e.target.value })}>{targets.map(v => <option key={v.id} value={v.id}>{versionLabel(v, true)}{v.loadError ? ' · 图片不可用' : ''}</option>)}</select></label>
      {target.loadError && <span role="status" className="tw-target-error">{target.loadError}</span>}
    </div> : <div className="tw-composer-intent"><span>{source ? `修改对象：${source.filename}` : run ? '正在生成，可准备下一轮要求' : '新方案'} · {PATHS[t.path]}</span></div>}
    <div className="tw-composer-topline">
      {onPromptGuide && <button type="button" className="tw-prompt-guide-trigger" aria-haspopup="dialog" onClick={onPromptGuide}><Lightbulb size={15} aria-hidden="true" /><span>提示词建议</span></button>}
      {mobile && summary}
    </div>
    <form className="tw-composer" onSubmit={submit}>
      <label className="tw-sr" htmlFor={inputId}>{target ? '修改要求' : '绘图要求'}</label>
      <input className="tw-sr" type="file" tabIndex={-1} ref={fileRef} accept={MATERIAL_ACCEPT} multiple onChange={e => { const files = [...e.target.files]; e.target.value = ''; onFiles(files); }} />
      <textarea onBeforeInput={onInputStart} onCompositionStart={onInputStart} onFocus={() => setExpanded(true)} wrap="soft" ref={textRef} id={inputId} value={d.text} maxLength={100000} rows={mobile ? 1 : 3} placeholder={mobile ? target ? '描述修改要求…' : '描述你想绘制的图…' : target ? '说明希望修改什么，以及哪些内容需要保持…' : '描述研究内容、绘图目标，以及需要保留或避免的细节…'} onChange={e => edit({ text: e.target.value })} onKeyDown={e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing && e.keyCode !== 229) submit(e);
      }} />
      {!!d.attachments.length && <div className="tw-attachments">{d.attachments.map(a => <div className="tw-attachment" key={a.id}><FileText size={17} /><span title={a.filename}>{a.filename}</span><select aria-label={`${a.filename} 的用途`} value={a.purpose || ''} onChange={e => edit({ attachments: d.attachments.map(item => item.id === a.id ? { ...item, purpose: e.target.value } : item) })}>
        <option value="">确认用途</option><option value="research">研究材料</option><option value="reference">参考图片</option><option value="source">待修改原图</option>
      </select>{pngEditing && a.purpose === 'reference' && <select aria-label={`${a.filename} 的参考目的`} value={a.referencePurpose || ''} onChange={e => edit({attachments:d.attachments.map(item => item.id===a.id ? {...item,referencePurpose:e.target.value} : item)})}><option value="">确认参考目的</option><option value="content">内容</option><option value="layout">布局</option><option value="color">配色</option><option value="style">风格</option></select>}<button type="button" className="tw-icon" aria-label={`移除 ${a.filename}`} onClick={() => edit({ attachments: d.attachments.filter(item => item.id !== a.id) })}><X size={15} /></button></div>)}</div>}
      {(d.caption || d.avoid) && <div className="tw-supplements"><label>指定图注<input value={d.caption} onChange={e => edit({ caption: e.target.value })} /></label><label>避免出现<input value={d.avoid} onChange={e => edit({ avoid: e.target.value })} /></label></div>}
      {mobile ? <div className="tw-mobile-composer-toolbar" role="group" aria-label="绘图工具" onPointerDown={e => {
        // Keep the keyboard and toolbar still until the button's click fires.
        if (e.target.closest('button') && document.activeElement === textRef.current) e.preventDefault();
      }}>
        <button type="button" data-composer-action="attachments" aria-label="添加附件" title="上传文件" disabled={busy} onClick={() => fileRef.current?.click()}><Plus size={23} /></button>
        <div className="tw-mobile-composer-options" inert={!expanded ? true : undefined} aria-hidden={!expanded ? true : undefined}>
          {modeControl}
          <span className="tw-toolbar-spacer" />
          {onOptimize && <button type="button" aria-label={optimizing ? '优化中…' : '优化输入'} title={optimizing ? '优化中…' : '优化输入'} disabled={busy || !!run || optimizing} data-composer-action="optimize" onClick={onOptimize}><Sparkles size={19} /></button>}
          <button type="button" aria-label="模型配置" title="模型配置" onClick={onModels}><Boxes size={20} /></button>
          <button type="button" aria-label="绘图设置" title="绘图设置" onClick={onSettings}><SlidersHorizontal size={20} /></button>
        </div>
        {sendButton}
      </div> : <div className="tw-composer-toolbar">
        <button type="button" className="tw-icon tw-upload" data-composer-action="attachments" aria-label="添加附件" disabled={busy} onClick={() => fileRef.current?.click()}><Plus size={22} /></button>
        {modeControl}
        <div className="tw-toolbar-spacer" />
        <div className="tw-composer-actions">
        {onOptimize && <button type="button" className="tw-tool" disabled={busy || !!run || optimizing} data-composer-action="optimize" onClick={onOptimize}><Sparkles size={17} /><span>{optimizing ? '优化中…' : '优化输入'}</span></button>}
        <button type="button" className="tw-tool" onClick={onModels}><Boxes size={17} /><span>模型配置</span></button>
        <button type="button" className="tw-tool" onClick={onSettings}><SlidersHorizontal size={17} /><span>绘图设置</span></button>
        {sendButton}
        </div>
      </div>}
    </form>
    {!mobile && summary}
    <div className="tw-composer-foot" id={`${inputId}-status`}><span role="status">{statusText}</span>
      {missingOriginal && <><input ref={restoreRef} className="tw-sr" type="file" tabIndex={-1} aria-label="选择补传原件" accept={MATERIAL_ACCEPT} onChange={e=>{const file=e.target.files[0];e.target.value='';onRestoreOriginal?.(file);}}/><button type="button" disabled={busy} onClick={()=>restoreRef.current?.click()}>补传 {missingOriginal.filename}</button></>}
    </div>
    {optimizationContent}
  </section>;
}
