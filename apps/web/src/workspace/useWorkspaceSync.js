import { purgeLocalTaskAssets } from './workspaceDeletion.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTH_BASE_DEFAULT, API_BASE_DEFAULT } from '../config.js';
import { createWorkspaceCache, createWorkspaceClient, importBrowserDrafts, readLegacy, WorkspaceSyncController, workspaceFingerprint } from './workspaceSync.js';
import { mergeAccountHistory } from './workspaceHistory.js';
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
  const [historyStatus,setHistoryStatus]=useState('');
  const [historyIssue,setHistoryIssue]=useState('');
  const historyBusy=useRef(false);
  const loadHistory=useCallback(async({background=false}={})=>{
    const c=current.current;if(!userId || !c?.state || c.disposed || historyBusy.current)return;
    historyBusy.current=true;if(!background)setHistoryStatus('正在读取账号历史任务…');
    try {
      let offset=0,total=0,truncated=false;const seen=new Set();
      do {
        const data=await c.client.history(offset);if(c.disposed)return;
        const fresh=data.jobs.filter(j=>!seen.has(j.source+':'+j.id));fresh.forEach(j=>seen.add(j.source+':'+j.id));
        c.setState(s=>mergeAccountHistory(s,fresh));total+=fresh.length;truncated ||= data.truncated===true;
        if(data.nextOffset==null)break;
        if(!Number.isSafeInteger(data.nextOffset) || data.nextOffset<=offset || !fresh.length)throw Error('历史分页未前进，已保留读到的记录，请重试。');
        offset=data.nextOffset;
      }while(true);
      setHistoryStatus(truncated?`已读取 ${total} 条；正式服务的旧接口有数量上限，尚不能确认全部历史。`:`已读取账号历史 ${total} 条 · 原材料未迁移`);
      setHistoryIssue(truncated?'账号历史尚未完整读取，已读取的任务仍保留。':'');
    }catch(error){if(!c.disposed){const retained=c.state.tasks.reduce((n,t)=>n+t.runs.filter(r=>r.history).length,0);const message=(retained?`已保留 ${retained} 条历史；更新未完成：`:'历史同步未完成：')+error.message;setHistoryStatus(message);setHistoryIssue(message);}}finally{historyBusy.current=false;}
  },[userId,baseUrl]);
  useEffect(()=>{
    const key=prefix+(userId||'guest');
    const channel=typeof window.BroadcastChannel==='function'?new window.BroadcastChannel('tuyan-workspace-updates-v1'):null;
    const broadcast=message=>{channel?.postMessage(message);try{localStorage.setItem('tuyan-workspace-update',JSON.stringify({...message,nonce:crypto.randomUUID()}));}catch{}};
    const controller=new WorkspaceSyncController({cache,key,purgeLocal:state=>purgeLocalTaskAssets({state,key,cache,baseUrl:API_BASE_DEFAULT,userId}),...recoveryIds(key),broadcast,client:userId?createWorkspaceClient({baseUrl,userId}):null,notify:c=>setView({state:c.state,status:c.status,error:c.error,notice:c.notice,importedGuest:c.importedGuest})});
    current.current=controller;void controller.init();
    const receive=event=>{try{const data=event.type==='storage'?JSON.parse(event.newValue):event.data;void controller.receive(data);}catch{}};
    const storage=event=>{if(event.key==='tuyan-workspace-update')receive(event);};
    channel?.addEventListener('message',receive);window.addEventListener('storage',storage);
    const retry=()=>{void controller.persist().then(()=>controller.sync({background:true}));};
    const visible=()=>{if(document.visibilityState==='visible')retry();};
    window.addEventListener('online',retry);window.addEventListener('focus',retry);window.addEventListener('pageshow',retry);document.addEventListener('visibilitychange',visible);
    // The account endpoint connects independent origins; broadcasts only accelerate
    // same-origin delivery. Hidden pages catch up on visibility/pageshow/online.
    const timer=setInterval(()=>{if(document.visibilityState==='visible')void controller.sync({background:true});},5000);
    return()=>{controller.dispose();clearInterval(timer);channel?.close();window.removeEventListener('storage',storage);window.removeEventListener('online',retry);window.removeEventListener('focus',retry);window.removeEventListener('pageshow',retry);document.removeEventListener('visibilitychange',visible);};
  },[prefix,userId,baseUrl]);
  useEffect(()=>{let live=true;if(userId)cache.read(prefix+'guest').then(async saved=>{const state=saved?.state||readLegacy();const fingerprint=await workspaceFingerprint(state);if(live&&state.tasks.some(taskHasContent))setGuest({state,fingerprint});}).catch(()=>{});return()=>{live=false};},[prefix,userId]);
  useEffect(()=>{if(!userId || !view.state)return;void loadHistory();const timer=setInterval(()=>{if(document.visibilityState==='visible')void loadHistory({background:true});},60000);return()=>clearInterval(timer);},[userId,!!view.state,loadHistory]);
  const setState=useCallback(update=>current.current?.setState(update),[]);
  const flush=useCallback(()=>current.current?.flush(),[]);
  const importGuest=()=>{current.current.importedGuest=guest.fingerprint;current.current.setState(s=>importBrowserDrafts(s,guest.state));};
  return {...view,deleteTask:taskId=>current.current.deleteTask(taskId),historyStatus,historyIssue,loadHistory,setState,saveStatus:labels[view.status],retry:()=>current.current?.sync(),flush,ensureSynced:async()=>{const c=current.current;await c.flush();await c.sync();if(c.status==='pending')await c.sync();if(c.status!=='synced')throw Error(c.error||'请等待账号同步完成再执行。');},canImport:!!(userId&&guest&&view.importedGuest!==guest.fingerprint),importGuest};
}
