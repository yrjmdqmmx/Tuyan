import { useEffect, useState } from 'react';
import { PanelLeft, ArrowLeft } from 'lucide-react';
import RatioCanvas from './RatioCanvas.jsx';
import TaskSidebar from './TaskSidebar.jsx';
import TaskSidebarRail from './TaskSidebarRail.jsx';
import TaskComposer from './TaskComposer.jsx';
import useComposerViewport from './useComposerViewport.js';
import ResultWorkspace from './ResultWorkspace.jsx';
import WorkspaceDialog from './WorkspaceDialog.jsx';
import WorkspaceSegments from './WorkspaceSegments.jsx';
import { currentTask, currentBranch, PATHS, taskMatches, taskHasContent, currentDraft } from './workspaceState.js';

export default function TaskWorkspace({ state, dispatch, onSubmit, onFiles, busy = false, uploadError = '', missingOriginal, onRestoreOriginal, saveStatus = '', user = null, onSignIn, onSignOut, onAccountSettings, accountPending = false, renderModels, renderRecovery, renderSettings, renderOptimize, renderPage, renderAccount, isAdmin = false, renderSvgEditor, onDownload, onCloseUnaccepted, headerTools, executionProgress }) {
  const task = currentTask(state), branch = currentBranch(state);
  const nickname = user?.name?.trim();
  const [collapsed, setCollapsed] = useState(false), [mobile, setMobile] = useState(false), [mobileOpen, setMobileOpen] = useState(false);
  const shellRef = useComposerViewport(mobile);
  const [panel, setPanel] = useState(null), [page, setPage] = useState('workspace'), [query, setQuery] = useState(''), [archived, setArchived] = useState(false);
  const [rename, setRename] = useState(null), [title, setTitle] = useState('');
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => { setMobile(media.matches); if (!media.matches) setMobileOpen(false); };
    update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const key = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.isComposing) { e.preventDefault(); setPanel('search'); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => { setPanel(null); }, [state.selectedTaskId]);
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
  const sidebar = <TaskSidebar page={page} state={state} dispatch={dispatch} onClose={() => mobile ? setMobileOpen(false) : toggleSidebar(true)} onSearch={() => { setMobileOpen(false); setPanel('search'); }} onNavigate={next => { setPage(next); setMobileOpen(false); }} onRename={t => { setRename(t); setTitle(t.title); }} {...accountActions} accountPending={accountPending} user={user} mobile={mobile} />;
  const renderComposer = (optimization = {}) => <TaskComposer mobile={mobile} toolDialogOpen={panel === 'models' || panel === 'settings'} key={`${task.id}:${task.path}`} state={state} dispatch={dispatch} onSubmit={onSubmit} onFiles={onFiles} busy={busy} uploadError={uploadError} missingOriginal={missingOriginal} onRestoreOriginal={onRestoreOriginal} saveStatus={saveStatus} onModels={() => setPanel('models')} onSettings={() => setPanel('settings')} onOptimize={optimization.start} optimizing={optimization.optimizing} optimizationContent={optimization.content} />;
  const composer = renderOptimize ? <div className="tw-optimization-host" key={`${task.id}:${task.path}:${branch.targetId || 'new'}`}>{renderOptimize(renderComposer)}</div> : renderComposer();
  function navigate(path) { dispatch({ type: 'SET_PATH', path }); }
  return <div ref={shellRef} className={`tw-shell ${collapsed ? 'tw-collapsed' : ''} ${mobile && mobileOpen ? 'tw-mobile-nav-open' : ''}`}>
    {!mobile && (!collapsed ? sidebar : <TaskSidebarRail
      onExpand={() => toggleSidebar(false)} onSearch={() => setPanel('search')}
      onCreate={() => { dispatch({ type: 'CREATE_TASK' }); setPage('workspace'); }}
      onModels={() => setPage('models')} onNavigate={setPage}
      {...accountActions} accountPending={accountPending} user={user} page={page}
    />)}
    <main inert={mobile && mobileOpen ? true : undefined} className={`tw-main ${!hasStarted && page === 'workspace' ? 'tw-empty' : ''}`}>
      <header className={`tw-topbar ${page !== 'workspace' ? 'tw-management-topbar' : ''}`}>{mobile && <button type="button" className="tw-icon" aria-label="打开侧边栏" onClick={() => setMobileOpen(true)}><PanelLeft size={21} /></button>}
        <h1>{page === 'workspace' ? task.title : page === 'models' ? '模型管理' : page}</h1>{task.archived && page === 'workspace' && <button type="button" className="tw-text-button" onClick={() => dispatch({ type: 'ARCHIVE' })}>恢复已归档任务</button>}
        {page !== 'workspace' && <button type="button" className="tw-text-button" onClick={() => setPage('workspace')}><ArrowLeft size={16} />返回任务</button>}
        {page === 'workspace' && <WorkspaceSegments className="tw-paths" label="创作路径" value={task.path} onChange={navigate} options={Object.entries(PATHS).map(([path, label]) => ({ value: path, label, suffix: task.activeRunId && task.runs.find(r => r.id === task.activeRunId)?.path === path ? <span className="tw-path-running" aria-label="执行中" /> : null }))} />}
        {headerTools && <div className="tw-header-tools">{headerTools}</div>}
      </header>
      {page !== 'workspace' ? <div key={page} className={`tw-page ${['models', '排行榜', '他山科研生态', '站长页', '社区评估题审核'].includes(page) ? 'tw-page-wide' : ''}`}><div className="tw-page-body">{page === 'models' ? renderModels?.({ management: true, onClose: () => setPage('workspace') }) : page === '账户设置' && renderAccount ? renderAccount() : renderPage?.(page, () => setPage('workspace'), setPage)}</div></div>
        : task.deleted ? <div className="tw-empty-body"><p role="status">此任务已删除。内容仍保留，可恢复后继续编辑。</p><button type="button" onClick={()=>dispatch({type:'RESTORE_TASK'})}>恢复任务</button></div> : !hasStarted ? <div className="tw-empty-body"><div className="tw-welcome"><h2>HI！{nickname && <>{nickname}，</>}今天想绘制什么？</h2></div>{currentDraft(state).settings[currentDraft(state).mode].ratio !== 'auto' && <RatioCanvas ratio={currentDraft(state).settings[currentDraft(state).mode].ratio}/>}{composer}
        </div> : <><ResultWorkspace executionProgress={executionProgress} renderRecovery={renderRecovery} userId={user?.id} key={`${task.id}:${task.path}`} state={state} dispatch={dispatch} renderSvgEditor={renderSvgEditor} onDownload={onDownload} onCloseUnaccepted={!busy ? onCloseUnaccepted : null} /><div className="tw-docked">{composer}</div></>}
    </main>
    {mobile && mobileOpen && <WorkspaceDialog title="任务导航" className="tw-mobile-nav-dialog" backdropClassName="tw-mobile-nav-backdrop" onClose={() => setMobileOpen(false)}>{sidebar}</WorkspaceDialog>}
    {panel === 'search' && <WorkspaceDialog title="搜索任务" onClose={() => setPanel(null)}><input className="tw-search-input" data-autofocus aria-label="搜索任务标题和需求" value={query} placeholder="搜索任务标题和需求内容" onChange={e => setQuery(e.target.value)} /><label className="tw-archive-filter"><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} />包含已归档和已删除任务</label><div className="tw-search-results">{state.tasks.filter(t => taskHasContent(t) && (archived || !t.deleted && !t.archived) && taskMatches(t, query)).map(t => <button type="button" key={t.id} onClick={() => { dispatch({ type: 'SELECT_TASK', id: t.id }); setPage('workspace'); setPanel(null); }}><strong>{t.title}</strong><span>{t.deleted ? '已删除 · ' : t.archived ? '已归档 · ' : ''}{PATHS[t.path]} · {t.runs.length} 次执行</span></button>)}{!state.tasks.some(t => taskHasContent(t) && (archived || !t.deleted && !t.archived) && taskMatches(t, query)) && <p>没有匹配的任务</p>}</div></WorkspaceDialog>}
    {rename && <WorkspaceDialog title="重命名任务" onClose={() => setRename(null)}><form onSubmit={e => { e.preventDefault(); dispatch({ type: 'RENAME', taskId: rename.id, title, baseTitle: rename.title }); setRename(null); }}><label className="tw-field">任务名称<input data-autofocus value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label><button type="submit" className="tw-primary">保存名称</button></form></WorkspaceDialog>}
    {panel === 'models' && <WorkspaceDialog title="模型配置" onClose={() => setPanel(null)}>{renderModels?.({ management: false, onClose: () => setPanel(null), onManage: () => { setPanel(null); setPage('models'); } })}</WorkspaceDialog>}
    {panel === 'settings' && <WorkspaceDialog title="绘图设置" onClose={() => setPanel(null)}>{renderSettings?.()}</WorkspaceDialog>}
  </div>;
}
