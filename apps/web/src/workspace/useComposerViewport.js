import { useEffect, useRef } from 'react';

// iOS overlays the keyboard without resizing the layout viewport. Keep the
// existing workspace inside the visible area; native textarea focus opens it.
export default function useComposerViewport(mobile) {
  const shellRef = useRef(null);
  useEffect(() => {
    const shell = shellRef.current, viewport = window.visualViewport;
    if (!mobile || !shell || !viewport) return;
    let frame;
    const reset = () => {
      delete shell.dataset.keyboardOpen;
      shell.style.removeProperty('--tw-keyboard-height');
    };
    const update = () => {
      const input = document.activeElement;
      const typing = shell.contains(input) && input?.matches('.tw-composer > textarea');
      if (!typing || Math.abs(viewport.scale - 1) > 0.05 || window.innerHeight - viewport.height < 120) { reset(); return; }
      const top = shell.getBoundingClientRect().top + window.scrollY;
      const bottom = window.scrollY + viewport.offsetTop + viewport.height;
      shell.style.setProperty('--tw-keyboard-height', `${Math.max(200, bottom - top)}px`);
      shell.dataset.keyboardOpen = 'true';
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      reset();
    };
  }, [mobile]);
  return shellRef;
}
