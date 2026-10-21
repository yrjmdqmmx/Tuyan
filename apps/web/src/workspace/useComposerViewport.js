import { useEffect, useRef } from 'react';

// iOS overlays the keyboard without resizing the layout viewport. Keep the
// workspace and its tool dialogs inside the visible area during native focus.
export default function useComposerViewport(mobile) {
  const shellRef = useRef(null);
  useEffect(() => {
    const shell = shellRef.current, viewport = window.visualViewport;
    if (!mobile || !shell || !viewport) return;
    let frame, keyboardActive = false, innerTracksKeyboard = false, lastHeight, lastTop, lastInput;
    let restingHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    let restingWidth = document.documentElement.clientWidth || window.innerWidth;
    const reset = () => {
      delete shell.dataset.keyboardOpen;
      shell.style.removeProperty('--tw-keyboard-height');
      shell.style.removeProperty('--tw-keyboard-top');
      keyboardActive = false;
      innerTracksKeyboard = false;
      lastHeight = lastTop = lastInput = undefined;
    };
    const update = () => {
      const input = document.activeElement;
      const typing = shell.contains(input) && input?.matches('.tw-composer > textarea, .tw-dialog :is(input:not([type=checkbox]):not([type=radio]),textarea,select)');
      const layoutHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
      const layoutWidth = document.documentElement.clientWidth || window.innerWidth;
      // Some mobile browsers resize both viewport measurements. Comparing only
      // their current heights then reports zero occlusion while the keyboard is
      // covering the 100dvh workspace. Retain the height from before focus.
      if (layoutWidth !== restingWidth || (!typing && !keyboardActive)) {
        restingHeight = layoutHeight;
        restingWidth = layoutWidth;
      } else restingHeight = Math.max(restingHeight, layoutHeight);
      const occluded = Math.max(layoutHeight, restingHeight) - viewport.height;
      if (Math.abs(viewport.scale - 1) > 0.05 || occluded <= 1) { reset(); return; }
      if (typing && occluded > 120) keyboardActive = true;
      if (!keyboardActive) return;
      if (window.innerHeight < layoutHeight - 1) innerTracksKeyboard = true;
      // Safari can restore innerHeight/scrollY hundreds of milliseconds before
      // visualViewport. Do not retain that stale keyboard-sized, offset shell.
      if (!typing && innerTracksKeyboard && window.innerHeight >= layoutHeight - 1) { reset(); return; }
      // Blur precedes the native keyboard's closing animation. Keep following
      // visualViewport until it finishes instead of jumping to full height.
      // Anchor inside the visual viewport even when Safari pans to the input.
      const height = `${viewport.height}px`, top = `${innerTracksKeyboard ? window.scrollY : viewport.offsetTop}px`;
      if (shell.style.getPropertyValue('--tw-keyboard-height') !== height) shell.style.setProperty('--tw-keyboard-height', height);
      if (shell.style.getPropertyValue('--tw-keyboard-top') !== top) shell.style.setProperty('--tw-keyboard-top', top);
      if (!shell.dataset.keyboardOpen) shell.dataset.keyboardOpen = 'true';
      // Safari pans the root to a field in a long sheet. Once the sheet is
      // anchored above the keyboard, scroll its body to keep that field visible.
      const body = typing && input.closest('.tw-dialog-body');
      if (body?.clientHeight && (height !== lastHeight || top !== lastTop || input !== lastInput)) {
        const field = input.getBoundingClientRect(), bounds = body.getBoundingClientRect();
        if (field.bottom > bounds.bottom - 12) body.scrollTop += field.bottom - bounds.bottom + 12;
        else if (field.top < bounds.top + 12) body.scrollTop += field.top - bounds.top - 12;
      }
      lastHeight = height; lastTop = top; lastInput = input;
    };
    let settleUntil = 0;
    const settle = () => {
      update();
      frame = performance.now() < settleUntil ? requestAnimationFrame(settle) : 0;
    };
    const schedule = () => {
      // WebKit can change the window pan before delivering either scroll
      // event. Sample only during the bounded native keyboard transition.
      settleUntil = performance.now() + 700;
      if (!frame) frame = requestAnimationFrame(settle);
    };
    const resize = () => { update(); schedule(); };
    let touch;
    const startTouch = event => { touch = event.touches.length === 1 ? event.touches[0] : null; };
    const moveTouch = event => {
      if (!keyboardActive || !touch || event.touches.length !== 1) return;
      const next = event.touches[0], dx = touch.clientX - next.clientX, dy = touch.clientY - next.clientY;
      touch = next;
      const vertical = Math.abs(dy) >= Math.abs(dx), delta = vertical ? dy : dx;
      if (!delta) return;
      for (let node = event.target; node && shell.contains(node); node = node.parentElement) {
        const style = getComputedStyle(node);
        const overflow = vertical ? style.overflowY : style.overflowX;
        const position = vertical ? node.scrollTop : node.scrollLeft;
        const max = vertical ? node.scrollHeight - node.clientHeight : node.scrollWidth - node.clientWidth;
        if (/auto|scroll/.test(overflow) && max > 1 && (delta < 0 ? position > 0 : position < max - 1)) return;
      }
      // iOS can pan the root under a focused input even with overflow:hidden.
      // Stop only unused single-finger drags; keep real content scroll and pinch.
      if (event.cancelable) event.preventDefault();
    };
    shell.addEventListener('touchstart', startTouch, {passive:true});
    shell.addEventListener('touchmove', moveTouch, {passive:false});
    // Native pan changes must be compensated before the next paint, rather
    // than queuing behind a frame that can expose an empty/shifted workspace.
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', update);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', resize);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', update);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      shell.removeEventListener('touchstart', startTouch);
      shell.removeEventListener('touchmove', moveTouch);
      reset();
    };
  }, [mobile]);
  return shellRef;
}
