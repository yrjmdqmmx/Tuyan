import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Image, ArrowUpRight, RefreshCw } from 'lucide-react';
import { IMAGE_LIBRARY_NOTICE, imageBytesLabel, imageFileSizeLabel } from '../../../../packages/api/src/image-library.mjs';
import WorkspaceDialog from './WorkspaceDialog.jsx';

const date = value => !value?'时间待核对':new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
function imageBlob(value) {
  const bytes=Uint8Array.from(atob(value.base64),c=>c.charCodeAt(0));
  return new Blob([bytes],{type:value.format==='svg'?'image/svg+xml':'image/png'});
}
function StoredImage({image,request,onPreview,onDownload,onTask}) {
  const ref=useRef(null),[url,setUrl]=useState(''),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();let objectUrl='',started=false;
    const load=()=>{if(started)return;started=true;request('/'+image.id,controller.signal).then(data=>{
      if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(imageBlob(data));setUrl(objectUrl);
    }).catch(e=>{if(!controller.signal.aborted)setError(e.message);});};
    const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load();}},{rootMargin:'100px'}):null;
    if(observer)observer.observe(ref.current);else load();
    return()=>{controller.abort();observer?.disconnect();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[image.id,request]);
  return <article ref={ref} className="tw-stored-image">
    <button className="tw-storage-thumbnail" type="button" onClick={()=>onPreview(image)} aria-label={`预览 ${image.format.toUpperCase()} 图片，${date(image.savedAt)}`}>
      {url&&!error?<img src={url} alt="已保存的生成图片" onError={()=>setError('图片预览暂不可用')}/>:<span><Image size={26}/>{error||'正在读取图片…'}</span>}
    </button>
    <div className="tw-stored-image-details"><div><strong>{image.format.toUpperCase()}</strong><span>{imageFileSizeLabel(image.size)}</span></div>
      <p>保存于 {date(image.savedAt)}</p><p>{image.retentionHold?'历史图片暂予保留':'到期于 '+date(image.expiresAt)}</p>
      <div className="tw-storage-actions"><button type="button" onClick={()=>onDownload(image)}><Download size={15}/>下载</button>
        {image.taskIds?.length&&onTask?<button type="button" onClick={()=>onTask(image.taskIds[0])}><ArrowUpRight size={15}/>返回任务</button>:<span>无可返回的任务</span>}</div>
    </div>
  </article>;
}
export default function WorkspaceStoragePage({userId,apiBase,onOpenTask,active=true}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [preview,setPreview]=useState(null),[actionError,setActionError]=useState(''),[busy,setBusy]=useState(false);
  const actions=useRef(null),previewUrl=useRef('');
  const request=useCallback(async(path='',signal)=>{
    const response=await fetch(`${apiBase}/api/account/images${path}`,{credentials:'include',cache:'no-store',headers:{'X-Workspace-Account':userId},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(45000)]):AbortSignal.timeout(45000)});
    const value=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(value.error||'图片库读取失败，请稍后重试');
    return value;
  },[apiBase,userId]);
  useEffect(()=>{
    if(!userId||!active)return;
    const controller=new AbortController();setError('');
    request('',controller.signal).then(value=>{if(!controller.signal.aborted){setData(value);setPreview(current=>{if(current&&!value.images.some(i=>i.id===current.id)){if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current='';return null;}return current;});}}).catch(e=>{if(!controller.signal.aborted){setData(null);setError(e.message);}});
    return()=>controller.abort();
  },[userId,active,request,revision]);
  useEffect(()=>{
    if(!active||!userId)return;
    const refresh=()=>{if(document.visibilityState!=='hidden')setRevision(v=>v+1);};
    const timer=setInterval(refresh,60000);window.addEventListener('focus',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[active,userId]);
  useEffect(()=>()=>{actions.current?.abort();if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);},[userId]);
  useEffect(()=>{if(!active){actions.current?.abort();setBusy(false);setPreview(null);if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current='';}},[active]);
  async function load(image,download=false) {
    actions.current?.abort();const controller=new AbortController();actions.current=controller;setBusy(true);setActionError('');
    try{
      const value=await request('/'+image.id,controller.signal);if(controller.signal.aborted)return;
      const url=URL.createObjectURL(imageBlob(value));
      if(download){const a=document.createElement('a');a.href=url;a.download=`Tuyan-${image.id.slice(0,12)}.${image.format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
      else{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current=url;setPreview({...image,url});}
    }catch(e){if(!controller.signal.aborted){setActionError(e.message);setRevision(v=>v+1);}}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  function close(){setPreview(null);if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current='';}
  if(!userId)return <p>登录后查看账号保存的图片。</p>;
  return <div className="tw-storage-page">
    <div className="tw-storage-summary"><div><h2>存储</h2><p className="tw-storage-capacity">已用 {data?imageBytesLabel(data.usedBytes):'—'} / {data?imageBytesLabel(data.maxBytes):'100 MB'}</p></div><button type="button" aria-label="刷新存储" onClick={()=>setRevision(v=>v+1)}><RefreshCw size={17}/></button></div>
    {data&&<progress max={data.maxBytes} value={Math.min(data.usedBytes,data.maxBytes)} aria-label="已用图片存储空间"/>}
    <p className="tw-storage-notice">{IMAGE_LIBRARY_NOTICE}</p>
    {!!data?.protectedBytes&&<p role="status" className="tw-storage-cleanup">历史图片中有 {imageBytesLabel(data.protectedBytes)} 的保留期限待核对，已计入容量，暂不自动清理。时间未知的图片列于末尾。</p>}
    {!!data?.unavailableHistoryCount&&<p role="status" className="tw-storage-cleanup">另有 {data.unavailableHistoryCount} 个历史结果引用的文件已缺失，未计入已保存图片。原任务记录保留。</p>}
    {!!data?.pendingBytes&&<p role="status" className="tw-storage-cleanup">有 {imageBytesLabel(data.pendingBytes)} 等待服务器清理，仍计入实际占用；服务端会自动重试。</p>}
    {error?<p role="alert">{error} <button type="button" onClick={()=>setRevision(v=>v+1)}>重新加载</button></p>:!data?<p role="status">正在读取已保存图片…</p>:data.images.length?<div className="tw-storage-grid">{data.images.map(image=><StoredImage key={image.id} image={image} request={request} onPreview={i=>load(i)} onDownload={i=>load(i,true)} onTask={onOpenTask}/>)}</div>:<div className="tw-storage-empty"><Image size={34}/><h3>还没有已保存的图片</h3><p>服务器确认保存的生成结果会显示在这里。</p></div>}
    {busy&&<p role="status">正在读取图片…</p>}{actionError&&<p role="alert">{actionError}</p>}
    {preview&&<WorkspaceDialog title="图片预览" wide onClose={close}><img className="tw-storage-preview" src={preview.url} alt="已保存图片预览"/><div className="tw-storage-preview-footer"><span>{preview.format.toUpperCase()} · {imageFileSizeLabel(preview.size)} · {preview.retentionHold?'历史图片暂予保留':date(preview.expiresAt)+' 到期'}</span><button type="button" className="tw-primary" disabled={busy} onClick={()=>load(preview,true)}>下载图片</button></div></WorkspaceDialog>}
  </div>;
}
