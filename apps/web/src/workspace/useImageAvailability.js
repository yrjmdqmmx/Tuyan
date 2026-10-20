import {useEffect,useMemo,useState} from 'react';
import {imageRemovalMessage} from '../../../../packages/api/src/image-library.mjs';

// Availability is a server projection, never a client edit to the task or a
// sync conflict. Local bytes cannot override an account-image tombstone.
export function projectImageAvailability(state,images) {
  if(!state)return state;
  const ids=new Map(),history=new Map();
  for(const image of images){
    if(image.status!=='removed')continue;
    const message=imageRemovalMessage(image.reason);ids.set(image.id,message);
    for(const source of image.sources||[])if(source.jobId&&Number.isSafeInteger(source.resultIndex))history.set(`${source.jobId}:${source.resultIndex}`,message);
  }
  if(!ids.size)return state;
  const mapChanged=(values,fn)=>{const next=values.map(fn);return next.some((v,i)=>v!==values[i])?next:values;};
  const tasks=mapChanged(state.tasks,task=>{
    let changed=false;
    const branches=Object.fromEntries(Object.entries(task.branches).map(([path,branch])=>{
      const groups=mapChanged(branch.groups,group=>{
        const candidates=mapChanged(group.candidates,candidate=>{
          const versions=mapChanged(candidate.versions,version=>{
            const message=ids.get(version.resultId)||(version.history&&history.get(`${version.history.jobId}:${version.history.index}`));
            return message?{...version,url:'',loadError:message}:version;
          });
          return versions===candidate.versions?candidate:{...candidate,versions};
        });
        return candidates===group.candidates?group:{...group,candidates};
      });
      changed||=groups!==branch.groups;
      return [path,groups===branch.groups?branch:{...branch,groups}];
    }));
    return changed?{...task,branches}:task;
  });
  return tasks===state.tasks?state:{...state,tasks};
}
export default function useImageAvailability(state,userId,base) {
  const [availability,setAvailability]=useState({userId:null,images:[]});
  const count=(state?.tasks||[]).reduce((n,t)=>n+Object.values(t.branches).reduce((m,b)=>m+b.groups.reduce((p,g)=>p+g.candidates.reduce((q,c)=>q+c.versions.length,0),0),0),0);
  useEffect(()=>{
    if(!userId)return;
    const controller=new AbortController();let running=false;
    const update=async()=>{if(running||document.visibilityState==='hidden')return;running=true;try{
      const response=await fetch(`${base}/api/account/images/status`,{credentials:'include',cache:'no-store',headers:{'X-Workspace-Account':userId},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});
      if(!response.ok)return;const value=await response.json();if(!controller.signal.aborted)setAvailability({userId,images:value.images||[]});
    }catch{/* The task keeps its last server-confirmed availability during outages. */}finally{running=false;}};
    void update();const timer=setInterval(update,60000);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
    return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
  },[userId,base,count]);
  return useMemo(()=>availability.userId===userId?projectImageAvailability(state,availability.images):state,[state,userId,availability]);
}
