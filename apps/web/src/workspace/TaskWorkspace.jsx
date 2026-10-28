import { useEffect, useRef, useState } from 'react';
import { PanelLeft, ArrowLeft, ChevronLeft, X } from 'lucide-react';
import RatioCanvas from './RatioCanvas.jsx';
import TaskSidebar from './TaskSidebar.jsx';
import TaskSidebarRail from './TaskSidebarRail.jsx';
import TaskComposer from './TaskComposer.jsx';
import useComposerViewport from './useComposerViewport.js';
import { useWorkspaceEntrance } from './useWorkspaceMotion.js';
import ResultWorkspace from './ResultWorkspace.jsx';
import WorkspaceDialog from './WorkspaceDialog.jsx';
import WorkspaceSegments from './WorkspaceSegments.jsx';
import WorkspaceSearch from './WorkspaceSearch.jsx';
import WorkspacePromptGuide from './WorkspacePromptGuide.jsx';
import HomeTemplateCarousel from './HomeTemplateCarousel.jsx';
import WelcomeTypewriter from './WelcomeTypewriter.jsx';
import { currentTask, currentBranch, PATHS, currentDraft } from './workspaceState.js';
import { ACCOUNT_SETTINGS_SECTIONS } from './accountSettingsSections.js';

export default function TaskWorkspace({ navigation, state, dispatch, onDeleteTask, onSubmit, onFiles, busy = false, uploadError = '', missingOriginal, onRestoreOriginal, saveStatus = '', user = null, onSignIn, onSignOut, onAccountSettings, accountPending = false, renderModels, renderRecovery, renderSettings, renderOptimize, renderPage, renderAccount, isAdmin = false, renderSvgEditor, onDownload, onCloseUnaccepted, headerTools, executionProgress, presentationOnly = false }) {
  const task = currentTask(state), branch = currentBranch(state);
  const nickname = user?.name?.trim();
  const [welcomeStoppedTasks, setWelcomeStoppedTasks] = useState(() => new Set());
  const stopWelcome = () => setWelcomeStoppedTasks(ids => ids.has(task.id) ? ids : new Set(ids).add(task.id));
  const draft = currentDraft(state);
  const welcomeStopped = welcomeStoppedTasks.has(task.id) || Boolean(draft.text || draft.caption || draft.avoid || draft.attachments.length);
  const [collapsed, setCollapsed] = useState(false), [mobile, setMobile] = useState(false), [mobileOpen, setMobileOpen] = useState(false);
  const [modelHeaderTarget, setModelHeaderTarget] = useState(null);
  const shellRef = useComposerViewport(mobile);
  const composerDialogTriggerRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const searchStateRef = useRef({query:'', archived:false});
  const [panel, setPanel] = useState(null), [localPage, setPageState] = useState('workspace');
  const page = navigation?.route.page || localPage;
  const [accountSection, setAccountSection] = useState(navigation?.route.accountSection || null);
  const accountHeadingRef = useRef(null);
  const [modelView, setModelView] = useState(null), [settingsSection, setSettingsSection] = useState(null);
  const [modelVisit, setModelVisit] = useState(0);
  const [pageTool, setPageTool] = useState(null);
  const [composerFocus, setComposerFocus] = useState(null);
  function setPage(next) { if (navigation) navigation.navigate(next); else setPageState(next); setModelView(null); setPageTool(null); setAccountSection(null); }
  function changeAccountSection(next) {
    const previous = accountSection;
    setAccountSection(next);
    if (mobile) requestAnimationFrame(() => {
      const scroller = shellRef.current?.querySelector('.tw-settings-page');
      if (scroller) scroller.scrollTop = 0;
      if (next) accountHeadingRef.current?.focus({preventScroll:true});
      else shellRef.current?.querySelector(`[data-settings-section="${previous}"]`)?.focus({preventScroll:true});
    });
  }
  useEffect(() => {
    if (!navigation) return;
    setAccountSection(navigation.route.accountSection || null);
    if (navigation.route.page !== 'workspace') setPanel(null);
    setMobileOpen(false);
    if (navigation.route.composerAction) setComposerFocus({action:navigation.route.composerAction});
  }, [navigation?.route.href]);
  const mobileSettings = mobile && page === '账户设置';
  const accountSectionTitle = ACCOUNT_SETTINGS_SECTIONS.find(section => section.id === accountSection)?.label;
  const deleteTriggerRef=useRef(null);
  const [deletion,setDeletion]=useState(null),[deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState('');
  const askDelete=onDeleteTask&&!busy?(t,trigger)=>{deleteTriggerRef.current=trigger;setDeletion({id:t.id,title:t.title});setDeleteError('');}:null;
  async function confirmDelete(){setDeleting(true);setDeleteError('');try{await onDeleteTask(deletion.id);setDeletion(null);}catch(error){setDeleteError(error.message);}finally{setDeleting(false);}}
  const [rename, setRename] = useState(null), [title, setTitle] = useState('');
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => { setMobile(media.matches); if (!media.matches) setMobileOpen(false); };
    update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (presentationOnly) return;
    const key = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.isComposing) { e.preventDefault(); openSearch(); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [presentationOnly]);
  useEffect(() => { setPanel(null); }, [state.selectedTaskId]);
  useEffect(() => {
    if (!composerFocus) return;
    // Reveal the existing controls, then focus one. Never click an action.
    shellRef.current?.querySelector('.tw-composer textarea')?.focus({preventScroll:true});
    const frame = requestAnimationFrame(() => shellRef.current?.querySelector(`[data-composer-action="${composerFocus.action}"]`)?.focus({preventScroll:true}));
    return () => cancelAnimationFrame(frame);
  }, [composerFocus]);
  function toggleSidebar(next) {
    setCollapsed(next);
    requestAnimationFrame(() => {
      // Restore focus after replacing the sidebar, without stealing a newer menu/input focus.
      if (document.activeElement === document.body) document.querySelector(next ? '.tw-rail [aria-label="展开侧边栏"]' : '.tw-sidebar [aria-label="收起侧边栏"]')?.focus();
    });
  }
  const accountActions = {
    onAdmin: isAdmin ? () => { setMobileOpen(false); setPage('站长页'); } : undefined,
    onSignIn: onSignIn && (() => { setMobileOpen(false); onSignIn(); }),
    onSignOut: onSignOut && (() => { setMobileOpen(false); onSignOut(); }),
    onAccountSettings: (renderAccount || onAccountSettings) && (() => { setMobileOpen(false); if (renderAccount) setPage('账户设置'); else onAccountSettings(); }),
  };
  const hasStarted = task.runs.length > 0 || task.path === 'svg';
  useWorkspaceEntrance(shellRef, !presentationOnly && page === 'workspace' && !hasStarted && !task.deleted);
  function openComposerPanel(next, event) {
    composerDialogTriggerRef.current = event.currentTarget;
    setSettingsSection(null);
    setPanel(next);
  }
  function openSearch(event) {
    searchTriggerRef.current = event?.currentTarget || document.activeElement;
    setPanel('search');
  }
  function selectSearchResult(target) {
    setMobileOpen(false);
    setPanel(target.panel || null);
    if (target.taskId) dispatch({type:'SELECT_TASK', id:target.taskId});
    if (target.path) dispatch({type:'SET_PATH', path:target.path});
    setPage(target.page || 'workspace');
    setModelView(target.view || null);
    if (target.page) setModelVisit(visit => visit + 1);
    setPageTool(target.tool || null);
    setSettingsSection(target.section || null);
    if (target.composer) setComposerFocus({action:target.composer});
    if (target.panel) composerDialogTriggerRef.current = shellRef.current?.querySelector('.tw-topbar [aria-label="打开侧边栏"], .tw-brand [aria-label="搜索"], .tw-rail [aria-label="搜索"]');
    if (target.page === '账户设置' && !renderAccount) onAccountSettings?.();
  }
  const sidebar = <TaskSidebar page={page} state={state} dispatch={dispatch} onClose={() => mobile ? setMobileOpen(false) : toggleSidebar(true)} onSearch={openSearch} onNavigate={next => { setPage(next); setMobileOpen(false); }} onDelete={askDelete} onRename={t => { setRename(t); setTitle(t.title); }} {...accountActions} accountPending={accountPending} user={user} mobile={mobile} />;
  const renderComposer = (optimization = {}) => <TaskComposer onInputStart={stopWelcome} mobile={mobile} toolDialogOpen={panel === 'models' || panel === 'settings' || panel === 'prompt-guide'} key={`${task.id}:${task.path}`} state={state} dispatch={dispatch} onSubmit={onSubmit} onFiles={onFiles} busy={busy} uploadError={uploadError} missingOriginal={missingOriginal} onRestoreOriginal={onRestoreOriginal} saveStatus={saveStatus} onModels={event => openComposerPanel('models', event)} onSettings={event => openComposerPanel('settings', event)} onPromptGuide={event => openComposerPanel('prompt-guide', event)} onOptimize={optimization.start} optimizing={optimization.optimizing} optimizationContent={optimization.content} />;
  const composer = renderOptimize ? <div className="tw-optimization-host" key={`${task.id}:${task.path}`}>{renderOptimize(renderComposer)}</div> : renderComposer();
  function navigate(path) { dispatch({ type: 'SET_PATH', path }); }
  return <div ref={shellRef} className={`tw-shell ${collapsed ? 'tw-collapsed' : ''} ${mobile && mobileOpen ? 'tw-mobile-nav-open' : ''}`}>
    {!mobile && (!collapsed ? sidebar : <TaskSidebarRail
      onExpand={() => toggleSidebar(false)} onSearch={openSearch}
      onCreate={() => { dispatch({ type: 'CREATE_TASK' }); setPage('workspace'); }}
      onModels={() => setPage('models')} onNavigate={setPage}
      {...accountActions} accountPending={accountPending} user={user} page={page}
    />)}
    <main inert={mobile && mobileOpen ? true : undefined} className={`tw-main ${!hasStarted && page === 'workspace' ? 'tw-empty' : ''}`}>
      {mobileSettings ? <header className="tw-topbar tw-mobile-settings-topbar" data-settings-view={accountSection ? 'detail' : 'index'}>
        {accountSection ? <button type="button" className="tw-settings-header-button" aria-label="返回账户设置" onClick={() => changeAccountSection(null)}><ChevronLeft size={24} aria-hidden="true"/></button> : <span aria-hidden="true"/>}
        <h1 ref={accountHeadingRef} tabIndex={-1}>{accountSectionTitle || '账户设置'}</h1>
        {!accountSection ? <button type="button" className="tw-settings-header-button" aria-label="关闭账户设置，返回任务" onClick={() => setPage('workspace')}><X size={22} aria-hidden="true"/></button> : <span aria-hidden="true"/>}
      </header> : <header className={`tw-topbar ${page !== 'workspace' ? 'tw-management-topbar' : ''} ${page === 'models' ? 'tw-models-topbar' : ''}`}>{mobile && <button type="button" className="tw-icon" aria-label="打开侧边栏" onClick={() => setMobileOpen(true)}><PanelLeft size={21} /></button>}
        <h1>{page === 'workspace' ? task.title : page === 'models' ? '模型管理' : page}</h1>{task.archived && page === 'workspace' && <button type="button" className="tw-text-button" onClick={() => dispatch({ type: 'ARCHIVE' })}>恢复已归档任务</button>}
        {page !== 'workspace' && page !== 'models' && <button type="button" className="tw-text-button" onClick={() => setPage('workspace')}><ArrowLeft size={16} />返回任务</button>}
        {page === 'workspace' && <WorkspaceSegments className="tw-paths" label="创作路径" value={task.path} onChange={navigate} options={Object.entries(PATHS).map(([path, label]) => ({ value: path, label, suffix: task.activeRunId && task.runs.find(r => r.id === task.activeRunId)?.path === path ? <span className="tw-path-running" aria-label="执行中" /> : null }))} />}
        {page === 'models' && <div className="tw-model-header-actions" ref={setModelHeaderTarget} />}
        {headerTools && <div className="tw-header-tools">{headerTools}</div>}
      </header>}
      {page !== 'workspace' ? <div key={`${page}:${modelView || ""}:${modelVisit}:${pageTool || ""}`} data-settings-view={page === '账户设置' ? (accountSection ? 'detail' : 'index') : undefined} className={`tw-page ${['models', '排行榜', '他山科研生态', '站长页', '社区评估题审核', '账户设置'].includes(page) ? 'tw-page-wide' : ''} ${page === '账户设置' ? 'tw-settings-page' : ''}`}><div className="tw-page-body">{page === 'models' ? renderModels?.({ management: true, headerTarget: modelHeaderTarget, initialView: modelView, onClose: () => setPage('workspace') }) : page === '账户设置' && renderAccount ? renderAccount({mobile,section:accountSection,onSectionChange:changeAccountSection,onOpenTask:id=>{if(state.tasks.some(t=>t.id===id&&!t.deleted)){dispatch({type:'SELECT_TASK',id});setPage('workspace');}}}) : renderPage?.(page, () => setPage('workspace'), setPage, {initialTool:pageTool, navigation, tasks:state.tasks, onSelectTask:id=>selectSearchResult({taskId:id})})}</div></div>
        : task.deleted ? <div className="tw-empty-body"><p role="status">此任务由旧版本移除，内容仍保留。</p><button type="button" onClick={()=>dispatch({type:'RESTORE_TASK'})}>恢复任务</button><button type="button" disabled={!askDelete} onClick={()=>askDelete(task)}>彻底删除</button></div> : !hasStarted ? <div className="tw-empty-body"><div className="tw-welcome"><WelcomeTypewriter key={task.id} nickname={nickname} stopped={presentationOnly || welcomeStopped} paused={Boolean(panel || mobileOpen)} /></div><HomeTemplateCarousel key={task.id} mobile={mobile} stopped={presentationOnly || welcomeStopped} paused={Boolean(panel || mobileOpen)} onApply={template=>dispatch({type:'APPLY_TEMPLATE',template})}/>{currentDraft(state).settings[currentDraft(state).mode].ratio !== 'auto' && <RatioCanvas ratio={currentDraft(state).settings[currentDraft(state).mode].ratio}/>}{composer}
        </div> : <><ResultWorkspace executionProgress={executionProgress} renderRecovery={renderRecovery} userId={user?.id} key={`${task.id}:${task.path}`} state={state} dispatch={dispatch} renderSvgEditor={renderSvgEditor} onDownload={onDownload} onCloseUnaccepted={!busy ? onCloseUnaccepted : null} /><div className="tw-docked">{composer}</div></>}
    </main>
    {mobile && mobileOpen && <div inert={panel === 'search' || deletion ? true : undefined} aria-hidden={panel === 'search' || deletion ? true : undefined}><WorkspaceDialog title="任务导航" className="tw-mobile-nav-dialog" backdropClassName="tw-mobile-nav-backdrop" onClose={() => setMobileOpen(false)}>{sidebar}</WorkspaceDialog></div>}
    {panel === 'search' && <WorkspaceSearch tasks={state.tasks} searchStateRef={searchStateRef} returnFocusRef={searchTriggerRef} onClose={() => setPanel(null)} onSelect={selectSearchResult}
      capabilities={{isAdmin, models:!!renderModels, settings:!!renderSettings && !task.deleted, account:!!(renderAccount || onAccountSettings), pages:!!renderPage, svg:!!renderSvgEditor && !task.deleted, composer:!task.deleted && !busy, optimize:!!renderOptimize && !task.activeRunId}} />}
    {deletion && <WorkspaceDialog title="彻底删除任务" returnFocusRef={deleteTriggerRef} onClose={()=>{if(!deleting)setDeletion(null);}}>
      <p>确定彻底删除“{deletion.title}”吗？</p><p>任务的草稿、执行记录、结果版本和关联恢复副本将被删除，无法恢复。其他任务共用的文件会保留，已下载或自行导出的文件不受影响。</p>
      {deleteError && <p role="alert">{deleteError}</p>}
      <div className="tw-delete-actions"><button type="button" data-autofocus disabled={deleting} onClick={()=>setDeletion(null)}>取消</button><button type="button" className="tw-danger" disabled={deleting} onClick={confirmDelete}>{deleting?'正在彻底删除…':'彻底删除'}</button></div>
    </WorkspaceDialog>}
    {rename && <WorkspaceDialog title="重命名任务" onClose={() => setRename(null)}><form onSubmit={e => { e.preventDefault(); dispatch({ type: 'RENAME', taskId: rename.id, title, baseTitle: rename.title }); setRename(null); }}><label className="tw-field">任务名称<input data-autofocus value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label><button type="submit" className="tw-primary">保存名称</button></form></WorkspaceDialog>}
    {panel === 'models' && <WorkspaceDialog title="模型配置" returnFocusRef={composerDialogTriggerRef} onClose={() => setPanel(null)}>{renderModels?.({ management: false, onClose: () => setPanel(null), onManage: () => { setPanel(null); setPage('models'); } })}</WorkspaceDialog>}
    {panel === 'settings' && <WorkspaceDialog title="绘图设置" returnFocusRef={composerDialogTriggerRef} onClose={() => setPanel(null)}>{renderSettings?.({focusSection:settingsSection})}</WorkspaceDialog>}
    {panel === 'prompt-guide' && <WorkspacePromptGuide path={task.path} returnFocusRef={composerDialogTriggerRef} onClose={() => setPanel(null)} />}
  </div>;
}
