import { ExternalLink } from 'lucide-react';
import { appPath } from '../appPaths.js';

export default function ResourceLinks({ onNavigate, menu = false, id, onDismiss, page }) {
  const item = menu ? { role: 'menuitem', tabIndex: -1 } : {};
  return <nav id={id} className="tw-resource-links" role={menu ? 'menu' : undefined} aria-label="资源与帮助">
    {['绘图模板', '浏览器手工稿', '使用教程', '智能体接入', '意见反馈', '联系作者', '微信小程序', '更新日志'].map(label => <button type="button" key={label} {...item} aria-current={page === label ? 'page' : undefined} onClick={() => onNavigate(label)}>{label}</button>)}
    {[['OpenAcad', 'https://openacad.xyz/'], ['GitHub', 'https://github.com/yrjmdqmmx/Tuyan'], ['观猹', 'https://watcha.cn/products/tu-yan']].map(([label, href]) => <a key={label} {...item} href={href} target="_blank" rel="noreferrer" onClick={onDismiss}>{label}<ExternalLink size={13} aria-hidden="true" /></a>)}
  </nav>;
}
