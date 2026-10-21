// Dev-only, synthetic account and read responses. No real account/model requests.
import React,{useReducer,useState} from 'react';
import {createRoot} from 'react-dom/client';
import TaskWorkspace from '../../src/workspace/TaskWorkspace.jsx';
import WorkspaceAccountPage from '../../src/workspace/WorkspaceAccountPage.jsx';
import WorkspaceDrawingSettings from '../../src/workspace/WorkspaceDrawingSettings.jsx';
import AccountSettingsDialog from '../../src/components/AccountSettingsDialog.jsx';
import {AppLocaleProvider} from '../../src/components/BenchmarkLocale.jsx';
import {newWorkspace,workspaceReducer,currentDraft,currentTask} from '../../src/workspace/workspaceState.js';
// Match main.jsx's global styles: rendering components alone omits their entry-level CSS.
import '../../src/components/journal-rules.css';
import '../../src/components/journal-bookshelf.css';
import '../../src/components/svgWorkspace.css';
import '../../src/components/referenceTaxonomy.css';
import '../../src/components/figureTypePicker.css';
import '../../src/components/workflowOptions.css';
import '../../src/components/guidePanel.css';
import '../../src/components/ThinkingSettings.css';
import '../../src/styles.css';
import '../../src/components/tokendance.css';
import '../../src/components/watcha.css';
import '../../src/components/benchmark.css';
import '../../src/components/admin/admin.css';
import '../../src/mobile-workbench.css';
import '../../src/components/generationSettingsDrawer.css';
import '../../src/components/leaderboard-mobile.css';
import '../../src/components/changelog.css';
import '../../src/components/header-navigation.css';
import '../../src/workspace/workspace.css';
import '../../src/workspace/workspacePages.css';
import '../../src/workspace/workspaceMotion.css';
const fixtureUser={id:'fixture-local',name:'本地预览',email:'preview@example.test'};
const models={library:{models:[]},tokenDance:{connection:{connected:false,available:false},userId:null}};
function Harness(){
 const [state,dispatch]=useReducer(workspaceReducer,null,()=>newWorkspace('local-interactions'));
 const [dialog,setDialog]=useState(false),[notice,setNotice]=useState('');
 const account={user:fixtureUser,refreshAccount:async()=>{},onAccountSettings(){setDialog(true);},onSignOut(){setNotice('本地合成预览：已触发退出入口，未操作真实账号。');}};
 const draft=currentDraft(state);
 return <AppLocaleProvider><TaskWorkspace state={state} dispatch={dispatch} user={fixtureUser} onSubmit={()=>setNotice('本地交互预览，不调用生成模型。')} onFiles={()=>{}} onSignOut={account.onSignOut}
  renderAccount={navigation=><WorkspaceAccountPage {...navigation} state={state} account={account} sync={{saveStatus:'本地合成预览',retry(){}}} models={models} onExport={()=>{}} apiBase=""/>}
  renderSettings={()=><WorkspaceDrawingSettings draft={draft} path={currentTask(state).path} models={models} onChange={settings=>dispatch({type:'EDIT_DRAFT',patch:{settings:{...draft.settings,[draft.mode]:settings}}})}/>}/>
  {dialog&&<AccountSettingsDialog apiBase="" email={fixtureUser.email} onClose={()=>setDialog(false)} onDeleted={()=>setDialog(false)}/>}
  {notice&&<div className="tw-auth-message" role="status">{notice}<button onClick={()=>setNotice('')}>关闭</button></div>}
 </AppLocaleProvider>;
}
if(import.meta.env.DEV){
 window.fetch=async(input,options)=>{
  const url=String(input);
  if(options?.method==='POST')return Response.json({error:'本地预览不提交账号或生成操作。'},{status:403});
  if(url.endsWith('/activity'))return Response.json({today:'2026-10-21',total:0,peak:0,longestStreak:0,currentStreak:0,days:[]});
  if(url.endsWith('/status'))return Response.json({code:0,state:'active'});
  if(url.includes('/images'))return Response.json({maxBytes:100000000,usedBytes:0,images:[]});
  return Response.json({code:0,references:[]});
 };
 const root=createRoot(document.getElementById('root'));
 root.render(<Harness/>);
 import.meta.hot?.dispose(()=>root.unmount());
}
