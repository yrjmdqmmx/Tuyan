import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function SidebarTooltip({ label, shortcut, side = 'right', disabled = false, children }) {
  const id = useId(), anchor = useRef(null), bubble = useRef(null), timer = useRef(null);
  const [open, setOpen] = useState(false), [position, setPosition] = useState(null);
  function hide() { clearTimeout(timer.current); setOpen(false); setPosition(null); }
  function show(delay) {
    clearTimeout(timer.current);
    if (!disabled) timer.current = setTimeout(() => setOpen(true), delay);
  }
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (disabled) hide(); }, [disabled]);
  useLayoutEffect(() => {
    if (!open || disabled) return;
    const a = anchor.current.getBoundingClientRect(), b = bubble.current.getBoundingClientRect();
    const left = side === 'bottom' ? a.left + (a.width - b.width) / 2 : a.right + 10;
    const top = side === 'bottom' ? a.bottom + 10 : a.top + (a.height - b.height) / 2;
    setPosition({ left: Math.max(8, Math.min(left, window.innerWidth - b.width - 8)), top: Math.max(8, Math.min(top, window.innerHeight - b.height - 8)) });
  }, [open, disabled, side, label, shortcut]);
  useEffect(() => {
    if (!open) return;
    const escape = event => { if (event.key === 'Escape') hide(); };
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', hide);
    document.addEventListener('scroll', hide, true);
    return () => { document.removeEventListener('keydown', escape); window.removeEventListener('resize', hide); document.removeEventListener('scroll', hide, true); };
  }, [open]);
  const visible = open && !disabled;
  return <div className="tw-tooltip-anchor" ref={anchor}
    onPointerEnter={event => { if (event.pointerType !== 'touch') show(100); }} onPointerLeave={hide}
    onFocus={event => { if (event.target.matches(':focus-visible')) show(0); }} onBlur={hide} onPointerDown={hide}>
    {cloneElement(children, { title: undefined, 'aria-describedby': visible ? id : undefined })}
    {visible && createPortal(<div id={id} ref={bubble} role="tooltip" className="tw-sidebar-tooltip" style={{ ...position, visibility: position ? 'visible' : 'hidden' }}>
      <span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}
    </div>, document.body)}
  </div>;
}

export function searchShortcut() {
  return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
}
