import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { useRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import WorkspaceDialog from '../src/workspace/WorkspaceDialog.jsx';
import { closeWorkspaceDialog, playWorkspaceEntrance, useWorkspaceEntrance } from '../src/workspace/useWorkspaceMotion.js';

afterEach(cleanup);
function motion(t, reduced = false) {
  const calls = [], listeners = new Set();
  const media = { matches: reduced, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const oldMedia = window.matchMedia, oldAnimate = window.HTMLElement.prototype.animate;
  window.matchMedia = query => query.includes('prefers-reduced-motion') ? media : { matches: false };
  window.HTMLElement.prototype.animate = function (frames, options) {
    let resolve;
    const animation = { target: this, frames, options, cancelled: false, finished: new Promise(done => { resolve = done; }), cancel() { this.cancelled = true; resolve(); }, finish() { resolve(); } };
    calls.push(animation); return animation;
  };
  t.after(() => { window.matchMedia = oldMedia; if (oldAnimate) window.HTMLElement.prototype.animate = oldAnimate; else delete window.HTMLElement.prototype.animate; });
  return { calls, listeners, reduce: () => { media.matches = true; listeners.forEach(fn => fn()); } };
}
function Shell({ enabled = true }) {
  const ref = useRef(null);
  useWorkspaceEntrance(ref, enabled);
  return React.createElement('div', { ref, className: 'tw-shell' },
    React.createElement('aside', { className: 'tw-sidebar' }),
    React.createElement('header', { className: 'tw-topbar' }),
    React.createElement('div', { className: 'tw-welcome' }),
    React.createElement('div', { className: 'tw-home-templates' }),
    React.createElement('div', { className: 'tw-composer-region' }, React.createElement('textarea', { defaultValue: '保留草稿' })));
}

test('entrance preserves the slower preview timing, plays once and yields immediately to typing', async t => {
  const { calls, listeners } = motion(t);
  const view = render(React.createElement(Shell));
  assert.equal(calls.length, 5);
  assert.equal(Math.max(...calls.map(c => c.options.duration + c.options.delay)), 1020);
  view.rerender(React.createElement(Shell));
  assert.equal(calls.length, 5);
  const input = screen.getByRole('textbox');
  fireEvent.keyDown(input, { key: 'a' });
  assert.ok(calls.every(c => c.cancelled));
  assert.equal(input.value, '保留草稿');
  assert.equal(listeners.size, 0);
  await act(async () => {});
});

test('entry is skipped for reduced motion and does not hide content', t => {
  const { calls } = motion(t, true);
  render(React.createElement(Shell));
  assert.equal(calls.length, 0);
  assert.equal(screen.getByRole('textbox').value, '保留草稿');
});

test('live reduced-motion changes cancel an entry; unmount removes its listeners', async t => {
  const { calls, listeners, reduce } = motion(t);
  const view = render(React.createElement(Shell));
  act(reduce);
  assert.ok(calls.every(c => c.cancelled));
  view.unmount();
  assert.equal(listeners.size, 0);
  await act(async () => {});
});

test('hidden pages do not start entrance animations', t => {
  const { calls } = motion(t);
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  t.after(() => delete document.hidden);
  render(React.createElement(Shell));
  assert.equal(calls.length, 0);
});

test('finishing an entrance releases all animations and event listeners', async t => {
  const { calls, listeners } = motion(t);
  const shell = document.createElement('div');
  shell.innerHTML = '<header class="tw-topbar"></header>';
  const stop = playWorkspaceEntrance(shell);
  calls.forEach(c => c.finish());
  await Promise.resolve(); await Promise.resolve();
  assert.equal(listeners.size, 0);
  assert.ok(calls.every(c => c.cancelled));
  stop();
});

test('dialog exit keeps the dialog mounted, deduplicates Escape and restores trigger focus', async t => {
  const { calls } = motion(t);
  let closes = 0;
  function Harness() {
    const [open, setOpen] = useState(false), trigger = useRef(null);
    return React.createElement(React.Fragment, null,
      React.createElement('button', { ref: trigger, onClick: () => setOpen(true) }, '打开设置'),
      open && React.createElement(WorkspaceDialog, { title: '设置', returnFocusRef: trigger, onClose: () => { closes++; setOpen(false); } }, React.createElement('input', { defaultValue: '未保存输入' })));
  }
  render(React.createElement(Harness));
  const trigger = screen.getByRole('button', { name: '打开设置' });
  trigger.focus(); fireEvent.click(trigger);
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.keyDown(window, { key: 'Escape' });
  assert.ok(screen.getByRole('dialog', { name: '设置' }));
  assert.equal(screen.getByRole('textbox').value, '未保存输入');
  assert.equal(calls.length, 2);
  assert.equal(closes, 0);
  await act(async () => { calls.forEach(c => c.finish()); });
  assert.equal(closes, 1);
  assert.equal(screen.queryByRole('dialog'), null);
  assert.equal(document.activeElement, trigger);
});

test('unmount during exit cancels animations and prevents a late close callback', async t => {
  const { calls, listeners } = motion(t);
  let closes = 0;
  const view = render(React.createElement(WorkspaceDialog, { title: '测试', onClose: () => closes++ }));
  fireEvent.click(screen.getByRole('button', { name: '关闭测试' }));
  view.unmount();
  await act(async () => { calls.forEach(c => c.finish()); });
  assert.equal(closes, 0);
  assert.ok(calls.every(c => c.cancelled));
  assert.equal(listeners.size, 0);
});

test('dialog exit has a bounded fallback even if animation completion never arrives', async t => {
  const { calls } = motion(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const panel = document.createElement('div');
  let closed = 0;
  const cancel = closeWorkspaceDialog(panel, () => closed++);
  t.mock.timers.tick(230);
  assert.equal(closed, 1);
  calls.forEach(c => c.finish()); await Promise.resolve(); await Promise.resolve();
  assert.equal(closed, 1);
  cancel();
});

test('reduced motion closes synchronously with no animation', t => {
  const { calls } = motion(t, true);
  let closed = 0;
  closeWorkspaceDialog(document.createElement('div'), () => closed++);
  assert.equal(closed, 1);
  assert.equal(calls.length, 0);
});
