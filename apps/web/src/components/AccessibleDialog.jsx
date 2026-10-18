import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  '[data-autofocus]',
  'button:not([disabled])',
  'a[href]',
  'summary',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const dialogStack = [];

// Shared by dialogs with different visual shells, including the legacy model picker.
export function useDialogLayer(open) {
  const entry = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const token = Symbol('dialog');
    entry.current = token;
    dialogStack.push(token);
    return () => {
      const index = dialogStack.indexOf(token);
      if (index >= 0) dialogStack.splice(index, 1);
      entry.current = null;
    };
  }, [open]);
  return () => entry.current !== null && dialogStack.at(-1) === entry.current;
}

export default function AccessibleDialog({ open, onClose, labelledBy, describedBy, className = '', backdropClassName = '', children }) {
  const isTopDialog = useDialogLayer(open);
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      const preferred = panelRef.current?.querySelector('[data-autofocus]')
        || panelRef.current?.querySelector(FOCUSABLE_SELECTOR);
      (preferred || panelRef.current)?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (!isTopDialog()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(panelRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [])]
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true' && !element.closest('[hidden],[inert]') && (!element.closest('details:not([open])') || element.tagName === 'SUMMARY'));
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className={`accessible-dialog-backdrop ${backdropClassName}`.trim()} onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        event.preventDefault();
        onClose();
      }
    }}>
      <div
        ref={panelRef}
        className={`accessible-dialog ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
