import {useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BookOpen,ChevronRight,X} from 'lucide-react';
import AccessibleDialog from './AccessibleDialog.jsx';
import JournalBookshelf from './JournalBookshelf.jsx';
import {getFigureType} from '../../../../packages/figure-taxonomy/src/index.js';
import {JOURNALS,JOURNAL_VERSION,JOURNAL_STATUS,JOURNAL_STAGES,JOURNAL_PURPOSES,JOURNAL_CONTENT,JOURNAL_LEVELS,defaultJournalSelection,journalSnapshot,activeJournalRules,journalPreflight,journalFigureContent,journalSelectionForFigure} from '../../../../packages/api/src/journal-rules.js';

export default function JournalRulePicker({value,onChange,figureTypeId,refineContext,outputFormat='png',saveFailed=false,backdropClassName=''}) {
  const [open,setOpen]=useState(false),[draft,setDraft]=useState(null);
  const shelfRef=useRef(null);
  const close=()=>shelfRef.current?shelfRef.current.dismiss(()=>setOpen(false)):setOpen(false);
  const title=useId();
  const current=JOURNALS.find(j=>j.id===value?.journalId);
  const figureType=getFigureType(figureTypeId),canReuse=Boolean(journalFigureContent(figureType?.id));
  const reuseFigure=(selection)=>journalSelectionForFigure({...selection,contentType:journalFigureContent(figureType.id),contentSource:'figure-type'},figureType.id);
  let savedIssues=[];try{savedIssues=journalPreflight(journalSnapshot(value),outputFormat,refineContext?'generative-refine':'generate');}catch(e){savedIssues=[{code:'version',text:e.message}];}
  let snapshot=null,error='';try{snapshot=journalSnapshot(draft);}catch(e){error=e.message;try{snapshot=journalSnapshot({...draft,widthMm:85});}catch{}}
  const rules=activeJournalRules(snapshot),issues=journalPreflight(snapshot,outputFormat,refineContext?'generative-refine':'generate');
  const primaryRule=r=>['stage','format','width','height','dpi','dimensions','color','font','labels','layout','ai'].includes(r.field)&&!issues.some(i=>i.code===`policy-${r.id}`);
  const change=(key,val)=>setDraft({...draft,[key]:val});
  const changeContent=(contentType)=>{
    if(contentType==='figure-type'){setDraft(reuseFigure(draft));return;}
    const {contentSource,figureTypeId:previousType,...manual}=draft;
    setDraft({...manual,contentType});
  };
  const selectJournal=(id)=>{
    // Browsing the selected book keeps its frozen version and scope. Updating is explicit.
    if(id===value?.journalId){setDraft({...value});return;}
    const next=defaultJournalSelection(id);
    // Journal changes must not silently erase a declared research-original image.
    const previous=draft||value;
    if(previous)Object.assign(next,{contentType:previous.contentType,...(previous.contentSource?{contentSource:previous.contentSource,figureTypeId:previous.figureTypeId}:{})});
    if(refineContext?.contentType)next.contentType=refineContext.contentType;
    setDraft(canReuse&&(!previous||previous.contentSource==='figure-type')&&!['primary','illustration'].includes(next.contentType)?reuseFigure(next):next);
  };
  return <section className="journal-setting">
    <label>期刊规则</label>
    <button type="button" className="journal-entry" aria-haspopup="dialog" disabled={refineContext&&!refineContext.hasSource} onClick={()=>{setDraft(value??null);setOpen(true);}}>
      <BookOpen size={20}/><span><strong>{current?.name|| (value?'历史期刊规则':'不指定期刊')}</strong><small>{value?`${JOURNAL_STAGES[value.stage]||'历史阶段'} · ${JOURNAL_PURPOSES[value.purpose]||'历史用途'} · ${value.widthMm} mm · ${value.version}`:'使用现有通用流程；可按目标期刊准备与检查图件'}</small></span><ChevronRight size={17}/>
    </button>
    {savedIssues.length>0&&<details className="journal-selection-notices"><summary>当前任务的期刊提示（{savedIssues.length}）</summary>{distinctNotices(savedIssues).map(i=><p className="journal-notice" key={i.code}>{i.text}</p>)}</details>}
    {saveFailed&&<p className="notice warning" role="status">本次选择仍有效，但浏览器设置保存失败；刷新后可能丢失。</p>}
    {createPortal(<AccessibleDialog open={open} onClose={close} labelledBy={title} className="journal-dialog journal-bookshelf-dialog" backdropClassName={`journal-backdrop ${backdropClassName}`}>
      <header className="journal-header"><div><h2 id={title}>期刊规则</h2><p>选择目标期刊，查看适用要求</p></div><button type="button" aria-label="关闭期刊规则" onClick={close}><X size={20}/></button></header>
      {error&&!snapshot&&<p role="alert" className="journal-version-alert">{error} 保留原选择；可浏览其他期刊，或明确更新当前期刊规则。</p>}
      <JournalBookshelf ref={shelfRef} value={value} onBrowse={selectJournal} onDismiss={close} onNone={()=>{onChange(null);setOpen(false);}} footer={<><button type="button" onClick={close}>取消</button><button type="button" className="primary-button" disabled={Boolean(error||!snapshot||snapshot&&refineContext&&!refineContext.contentType)} onClick={()=>{onChange(snapshot.selection);close();}}>选择此期刊</button></>}>
          {draft?.version!==JOURNAL_VERSION&&draft&&<div className="journal-version-note"><p>当前沿用 {draft.version}，浏览不会更新任务规则。</p><button type="button" onClick={()=>setDraft({...draft,version:JOURNAL_VERSION})}>采用当前规则 {JOURNAL_VERSION}</button></div>}
          {error&&!snapshot?<p role="alert" className="notice warning">{error} 原选择版本：{draft?.version}。选择其他期刊会采用 {JOURNAL_VERSION}；取消保留历史选择。</p>:snapshot?<>
            <div className="journal-title"><h3>{snapshot.name}</h3><span className={`journal-badge ${snapshot.status}`}>{JOURNAL_STATUS[snapshot.status]}</span></div>
            <p className="journal-muted">{snapshot.summary}</p>
            {error&&<p role="alert" className="notice warning">{error}</p>}
            <div className="journal-scope">
              {snapshot.rules.some(r=>r.applicability?.stages?.length<3)&&<label>投稿阶段<select value={draft.stage} onChange={e=>change('stage',e.target.value)}>{Object.entries(JOURNAL_STAGES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
              {snapshot.rules.some(r=>r.applicability?.purposes?.length<5)&&<label>图件用途<select value={draft.purpose} onChange={e=>change('purpose',e.target.value)}>{Object.entries(JOURNAL_PURPOSES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
              <label>最终排版宽度（mm）<input type="number" min="10" max="1000" step="0.1" value={draft.widthMm} onChange={e=>change('widthMm',e.target.value)}/></label>
              {rules.some(r=>r.field==='dpi'&&r.value?.byKind)&&<label>图像构成<select value={draft.rasterKind} onChange={e=>change('rasterKind',e.target.value)}><option value="color">彩色</option><option value="grayscale">灰度</option><option value="lineart">纯线稿</option></select></label>}
            </div>
            <p className="journal-width-help">排版宽度用于检查实际像素密度，不改变画面比例或像素数。</p>
            {refineContext?<div className="journal-content-basis">
              <p>{refineContext.jobId?'沿用原任务':'当前原图'}：{getFigureType(refineContext.figureTypeId)?.label||JOURNAL_CONTENT[refineContext.contentType]||'性质尚未确认'}</p>
              <p>{refineContext.contentType?JOURNAL_CONTENT[refineContext.contentType]:'请先回到精修原图处确认图像性质，确认只应用于这张图。'}</p>
            </div>:canReuse?<div className="journal-content-basis">
              <p>{draft.contentSource==='figure-type'?`沿用信息图类别：${figureType.label}`:`已保存的图像性质：${JOURNAL_CONTENT[draft.contentType]}`}<span>{draft.contentSource==='figure-type'?JOURNAL_CONTENT[draft.contentType]:''}</span></p>
              <details><summary>特殊内容或调整判断</summary>
                <p>图型决定表达方式，不能证明素材是否为原始科研图像。涉及显微照片、实验成像等原始证据时，请单独声明。</p>
                <label>图像性质<select value={draft.contentSource==='figure-type'?'figure-type':draft.contentType} onChange={e=>changeContent(e.target.value)}>
                  <option value="figure-type">沿用信息图类别（{figureType.label}）</option>
                  {Object.entries(JOURNAL_CONTENT).map(([id,label])=><option key={id} value={id}>{label}</option>)}
                </select></label>
              </details>
            </div>:<div className="journal-content-basis">
              <label>精修原图性质<select value={draft.contentType} onChange={e=>changeContent(e.target.value)}>{Object.entries(JOURNAL_CONTENT).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
              <p>精修原图不能从生成页的图型推断，请确认其性质；历史任务沿用已保存的判断。</p>
            </div>}
            <ul className="journal-rules">{rules.filter(primaryRule).map(r=><Rule key={r.id} rule={r} sources={snapshot.sources}/>)}</ul>
            {distinctNotices(issues).map(i=><p key={i.code} className={`journal-notice ${i.blocking?'blocked':''}`} role="status">{i.blocking?'当前不可执行：':''}{i.text}</p>)}
            <details><summary>详细要求与官方来源</summary>
              <ul className="journal-rules">{rules.filter(r=>!primaryRule(r)).map(r=><Rule key={r.id} rule={r} sources={snapshot.sources}/>)}</ul>
              <p className="journal-muted">未列出的要求未完成核验，不表示期刊没有规定。字体、线宽、科研真实性等仍需人工确认。</p>
              {snapshot.inheritance.map(item=><p key={item.sourceId}>继承关系：{item.scope} · {item.status==='verified'?'已核实':item.status==='conflict'?'来源冲突，适用结论待确认':'待确认，不作为专刊要求'}</p>)}
              {snapshot.sources.map(src=><p key={src.id}><a href={src.url} target="_blank" rel="noreferrer">{src.title}</a><br/><small>{src.scope}{src.publishedOn?` · 发布 ${src.publishedOn}`:''}{src.updatedOn?` · 来源更新 ${src.updatedOn}`:''} · 核验 {src.verifiedOn}{src.note?` · ${src.note}`:src.verification.includes('403')?' · 页面直连 403；详见规则状态':''}</small></p>)}
            </details>
            <p className="journal-muted">规则版本 {snapshot.version} · 核验 {snapshot.verifiedOn}。选择期刊不代表投稿合规或录用保证。</p>
          </>:null}
      </JournalBookshelf>
    </AccessibleDialog>,document.body)}
  </section>;
}
function Rule({rule,sources}) {return <li><span className={`journal-level ${rule.requirement}`}>{JOURNAL_LEVELS[rule.requirement]}</span><span>{rule.text}{rule.sourceIds.map(id=>{const src=sources.find(s=>s.id===id);return src?<a className="journal-rule-source" key={id} href={src.url} target="_blank" rel="noreferrer" aria-label={`${rule.text} 官方来源`}>来源 ↗</a>:null;})}</span></li>;}

// Several operation records can share one explanation; retain the active blocking notice.
function distinctNotices(issues) {
  const byText=new Map();
  for(const issue of issues)if(!byText.has(issue.text)||issue.blocking)byText.set(issue.text,issue);
  return [...byText.values()];
}
