// Development-only continuous interaction with synthetic results; no API/model calls.
import React,{useEffect,useRef,useState,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {FlaskConical} from 'lucide-react';
import TaskWorkspace from '../../src/workspace/TaskWorkspace.jsx';
import WorkspaceSvgEditor from '../../src/workspace/WorkspaceSvgEditor.jsx';
import {WorkspaceSyncController,createWorkspaceCache} from '../../src/workspace/workspaceSync.js';
import {newWorkspace,workspaceReducer,currentTask,locateVersion,uid} from '../../src/workspace/workspaceState.js';
import {prepareWorkspaceInput} from '../../src/workspace/workspaceSubmission.js';
import '../../src/styles.css';
import '../../src/workspace/workspace.css';
import '../../src/workspace/workspacePages.css';
import '../../src/workspace/workspaceMotion.css';
import '../../src/workspace/workspaceStatus.css';
import '../../src/components/svgWorkspace.css';
import '../../src/workspace/workspaceSvg.css';
const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" font-family="Arial"><rect x="0" y="0" width="800" height="450" fill="white"/><rect id="box" x="80" y="155" width="240" height="120" rx="18" fill="#d6e9df"/><rect x="480" y="155" width="240" height="120" rx="18" fill="#e8ece9"/><path d="M340 215H460M445 205L460 215L445 225" stroke="#355e4c" stroke-width="4" fill="none"/><text x="200" y="225" text-anchor="middle" font-size="26" fill="#243e34">研究想法</text><text x="600" y="225" text-anchor="middle" font-size="26" fill="#243e34">清晰图示</text><text x="400" y="80" text-anchor="middle" font-size="30" fill="#243e34">SVG 自动保存验收</text></svg>';
const path=new URLSearchParams(location.search).get('path')==='png'?'png':'svg';
function initial(){let s=newWorkspace('continuous-'+path);s=workspaceReducer(s,{type:'SET_PATH',path});return s;}
function syntheticResult(run,label,task){
 const n=task.runs.filter(r=>r.kind!=='edit').length;
 if(run.path==='png'){
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=600;const c=canvas.getContext('2d');
  c.fillStyle='#fff';c.fillRect(0,0,1000,600);c.fillStyle='#243e34';c.font='30px sans-serif';c.fillText(`连续创作 · 候选 ${label} · 第 ${n} 轮`,100,100);
  c.fillStyle=n%2?'#d6e9df':'#dce5f1';c.fillRect(100,200,300,190);c.fillRect(600,200,300,190);c.fillStyle='#243e34';c.font='24px sans-serif';c.fillText('研究想法',195,305);c.fillText('清晰图示',695,305);c.fillText('→',480,305);return canvas.toDataURL('image/png');
 }
 const parent=locateVersion(task,run.parentId);const svg=parent?decodeURIComponent(parent.url.split(',').slice(1).join(',')):source;
 return 'data:image/svg+xml,'+encodeURIComponent(svg.replace(/SVG (?:自动保存验收|连续创作[^<]*)/,`SVG 连续创作 · ${label} · 第 ${n} 轮（合成）`));
}
function Harness(){
 const [state,setState]=useState(null),controller=useRef(null),svgFlush=useRef(null),lock=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const registerFlush=useCallback(fn=>{svgFlush.current=fn;},[]);
 useEffect(()=>{const c=new WorkspaceSyncController({key:'continuous-creation-isolated-'+path,cache:createWorkspaceCache(),legacy:initial,notify:c=>setState(c.state)});controller.current=c;void c.init();return()=>c.dispose();},[]);
 const dispatch=action=>controller.current.setState(s=>workspaceReducer(s,action));
 async function submit(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   await prepareWorkspaceInput({getState:()=>controller.current.state,flushSvg:svgFlush.current,readFile:async()=>{throw Error('合成演示不上传材料');}});
   const t=currentTask(controller.current.state),id=uid();dispatch({type:'BEGIN',runId:id});const run=currentTask(controller.current.state).runs.find(r=>r.id===id);if(!run)throw Error('请完成输入');
   dispatch({type:'ACCEPT',taskId:t.id,runId:id});await new Promise(resolve=>setTimeout(resolve,300));
   for(const label of run.parentId?['A']:['A','B'])dispatch({type:'RESULT',taskId:t.id,runId:id,candidateId:'candidate-'+label,label,version:{id:uid(),format:run.path,url:syntheticResult(run,label,currentTask(controller.current.state))}});
   dispatch({type:'FINISH',taskId:t.id,runId:id});await controller.current.flush();
  }catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
 }
 if(!state)return <p>正在读取本地合成任务…</p>;
 const task=currentTask(state);
 return <TaskWorkspace state={state} dispatch={dispatch} onSubmit={submit} onFiles={()=>{}} busy={busy} uploadError={error} headerTools={<span className="tw-status-trigger" title="本地合成演示 · 不调用模型"><FlaskConical size={18}/><span>本地合成演示 · 不调用模型</span></span>}
 renderSvgEditor={version=><WorkspaceSvgEditor key={task.id} version={version} versionIds={task.branches.svg.groups.flatMap(g=>g.candidates.filter(c=>!version||c.id===version.candidateId).flatMap(c=>c.versions.map(v=>v.id)))} registerFlush={registerFlush} taskId={task.id} base={location.origin} dataProtected={false} readOnly={!!task.activeRunId} syncStatus="local" onInteract={()=>dispatch({type:'INTERACT',taskId:task.id,path:'svg'})} onSave={async(svg,ids)=>{dispatch({type:'SAVE_SVG',taskId:task.id,...ids,select:false,url:'data:image/svg+xml,'+encodeURIComponent(svg)});await controller.current.flush();dispatch({type:'FOLLOW_SVG_SAVE',taskId:task.id,...ids});await controller.current.flush();}}/>}/>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')).render(<Harness/>);
