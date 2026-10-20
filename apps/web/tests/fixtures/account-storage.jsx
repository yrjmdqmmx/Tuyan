// Dev-only harness. API replies are supplied by the isolated browser acceptance runner.
import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import TaskWorkspace from '../../src/workspace/TaskWorkspace.jsx';
import WorkspaceAccountPage from '../../src/workspace/WorkspaceAccountPage.jsx';
import {newWorkspace,workspaceReducer} from '../../src/workspace/workspaceState.js';
import '../../src/styles.css';
import '../../src/workspace/workspace.css';
import '../../src/workspace/workspacePages.css';
import '../../src/workspace/workspaceMotion.css';
function Harness(){
 const [state,dispatch]=useReducer(workspaceReducer,null,()=>{const s=newWorkspace('fixture-task');s.tasks[0].title='合成验收任务';return s});
 const [user,setUser]=useState({id:'fixture-A',name:'本地合成账号',email:'fixture@example.test'});
 const account={user,refreshAccount:async()=>{const value=await(await fetch('/api/auth/get-session')).json();setUser(value.user)},beforeAccountMutation:async()=>{},onAccountSettings(){},onSignOut(){}};
 const models={tokenDance:{connection:{connected:false,available:false},userId:null}};
 return <TaskWorkspace state={state} dispatch={dispatch} user={user} onSubmit={()=>{}} onFiles={()=>{}} renderAccount={({onOpenTask})=><WorkspaceAccountPage state={state} account={account} sync={{saveStatus:'合成账号 · 本地验收',retry(){}}} models={models} onExport={()=>{}} onOpenTask={onOpenTask} apiBase=""/>}/>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')).render(<Harness/>);
