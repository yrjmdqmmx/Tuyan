import { useEffect } from 'react';

// iOS shrinks the visual viewport, not necessarily vh/dvh, when its keyboard opens.
// Use it for overlays only; pinch zoom retains normal document sizing.
export default function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const style = document.documentElement.style;
    const update = () => {
      if (viewport.scale > 1.05) return;
      style.setProperty('--workbench-viewport-height', `${viewport.height}px`);
      style.setProperty('--workbench-viewport-top', `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      style.removeProperty('--workbench-viewport-height');
      style.removeProperty('--workbench-viewport-top');
    };
  }, []);
}
