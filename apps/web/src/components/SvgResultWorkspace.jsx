import MenuSelect from './MenuSelect.jsx';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import SvgToolMenu from './SvgToolMenu.jsx';
import {FileCode2,Maximize2,Minimize2,FolderOpen,Save,Download,Sparkles} from 'lucide-react';
import {resolveImageUrl} from '../utils';
import {historyChange,historyStep,MAX_SVG_BYTES,parseSvg,svgHistory} from '../lib/svgDocument.js';
import {downloadSvg,journalDraft,listSvgDrafts,readSvgDraft,saveSvgDraft,svgDraftKey} from '../lib/svgDrafts.js';
import {hasEncodedData,svgCandidates,svgPhase,svgTaskRunning} from '../lib/svgGeneration.js';
import SvgEditorCanvas from './SvgEditorCanvas.jsx';

async function fetchSvg(url,signal) {
  const response=await fetch(url,{signal,credentials:'omit',headers:{Accept:'image/svg+xml,text/plain'}});
  if(!response.ok)throw new Error(`SVG 获取失败（${response.status}），保留上一版本。`);
  if(Number(response.headers.get('content-length'))>MAX_SVG_BYTES)throw new Error('SVG 超过 2 MB 编辑上限；原件可下载。');
  if(!response.body){const text=await response.text();if(new TextEncoder().encode(text).length>MAX_SVG_BYTES)throw new Error('SVG 超过编辑上限。');return text;}
  const reader=response.body.getReader(),decoder=new TextDecoder();let source='',bytes=0;
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>MAX_SVG_BYTES){await reader.cancel();throw new Error('SVG 超过编辑上限；原件可下载。');}source+=decoder.decode(value,{stream:true});}
  return source+decoder.decode();
}
function CandidateEditor({candidate,job,apiBase,owner,active,ratio,onUseForRefine,onPreview,actionsHost,onOpenDrafts}) {
  const running=svgTaskRunning(job),key=svgDraftKey(apiBase,owner,job?.id||'unsubmitted',candidate.id);
  const [history,setHistory]=useState(svgHistory('')),[original,setOriginal]=useState(null),[originalView,setOriginalView]=useState(false),[ready,setReady]=useState(false),[saveStatus,setSaveStatus]=useState(''),[error,setError]=useState(''),[recovered,setRecovered]=useState(false),[geometryAllowed,setGeometryAllowed]=useState(false),[retry,setRetry]=useState(0);
  const writer=useRef(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`),loadedAt=useRef(Date.now()),baseRevision=useRef(0),draftRef=useRef(null),historyRef=useRef(history),originalRef=useRef(null),liveRunning=useRef(running),revision=useRef(0),pending=useRef(null),saveChain=useRef(Promise.resolve()),mounted=useRef(true),lastLoaded=useRef('');
  historyRef.current=history;originalRef.current=original;liveRunning.current=running;
  const latest=candidate.versions.at(-1),versionsKey=candidate.versions.map(v=>v.key).join('|');
  const manual=!!draftRef.current?.manual;
  function persist(draft){
    pending.current=draft;
    const work=saveChain.current.catch(()=>{}).then(()=>saveSvgDraft(draft));saveChain.current=work;
    work.then(()=>{if(!mounted.current||pending.current?.revision!==draft.revision)return;pending.current=null;setSaveStatus('已保存到此浏览器');},failure=>{if(!mounted.current)return;setSaveStatus('未保存到草稿库');setError(`${failure.message} 当前稿仍在画布中，请立即导出；恢复副本仅在浏览器允许写入时有效。`);});
    return work;
  }
  function storeWorking(next,{changed=true}={}) {
    const base=draftRef.current?.manual?draftRef.current.base:originalRef.current;
    const jobSnapshot={id:job.id,status:job.status,output_format:'svg',aspect_ratio:job.aspect_ratio,num_candidates:job.num_candidates,figureTypeId:job.figureTypeId,hasDataEncoding:hasEncodedData(job),browserDraft:true};
    const draft={key,writer:writer.current,loadedAt:loadedAt.current,baseRevision:baseRevision.current,revision:++revision.current,updatedAt:Date.now(),taskId:job.id,candidateId:candidate.id,jobSnapshot,svg:next.present,base,manual:next.present!==(base?.svg||''),geometryAcknowledged:geometryAllowed};
    draftRef.current=draft;historyRef.current=next;setHistory(next);setOriginalView(false);setError('');
    const journaled=journalDraft(draft);setSaveStatus(journaled?'正在保存 · 恢复副本已写入':'正在保存 · 恢复副本未写入');
    if(changed)persist(draft).catch(()=>{});
  }
  useEffect(()=>{
    mounted.current=true;let cancelled=false;
    if(!job?.id){setReady(true);return()=>{cancelled=true;mounted.current=false;};}
    readSvgDraft(key).then(draft=>{
      if(cancelled)return;
      if(draft?.svg){
        const checked=parseSvg(draft.svg);draftRef.current={...draft,svg:checked.svg};revision.current=draft.revision||0;baseRevision.current=draft.revision||0;
        historyRef.current=svgHistory(checked.svg);setHistory(historyRef.current);setRecovered(!!draft.recovered);setSaveStatus(draft.recovered?'已恢复上次未完成保存的修改':'已载入浏览器草稿');
        if(draft.base){setOriginal(draft.base);originalRef.current=draft.base;}
        // Geometry acknowledgement is deliberate for each reopening, not silently restored.
      }
    }).catch(failure=>{if(!cancelled)setError(`浏览器草稿读取失败：${failure.message}。原始任务仍可载入。`);}).finally(()=>{if(!cancelled)setReady(true);});
    return()=>{cancelled=true;mounted.current=false;};
  },[key]);
  useEffect(()=>{
    if(!ready||!candidate.versions.length)return;
    const controller=new AbortController();let cancelled=false;
    const version=candidate.versions.at(-1);
    if(lastLoaded.current===version.key)return;
    (async()=>{
      let issue='';
      // If the newest version cannot render, keep the previous complete version.
      for(const item of [...candidate.versions].reverse()){
        if(cancelled)return;
        if(item.key===lastLoaded.current)break;
        try {
          const raw=await fetchSvg(resolveImageUrl(apiBase,item.image.url),controller.signal);
          const parsed=parseSvg(raw),value={key:item.key,title:item.title,raw,svg:parsed.svg,warnings:parsed.warnings,image:item.image,review:item.review};
          if(cancelled)return;
          lastLoaded.current=item.key;originalRef.current=value;setOriginal(value);
          if(!draftRef.current?.manual){historyRef.current=svgHistory(parsed.svg);setHistory(historyRef.current);}
          setError(issue);return;
        }catch(failure){if(failure.name==='AbortError')return;issue=issue||`${item.title}：${failure.message}`;}
      }
      if(!cancelled)setError(issue||'新版本暂不可用，继续显示上一版本。');
    })();
    return()=>{cancelled=true;controller.abort();};
  },[key,versionsKey,ready,retry,apiBase]);
  useEffect(()=>{
    const beforeUnload=event=>{if(pending.current){journalDraft(pending.current);event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload);
  },[]);
  const shown=(running||originalView)?original?.svg||history.present:history.present||original?.svg||'';
  const readOnly=running||originalView||!ready||!shown;
  useEffect(()=>{
    if(!shown){onPreview?.(candidate.id,null);return;}
    const url=URL.createObjectURL(new Blob([shown],{type:'image/svg+xml'}));onPreview?.(candidate.id,url);
    return()=>URL.revokeObjectURL(url);
  },[shown,candidate.id,onPreview]);
  // The existing Core SVG generation subset is narrower than safe browser display.
  const aiUnsupported=/<(?:[\w.-]+:)?(?:image|mask|pattern|style|clipPath|textPath)\b/.test(shown);
  const canAiRefine=onUseForRefine&&shown&&!running&&!hasEncodedData(job)&&!aiUnsupported;
  const change=svg=>{if(liveRunning.current||originalView)return;storeWorking(historyChange(historyRef.current,svg));};
  const step=direction=>{if(readOnly)return;const next=historyStep(historyRef.current,direction);if(next!==historyRef.current)storeWorking(next);};
  const warnings=original?.warnings||[];
  const filename=`tuyan-${job?.id||'canvas'}-candidate-${candidate.id+1}${!originalView&&manual?'-edited':''}.svg`;
  const actions=<div className="svg-header-actions">
      <div className="svg-document-status"><span className="svg-version-badge">{running?(original?.title||'等待 SVG 内容'):originalView?'原始生成版本':manual?'已手动修改':original?.title||'空白画布'}</span><span className="svg-save-status" role="status">{saveStatus||'草稿仅存此浏览器'}</span></div>
      <button type="button" disabled={!shown||running||originalView} onClick={()=>{if(draftRef.current)persist(draftRef.current).catch(()=>{});else storeWorking(historyRef.current);}}><Save size={15} aria-hidden="true"/>保存</button>
      <button type="button" disabled={!shown} onClick={()=>downloadSvg(shown,filename)} className="svg-export-primary"><Download size={15} aria-hidden="true"/>导出 SVG</button>
      <SvgToolMenu label="版本与文件">
        {!running&&manual&&<button type="button" onClick={()=>setOriginalView(!originalView)}>{originalView?'返回手工稿':'查看原始版本'}</button>}
        {onOpenDrafts&&<button type="button" disabled={running} onClick={onOpenDrafts}><FolderOpen size={15}/>重新打开草稿</button>}
        {original&&<button type="button" onClick={()=>downloadSvg(original.raw,`original-${job.id}-${candidate.id+1}.svg`)}>下载原件</button>}
        {canAiRefine&&<button type="button" onClick={async()=>{const url=URL.createObjectURL(new Blob([shown],{type:'image/svg+xml'}));try{await onUseForRefine(url,{...(original?.image||latest?.image),object_key:`${job.id}/svg-canvas-${candidate.id}`,candidate_id:candidate.id,outputFormat:'svg',mime_type:'image/svg+xml'});}finally{URL.revokeObjectURL(url);}}}><Sparkles size={15}/>AI 修订</button>}
        <p>原始版本与评审记录独立保留。手工稿不沿用原版评审结论。</p>
    <details className="svg-save-help"><summary>版本、保存与兼容说明</summary>
    {manual&&<p className="svg-small">已手动修改 · 原有评审只属于原始生成版本，不代表当前稿通过评审。{running?'任务继续执行时暂时展示 AI 版本；手工稿独立保留。':''}</p>}
    {warnings.length>0&&<details className="svg-compatibility"><summary>文档兼容与字体</summary>{warnings.map(w=><p key={w}>{w}</p>)}</details>}
    <p className="svg-small">草稿仅保存在此浏览器，按账号、任务及候选图隔离，未同步账号。账号中的原始生成结果独立保留。清理浏览器数据会删除草稿，请及时导出。</p>
    {canAiRefine&&<p className="svg-small">AI 修订会把当前 SVG 和原任务输入放回左侧；确认要求并提交后才调用模型。</p>}
    {onUseForRefine&&shown&&!running&&(hasEncodedData(job)||aiUnsupported)&&<p className="svg-notice">{hasEncodedData(job)?'数据图暂不提供此入口的 AI 修订，以免把手工几何改动当成源数据更新。':'当前稿含现有 SVG 生成链不支持的图片、裁剪或复杂样式，暂不提供 AI 修订，避免有损再生成。'}仍可手工编辑、保存和导出。</p>}
    <details className="svg-generation-help"><summary>真实生成过程</summary><p className="svg-small">按服务器实际产生的完整 SVG 版本更新；当前模型链路不提供逐字绘制。生成、评审和自动修订期间可缩放、平移，结束后自动开放编辑。</p></details>
    </details>
      </SvgToolMenu>
    </div>;
  return <div hidden={!active} className="svg-candidate" data-candidate-id={candidate.id}>
    {active&&actionsHost&&createPortal(actions,actionsHost)}
    {error&&<div role="alert" className="svg-notice svg-warning">{error}<button type="button" onClick={()=>setRetry(n=>n+1)}>重试载入</button>{latest?.image?.url&&<a href={resolveImageUrl(apiBase,latest.image.url)} target="_blank" rel="noopener noreferrer">打开原件</a>}</div>}
    {recovered&&<p className="svg-notice">已恢复此任务、此候选图的浏览器修改。请检查后保存或导出。</p>}
    {manual&&draftRef.current?.base?.key!==original?.key&&<p className="svg-notice">任务产生了更新的原始版本；已保留您的手工稿，未自动合并或覆盖。</p>}
    <SvgEditorCanvas svg={shown} readOnly={readOnly} onChange={change} onError={setError} onUndo={()=>step('undo')} onRedo={()=>step('redo')} canUndo={history.past.length>0} canRedo={history.future.length>0} dataProtected={hasEncodedData(job)} geometryAllowed={geometryAllowed} onAllowGeometry={setGeometryAllowed} ratio={ratio}/>

  </div>;
}
export default function SvgResultWorkspace({job,apiBase,owner,aspectRatio='16:9',isSubmitting=false,onUseForRefine,onOpenTask}) {
  const [active,setActive]=useState(0),[expanded,setExpanded]=useState(false),[drafts,setDrafts]=useState(null),[draftError,setDraftError]=useState(''),[previews,setPreviews]=useState({}),[actionsHost,setActionsHost]=useState(null);
  const onPreview=useCallback((id,url)=>setPreviews(previous=>previous[id]===url?previous:{...previous,[id]:url}),[]);
  const candidates=svgCandidates(job),scope=JSON.stringify([apiBase,owner,job?.id]);
  useEffect(()=>{setActive(job?.browserCandidate??0);setDrafts(null);setDraftError('');},[scope]);
  return <section className={`svg-workspace${expanded?' is-expanded':''}`} aria-label="SVG 生成与编辑工作台">
    <div className="svg-workspace-heading"><div className="svg-workspace-title"><FileCode2 size={18} aria-hidden="true"/><strong>SVG 画布</strong></div>
      <div className="svg-header-candidates">{candidates.length>1&&<div className="svg-candidate-tabs" role="tablist" aria-label="SVG 候选图">{candidates.map((c,index)=><button key={c.id} type="button" role="tab" aria-label={`候选 ${c.id+1}`} tabIndex={active===c.id?0:-1} aria-selected={active===c.id} onClick={()=>setActive(c.id)} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?candidates.length-1:(index+(event.key==='ArrowRight'?1:-1)+candidates.length)%candidates.length;setActive(candidates[next].id);event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();}}>{previews[c.id]?<img src={previews[c.id]} alt=""/>:<FileCode2 size={16}/>}<span>{c.id+1}</span></button>)}</div>}</div>
      <div ref={setActionsHost} className="svg-header-action-host"/>
      <button type="button" className="svg-expand" title={expanded?'收起画布':'展开画布'} aria-label={expanded?'收起画布':'展开画布'} aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>}<span>{expanded?'收起':'展开'}</span></button>
    </div>
    {(!job||isSubmitting||!['succeeded','completed'].includes(job.status))&&<p role="status" className="svg-phase">{svgPhase(job,isSubmitting)}</p>}
    {onOpenTask&&(drafts||draftError)&&<div className="svg-local-drafts">{drafts&&<label>此浏览器的草稿<MenuSelect aria-label="此浏览器的草稿" value="" onChange={event=>{const draft=drafts.find(d=>d.key===event.target.value);if(draft){setActive(draft.candidateId);onOpenTask({...draft.jobSnapshot,id:draft.taskId,status:draft.jobSnapshot?.status||'succeeded',output_format:'svg',num_candidates:draft.jobSnapshot?.num_candidates||draft.candidateId+1,browserDraft:true,browserCandidate:draft.candidateId});setDrafts(null);}}}><option value="">{drafts.length?'选择任务与候选图':'此账号在本浏览器暂无 SVG 草稿'}</option>{drafts.map(d=><option key={d.key} value={d.key}>{d.taskId} · 候选 {d.candidateId+1} · {new Date(d.updatedAt).toLocaleString()}</option>)}</MenuSelect></label>}{draftError&&<span role="alert">{draftError}</span>}</div>}
    {job?.browserDraft&&<p className="svg-notice">已从此浏览器重新打开手工稿；正在尝试获取原任务最新状态。此副本不证明服务端任务或账号草稿已同步。</p>}

    {candidates.map(candidate=><CandidateEditor key={`${scope}:${candidate.id}`} candidate={candidate} job={job} apiBase={apiBase} owner={owner} active={candidate.id===active} ratio={job?.aspect_ratio||aspectRatio} onUseForRefine={onUseForRefine} onPreview={onPreview} actionsHost={actionsHost} onOpenDrafts={onOpenTask?()=>listSvgDrafts(apiBase,owner).then(setDrafts).catch(e=>setDraftError(`无法读取此浏览器草稿：${e.message}`)):undefined}/>)}

  </section>;
}
