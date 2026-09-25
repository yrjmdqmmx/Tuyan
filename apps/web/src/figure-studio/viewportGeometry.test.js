import test from 'node:test';
import assert from 'node:assert/strict';
import { CSS_PIXELS_PER_MM, fitZoom, pointerDeltaMm, viewportGeometry, zoomScroll } from './viewportGeometry.js';

test('100% maps millimetres to 96 CSS pixels per inch without altering document dimensions', () => {
  const canvas = Object.freeze({ widthMm: 25.4, heightMm: 50.8 });
  const geometry = viewportGeometry(canvas, { width: 500, height: 300 }, 1);
  assert.equal(geometry.paperWidth, 96);
  assert.equal(geometry.paperHeight, 192);
  assert.equal(CSS_PIXELS_PER_MM, 96 / 25.4);
});

test('fit constrains both paper edges in narrow, short, expanded, portrait and tiny viewports', () => {
  for (const canvas of [{ widthMm: 183, heightMm: 70 }, { widthMm: 89, heightMm: 170 }]) {
    for (const viewport of [{ width: 280, height: 600 }, { width: 900, height: 190 }, { width: 1400, height: 720 }, { width: 40, height: 30 }]) {
      const zoom = fitZoom(canvas, viewport);
      const geometry = viewportGeometry(canvas, viewport, zoom);
      assert.ok(geometry.paperLeft > 0 && geometry.paperTop > 0);
      assert.ok(geometry.paperLeft + geometry.paperWidth < viewport.width);
      assert.ok(geometry.paperTop + geometry.paperHeight < viewport.height);
      assert.ok(Math.abs(geometry.width - viewport.width) < 1e-9);
      assert.ok(Math.abs(geometry.height - viewport.height) < 1e-9);
      assert.ok(Math.abs(geometry.paperWidth / geometry.paperHeight - canvas.widthMm / canvas.heightMm) < 1e-9);
    }
  }
});

test('manual zoom keeps the center paper point and makes all four corners scrollable', () => {
  const canvas = { widthMm: 183, heightMm: 170 };
  const viewport = { width: 600, height: 400 };
  const first = viewportGeometry(canvas, viewport, 1);
  const second = viewportGeometry(canvas, viewport, 2);
  const scroll = zoomScroll(first, second, { left: 80, top: 130 }, viewport);
  assert.ok(Math.abs((scroll.left + 300 - second.paperLeft) / second.paperWidth - (80 + 300 - first.paperLeft) / first.paperWidth) < 1e-9);
  assert.ok(Math.abs((scroll.top + 200 - second.paperTop) / second.paperHeight - (130 + 200 - first.paperTop) / first.paperHeight) < 1e-9);
  assert.ok(second.width > viewport.width && second.height > viewport.height);
  assert.equal(second.width - second.paperLeft - second.paperWidth, 24);
  assert.equal(second.height - second.paperTop - second.paperHeight, 24);
});

test('object drag pixel deltas convert to the same millimetres at every zoom', () => {
  const canvas = { widthMm: 183, heightMm: 70 };
  for (const zoom of [0.25, 0.8, 1, 2.5]) {
    const rect = { width: canvas.widthMm * CSS_PIXELS_PER_MM * zoom, height: canvas.heightMm * CSS_PIXELS_PER_MM * zoom };
    const delta = pointerDeltaMm({ x: 200, y: 100 }, { x: 200 + 10 * CSS_PIXELS_PER_MM * zoom, y: 100 - 5 * CSS_PIXELS_PER_MM * zoom }, rect, canvas);
    assert.ok(Math.abs(delta.x - 10) < 1e-9);
    assert.ok(Math.abs(delta.y + 5) < 1e-9);
  }
});
