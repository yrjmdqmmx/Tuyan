import { useCallback, useEffect, useRef, useState } from 'react';
import { githubRequest, githubLaunchUrl, isGithubCallback } from '../lib/github.js';
const empty={available:false,linked:false,pending:null};
export function useGithub(apiBase,userId,enabled,onAuthenticated) {
  const [status,setStatus]=useState(empty),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const popup=useRef(null),mounted=useRef(true),epoch=useRef(0),callback=useRef(onAuthenticated),awaiting=useRef(false),started=useRef(0),finishing=useRef(false);
  callback.current=onAuthenticated;
  const request=useCallback((action,body)=>githubRequest(apiBase,action,body,userId),[apiBase,userId]);
  const refresh=useCallback(async()=>{
    const version=epoch.current;
    if(!enabled)return empty;
    const result=await request('status');
    if(mounted.current && version===epoch.current)setStatus(result);
    return result;
  },[request,enabled]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;epoch.current++;popup.current?.close();};},[]);
  useEffect(()=>{epoch.current++;awaiting.current=false;finishing.current=false;popup.current?.close();popup.current=null;setBusy(false);setStatus(empty);setError('');void refresh().catch(()=>{});},[refresh]);
  async function complete(createAccount=false) {
    const version=epoch.current;
    setBusy(true);setError('');
    try {
      const result=await request('complete',{createAccount});
      if(!mounted.current || version!==epoch.current)return null;
      await refresh();
      if(!mounted.current || version!==epoch.current)return null;
      if(!result.confirmationToken)await callback.current?.();
      return result;
    }catch(failure){if(mounted.current && version===epoch.current)setError(failure.message);return null;}finally{if(mounted.current && version===epoch.current)setBusy(false);}
  }
  useEffect(()=>{
    if(!enabled)return;
    async function finish(providerError=false) {
      if(!awaiting.current || finishing.current)return;
      finishing.current=true;const version=epoch.current;
      try {
        const result=await refresh();
        if(!mounted.current || version!==epoch.current)return;
        if(result.pending){
          awaiting.current=false;popup.current?.close();popup.current=null;setBusy(false);
          if(!result.pending.newAccount && result.pending.intent!=='delete'){
            setBusy(true);await request('complete',{});
            if(!mounted.current || version!==epoch.current)return;
            await refresh();
            if(!mounted.current || version!==epoch.current)return;
            await callback.current?.();if(mounted.current && version===epoch.current)setBusy(false);
          }
        }else if(providerError || popup.current?.closed || Date.now()-started.current>600000){
          awaiting.current=false;popup.current?.close();popup.current=null;setBusy(false);setError(providerError?'GitHub 授权未完成，请重新授权':'授权已结束，当前输入已保留');
        }
      }catch(failure){if(!mounted.current || version!==epoch.current)return;awaiting.current=false;popup.current?.close();popup.current=null;setBusy(false);setError(failure.message);}
      finally{if(version===epoch.current)finishing.current=false;}
    }
    const message=event=>{if(isGithubCallback(event,popup.current,window.location.origin))void finish(event.data.status==='error');};
    const focus=()=>{if(awaiting.current)void finish();};
    const timer=window.setInterval(()=>{if(awaiting.current)void finish();},2500);
    window.addEventListener('message',message);window.addEventListener('focus',focus);
    return()=>{window.clearInterval(timer);window.removeEventListener('message',message);window.removeEventListener('focus',focus);};
  },[enabled,refresh,request]);
  async function start(intent='login') {
    if(busy || !status.available || (popup.current && !popup.current.closed))return;
    const version=epoch.current;
    const opened=window.open('about:blank','_blank','popup,width=500,height=650');
    if(!opened){setError('请允许浏览器打开GitHub 授权窗口');return;}
    popup.current?.close();popup.current=opened;setBusy(true);setError('');
    try {
      const result=await request('start',{intent,returnOrigin:window.location.origin});
      if(!mounted.current || version!==epoch.current || popup.current!==opened || opened.closed){opened.close();return;}
      opened.location.replace(githubLaunchUrl(result.url,apiBase,window.location.origin));
      started.current=Date.now();awaiting.current=true;
    }catch(failure){opened.close();if(mounted.current && version===epoch.current){popup.current=null;setBusy(false);setError(failure.message);}}
  }
  async function cancel(){const version=epoch.current;awaiting.current=false;popup.current?.close();popup.current=null;setBusy(false);try{await request('cancel',{});if(!mounted.current || version!==epoch.current)return;await refresh();if(mounted.current && version===epoch.current)setError('');}catch(failure){if(mounted.current && version===epoch.current)setError(failure.message);}}
  return {status,busy,error,start,complete,cancel,refresh};
}
