import { useLayoutEffect, useRef } from 'react';

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const easing = 'cubic-bezier(.22,1,.36,1)';

export function playWorkspaceEntrance(shell) {
  const media = window.matchMedia?.(MOTION_QUERY);
  if (!shell || !media || media.matches || document.hidden) return () => {};
  const animations = [];
  const stage = (selector, frames, duration, delay = 0) => {
    shell.querySelectorAll(selector).forEach(node => {
      if (node.animate) animations.push(node.animate(frames, { duration, delay, easing, fill: 'backwards' }));
    });
  };
  stage(':scope > .tw-sidebar, :scope > .tw-rail', [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'translateX(0)' }], 480);
  stage('.tw-topbar', [{ opacity: 0, transform: 'translateY(-5px)' }, { opacity: 1, transform: 'translateY(0)' }], 420, 40);
  stage('.tw-welcome', [{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }], 600, 120);
  stage('.tw-home-templates', [{ opacity: 0, transform: 'translateY(14px) scale(.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], 620, 220);
  stage('.tw-composer-region', [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], 660, 360);
  // Interacting takes precedence over decoration, including the delayed composer.
  const stop = () => {
    shell.removeEventListener('pointerdown', stop, true);
    shell.removeEventListener('keydown', stop, true);
    document.removeEventListener('visibilitychange', visibility);
    media.removeEventListener('change', preference);
    animations.forEach(animation => animation.cancel());
  };
  const visibility = () => { if (document.hidden) stop(); };
  const preference = () => { if (media.matches) stop(); };
  shell.addEventListener('pointerdown', stop, true);
  shell.addEventListener('keydown', stop, true);
  document.addEventListener('visibilitychange', visibility);
  media.addEventListener('change', preference);
  Promise.allSettled(animations.map(animation => animation.finished)).then(stop);
  return stop;
}

export function useWorkspaceEntrance(shellRef, enabled) {
  const played = useRef(false);
  useLayoutEffect(() => {
    if (!enabled || played.current) return;
    played.current = true;
    return playWorkspaceEntrance(shellRef.current);
  }, [shellRef, enabled]);
}

// Keep the existing dialog focus trap until exit completes. Cancelled or
// interrupted animations cannot trigger a late close on a replacement dialog.
export function closeWorkspaceDialog(panel, onClosed) {
  const media = window.matchMedia?.(MOTION_QUERY);
  if (!panel?.animate || !media || media.matches) { onClosed(); return () => {}; }
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  const transform = panel.classList.contains('tw-mobile-nav-dialog') ? 'translateX(-100%)'
    : panel.classList.contains('tw-dialog-fullscreen') ? 'none'
      : mobile ? 'translateY(24px)' : 'translateY(8px) scale(.99)';
  let done = false, timer;
  const animations = [panel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform }], { duration: 180, easing })];
  if (panel.parentElement?.animate) animations.push(panel.parentElement.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing }));
  const cleanup = () => {
    clearTimeout(timer);
    media.removeEventListener('change', preference);
    animations.forEach(animation => animation.cancel());
  };
  const finish = () => { if (done) return; done = true; cleanup(); onClosed(); };
  const preference = () => { if (media.matches) finish(); };
  media.addEventListener('change', preference);
  timer = setTimeout(finish, 230);
  Promise.allSettled(animations.map(animation => animation.finished)).then(finish);
  return () => { done = true; cleanup(); };
}
