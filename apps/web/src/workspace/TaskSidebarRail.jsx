import { useId, useRef, useState } from 'react';
import { PanelLeft, Search, Plus, Boxes, ChartNoAxesColumn, Mountain, BookOpen } from 'lucide-react';
import { logoUrl } from '../config.js';
import SidebarTooltip, { searchShortcut } from './SidebarTooltip.jsx';
import ResourcePopover from './ResourcePopover.jsx';
import SidebarAccount from './SidebarAccount.jsx';

export default function TaskSidebarRail({ onExpand, onSearch, onCreate, onModels, onNavigate, onSignIn, onSignOut, onAccountSettings, onAdmin, accountPending = false, user, page }) {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesTrigger = useRef(null), resourcesId = useId();
  function closeResources(restoreFocus) {
    setResourcesOpen(false);
    if (restoreFocus) resourcesTrigger.current?.focus({ preventScroll: true });
  }
  return <aside className="tw-rail" aria-label="快捷导航">
    <div className="tw-rail-brand">
      <img src={logoUrl} alt="图研" />
      <SidebarTooltip label="展开侧边栏"><button type="button" className="tw-rail-control" onClick={onExpand} aria-label="展开侧边栏"><PanelLeft size={20} aria-hidden="true" /></button></SidebarTooltip>
    </div>
    <nav className="tw-rail-navigation" aria-label="常用功能">
      <SidebarTooltip label="搜索" shortcut={searchShortcut()}><button type="button" className="tw-rail-control" onClick={onSearch} aria-label="搜索"><Search size={20} aria-hidden="true" /></button></SidebarTooltip>
      <SidebarTooltip label="新建任务"><button type="button" className="tw-rail-control" onClick={onCreate} aria-label="新建任务"><Plus size={21} aria-hidden="true" /></button></SidebarTooltip>
      <SidebarTooltip label="模型管理"><button type="button" className="tw-rail-control" onClick={onModels} aria-label="模型管理" aria-current={page === 'models' ? 'page' : undefined}><Boxes size={20} aria-hidden="true" /></button></SidebarTooltip>
      <SidebarTooltip label="排行榜"><button type="button" className="tw-rail-control" onClick={() => onNavigate('排行榜')} aria-label="排行榜" aria-current={page === '排行榜' ? 'page' : undefined}><ChartNoAxesColumn size={20} aria-hidden="true" /></button></SidebarTooltip>
      <SidebarTooltip label="他山科研生态"><button type="button" className="tw-rail-control" onClick={() => onNavigate('他山科研生态')} aria-label="他山科研生态" aria-current={page === '他山科研生态' ? 'page' : undefined}><Mountain size={20} aria-hidden="true" /></button></SidebarTooltip>
      <SidebarTooltip label="资源与帮助" disabled={resourcesOpen}><button type="button" className="tw-rail-control" ref={resourcesTrigger} onClick={() => setResourcesOpen(open => !open)} aria-label="资源与帮助" aria-haspopup="menu" aria-expanded={resourcesOpen} aria-controls={resourcesOpen ? resourcesId : undefined}><BookOpen size={20} aria-hidden="true" /></button></SidebarTooltip>
    </nav>
    <SidebarAccount compact user={user} onSignIn={onSignIn} onSignOut={onSignOut} onAccountSettings={onAccountSettings} onAdmin={onAdmin} accountPending={accountPending} />
    {resourcesOpen && <ResourcePopover id={resourcesId} triggerRef={resourcesTrigger} onClose={closeResources} onNavigate={onNavigate} />}
  </aside>;
}
