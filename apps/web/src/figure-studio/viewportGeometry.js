export const CSS_PIXELS_PER_MM = 96 / 25.4;
export const VIEWPORT_PADDING = 24;
export const MIN_MANUAL_ZOOM = 0.05;
export const MAX_MANUAL_ZOOM = 8;

const visiblePadding = (viewport, padding) => viewport.width > 0 && viewport.height > 0
  ? Math.min(padding, viewport.width / 4, viewport.height / 4) : padding;

/** Scale is relative to CSS's 96 px per inch; document coordinates remain mm. */
export function fitZoom(canvas, viewport, padding = VIEWPORT_PADDING) {
  if (!(viewport.width > 0 && viewport.height > 0)) return 1;
  padding = visiblePadding(viewport, padding);
  return Math.max(Number.EPSILON, Math.min(
    (viewport.width - padding * 2) / (canvas.widthMm * CSS_PIXELS_PER_MM),
    (viewport.height - padding * 2) / (canvas.heightMm * CSS_PIXELS_PER_MM),
  ));
}

export function viewportGeometry(canvas, viewport, zoom, padding = VIEWPORT_PADDING) {
  padding = visiblePadding(viewport, padding);
  const paperWidth = canvas.widthMm * CSS_PIXELS_PER_MM * zoom;
  const paperHeight = canvas.heightMm * CSS_PIXELS_PER_MM * zoom;
  const width = Math.max(viewport.width, paperWidth + padding * 2);
  const height = Math.max(viewport.height, paperHeight + padding * 2);
  return { width, height, paperWidth, paperHeight, paperLeft: (width - paperWidth) / 2, paperTop: (height - paperHeight) / 2 };
}

/** Keep the paper point at the viewport center stable when the user zooms. */
export function zoomScroll(previous, next, scroll, viewport) {
  const x = (scroll.left + viewport.width / 2 - previous.paperLeft) / previous.paperWidth;
  const y = (scroll.top + viewport.height / 2 - previous.paperTop) / previous.paperHeight;
  return {
    left: Math.max(0, Math.min(next.width - viewport.width, next.paperLeft + x * next.paperWidth - viewport.width / 2)),
    top: Math.max(0, Math.min(next.height - viewport.height, next.paperTop + y * next.paperHeight - viewport.height / 2)),
  };
}

export function pointerDeltaMm(start, point, rect, canvas) {
  return {
    x: (point.x - start.x) * canvas.widthMm / rect.width,
    y: (point.y - start.y) * canvas.heightMm / rect.height,
  };
}
