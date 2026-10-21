import { BookOpen, Bot, ExternalLink, GraduationCap, History, LayoutTemplate, Mail, MessageSquare } from 'lucide-react';
import { appPath } from '../appPaths.js';
import { RESOURCE_ENTRIES } from './workspaceSearch.js';

const RESOURCE_ICONS = {
  templates: LayoutTemplate,
  guide: BookOpen,
  agents: Bot,
  feedback: MessageSquare,
  contact: Mail,
  changelog: History,
};

export default function ResourceLinks({ onNavigate, menu = false, id, onDismiss, page }) {
  const item = menu ? { role: 'menuitem', tabIndex: -1 } : {};
  return <nav id={id} className="tw-resource-links" role={menu ? 'menu' : undefined} aria-label="资源与帮助">
    {RESOURCE_ENTRIES.map(({id:resourceId,name:label}) => {
      const Icon = RESOURCE_ICONS[resourceId] || BookOpen;
      return <button type="button" key={resourceId} {...item} aria-current={page === label ? 'page' : undefined} onClick={() => onNavigate(label)}>
        {resourceId === 'mini-program' ? <span className="tw-resource-icon tw-resource-wechat" aria-hidden="true"><img src={appPath('/brand/wechat-mark.svg')} alt="" /></span> : <Icon className="tw-resource-icon" size={17} aria-hidden="true" />}
        <span>{label}</span>
      </button>;
    })}
    <a {...item} href="https://openacad.xyz/" target="_blank" rel="noopener noreferrer" onClick={onDismiss}><GraduationCap className="tw-resource-icon" size={17} aria-hidden="true" /><span>OpenAcad</span><ExternalLink className="tw-resource-external" size={13} aria-hidden="true" /></a>
    <a {...item} href="https://github.com/yrjmdqmmx/Tuyan" target="_blank" rel="noopener noreferrer" onClick={onDismiss}><img className="tw-resource-icon" src={appPath('/brand/github-invertocat.svg')} alt="" aria-hidden="true" /><span>GitHub</span><ExternalLink className="tw-resource-external" size={13} aria-hidden="true" /></a>
    <a {...item} className="tw-resource-watcha" aria-label="观猹" title="去观猹点评图研 Tuyan" href="https://watcha.cn/products/tu-yan?utm_source=product-badge&utm_content=invite" target="_blank" rel="noopener noreferrer" onClick={onDismiss}><img src={appPath('/brand/watcha-invite-light.png')} width="4500" height="972" alt="" aria-hidden="true" /></a>
  </nav>;
}
