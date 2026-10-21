// Development-only, synthetic SVG. Real local cache/reducer; no model or account API.
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import TaskWorkspace from '../../src/workspace/TaskWorkspace.jsx';
import WorkspaceSvgEditor from '../../src/workspace/WorkspaceSvgEditor.jsx';
import {WorkspaceSyncController,createWorkspaceCache} from '../../src/workspace/workspaceSync.js';
import {newWorkspace,workspaceReducer,currentTask} from '../../src/workspace/workspaceState.js';
import '../../src/styles.css';
import '../../src/workspace/workspace.css';
import '../../src/workspace/workspacePages.css';
import '../../src/workspace/workspaceMotion.css';
import '../../src/components/svgWorkspace.css';
import '../../src/workspace/workspaceSvg.css';
const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" font-family="Arial"><rect x="0" y="0" width="800" height="450" fill="white"/><rect id="box" x="80" y="155" width="240" height="120" rx="18" fill="#d6e9df"/><rect x="480" y="155" width="240" height="120" rx="18" fill="#e8ece9"/><path d="M340 215H460M445 205L460 215L445 225" stroke="#355e4c" stroke-width="4" fill="none"/><text x="200" y="225" text-anchor="middle" font-size="26" fill="#243e34">研究想法</text><text x="600" y="225" text-anchor="middle" font-size="26" fill="#243e34">清晰图示</text><text x="400" y="80" text-anchor="middle" font-size="30" fill="#243e34">SVG 自动保存验收</text></svg>';
function fixture(){let s=newWorkspace('svg-autosave-fixture');const send=(type,rest={})=>{s=workspaceReducer(s,{type,...rest});};send('SET_PATH',{path:'svg'});send('EDIT_DRAFT',{patch:{text:'合成验收图，无模型调用'}});send('BEGIN',{runId:'fixture-generation'});send('ACCEPT',{runId:'fixture-generation'});send('RESULT',{runId:'fixture-generation',candidateId:'a',label:'A',version:{id:'fixture-original',format:'svg',url:'data:image/svg+xml,'+encodeURIComponent(source)}});send('FINISH',{runId:'fixture-generation'});send('RENAME',{title:'自动保存验收图'});send('CREATE_TASK',{id:'svg-switch-fixture'});send('RENAME',{title:'切换验收任务'});send('SELECT_TASK',{id:'svg-autosave-fixture'});return s;}
function Harness(){
 const [state,setState]=useState(null),controller=useRef(null);
 useEffect(()=>{const c=new WorkspaceSyncController({key:'svg-autosave-isolated-fixture',cache:createWorkspaceCache(),legacy:fixture,notify:c=>setState(c.state)});controller.current=c;void c.init();return()=>c.dispose();},[]);
 if(!state)return <p>正在读取本地合成任务…</p>;
 const dispatch=action=>controller.current.setState(s=>workspaceReducer(s,action));
 const task=currentTask(state);
 return <TaskWorkspace state={state} dispatch={dispatch} onSubmit={()=>{}} onFiles={()=>{}} renderSvgEditor={version=><WorkspaceSvgEditor key={task.id} version={version} versionIds={task.branches.svg.groups.flatMap(g=>g.candidates.filter(c=>!version||c.id===version.candidateId).flatMap(c=>c.versions.map(v=>v.id)))} taskId={task.id} base={location.origin} dataProtected={false} syncStatus="local" onInteract={()=>dispatch({type:'INTERACT',taskId:task.id,path:'svg'})} onSave={async(svg,ids)=>{const c=controller.current;if(c.disposed)throw Error('验收页面已关闭，本机备份保留');dispatch({type:'SAVE_SVG',taskId:task.id,...ids,select:false,url:'data:image/svg+xml,'+encodeURIComponent(svg)});await c.flush();await new Promise(r=>setTimeout(r,350));dispatch({type:'FOLLOW_SVG_SAVE',taskId:task.id,...ids});await c.flush();}}/>}/>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')).render(<Harness/>);
