import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDocument, renderSvg } from '@paperbanana/figure-core';
import FigureCanvas from './FigureCanvas.jsx';
import { historyReducer, initialHistory } from './state.js';
import { CSS_PIXELS_PER_MM } from './viewportGeometry.js';

const originalObserver = globalThis.ResizeObserver;
const originalPointerEvent = window.PointerEvent;
afterEach(() => { cleanup(); globalThis.ResizeObserver = originalObserver; window.PointerEvent = originalPointerEvent; });

function setup() {
  let observer;
  globalThis.ResizeObserver = class { constructor(callback) { observer = callback; } observe() {} disconnect() {} };
  window.PointerEvent = window.MouseEvent;
  const source = createDocument({ elements: [{ id: 'box', type: 'rect', x: 10, y: 10, width: 20, height: 15, fill: '#e2e8f0', stroke: '#334155', strokeWidth: 0.3 }] });
  const calls = []; const selections = [];
  const view = render(<FigureCanvas document={source} selectedId="box" onSelect={(id) => selections.push(id)} onCommands={(commands, baseRevision) => calls.push({ commands, baseRevision })} />);
  const viewport = screen.getByRole('region', { name: '画布视口' });
  const paper = view.container.querySelector('.fs-page');
  let size = { width: 600, height: 400 };
  Object.defineProperties(viewport, { clientWidth: { configurable: true, get: () => size.width }, clientHeight: { configurable: true, get: () => size.height } });
  const resize = (width, height) => { size = { width, height }; act(() => observer()); };
  const zoom = () => parseFloat(screen.getByLabelText('画布缩放比例').textContent);
  act(() => observer());
  return { ...view, source, calls, selections, viewport, paper, resize, zoom };
}

test('fit follows actual viewport resize while manual zoom persists and source/export stay identical', () => {
  const { source, calls, paper, resize, zoom } = setup();
  const json = JSON.stringify(source); const svg = renderSvg(source);
  const firstZoom = zoom();
  resize(300, 500);
  assert.ok(zoom() < firstZoom);
  assert.ok(parseFloat(paper.style.left) + parseFloat(paper.style.width) < 300);
  assert.ok(parseFloat(paper.style.top) + parseFloat(paper.style.height) < 500);
  fireEvent.click(screen.getByRole('button', { name: '放大画布' }));
  const manual = { zoom: zoom(), width: paper.style.width, height: paper.style.height };
  resize(900, 180);
  assert.equal(zoom(), manual.zoom);
  assert.equal(paper.style.width, manual.width);
  assert.equal(paper.style.height, manual.height);
  assert.equal(screen.getByRole('button', { name: '适合窗口' }).getAttribute('aria-pressed'), 'false');
  fireEvent.click(screen.getByRole('button', { name: '适合窗口' }));
  assert.ok(parseFloat(paper.style.top) + parseFloat(paper.style.height) < 180);
  resize(1200, 700);
  assert.ok(zoom() > manual.zoom);
  assert.equal(calls.length, 0);
  assert.equal(JSON.stringify(source), json);
  assert.equal(renderSvg(source), svg);
});

