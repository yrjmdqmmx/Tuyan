import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, MoreHorizontal, Pencil, Pin } from 'lucide-react';

export default function TaskActionMenu({ task, onRename, dispatch, onDelete }) {
  const [open, setOpen] = useState(false), trigger = useRef(null), panel = useRef(null), id = useId();
  const firstIndex = useRef(0);
  function close(restore = false) { setOpen(false); if (restore) trigger.current?.focus({ preventScroll: true }); }
  useLayoutEffect(() => {
    if (!open) return;
    const box = panel.current;
    box.showPopover?.();
    function position() {
      const anchor = trigger.current.getBoundingClientRect();
      box.style.left = `${Math.max(8, Math.min(anchor.right - box.offsetWidth, window.innerWidth - box.offsetWidth - 8))}px`;
      box.style.top = `${Math.max(8, Math.min(anchor.bottom + 5, window.innerHeight - box.offsetHeight - 8))}px`;
    }
    position();
    box.querySelectorAll('[role="menuitem"]:not(:disabled)')[firstIndex.current]?.focus({ preventScroll: true });
    window.addEventListener('resize', position);
    return () => { window.removeEventListener('resize', position); if (box.hidePopover && box.matches(':popover-open')) box.hidePopover(); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) close(); };
    const scroll = event => { if (!panel.current?.contains(event.target)) close(true); };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    document.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside); document.removeEventListener('scroll', scroll, true); };
  }, [open]);
  function keyboard(event) {
    const items = [...panel.current.querySelectorAll('[role="menuitem"]:not(:disabled)')], index = items.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus({ preventScroll: true });
    } else if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); close(true);
    } else if (event.key === 'Tab') {
      // Continue normal tab order from the trigger, including a surrounding mobile dialog.
      close(true);
    }
  }
  function act(action) { close(true); action(); }
  return <>
    <button className="tw-task-menu-trigger" type="button" ref={trigger} aria-label={`${task.title} 的操作`}
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); firstIndex.current = event.key === 'ArrowUp' ? (task.activeRunId || !onDelete ? 1 : 2) : 0; setOpen(true); } }}
      onClick={() => { firstIndex.current = 0; setOpen(value => !value); }}><MoreHorizontal size={16} aria-hidden="true" /></button>
    {open && createPortal(<div className="tw-task-menu-popover" id={id} ref={panel} role="menu" aria-label={`${task.title} 的操作`}
      popover={typeof window.HTMLElement.prototype.showPopover === 'function' ? 'manual' : undefined} onKeyDown={keyboard}>
      <button type="button" role="menuitem" tabIndex={-1} onClick={() => act(() => onRename(task))}><Pencil size={15} aria-hidden="true"/>重命名</button>
      <button type="button" role="menuitem" tabIndex={-1} onClick={() => act(() => dispatch({ type: 'PIN', taskId: task.id }))}><Pin size={15} aria-hidden="true"/>{task.pinned ? '取消置顶' : '置顶'}</button>
      <button type="button" role="menuitem" tabIndex={-1} disabled={!!task.activeRunId || !onDelete} onClick={() => act(() => onDelete(task, trigger.current))}><Trash2 size={15} aria-hidden="true"/>删除</button>
    </div>, trigger.current?.closest('[role="dialog"]') || document.body)}
  </>;
}
