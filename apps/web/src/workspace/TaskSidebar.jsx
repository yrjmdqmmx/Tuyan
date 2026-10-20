import { useState } from 'react';
import { PanelLeftClose, Plus, Search, Boxes, ChartNoAxesColumn, BookOpen, MoreHorizontal, Pin, Pencil, ChevronDown, LoaderCircle, SquarePen, Trash2 } from 'lucide-react';
import { logoUrl } from '../config.js';
import { taskHasContent } from './workspaceState.js';
import ResourceLinks from './ResourceLinks.jsx';
import SidebarAccount from './SidebarAccount.jsx';
import SidebarTooltip, { searchShortcut } from './SidebarTooltip.jsx';

export default function TaskSidebar({ state, dispatch, onClose, onSearch, onNavigate, onRename, onDelete, onSignIn, onSignOut, onAccountSettings, onAdmin, accountPending = false, user, mobile = false, page = 'workspace' }) {
  const [resources, setResources] = useState(false);
  const visible = state.tasks.filter(t => !t.deleted && !t.archived && taskHasContent(t)).sort((a,b)=>Math.max(b.updatedAt||0,...b.runs.map(r=>r.createdAt))-Math.max(a.updatedAt||0,...a.runs.map(r=>r.createdAt)));
  function select(id) { dispatch({ type: 'SELECT_TASK', id }); onNavigate('workspace'); if (mobile) onClose(); }
  function create() { dispatch({ type: 'CREATE_TASK' }); onNavigate('workspace'); if (mobile) onClose(); }
  const rows = tasks => tasks.map(t => {
    const running = t.runs.find(r => r.id === t.activeRunId);
    const failed = !running && t.runs.at(-1)?.status === 'failed';
    return <div data-task-id={t.id} className={`tw-task-row ${page === 'workspace' && state.selectedTaskId === t.id ? 'is-selected' : ''}`} key={t.id}>
      <button type="button" className="tw-task-select" onClick={() => select(t.id)} aria-current={page === 'workspace' && state.selectedTaskId === t.id ? 'page' : undefined} title={t.title}>
        <span className="tw-task-title">{t.title}</span>{running ? <LoaderCircle size={14} className="tw-spin" aria-label="执行中" /> : failed ? <span className="tw-error-dot" aria-label="执行失败">!</span> : null}
      </button>
      <details className="tw-task-menu"><summary aria-label={`${t.title} 的操作`}><MoreHorizontal size={16} /></summary><div>
        <button type="button" onClick={e => { e.currentTarget.closest('details').open = false; onRename(t); }}><Pencil size={15} />重命名</button>
        <button type="button" onClick={e => { e.currentTarget.closest('details').open = false; dispatch({ type: 'PIN', taskId: t.id }); }}><Pin size={15} />{t.pinned ? '取消置顶' : '置顶'}</button>
        <button type="button" disabled={!!t.activeRunId || !onDelete} onClick={e => { e.currentTarget.closest('details').open = false; onDelete(t,e.currentTarget.closest('details').querySelector('summary')); }}><Trash2 size={15} />删除</button>
      </div></details>
    </div>;
  });
  return <aside className="tw-sidebar" aria-label="任务侧边栏">
    <div className="tw-brand">
      <img src={logoUrl} alt="图研" /><span>图研 <small>Tuyan</small></span>
      <SidebarTooltip label="搜索" shortcut={searchShortcut()} side="bottom"><button type="button" className="tw-icon" onClick={onSearch} aria-label="搜索"><Search size={20} aria-hidden="true" /></button></SidebarTooltip>
      {!mobile && <SidebarTooltip label="收起侧边栏" side="bottom"><button type="button" className="tw-icon" onClick={onClose} aria-label="收起侧边栏"><PanelLeftClose size={20} aria-hidden="true" /></button></SidebarTooltip>}
    </div>
    <div className="tw-sidebar-content">
      <nav className="tw-navigation" aria-label="常用功能">
        {!mobile && <button type="button" onClick={create}><Plus size={20} />新建任务</button>}
        <button type="button" aria-current={page === 'models' ? 'page' : undefined} onClick={() => { onNavigate('models'); if (mobile) onClose(); }}><Boxes size={19} />模型管理</button>
        <button type="button" aria-current={page === '排行榜' ? 'page' : undefined} onClick={() => onNavigate('排行榜')}><ChartNoAxesColumn size={19} />排行榜</button>
      </nav>
      <div className="tw-resources"><button type="button" onClick={() => setResources(!resources)} aria-expanded={resources}><BookOpen size={19} aria-hidden="true" /><span>资源与帮助</span><ChevronDown size={15} className="tw-resources-chevron" aria-hidden="true" /></button>
        {resources && <ResourceLinks onNavigate={onNavigate} page={page} />}
      </div>
      <nav className="tw-tasks" aria-label="创作任务">
        {visible.some(t => t.pinned) && <section><h2>置顶</h2>{rows(visible.filter(t => t.pinned))}</section>}
        <section><h2>最近任务</h2>{rows(visible.filter(t => !t.pinned))}{!visible.length && <p className="tw-muted">还没有任务</p>}</section>
      </nav>
    </div>
    <div className={mobile ? "tw-mobile-nav-footer" : "tw-sidebar-account-slot"}>
      {mobile && <button type="button" className="tw-mobile-create" onClick={create}><SquarePen size={22} />新建任务</button>}
      <SidebarAccount mobile={mobile} user={user} onSignIn={onSignIn} onSignOut={onSignOut} onAccountSettings={onAccountSettings} onAdmin={onAdmin} accountPending={accountPending} />
    </div>
  </aside>;
}