test('hand tool and temporary Space pan over objects without selecting or changing them', () => {
  const { source, calls, selections, container, viewport } = setup();
  const json = JSON.stringify(source); const svg = renderSvg(source);
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: '放大画布' }));
  const object = () => container.querySelector('[data-element-id="box"]');
  const hand = screen.getByRole('button', { name: '抓手平移画布' });
  fireEvent.click(hand);
  assert.equal(hand.getAttribute('aria-pressed'), 'true');
  viewport.scrollLeft = 100; viewport.scrollTop = 100;
  fireEvent.pointerDown(object(), { button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(viewport, { clientX: 60, clientY: 75 });
  fireEvent.pointerUp(viewport);
  assert.equal(viewport.scrollLeft, 140); assert.equal(viewport.scrollTop, 125);
  fireEvent.click(hand);
  fireEvent.keyDown(viewport, { key: ' ', code: 'Space' });
  fireEvent.pointerDown(object(), { button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(viewport, { clientX: 80, clientY: 90 });
  fireEvent.pointerUp(viewport);
  fireEvent.keyUp(viewport, { key: ' ', code: 'Space' });
  assert.equal(viewport.scrollLeft, 160); assert.equal(viewport.scrollTop, 135);
  assert.equal(selections.length, 0); assert.equal(calls.length, 0);
  assert.equal(JSON.stringify(source), json); assert.equal(renderSvg(source), svg);
});

test('scaled object dragging commits one millimetre command and stays undoable', () => {
  const { source, calls, container, viewport, paper } = setup();
  fireEvent.click(screen.getByRole('button', { name: '放大画布' }));
  const width = parseFloat(paper.style.width); const height = parseFloat(paper.style.height);
  container.querySelector('.fs-svg-host>svg').getBoundingClientRect = () => ({ width, height });
  const scale = width / source.canvas.widthMm / CSS_PIXELS_PER_MM;
  fireEvent.pointerDown(container.querySelector('[data-element-id="box"]'), { button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(viewport, { clientX: 100 + 10 * CSS_PIXELS_PER_MM * scale, clientY: 100 + 5 * CSS_PIXELS_PER_MM * scale });
  assert.equal(calls.length, 0);
  fireEvent.pointerUp(viewport);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { commands: [{ type: 'update', id: 'box', patch: { x: 20, y: 15 } }], baseRevision: source.revision });
  const before = initialHistory({ getItem: () => JSON.stringify(source) });
  const moved = historyReducer(before, { type: 'commands', ...calls[0] });
  assert.equal(moved.document.elements[0].x, 20);
  assert.deepEqual(historyReducer(moved, { type: 'undo' }).document, { ...source, revision: source.revision + 2 });
});

test('returning an object to its drag origin or cancelling a pointer does not commit a stale preview', () => {
  const { calls, container, viewport, paper } = setup();
  for (const finish of ['origin', 'cancel']) {
    container.querySelector('.fs-svg-host>svg').getBoundingClientRect = () => ({ width: parseFloat(paper.style.width), height: parseFloat(paper.style.height) });
    fireEvent.pointerDown(container.querySelector('[data-element-id="box"]'), { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(viewport, { clientX: 150, clientY: 130 });
    if (finish === 'origin') fireEvent.pointerMove(viewport, { clientX: 100, clientY: 100 });
    else fireEvent.pointerCancel(viewport);
    fireEvent.pointerUp(viewport);
  }
  assert.equal(calls.length, 0);
});

for (const name of ['放大画布', '缩小画布', '适合窗口', '抓手平移画布']) {
  test(`pointer activation of ${name} hands focus to the viewport so Space-drag cannot move an object`, async () => {
    const { source, calls, selections, container, viewport, paper } = setup();
    const user = userEvent.setup({ document: window.document });
    const before = JSON.stringify(source);
    await user.click(screen.getByRole('button', { name }));
    await user.keyboard('[Space>]');
    container.querySelector('.fs-svg-host>svg').getBoundingClientRect = () => ({ width: parseFloat(paper.style.width), height: parseFloat(paper.style.height) });
    fireEvent.pointerDown(container.querySelector('[data-element-id="box"]'), { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(viewport, { clientX: 150, clientY: 130 });
    fireEvent.pointerUp(viewport);
    await user.keyboard('[/Space]');
    assert.equal(calls.length, 0);
    assert.equal(selections.length, 0);
    assert.ok(window.document.activeElement === viewport, 'pointer toolbar action must focus the canvas viewport');
    assert.equal(JSON.stringify(source), before);
  });
}

test('keyboard Space still activates the focused zoom button without moving keyboard focus', async () => {
  const { zoom, calls } = setup();
  const user = userEvent.setup({ document: window.document });
  const button = screen.getByRole('button', { name: '放大画布' });
  const before = zoom();
  button.focus();
  await user.keyboard('[Space]');
  assert.ok(zoom() > before);
  assert.ok(window.document.activeElement === button, 'keyboard activation must retain native button focus');
  assert.equal(screen.getByRole('region', { name: '图稿画布' }).classList.contains('is-pan-tool'), false);
  assert.equal(calls.length, 0);
});
