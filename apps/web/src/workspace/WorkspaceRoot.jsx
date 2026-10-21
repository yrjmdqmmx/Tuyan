import {prepareWorkspaceInput} from './workspaceSubmission.js';
import {TokenDanceRecovery} from '../components/TokenDancePanel.jsx';
import useImageAvailability from './useImageAvailability.js';
import {resumeWorkspaceRun} from './workspaceExecution.js';
import {journalFigureContent} from '../../../../packages/api/src/journal-rules.js';
import useWorkspaceExecution from './useWorkspaceExecution.js';
import WorkspaceSvgEditor from './WorkspaceSvgEditor.jsx';
import {API_BASE_DEFAULT, AUTH_REQUIRED} from '../config.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import TaskWorkspace from './TaskWorkspace.jsx';
import WorkspaceAccount from './WorkspaceAccount.jsx';
import { newWorkspace, workspaceReducer, currentTask, currentBranch, currentDraft, refinementTarget, activeRun, uid, submitIssue, locateVersion } from './workspaceState.js';
import useWorkspaceSync from './useWorkspaceSync.js';
import { ORIGINAL_SCOPE } from './workspaceSync.js';
import { restoreWorkspaceOriginal } from './workspaceMaterials.js';
import { saveBrowserMaterial, browserFile } from '../lib/browserMaterials.js';
import { checkOriginalMaterial, isImageMaterial } from '../lib/materials.js';

import '../components/svgWorkspace.css';
import './workspace.css';
import './workspaceSvg.css';
import './workspacePages.css';
import './workspaceMotion.css';
import './workspaceModels.css';
import './workspaceStatus.css';
import '../ecosystem/ecosystem.css';
import WorkspaceStatus, { WorkspaceStatusNotice, workspaceStatusIssues } from './WorkspaceStatus.jsx';
import useWorkspaceModels from './useWorkspaceModels.js';
import { WorkspaceModelManager, WorkspaceModelConfig } from './WorkspaceModelPanels.jsx';
import WorkspaceAccountPage from './WorkspaceAccountPage.jsx';
import {workspaceVersionDataUrl} from './workspaceResultAsset.js';
import WorkspacePages, {useWorkspaceAdmin} from './WorkspacePages.jsx';
import WorkspaceOptimize from './WorkspaceOptimize.jsx';
import WorkspaceDrawingSettings from './WorkspaceDrawingSettings.jsx';

import { isLoginEntry } from '../appPaths.js';
import useWorkspaceNavigation from './useWorkspaceNavigation.js';

