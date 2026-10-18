import {useEffect,useRef,useState} from 'react';
import {Check,Download,LoaderCircle} from 'lucide-react';
import SvgEditorCanvas from '../components/SvgEditorCanvas.jsx';
import {parseSvg,svgHistory,historyChange,historyStep,MAX_SVG_BYTES} from '../lib/svgDocument.js';
import {readSvgDraft,saveSvgDraft,journalDraft,svgDraftKey,downloadSvg} from '../lib/svgDrafts.js';
import {workspaceVersionDataUrl} from './workspaceResultAsset.js';

function blankSvg(ratio){
  const match=/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(ratio||'');
  const aspect=match && Number(match[1])>0 && Number(match[2])>0 ? Number(match[1])/Number(match[2]) : 4/3;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 ${Math.round(1200/aspect)}"></svg>`;
}
export default function WorkspaceSvgEditor({version,taskId,userId,base,dataProtected=true,ratio,readOnly=false,onSave,onInteract}){
  const [history,setHistory]=useState(svgHistory('')),[error,setError]=useState(''),[original,setOriginal]=useState('');
  const [geometry,setGeometry]=useState(false),[saving,setSaving]=useState(false),[retry,setRetry]=useState(0);
  const key=svgDraftKey(base,userId,taskId,version?.id || 'blank');
  const meta=useRef({writer:crypto.randomUUID(),baseRevision:0,revision:0}),queue=useRef(Promise.resolve()),ready=useRef(false),saveAttempt=useRef(null),savingRef=useRef(false),live=useRef(true);
  const current=useRef('');current.current=history.present;
  // Asset URLs can be renewed by hydration. Only an explicit version change or retry reloads the canvas.
  const source=useRef();source.current={version,ratio};
  useEffect(()=>{
    live.current=true;ready.current=false;let cancelled=false;
    const controller=new AbortController();
    (async()=>{try{
      const {version,ratio}=source.current;let svg=blankSvg(ratio);
      if(version){
        const url=version.history?.source==='production'?await workspaceVersionDataUrl(version,base,userId):version.url;
        const res=await fetch(url,{signal:controller.signal,credentials:url.startsWith(base)?'include':'omit'});
        if(!res.ok)throw Error('SVG 版本读取失败');
        if(Number(res.headers.get('content-length'))>MAX_SVG_BYTES)throw Error('SVG 超过现有编辑器的 2 MB 上限，原版本仍可下载');
        svg=await res.text();
      }
      const parsed=parseSvg(svg),saved=await readSvgDraft(key);
      if(cancelled)return;
      meta.current.baseRevision=saved?.revision||0;meta.current.revision=saved?.revision||0;
      setOriginal(parsed.svg);setHistory(svgHistory(saved?.svg?parseSvg(saved.svg).svg:parsed.svg));setGeometry(!!saved?.geometryAcknowledged);ready.current=true;setError('');
    }catch(e){if(!cancelled)setError(e.message);}})();
    return()=>{cancelled=true;live.current=false;controller.abort();};
  },[key,base,userId,retry]);
  function persist(svg){
    const draft={...meta.current,revision:++meta.current.revision,key,taskId,candidateId:version?.id || 'blank',svg,updatedAt:Date.now(),geometryAcknowledged:geometry,manual:true};
    journalDraft(draft);
    queue.current=queue.current.catch(()=>{}).then(()=>saveSvgDraft(draft));
    queue.current.catch(e=>{if(live.current)setError(e.message+'；请导出当前稿。');});
  }
  function change(svg){if(!ready.current||readOnly||savingRef.current||svg===current.current)return;onInteract?.();current.current=svg;setHistory(h=>historyChange(h,svg));persist(svg);}
  function step(direction){if(readOnly||savingRef.current)return;const next=historyStep(history,direction);if(next.present===history.present)return;onInteract?.();current.current=next.present;setHistory(next);persist(next.present);}
  const dirty=!!history.present && history.present!==original;
  async function save(){
    if(savingRef.current||readOnly||!dirty)return;savingRef.current=true;setSaving(true);setError('');
    try{
      await queue.current;parseSvg(current.current);
      // Retrying a persistence failure must not append the same edit twice.
      if(saveAttempt.current?.svg!==current.current)saveAttempt.current={svg:current.current,versionId:crypto.randomUUID(),runId:crypto.randomUUID()};
      const {svg,versionId,runId}=saveAttempt.current;
      await onSave(svg,{versionId,runId});if(live.current)setOriginal(svg);
    }catch(e){if(live.current)setError(e.message);}finally{savingRef.current=false;if(live.current)setSaving(false);}
  }
  return <section className="tw-svg-editor tw-inline-svg-editor svg-workspace" aria-label={version?`就地编辑 SVG · 候选 ${version.candidateLabel} · v${version.number}`:'SVG 空白画布'} aria-busy={saving}>
    <div className="tw-editor-actions">
      <div className="tw-editor-caption"><strong>{version?'画布编辑':'空白画布'}</strong><span>{readOnly?'执行期间暂不可编辑':'点击对象编辑 · 双击文字修改'}</span></div>
      <button type="button" disabled={!history.present} onClick={()=>downloadSvg(history.present,'Tuyan-edited.svg')}><Download size={15}/>导出当前稿</button>
      <button type="button" className="tw-primary" disabled={!dirty||saving||readOnly} onClick={save}>{saving?<LoaderCircle size={15} className="tw-spin"/>:<Check size={15}/>}<span>保存为新版本</span></button>
    </div>
    {error&&<p role="alert" className="tw-editor-error">{error}{!history.present&&<button type="button" onClick={()=>{setError('');setRetry(n=>n+1);}}>重试载入</button>}</p>}
    {history.present?<SvgEditorCanvas inspectorLayout="side" svg={history.present} readOnly={saving||readOnly} onChange={change} onError={setError} onUndo={()=>step('undo')} onRedo={()=>step('redo')} canUndo={!!history.past.length} canRedo={!!history.future.length} dataProtected={dataProtected} geometryAllowed={geometry} onAllowGeometry={setGeometry}/>:!error&&<div className="tw-editor-loading" role="status"><LoaderCircle className="tw-spin" size={22}/>正在打开画布…</div>}
    <p className="tw-muted">编辑草稿仅保存在此浏览器；保存为新版本后同步账号，原版本保留。</p>
  </section>;
}
