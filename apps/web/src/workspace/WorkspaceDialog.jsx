import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import AccessibleDialog from '../components/AccessibleDialog.jsx';
import { closeWorkspaceDialog } from './useWorkspaceMotion.js';

export default function WorkspaceDialog({ title, onClose, returnFocusRef, children, wide = false, fullscreen = false, className = '', backdropClassName = '' }) {
  const id = useId();
  const closeRef = useRef(onClose), closing = useRef(null);
  closeRef.current = onClose;
  function requestClose() {
    if (closing.current) return;
    const request = {};
    closing.current = request;
    request.cancel = closeWorkspaceDialog(document.getElementById(id)?.closest('[role="dialog"]'), () => {
      if (closing.current !== request) return;
      closing.current = null;
      closeRef.current?.();
    });
  }
  useEffect(() => () => { closing.current?.cancel?.(); closing.current = null; }, []);
  useEffect(() => () => { requestAnimationFrame(() => {
    if (!document.querySelector('[role="dialog"]') && document.activeElement === document.body) document.querySelector('.tw-topbar [aria-label="打开侧边栏"], .tw-rail [aria-label="展开侧边栏"]')?.focus();
  }); }, []);
  return <AccessibleDialog open onClose={requestClose} returnFocusRef={returnFocusRef} labelledBy={id} backdropClassName={`tw-backdrop ${backdropClassName} ${fullscreen ? 'tw-backdrop-fullscreen' : ''}`} className={`tw-dialog ${wide ? 'tw-dialog-wide' : ''} ${fullscreen ? 'tw-dialog-fullscreen' : ''} ${className}`}>
    <header className="tw-dialog-head"><h2 id={id}>{title}</h2><button type="button" className="tw-icon" aria-label={`关闭${title}`} onClick={requestClose}><X size={20} /></button></header>
    <div className="tw-dialog-body">{children}</div>
  </AccessibleDialog>;
}
