import { purgeLocalTaskAssets } from './workspaceDeletion.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTH_BASE_DEFAULT, API_BASE_DEFAULT } from '../config.js';
import { createWorkspaceCache, createWorkspaceClient, importBrowserDrafts, readLegacy, WorkspaceSyncController, workspaceFingerprint } from './workspaceSync.js';
import { WorkspaceHistorySync } from './workspaceHistorySync.js';
import { taskHasContent } from './workspaceState.js';

const cache = createWorkspaceCache();
const tabIds=new Map();
function recoveryIds(key) {
  if(!tabIds.has(key)) {
    let restoreId;try{restoreId=sessionStorage.getItem(key+':tab');}catch{}
    const recoveryId=crypto.randomUUID();try{sessionStorage.setItem(key+':tab',recoveryId);}catch{}
    tabIds.set(key,{restoreId,recoveryId});
  }
  return tabIds.get(key);
}
const labels = { local:'草稿已保存在此浏览器', saving:'正在保存本机草稿…', pending:'本机已保存，等待账号同步', syncing:'正在同步任务、设置和结果…', synced:'任务、设置和结果已同步账号', error:'同步未完成，本机草稿仍保留' };
export default function useWorkspaceSync(userId, baseUrl = AUTH_BASE_DEFAULT) {
  const prefix=`workspace-v1:${baseUrl || location.origin}:`;
  const [view,setView]=useState({state:null,status:'saving',error:'',notice:''});
  const [guest,setGuest]=useState(null);
  const current=useRef(null);
  const [historyView,setHistoryView]=useState({historyStatus:'',historyIssue:''});
  const history=useRef(null);
  const loadHistory=useCallback(()=>history.current?.refresh({manual:true}),[]);
  useEffect(()=>{
    const key=prefix+(userId||'guest');
    const channel=typeof window.BroadcastChannel==='function'?new window.BroadcastChannel('tuyan-workspace-updates-v1'):null;
    const broadcast=message=>{channel?.postMessage(message);try{localStorage.setItem('tuyan-workspace-update',JSON.stringify({...message,nonce:crypto.randomUUID()}));}catch{}};
    let historySync;
    setHistoryView({historyStatus:'',historyIssue:''});
    const controller=new WorkspaceSyncController({cache,key,purgeLocal:state=>purgeLocalTaskAssets({state,key,cache,baseUrl:API_BASE_DEFAULT,userId}),...recoveryIds(key),broadcast,client:userId?createWorkspaceClient({baseUrl,userId}):null,notify:c=>{setView({state:c.state,status:c.status,error:c.error,notice:c.notice,importedGuest:c.importedGuest});if(c.state&&!c.disposed)historySync?.start();}});
    if(userId)historySync=new WorkspaceHistorySync({controller,notify:update=>setHistoryView(previous=>({...previous,...update})),canRefresh:()=>navigator.onLine!==false&&document.visibilityState==='visible'});
    history.current=historySync;
    current.current=controller;void controller.init();
    const receive=event=>{try{const data=event.type==='storage'?JSON.parse(event.newValue):event.data;void controller.receive(data);}catch{}};
    const storage=event=>{if(event.key==='tuyan-workspace-update')receive(event);};
    channel?.addEventListener('message',receive);window.addEventListener('storage',storage);
    const retry=()=>{void controller.persist().then(()=>controller.sync({background:true}));historySync?.wake();};
    const visible=()=>{if(document.visibilityState==='visible')retry();};
    window.addEventListener('online',retry);window.addEventListener('focus',retry);window.addEventListener('pageshow',retry);document.addEventListener('visibilitychange',visible);
    // The account endpoint connects independent origins; broadcasts only accelerate
    // same-origin delivery. Hidden pages catch up on visibility/pageshow/online.
    const timer=setInterval(()=>{if(document.visibilityState==='visible')void controller.sync({background:true});},5000);
    return()=>{historySync?.dispose();controller.dispose();clearInterval(timer);channel?.close();window.removeEventListener('storage',storage);window.removeEventListener('online',retry);window.removeEventListener('focus',retry);window.removeEventListener('pageshow',retry);document.removeEventListener('visibilitychange',visible);};
  },[prefix,userId,baseUrl]);
  useEffect(()=>{let live=true;if(userId)cache.read(prefix+'guest').then(async saved=>{const state=saved?.state||readLegacy();const fingerprint=await workspaceFingerprint(state);if(live&&state.tasks.some(taskHasContent))setGuest({state,fingerprint});}).catch(()=>{});return()=>{live=false};},[prefix,userId]);
  const setState=useCallback(update=>current.current?.setState(update),[]);
  const flush=useCallback(()=>current.current?.flush(),[]);
  const importGuest=()=>{current.current.importedGuest=guest.fingerprint;current.current.setState(s=>importBrowserDrafts(s,guest.state));};
  return {...view,deleteTask:taskId=>current.current.deleteTask(taskId),...historyView,loadHistory,setState,saveStatus:labels[view.status],retry:()=>current.current?.sync(),flush,ensureSynced:async()=>{const c=current.current;await c.flush();await c.sync();if(c.status==='pending')await c.sync();if(c.status!=='synced')throw Error(c.error||'请等待账号同步完成再执行。');},canImport:!!(userId&&guest&&view.importedGuest!==guest.fingerprint),importGuest};
}
