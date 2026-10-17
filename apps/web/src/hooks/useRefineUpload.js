import {saveBrowserMaterial,browserFile,putBrowserRecord,getBrowserRecord} from '../lib/browserMaterials.js';
import { useEffect, useRef, useState } from 'react';
import { abortReferenceUploadRequest, finalizeReferenceUploadRequest, prepareReferenceUploadRequest,uploadMaterialFileRequest,materialFileRequest } from '@paperbanana/api';
import { putRefineFile, readImageDimensions, validateRefineDimensions, validateRefineFile } from '../lib/refineUpload';

export default function useRefineUpload({ apiBase, health, limits, authReady, ownerId, materialVersion,onSelectionChange }) {
  const [source, updateSource] = useState({ url: '', objectKey: '' });
  const sourceRef=useRef(source);
  const selectionChange=useRef(onSelectionChange);selectionChange.current=onSelectionChange;
  const [upload, setUpload] = useState({ status: 'idle', progress: 0, error: '' });
  const operation = useRef({ sequence: 0, controller: null, preview: '', file: null });
  const scope=JSON.stringify([apiBase,ownerId||'anonymous']);
  const scopeRef=useRef(scope);
  if(scopeRef.current!==scope){scopeRef.current=scope;operation.current.sequence++;}
  const publish=(next)=>{sourceRef.current=next;updateSource(next);};
  function persistSource(next,sequence=operation.current.sequence){
    if(materialVersion!==2)return;
    operation.current.persistence=(operation.current.persistence||Promise.resolve()).catch(()=>{}).then(async()=>{
      if(operation.current.sequence!==sequence||scopeRef.current!==scope)return;
      await putBrowserRecord({scope,id:'draft:refine-source',kind:'draft',ref:next.browserSource||null,
        settings:next.browserSource?{taskContext:next.taskContext,journalSelection:next.journalSelection??null,contentType:next.contentType??null,sourceTaskId:next.sourceTaskId}:null});
      return true;
    }).catch(error=>{if(operation.current.sequence===sequence)setUpload(v=>({...v,error:'原图草稿未保存：'+error.message}));return false;});
  }

  function reset() {
    operation.current.sequence += 1;
    operation.current.controller?.abort();
    operation.current.cleanup?.();
    operation.current.cleanup = null;
    if (operation.current.preview) URL.revokeObjectURL(operation.current.preview);
    operation.current.preview = '';
    operation.current.file = null;
  }

  function captureSelection(){
    const sequence=operation.current.sequence;
    return {identity:sourceRef.current.identity,isCurrent:()=>operation.current.sequence===sequence&&scopeRef.current===scope};
  }
  function beginSelection() {
    reset();
    selectionChange.current?.();
    const sequence=operation.current.sequence,identity=crypto.randomUUID();
    publish({url:'',objectKey:'',identity});
    setUpload({status:'loading',progress:0,error:''});
    persistSource({});
    return {identity,isCurrent:()=>operation.current.sequence===sequence&&scopeRef.current===scope};
  }
  function setSource(next,ticket=beginSelection()) {
    if(!ticket.isCurrent())return false;
    publish({...next,identity:ticket.identity});
    setUpload({ status: 'idle', progress: 0, error: '' });
    persistSource(next);
    return true;
  }
  function updateSettings(identity,settings){
    if(sourceRef.current.identity!==identity||!sourceRef.current.url)return;
    const next={...sourceRef.current,...settings};publish(next);persistSource(next);
  }

  useEffect(() => {
    reset();publish({url:'',objectKey:'',identity:crypto.randomUUID()});setUpload({status:'idle',progress:0,error:''});
    selectionChange.current?.();
    const scope=JSON.stringify([apiBase,ownerId||'anonymous']),sequence=operation.current.sequence;
    if(materialVersion===2)getBrowserRecord(scope,'draft:refine-source').then(async d=>{if(!d?.ref)return;const file=await browserFile(scope,d.ref);if(sequence!==operation.current.sequence)return;const preview=URL.createObjectURL(file);operation.current.preview=preview;operation.current.file=file;const dimensions=await readImageDimensions(preview);if(sequence!==operation.current.sequence)return;publish({...d.settings,url:preview,filename:file.name,size:file.size,mimeType:file.type,...dimensions,browserSource:d.ref,identity:crypto.randomUUID()});setUpload({status:'ready',progress:100,error:''});}).catch(error=>{if(sequence===operation.current.sequence)setUpload({status:'failed',progress:0,error:error.message})});
    return reset;
  }, [apiBase, ownerId, materialVersion]);

  async function selectFiles(files,{ticket,settings={}}={}) {
    if (!files?.length) return;
    if (files.length !== 1) { setUpload((value) => ({ ...value, error: '每次请选择一张原图。' })); return; }
    const file = files[0];
    try {
      if (!authReady) throw new Error('请先登录，再上传精修原图。');
      validateRefineFile(file, limits);
    } catch (error) {
      setUpload((value) => ({ ...value, error: error.message }));
      return;
    }
    ticket=ticket||beginSelection();
    if(!ticket.isCurrent())return false;
    const sequence = operation.current.sequence;
    const controller = new AbortController();
    const preview = URL.createObjectURL(file);
    Object.assign(operation.current,{ sequence, controller, preview, file });
    const current = () => operation.current.sequence === sequence && !controller.signal.aborted;
    publish({ ...settings,identity:ticket.identity,url: preview, objectKey: '', filename: file.name, size: file.size, mimeType: file.type });
    setUpload({ status: 'validating', progress: 0, error: '' });
    let uploads;
    try {
      const browserSource=materialVersion===2?await saveBrowserMaterial(JSON.stringify([apiBase,ownerId||'anonymous']),file):null;
      if(!current())return;
      const dimensions = await readImageDimensions(preview);
      validateRefineDimensions(dimensions, limits);
      if (!current()) return;
      publish({...sourceRef.current,...dimensions});
      if(browserSource){publish({...sourceRef.current,browserSource});persistSource(sourceRef.current);const saved=await operation.current.persistence;if(!current())return false;if(saved===false)throw Error('原图草稿未保存，请重试。');setUpload({status:'ready',progress:100,error:''});return true;}
      const prepared = await prepareReferenceUploadRequest(apiBase, health, [{ clientId: 'refine-source', filename: file.name, mimeType: file.type, size: file.size }]);
      uploads = prepared.uploads?.map(({ objectKey, uploadToken, mimeType, size, filename, uploadUrl, expiresAt }) => ({ objectKey, uploadToken, mimeType, size, filename, uploadUrl, expiresAt }));
      if (!current()) throw new DOMException('已取消上传', 'AbortError');
      if (uploads?.length !== 1 || !uploads[0].uploadUrl) throw new Error('无法获取图片上传地址，请重试。');
      setUpload({ status: 'uploading', progress: 0, error: '' });
      await putRefineFile(uploads[0].uploadUrl, file, { signal: controller.signal, expiresAt: uploads[0].expiresAt, onProgress: (progress) => {
        if (current()) setUpload({ status: 'uploading', progress, error: '' });
      } });
      if (!current()) throw new DOMException('已取消上传', 'AbortError');
      setUpload({ status: 'checking', progress: 100, error: '' });
      const lifecycleUploads = uploads.map(({ uploadUrl, ...upload }) => upload);
      const finalized = await finalizeReferenceUploadRequest(apiBase, health, lifecycleUploads, { purpose: 'refine' });
      if (!current()) throw new DOMException('已取消上传', 'AbortError');
      operation.current.cleanup = () => { void abortReferenceUploadRequest(apiBase, health, lifecycleUploads).catch(() => {}); };
      publish({ ...sourceRef.current,url: preview, objectKey: uploads[0].objectKey, uploaded: true, filename: file.name, mimeType: file.type, size: file.size, ...dimensions, ...finalized.source, browserSource });
      setUpload({ status: 'ready', progress: 100, error: '' });
      return true;
    } catch (error) {
      if (uploads?.length) await abortReferenceUploadRequest(apiBase, health, uploads.map(({ uploadUrl, ...upload }) => upload)).catch(() => {});
      if (current()) setUpload({ status: 'failed', progress: 0, error: error.message || '图片上传失败，请重试。' });
    }
  }

  async function prepareSource(){
    if(!source.browserSource)return {source};
    const scope=JSON.stringify([apiBase,ownerId||'anonymous']),sequence=operation.current.sequence,file=await browserFile(scope,source.browserSource);
    if(sequence!==operation.current.sequence)throw Error('原图已更换，未上传。');
    const material=await uploadMaterialFileRequest(apiBase,health,file,{clientFileId:source.browserSource.id});
    if(sequence!==operation.current.sequence||material.sha256!==source.browserSource.sha256){await materialFileRequest(apiBase,health,'deleteMaterial',{materialId:material.id}).catch(()=>{});throw Error('原图已改变或校验失败，未提交精修。');}
    return {source:{...source,materialId:material.id},material};
  }
  async function restoreOriginal(ref,taskContext,ticket=beginSelection()){
    const file=await browserFile(scope,ref);
    if(!ticket.isCurrent())return false;
    return selectFiles([file],{ticket,settings:{taskContext,sourceTaskId:taskContext?.jobId,journalSelection:taskContext?.journalSelection??null,contentType:taskContext?.contentType??null}});
  }
  return { source, setSource, beginSelection,captureSelection,updateSettings,upload, selectFiles, prepareSource,restoreOriginal, retry: () => { if (operation.current.file) {const {taskContext,journalSelection,contentType,sourceTaskId}=sourceRef.current;void selectFiles([operation.current.file],{settings:{taskContext,journalSelection,contentType,sourceTaskId}});} } };
}
