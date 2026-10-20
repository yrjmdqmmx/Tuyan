import {workspaceProgress} from './workspaceProgress.js';
import {generationProgressSnapshot} from './generationProgress.js';
import { historyJob } from '../../../../packages/api/src/workspace-history.mjs';
import { mergeAccountHistory } from './workspaceHistory.js';
import {useEffect,useRef,useState} from 'react';
import {API_BASE_DEFAULT} from '../config.js';
import {workspaceResultDataUrl,workspaceAccountResultDataUrl} from './workspaceResultAsset.js';
import {buildWorkspaceRequest,startWorkspaceRun,recoverWorkspaceRun,pollWorkspaceRun,workspaceExecutionIssue} from './workspaceExecution.js';
import {currentTask,workspaceReducer,uid} from './workspaceState.js';
const terminal=['completed','succeeded','failed','cancelled'];
function reviewSummary(review,simulation){
  if(simulation)return '本地模拟 · 未执行模型评审';
  if(typeof review==='string')return review.slice(0,1000);
  return ({passed:'模型评审通过',issues_found:'模型评审发现问题',modified_unreviewed:'修改后的版本尚未复审',review_failed:'模型评审未完成'})[review?.status]||'未提供评审结论';
}
export default function useWorkspaceExecution({stateRef,dispatch,sync,models,userId,base=API_BASE_DEFAULT}){
  const [health,setHealth]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [progressByRunId,setProgressByRunId]=useState({});
  const live=useRef(true),submitting=useRef(new Set()),polling=useRef(false);
  useEffect(()=>{live.current=true;const ac=new AbortController();fetch(base+'/paperbanana-api',{credentials:'include',signal:ac.signal}).then(r=>r.json()).then(data=>{if(live.current)setHealth(data);}).catch(()=>{if(live.current)setError('无法确认执行服务状态');});return()=>{live.current=false;ac.abort();};},[base]);
  async function refresh(){
    if(polling.current||!live.current||!stateRef.current||!userId)return;
    polling.current=true;
    const activeIds=new Set(stateRef.current.tasks.map(t=>t.activeRunId).filter(Boolean));
    setProgressByRunId(current=>Object.fromEntries(Object.entries(current).filter(([id])=>activeIds.has(id))));
    try{for(const t of stateRef.current.tasks){const run=t.runs.find(r=>r.id===t.activeRunId&&r.execution);if(t.deleted||t.syncConflict||!run||submitting.current.has(run.id))continue;
      try{const remote=run.execution.jobId?{jobId:run.execution.jobId}:await recoverWorkspaceRun(base,userId,run.execution.taskId||t.id,run.id);if(!live.current)return;
        if(!remote?.jobId){if(remote?.status==='failed')dispatch({type:'FINISH',taskId:t.id,runId:run.id,error:'执行未获接收，原要求已保留。'});else dispatch({type:'EXECUTION',taskId:t.id,runId:run.id,stage:'正在核对提交状态；不会重复发送。'});continue;}
        dispatch({type:'EXECUTION',taskId:t.id,runId:run.id,execution:{jobId:remote.jobId}});dispatch({type:'ACCEPT',taskId:t.id,runId:run.id});
        const job=await pollWorkspaceRun(base,userId,run.execution.taskId||t.id,run.id,remote.jobId);if(!live.current)return;
        if(stateRef.current.tasks.find(task=>task.id===t.id)?.activeRunId!==run.id)continue;
        setProgressByRunId(current=>({...current,[run.id]:generationProgressSnapshot(job,{taskId:t.id,runId:run.id,base})}));
        if(run.history){sync.setState(current=>mergeAccountHistory(current,[historyJob(job,run.history.source,userId)]));continue;}
        for(const [i,image]of(job.result_images||[]).entries()){const format=image.mime_type==='image/svg+xml'||/\.svg(?:$|\?)/i.test(image.filename)?'svg':'png';if(format!==run.path)throw Error('返回格式与此执行不一致，未替换已有版本。');if(!image.url&&!image.storage_error)continue;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${run.id}:${image.candidate_id}:${image.filename}`));const versionId=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');if(!live.current)return;dispatch({type:'RESULT',taskId:t.id,runId:run.id,candidateId:`${run.id}-${image.candidate_id}`,label:String.fromCharCode(65+i),version:{id:versionId,format,url:image.storage_error?'':image.library_id?await workspaceAccountResultDataUrl(image.library_id,format,base,userId):await workspaceResultDataUrl(image.url,format,base),...(image.library_id?{resultId:image.library_id}:{}),...(image.storage_error?{loadError:image.storage_error}:{}),review:reviewSummary(image.review,run.execution.simulation)}});}
        if(terminal.includes(job.status))dispatch({type:'FINISH',taskId:t.id,runId:run.id,error:['failed','cancelled'].includes(job.status)?job.error||'执行未完成，已有结果及要求保留。':''});
        else dispatch({type:'EXECUTION',taskId:t.id,runId:run.id,stage:`${run.execution.simulation?'本地模拟 · ':''}${workspaceProgress(job)}`});
      }catch(e){if(live.current){setProgressByRunId(current=>current[run.id]?{...current,[run.id]:{...current[run.id],refreshFailed:true}}:current);dispatch({type:'EXECUTION',taskId:t.id,runId:run.id,stage:e.message+'；保留当前执行并稍后查询。'});}}}
    }finally{polling.current=false;}
  }
  const refreshRef=useRef(refresh);refreshRef.current=refresh;
  useEffect(()=>{const tick=()=>void refreshRef.current();tick();const timer=setInterval(tick,5000);const visible=()=>{if(document.visibilityState==='visible')tick();};window.addEventListener('online',tick);document.addEventListener('visibilitychange',visible);window.addEventListener('pageshow',tick);return()=>{clearInterval(timer);window.removeEventListener('online',tick);document.removeEventListener('visibilitychange',visible);window.removeEventListener('pageshow',tick);};},[userId]);
  async function submit(){
    if(submitting.current.size)return;setError('');if(!userId){setError('请先登录图研，任务执行需要账号归属。草稿已保留。');return;}
    const unavailable=workspaceExecutionIssue(health);if(unavailable){setError(unavailable);return;}
    const simulation=health.simulation===true;
    setBusy(true);const original=stateRef.current,task=currentTask(original),runId=uid();submitting.current.add(runId);
    let begun=false,requestStarted=false;
    try{
      const started=workspaceReducer(original,{type:'BEGIN',runId,execution:{version:1,simulation}}),run=started.tasks.find(t=>t.id===task.id).runs.find(r=>r.id===runId);if(!run)throw Error('请先完成当前任务的输入检查。');
      const request=buildWorkspaceRequest({task,run,models});
      const issue=workspaceExecutionIssue(health,request);if(issue)throw Error(issue);
      dispatch({type:'BEGIN',taskId:task.id,runId,execution:{version:1,simulation}});begun=true;
      await sync.ensureSynced();if(!live.current)return;
      if(stateRef.current.tasks.find(t=>t.id===task.id)?.activeRunId!==runId)throw Error('另一标签页已更新本任务的执行，请查看当前进度。');
      requestStarted=true;
      const result=await startWorkspaceRun({base,userId,task,run,models,simulation,request});if(!live.current)return;
      dispatch({type:'EXECUTION',taskId:task.id,runId,execution:{jobId:result.id}});dispatch({type:'ACCEPT',taskId:task.id,runId});
    }catch(e){if(live.current){if(begun&&(!requestStarted||e.beforeDispatch||e.status>=400&&e.status<500))dispatch({type:'FINISH',taskId:task.id,runId,error:e.message});else if(begun)dispatch({type:'EXECUTION',taskId:task.id,runId,stage:'提交状态待核对；不重复发送。'});setError(e.message);}}
    finally{submitting.current.delete(runId);if(live.current)setBusy(false);void refreshRef.current();}
  }
  async function closeUnaccepted(){
    const t=currentTask(stateRef.current),run=t.runs.find(r=>r.id===t.activeRunId);
    if(!run?.execution||run.accepted||busy)return;
    try {
      const response=await fetch(base+'/paperbanana-api',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Workspace-Account':userId},body:JSON.stringify({action:'workspaceCloseUnaccepted',workspaceExecution:{version:1,taskId:run.execution.taskId||t.id,runId:run.id}}),signal:AbortSignal.timeout(15000)});
      const data=await response.json();if(!response.ok)throw Error(data.error||'暂时无法确认提交状态');
      if(live.current)dispatch({type:'FINISH',taskId:t.id,runId:run.id,error:'未被服务接收的提交已取消，输入已保留。'});
    }catch(e){if(live.current)setError(e.message);}
  }
  async function simulateFailure(){const t=currentTask(stateRef.current),run=t.runs.find(r=>r.id===t.activeRunId);if(!run?.execution||!health?.simulation)return;await fetch(base+'/paperbanana-api',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Workspace-Account':userId},body:JSON.stringify({action:'workspaceSimulationFail',runId:run.id,jobId:run.execution.jobId})});await refresh();}
  return {submit,refresh,simulateFailure,closeUnaccepted,busy,error,health,progressByRunId};
}
