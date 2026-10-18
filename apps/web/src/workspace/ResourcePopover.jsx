import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ResourceLinks from './ResourceLinks.jsx';

export default function ResourcePopover({ id, triggerRef, onClose, onNavigate }) {
  const panel = useRef(null), closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    function position() {
      const anchor = triggerRef.current?.getBoundingClientRect(), box = panel.current;
      if (!anchor || !box) return;
      box.style.left = `${Math.max(8, Math.min(anchor.right + 12, window.innerWidth - box.offsetWidth - 8))}px`;
      box.style.top = `${Math.max(8, Math.min(anchor.top, window.innerHeight - box.offsetHeight - 8))}px`;
    }
    position();
    panel.current.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    window.addEventListener('resize', position);
    document.addEventListener('scroll', position, true);
    return () => { window.removeEventListener('resize', position); document.removeEventListener('scroll', position, true); };
  }, [triggerRef]);
  useEffect(() => {
    const outside = event => {
      if (!panel.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) closeRef.current(false);
    };
    const escape = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(true); }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', escape, true); };
  }, [triggerRef]);
  function moveFocus(event) {
    const items = [...panel.current.querySelectorAll('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const controls = [...triggerRef.current.closest('.tw-rail').querySelectorAll('button, a[href]')];
      const next = controls[controls.indexOf(triggerRef.current) + (event.shiftKey ? -1 : 1)];
      onClose(false);
      (next || triggerRef.current).focus({ preventScroll: true });
    } else if (event.key === ' ' && event.target.tagName === 'A') {
      event.preventDefault(); event.target.click();
    }
  }
  return createPortal(<div className="tw-resource-popover" ref={panel} onKeyDown={moveFocus}>
    <ResourceLinks id={id} menu onNavigate={next => { onClose(true); onNavigate(next); }} onDismiss={() => onClose(true)} />
  </div>, document.body);
}