export default function WorkspaceRoot({ preview = false }) {
  const beforeExit = useRef(null);
  const navigation = useWorkspaceNavigation();
  const publicPage = navigation.route.publicPage;
  return <WorkspaceAccount loginRequested={isLoginEntry(navigation.route.search)} beforeSignOut={() => beforeExit.current?.()} requireLogin={AUTH_REQUIRED && !publicPage}>{account => !account.user && publicPage
    ? <PublicWorkspaceHost account={account} navigation={navigation}/>
    : account.accountPending && !account.user ? <p role="status">正在确认账号并载入任务…</p>
      : <WorkspaceHost key={account.user?.id || 'guest'} account={account} beforeExit={beforeExit} preview={preview} navigation={navigation}/>}</WorkspaceAccount>;
}
// Anonymous public navigation never initializes task/model stores or execution.
function PublicWorkspaceHost({account, navigation}) {
  const [state] = useState(() => newWorkspace('public-navigation'));
  return <TaskWorkspace state={state} dispatch={() => {}} {...account} navigation={navigation}
    onSubmit={account.onSignIn} onFiles={account.onSignIn}
    renderPage={(page,onClose,onNavigate,options) => <WorkspacePages {...options} key={page} page={page} onClose={onClose} onNavigate={onNavigate} account={account} models={{}}/>}/>;
}
function WorkspaceHost({ account, beforeExit, preview, navigation }) {
  const sync = useWorkspaceSync(account.user?.id);
  const models = useWorkspaceModels(account.user?.id);
  const { state, setState } = sync;
  const stateRef = useRef(state); stateRef.current = state;
  const svgFlush=useRef(null);
  const registerSvgFlush=useCallback(flush=>{svgFlush.current=flush;},[]);
  const [busy, setBusy] = useState(false), [uploadError, setUploadError] = useState(''), [stepping, setStepping] = useState(false);
  const [missingOriginal,setMissingOriginal]=useState(null);
  const [statusOpen,setStatusOpen]=useState(false);
  const alive = useRef(true), lock = useRef(false), timers = useRef(new Set());
  const dispatch = useCallback(action => setState(s => {const next=workspaceReducer(s, action);stateRef.current=next;return next;}), [setState]);
  const execution=useWorkspaceExecution({stateRef,dispatch,sync,models,userId:account.user?.id});
  const displayState=useImageAvailability(state,execution.health?.imageLibraryEnabled?account.user?.id:null,API_BASE_DEFAULT);
  const isAdmin=useWorkspaceAdmin(account.user?.id,execution.health);
  useEffect(() => { alive.current = true; return () => { alive.current = false; for (const timer of timers.current) clearTimeout(timer); }; }, []);
  useEffect(() => { beforeExit.current = async () => { if(lock.current || execution.busy)throw Error('正在保存原件，请稍后退出。');await svgFlush.current?.();await sync.flush(); }; return () => { beforeExit.current = null; }; }, [beforeExit, sync.flush, execution.busy]);
  useEffect(()=>{setMissingOriginal(null);setUploadError('');},[state?.selectedTaskId,state && currentTask(state)?.path,state && currentBranch(state)?.versionId]);
  async function submit() {
    if (submitIssue(stateRef.current) || lock.current) return;
    const taskId=currentTask(stateRef.current).id,path=currentTask(stateRef.current).path;
    lock.current=true;setBusy(true);setUploadError('');
    try {
      await prepareWorkspaceInput({getState:()=>stateRef.current,flushSvg:svgFlush.current,isCurrent:()=>alive.current,readFile:async material=>{
        try{await browserFile(ORIGINAL_SCOPE,material);}
        catch(error){if(alive.current&&currentTask(stateRef.current).id===taskId&&currentTask(stateRef.current).path===path)setMissingOriginal(material);throw error;}
      }});
      await execution.submit();
    } catch(error){if(alive.current)setUploadError(error.message);}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }

  async function files(selected) {
    if (!selected.length || lock.current) return;
    const t = currentTask(stateRef.current), branch = currentBranch(stateRef.current), d = currentDraft(stateRef.current);
    const address = { taskId: t.id, path: t.path, draftTargetId: branch.versionId };
    lock.current = true; setBusy(true); setUploadError('');
    try {
      selected.forEach(checkOriginalMaterial);
      if (d.attachments.length + selected.length > 10 || [...d.attachments, ...selected].reduce((n, f) => n + f.size, 0) > 100_000_000) throw Error('每次最多 10 份文件，合计不超过 100 MB。');
      // Save and attach individually; a later failure does not orphan earlier successes.
      for (const file of selected) {
        const descriptor = await saveBrowserMaterial(ORIGINAL_SCOPE, file);
        if (!alive.current) return;
        dispatch({ type: 'ADD_ATTACHMENTS', ...address, attachments: [{ ...descriptor, purpose: isImageMaterial(file) ? '' : 'research' }] });
      }
    } catch (e) { if (alive.current) setUploadError(e.message); } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function restoreOriginal(file) {
    if(!file||!missingOriginal||lock.current)return;
    lock.current=true;setBusy(true);
    try {await restoreWorkspaceOriginal(missingOriginal,file);if(alive.current){setMissingOriginal(null);setUploadError('原件已补传到当前浏览器，可再次提交。');}}
    catch(error){if(alive.current)setUploadError(error.message);}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  async function examples(shape = 'landscape') {
    if (!import.meta.env.DEV || !preview || stepping) return;
    const exampleId = shape === 'portrait' ? 'example-task-portrait' : 'example-task';
    if (stateRef.current.tasks.some(t => t.id === exampleId)) { dispatch({ type: 'SELECT_TASK', id: exampleId }); setUploadError(''); return; }
    setStepping(true); setUploadError('');
    try {
      const { exampleWorkspace } = await import('./previewFixtures.js');
      const example = await exampleWorkspace(shape);
      if (alive.current) setState(s => ({ ...s, selectedTaskId: example.selectedTaskId, tasks: [...example.tasks, ...s.tasks.filter(t => t.id !== example.selectedTaskId)] }));
    } catch (e) { setUploadError(e.message); } finally { if (alive.current) setStepping(false); }
  }
  async function downloadVersion(v) {
    try { const url=await workspaceVersionDataUrl(v,API_BASE_DEFAULT,account.user?.id);const a=document.createElement('a');a.href=url;a.download=`Tuyan-${v.candidateLabel}-v${v.number}.${v.format}`;a.click();setUploadError(''); }
    catch(error){setUploadError(error.message);}
  }
  function exportDraft() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(stateRef.current, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'tuyan-workspace-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!state) return <div className="tw-sync-loading" role="status">{sync.error || '正在恢复本机草稿…'}</div>;
  const d = currentDraft(state), path = currentTask(state).path, run = activeRun(state);
  const statusIssues = workspaceStatusIssues(sync, !execution.health ? execution.error : '');
  return <div className="tw-preview-root">
    <WorkspaceStatusNotice issues={statusIssues} onOpen={() => setStatusOpen(true)} />
    <TaskWorkspace navigation={navigation} onDeleteTask={async taskId=>{if(lock.current)throw Error('正在保存，请稍后删除。');lock.current=true;setBusy(true);try{await sync.deleteTask(taskId);}finally{lock.current=false;if(alive.current)setBusy(false);}}} executionProgress={execution.progressByRunId[currentTask(state).activeRunId]} renderRecovery={(job,run,taskId)=><TokenDanceRecovery job={job} controller={{...models.tokenDance,request:async()=>{if(lock.current)throw Error('正在保存材料，请稍后继续。');lock.current=true;setBusy(true);try{const task=stateRef.current.tasks.find(t=>t.id===taskId);return await resumeWorkspaceRun({base:API_BASE_DEFAULT,userId:account.user.id,task,run,models,simulation:execution.health?.simulation===true,onAdopted:execution=>dispatch({type:'EXECUTION',taskId,runId:run.id,execution}),isCurrent:()=>alive.current,onMissingOriginal:ref=>{if(alive.current&&currentTask(stateRef.current).id===taskId)setMissingOriginal(ref);}});}finally{lock.current=false;if(alive.current)setBusy(false);}}}} onOpenAccount={account.onAccountSettings} onResumed={execution.refresh}/>} isAdmin={isAdmin} onDownload={downloadVersion} onCloseUnaccepted={execution.closeUnaccepted} {...account} state={displayState} dispatch={dispatch} onSubmit={submit} onFiles={files} busy={busy || execution.busy} uploadError={uploadError || execution.error} missingOriginal={missingOriginal} onRestoreOriginal={restoreOriginal}
      headerTools={<WorkspaceStatus preview={preview} sync={sync} execution={execution} signedIn={!!account.user} run={run} stepping={stepping} onExamples={examples} onExport={exportDraft} issues={statusIssues} open={statusOpen} onOpen={() => setStatusOpen(true)} onClose={() => setStatusOpen(false)} />}
      renderSvgEditor={version=>{const task=currentTask(state),input=task.runs.find(r=>r.id===version?.runId)?.input;return <WorkspaceSvgEditor key={`${account.user?.id}:${task.id}`} version={version} versionIds={task.branches.svg.groups.flatMap(g=>g.candidates.filter(c=>!version||c.id===version.candidateId).flatMap(c=>c.versions.map(v=>v.id)))} registerFlush={registerSvgFlush} syncStatus={sync.status} syncError={sync.error} onRetrySync={sync.retry} taskId={task.id} userId={account.user?.id} base={API_BASE_DEFAULT} ratio={d.settings[d.mode].ratio} readOnly={!!task.activeRunId} dataProtected={!!version && (input?.settings[input.mode]?.journalSelection?.contentType||journalFigureContent(input?.settings[input.mode]?.figureTypeId))!=='schematic'} onInteract={()=>dispatch({type:'INTERACT',taskId:task.id,path:'svg'})} onSave={async(svg,identity)=>{
        if(!alive.current)throw Error('账号已切换，编辑备份仍保留在原账号的本机记录中。');
        const sourceTask=stateRef.current.tasks.find(t=>t.id===task.id);if(!sourceTask)throw Error('原任务已不可用，请导出当前稿。');if(sourceTask.activeRunId)throw Error('本任务有活动执行，请完成后保存编辑版本。当前编辑稿已保留在本机。');
        dispatch({type:'SAVE_SVG',taskId:task.id,...identity,select:false,url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});await sync.flush();
        if(!alive.current)throw Error('账号已切换，编辑备份仍保留。');
        const savedTask=stateRef.current.tasks.find(t=>t.id===task.id);
        if(!savedTask||!locateVersion(savedTask,identity.versionId))throw Error('修改尚未写入原任务，编辑备份仍保留，请重试。');
        dispatch({type:'FOLLOW_SVG_SAVE',taskId:task.id,parentId:identity.parentId,versionId:identity.versionId});
        await sync.flush();
      }}/>;}}
      renderModels={({ management, onManage, initialView }) => management ? <WorkspaceModelManager initialView={initialView} models={models} health={execution.health} onSignIn={account.onSignIn} onUseApi={({role,reference,thinking})=>{const draft=currentDraft(stateRef.current), settings=draft.settings.advanced;dispatch({type:"EDIT_DRAFT",patch:{mode:"advanced",settings:{...draft.settings,advanced:{...settings,models:{...settings.models,[role]:reference},...(thinking?{thinking:{...settings.thinking,[role]:{libraryModelId:reference.libraryModelId,options:thinking.options}}}:{})}}}});}}/> : <WorkspaceModelConfig models={models} draft={d} path={path} editing={!!currentBranch(state).versionId || d.attachments.some(a=>a.purpose==='source')} onManage={onManage} onChange={next => dispatch({ type: 'EDIT_DRAFT', patch: { settings: { ...d.settings, [d.mode]: next } } })}/>}
      renderOptimize={children=><WorkspaceOptimize stateRef={stateRef} models={models} userId={account.user?.id} health={execution.health} sync={sync} dispatch={dispatch}>{children}</WorkspaceOptimize>}
      renderAccount={(navigation={}) => <WorkspaceAccountPage {...navigation} preview={preview} account={account} sync={sync} state={state} models={models} onExport={exportDraft}/>}
      renderSettings={({focusSection} = {}) => <WorkspaceDrawingSettings focusSection={focusSection} target={refinementTarget(state)} userId={account.user?.id} base={API_BASE_DEFAULT} draft={d} path={path} editing={!!currentBranch(state).versionId || d.attachments.some(a=>a.purpose==='source')} models={models} onChange={next => dispatch({ type: 'EDIT_DRAFT', patch: { settings: { ...d.settings, [d.mode]: next } } })}/>}
      renderPage={(page,onClose,onNavigate,options) => <WorkspacePages {...options} key={page} page={page} onClose={onClose} onNavigate={onNavigate} account={account} models={models} health={execution.health} isAdmin={isAdmin}/>}
    />

  </div>;
}
