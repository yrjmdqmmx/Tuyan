import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { act, useReducer } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import WelcomeTypewriter from '../src/workspace/WelcomeTypewriter.jsx';
import TaskWorkspace from '../src/workspace/TaskWorkspace.jsx';
import { newWorkspace, workspaceReducer } from '../src/workspace/workspaceState.js';

const originalMedia = window.matchMedia;
const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
afterEach(() => {
  cleanup(); window.matchMedia = originalMedia; window.localStorage.clear();
  if (originalHidden) Object.defineProperty(document, 'hidden', originalHidden);
  else delete document.hidden;
});
function setup(t, reduced = false) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const listeners = new Set();
  const media = { matches: reduced, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  window.matchMedia = query => query.includes('prefers-reduced-motion') ? media : { matches: false, addEventListener() {}, removeEventListener() {} };
  return { tick: ms => act(() => t.mock.timers.tick(ms)), reduce: value => act(() => { media.matches = value; listeners.forEach(fn => fn()); }), listeners };
}
const heading = () => document.querySelector('.tw-welcome-title');
const visible = () => document.querySelector('.tw-welcome-visible').textContent;
const phase = () => heading().dataset.welcomeState;
function reach(clock, expected) {
  for (let i = 0; phase() !== expected && i < 200; i++) clock.tick(220);
  assert.equal(phase(), expected);
}

test('types, holds a complete line for 3 seconds, deletes and randomly chooses a different line', t => {
  const clock = setup(t); t.mock.method(Math, 'random', () => .999);
  render(React.createElement(WelcomeTypewriter, { nickname: '悠然境默' }));
  assert.equal(visible(), '');
  assert.ok(screen.getByRole('heading', { name: 'HI！悠然境默，今天想绘制什么？' }));
  clock.tick(220); assert.equal(visible(), 'H');
  const seen = [];
  for (let i = 0; i < 6; i++) {
    reach(clock, 'holding');
    const full = visible(); seen.push(full);
    clock.tick(2999); assert.equal(visible(), full); assert.equal(phase(), 'holding');
    clock.tick(1); assert.equal(phase(), 'deleting'); assert.ok(visible().length < full.length);
    reach(clock, 'waiting'); assert.equal(visible(), '');
    clock.tick(380); assert.equal(phase(), 'typing');
  }
  assert.equal(seen[1], '上传一份材料，一起梳理绘图思路。');
  assert.equal(new Set(seen).size, 5);
  assert.ok(seen.every((line, i) => i === 0 || line !== seen[i - 1]));
});

test('reduced motion is static from first paint and reacts to live preference changes', t => {
  const clock = setup(t, true);
  render(React.createElement(WelcomeTypewriter, { nickname: '小研' }));
  assert.equal(visible(), 'HI！小研，今天想绘制什么？'); assert.equal(phase(), 'reduced');
  assert.equal(document.querySelector('.is-blinking'), null);
  clock.tick(20000); assert.equal(phase(), 'reduced');
  clock.reduce(false); clock.tick(220); assert.equal(visible(), 'H');
  clock.reduce(true); assert.equal(visible(), 'HI！小研，今天想绘制什么？');
  assert.equal(document.querySelector('.is-blinking'), null);
});

test('stopping completes the current phrase and removes the blinking cursor', t => {
  const clock = setup(t); t.mock.method(Math, 'random', () => 0);
  const view = render(React.createElement(WelcomeTypewriter));
  reach(clock, 'holding'); clock.tick(3000); reach(clock, 'waiting'); clock.tick(380); clock.tick(220);
  assert.equal(visible(), '把');
  view.rerender(React.createElement(WelcomeTypewriter, { stopped: true }));
  assert.equal(visible(), '把你的研究想法，变成一张清晰的图。');
  assert.equal(document.querySelector('.is-blinking'), null);
  clock.tick(60000); assert.equal(visible(), '把你的研究想法，变成一张清晰的图。');
});

test('emoji and combining marks in nicknames are revealed as complete graphemes', t => {
  const clock = setup(t), nickname = '👩🏽‍🔬e\u0301';
  render(React.createElement(WelcomeTypewriter, { nickname }));
  const full = `HI！${nickname}，今天想绘制什么？`;
  const parts = [...new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(full)].map(p => p.segment);
  const prefixes = parts.map((_, i) => parts.slice(0, i + 1).join(''));
  for (let i = 0; i < parts.length; i++) { clock.tick(220); assert.equal(visible(), prefixes[i]); }
  assert.equal(phase(), 'holding');
});

test('hidden tabs and open panels pause the loop and unmount removes listeners', t => {
  const clock = setup(t), view = render(React.createElement(WelcomeTypewriter));
  clock.tick(220); const before = visible();
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  act(() => document.dispatchEvent(new window.Event('visibilitychange')));
  clock.tick(20000); assert.equal(visible(), before);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  act(() => document.dispatchEvent(new window.Event('visibilitychange')));
  clock.tick(80); assert.notEqual(visible(), before);
  view.rerender(React.createElement(WelcomeTypewriter, { paused: true }));
  const paused = visible(); clock.tick(20000); assert.equal(visible(), paused);
  view.unmount(); assert.equal(clock.listeners.size, 0); clock.tick(20000);
});

function Harness({ initial = newWorkspace('welcome-task') }) {
  const [state, dispatch] = useReducer(workspaceReducer, initial);
  return React.createElement(TaskWorkspace, { state, dispatch, onFiles() {}, onSubmit() {
    dispatch({type:'BEGIN',runId:'welcome-run'});dispatch({type:'ACCEPT',runId:'welcome-run'});dispatch({type:'FINISH',runId:'welcome-run'});
  }, user: { name: '小研' } });
}
test('IME start stops immediately; clearing typed text does not restart; a new task can animate', t => {
  const clock = setup(t); render(React.createElement(Harness));
  const input = screen.getByRole('textbox', { name: '绘图要求' });
  clock.tick(220); assert.equal(phase(), 'typing');
  fireEvent.compositionStart(input); assert.equal(phase(), 'stopped');
  fireEvent.change(input, { target: { value: '研究内容' } }); fireEvent.compositionEnd(input);
  fireEvent.change(input, { target: { value: '' } });
  clock.tick(20000); assert.equal(phase(), 'stopped'); assert.equal(input.value, '');
  fireEvent.change(input, { target: { value: '新建应继续这份草稿' } });
  fireEvent.click(screen.getByRole('button', { name: '新建任务' })); assert.equal(phase(), 'stopped');
  assert.equal(input.value, '新建应继续这份草稿');
  fireEvent.click(screen.getByRole('button', { name: '生成图像' }));
  fireEvent.click(screen.getByRole('button', { name: '新建任务' })); assert.equal(phase(), 'typing');
});

test('restored drafts display a full static welcome without mutating content', t => {
  const clock = setup(t);
  const initial = workspaceReducer(newWorkspace('draft-task'), { type: 'EDIT_DRAFT', patch: { text: '保留已有草稿' } });
  render(React.createElement(Harness, { initial }));
  assert.equal(phase(), 'stopped'); assert.equal(visible(), 'HI！小研，今天想绘制什么？');
  clock.tick(30000); assert.equal(screen.getByRole('textbox', { name: '绘图要求' }).value, '保留已有草稿');
});
