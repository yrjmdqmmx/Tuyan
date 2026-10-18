import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FigureViewport from '../src/workspace/FigureViewport.jsx';

afterEach(cleanup);
const version = { id: 'figure', format: 'png', url: '/fixture.png', candidateLabel: 'A', groupNumber: 1, number: 1, origin: '生成', review: '未复审' };
function measuredViewport(t, width = 600, height = 400) {
  const original = globalThis.ResizeObserver;
  let observed, callback;
  globalThis.ResizeObserver = class {
    constructor(fn) { callback = fn; }
    observe(node) { observed = node; Object.defineProperties(node, { clientWidth: { configurable: true, get: () => width }, clientHeight: { configurable: true, get: () => height } }); callback(); }
    disconnect() {}
  };
  t.after(() => { globalThis.ResizeObserver = original; });
  return (w, h) => { width = w; height = h; act(() => callback([{ target: observed }])); };
}
function imageLoaded(width, height) {
  const image = screen.getByAltText('PNG · 第 1 次生成 · 候选 A · v1');
  Object.defineProperties(image, { naturalWidth: { configurable: true, value: width }, naturalHeight: { configurable: true, value: height } });
  fireEvent.load(image); return image;
}
test('fit uses both viewport dimensions and preserves landscape/portrait aspect on resize', t => {
  const resize = measuredViewport(t);
  render(React.createElement(FigureViewport, { version }));
  const image = imageLoaded(1000, 580);
  assert.equal(parseFloat(image.style.width), 592);
  assert.ok(Math.abs(parseFloat(image.style.height) - 343.36) < .01);
  imageLoaded(580, 1000);
  assert.equal(parseFloat(image.style.height), 392);
  assert.ok(Math.abs(parseFloat(image.style.width) - 227.36) < .01);
  resize(320, 240);
  assert.equal(parseFloat(image.style.height), 232);
  assert.ok(Math.abs(parseFloat(image.style.width) / parseFloat(image.style.height) - .58) < .00001);
});
test('zoom and original size change only the view; fit returns to full-image framing', async t => {
  measuredViewport(t); const user = userEvent.setup(); let interactions = 0;
  render(React.createElement(FigureViewport, { version, onInteract: () => interactions++ }));
  const image = imageLoaded(1000, 580);
  await user.click(screen.getByRole('button', { name: '放大预览' }));
  assert.equal(parseFloat(image.style.width), 740);
  assert.equal(screen.getByRole('button', { name: '适应画布' }).getAttribute('aria-pressed'), 'false');
  await user.click(screen.getByRole('button', { name: '按原始大小查看（100%）' }));
  assert.equal(parseFloat(image.style.width), 1000);
  assert.equal(parseFloat(image.style.height), 580);
  await user.click(screen.getByRole('button', { name: '适应画布' }));
  assert.equal(parseFloat(image.style.width), 592);
  assert.equal(screen.getByRole('button', { name: '适应画布' }).getAttribute('aria-pressed'), 'true');
  assert.equal(interactions, 1);
});
