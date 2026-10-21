import {useEffect,useRef,useState} from 'react';
import {Check,Download,LoaderCircle} from 'lucide-react';
import SvgEditorCanvas from '../components/SvgEditorCanvas.jsx';
import {parseSvg,svgHistory,historyChange,historyStep,MAX_SVG_BYTES} from '../lib/svgDocument.js';
import {readSvgDraft,listSvgDrafts,svgDraftKey,downloadSvg} from '../lib/svgDrafts.js';
import {workspaceVersionDataUrl} from './workspaceResultAsset.js';
import {SvgTaskAutosave} from './svgTaskAutosave.js';

function blankSvg(ratio){
  const match=/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(ratio||'');
  const aspect=match && Number(match[1])>0 && Number(match[2])>0 ? Number(match[1])/Number(match[2]) : 4/3;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 ${Math.round(1200/aspect)}"></svg>`;
}
const canResume=(draft,id,versionIds)=>draft?.autoSave && (draft.resumeVersionId===id || (!versionIds.includes(draft.resumeVersionId)&&draft.baseVersionId===id));
async function recoveryDraft({key,base,userId,taskId,versionIds,history}) {
  const direct=await readSvgDraft(key),id=JSON.parse(key)[3];
  if(canResume(direct,id,versionIds))return direct;
  let fallback=direct;
  const rows=await listSvgDrafts(base,userId,{taskId});
  for(const row of rows) {
    if(JSON.parse(row.key)[2]!==taskId || (!versionIds.includes(row.candidateId)&&row.candidateId!=='blank'))continue;
    const draft=await readSvgDraft(row.key);
    if(canResume(draft,id,versionIds))return draft;
    fallback ||= draft;
  }
  if(!fallback&&history?.jobId&&Number.isInteger(history.index)) {
    // Legacy editor keys used the confirmed server job and candidate index.
    // Offer that exact backup inside its original task; leave its bytes intact.
    const legacy=await readSvgDraft(svgDraftKey(base,userId,history.jobId,history.index));
    if(legacy)fallback={...legacy,legacyJobBackup:true};
  }
  return fallback;
}
export default function WorkspaceSvgEditor({version,versionIds=[],taskId,userId,base,dataProtected=true,ratio,readOnly=false,onSave,onInteract,syncStatus='local',syncError='',onRetrySync,registerFlush}){
  const [history,setHistory]=useState(svgHistory('')),[error,setError]=useState('');
  const [geometry,setGeometry]=useState(false),[retry,setRetry]=useState(0),[,refresh]=useState(0);
  const [recoverable,setRecoverable]=useState(null);
  const key=svgDraftKey(base,userId,taskId,version?.id || 'blank');
  const session=useRef(null),live=useRef(true),current=useRef('');
  const source=useRef();source.current={version,versionIds,ratio,onSave,readOnly};
  useEffect(()=>{
    live.current=true;
    const flush=async()=>{const s=session.current;if(!s)return;do{await s.flush();if(s.error)throw Error(s.error);}while(s.dirty&&!s.paused);};
    const backgroundFlush=()=>{void flush().catch(()=>{});};
    const hidden=()=>{if(document.visibilityState==='hidden')backgroundFlush();};
    window.addEventListener('pagehide',backgroundFlush);window.addEventListener('online',backgroundFlush);document.addEventListener('visibilitychange',hidden);
    registerFlush?.(flush);
    return()=>{live.current=false;session.current?.close();registerFlush?.(null);window.removeEventListener('pagehide',backgroundFlush);window.removeEventListener('online',backgroundFlush);document.removeEventListener('visibilitychange',hidden);};
  },[registerFlush]);
  useEffect(()=>{
    if(session.current?.followVersionId===version?.id && version){session.current.followVersionId=null;return;}
    session.current?.close();session.current=null;current.current='';setHistory(svgHistory(''));setRecoverable(null);setError('');
    let cancelled=false;const controller=new AbortController();
    (async()=>{try{
      const {version,versionIds,ratio,onSave}=source.current;let svg=blankSvg(ratio);
      if(version){
        const url=version.history?.source==='production'?await workspaceVersionDataUrl(version,base,userId):version.url;
        const res=await fetch(url,{signal:controller.signal,credentials:url.startsWith(base)?'include':'omit'});
        if(!res.ok)throw Error('SVG 版本读取失败');
        if(Number(res.headers.get('content-length'))>MAX_SVG_BYTES)throw Error('SVG 超过现有编辑器的 2 MB 上限，原版本仍可下载');
        svg=await res.text();
      }
      const parsed=parseSvg(svg);let saved,savedSvg='';
      try{saved=await recoveryDraft({key,base,userId,taskId,versionIds:[...versionIds,version?.id||'blank'],history:version?.history});savedSvg=saved?.svg?parseSvg(saved.svg).svg:'';}
      catch(e){if(!cancelled)setError('本机编辑备份读取失败，已保留原图：'+e.message);}
      if(cancelled)return;
      const id=version?.id||'blank';
      const resume=canResume(saved,id,versionIds);
      const restore=savedSvg&&(!version||resume);
      const s=new SvgTaskAutosave({key:saved?.legacyJobBackup?key:saved?.key||key,taskId,versionId:version?.id,svg:parsed.svg,saved:saved?.legacyJobBackup?null:saved,onSave,onChange:()=>{if(live.current&&session.current===s)refresh(n=>n+1);}});
      session.current=s;s.hasUnrestoredBackup=!!saved&&!saved.legacyJobBackup&&!restore;s.geometry=!!saved?.geometryAcknowledged;s.paused=source.current.readOnly;
      current.current=restore?savedSvg:parsed.svg;setHistory(svgHistory(current.current));
      setRecoverable(!restore&&savedSvg&&savedSvg!==parsed.svg?{...saved,svg:savedSvg}:null);
      setGeometry(!!restore&&!!saved?.geometryAcknowledged);
      if(restore)s.change(savedSvg);
    }catch(e){if(!cancelled)setError(e.message);}})();
    return()=>{cancelled=true;controller.abort();};
  },[key,base,userId,retry]);
  useEffect(()=>{session.current?.pause(readOnly);},[readOnly]);
  function change(svg){
    const s=session.current;if(!s||readOnly||svg===current.current)return;
    if(s.hasUnrestoredBackup)s.preserveBackup();
    onInteract?.();setError('');setRecoverable(null);current.current=svg;setHistory(h=>historyChange(h,svg));s.geometry=geometry;s.change(svg);
  }
  function restoreDraft(){
    if(!recoverable||readOnly||!session.current)return;
    onInteract?.();current.current=recoverable.svg;setHistory(svgHistory(recoverable.svg));setGeometry(!!recoverable.geometryAcknowledged);
    session.current.hasUnrestoredBackup=false;session.current.geometry=!!recoverable.geometryAcknowledged;session.current.change(recoverable.svg);setRecoverable(null);
  }
  function step(direction){if(readOnly)return;const next=historyStep(history,direction);if(next.present===history.present)return;onInteract?.();current.current=next.present;setHistory(next);session.current?.change(next.present);}
  const s=session.current,saving=!!s?.inFlight,dirty=!!s?.dirty,saveError=s?.error;
  const status=saveError?'自动保存未完成，请保留页面并重试':saving||dirty?'正在自动保存…':!version&&!s?.parentId?'修改后自动保存':userId?(syncStatus==='synced'?'已自动保存并同步账号':syncStatus==='error'?'已保存在本机，账号同步未完成':'已自动保存到本机，等待账号同步'):'已自动保存到本机';
  return <section className="tw-svg-editor tw-inline-svg-editor svg-workspace" aria-label={version?`就地编辑 SVG · 候选 ${version.candidateLabel} · v${version.number}`:'SVG 空白画布'}>
    <div className="tw-editor-actions">
      <div className="tw-editor-caption"><strong>{version?'画布编辑':'空白画布'}</strong><span>{readOnly?'执行期间暂不可编辑':'点击对象编辑 · 双击文字修改'}</span></div>
      {history.present&&<span className="tw-svg-save-status" role="status">{saving||(dirty&&!saveError)?<LoaderCircle size={14} className="tw-spin"/>:<Check size={14}/>}<span>{status}</span></span>}
      <button type="button" disabled={!history.present} onClick={()=>downloadSvg(history.present,'Tuyan-edited.svg')}><Download size={15}/>导出当前稿</button>
    </div>
    {recoverable&&<div className="tw-svg-draft-notice" role="status">此任务有旧版编辑备份，原图保持不变。<button type="button" disabled={readOnly||saving} onClick={restoreDraft}>恢复编辑内容</button></div>}
    {(error||saveError)&&<p role="alert" className="tw-editor-error">{saveError||error}{!history.present?<button type="button" onClick={()=>setRetry(n=>n+1)}>重试载入</button>:saveError&&<button type="button" disabled={readOnly||saving} onClick={()=>void s.flush()}>重试自动保存</button>}</p>}
    {syncStatus==='error'&&history.present&&<p className="tw-editor-error" role="alert">{syncError||'账号同步未完成，本机修改仍保留。'}{onRetrySync&&<button type="button" onClick={onRetrySync}>重试同步</button>}</p>}
    {history.present?<SvgEditorCanvas inspectorLayout="side" svg={history.present} readOnly={readOnly} onChange={change} onError={setError} onUndo={()=>step('undo')} onRedo={()=>step('redo')} canUndo={!!history.past.length} canRedo={!!history.future.length} dataProtected={dataProtected} geometryAllowed={geometry} onAllowGeometry={setGeometry}/>:!error&&<div className="tw-editor-loading" role="status"><LoaderCircle className="tw-spin" size={22}/>正在打开画布…</div>}
    <p className="tw-muted">修改会自动保存到当前任务，下次打开任务即可继续编辑。原图和历史版本保留。</p>
  </section>;
}
