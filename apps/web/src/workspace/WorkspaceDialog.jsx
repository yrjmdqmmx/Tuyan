import { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import AccessibleDialog from '../components/AccessibleDialog.jsx';

export default function WorkspaceDialog({ title, onClose, children, wide = false, fullscreen = false, className = '' }) {
  const id = useId();
  useEffect(() => () => { requestAnimationFrame(() => {
    if (!document.querySelector('[role="dialog"]') && document.activeElement === document.body) document.querySelector('.tw-topbar [aria-label="打开侧边栏"], .tw-rail [aria-label="展开侧边栏"]')?.focus();
  }); }, []);
  return <AccessibleDialog open onClose={onClose} labelledBy={id} backdropClassName={`tw-backdrop ${fullscreen ? 'tw-backdrop-fullscreen' : ''}`} className={`tw-dialog ${wide ? 'tw-dialog-wide' : ''} ${fullscreen ? 'tw-dialog-fullscreen' : ''} ${className}`}>
    <header className="tw-dialog-head"><h2 id={id}>{title}</h2><button type="button" className="tw-icon" aria-label={`关闭${title}`} onClick={onClose}><X size={20} /></button></header>
    <div className="tw-dialog-body">{children}</div>
  </AccessibleDialog>;
}
