import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkbenchHeader from '../src/components/WorkbenchHeader.jsx';
import { BenchmarkLocaleProvider } from '../src/components/BenchmarkLocale.jsx';
import { BENCHMARK_LANGUAGE_KEY } from '../src/components/benchmarkLocale.js';
import { BENCH_ENABLED } from '../src/config.js';

function headerProps(actions = []) {
  return {
    section: 'figure-studio',
    ...Object.fromEntries(['onContact', 'onFeedback', 'onMiniProgram', 'onAgentConnection', 'onSignOut', 'onSignIn', 'onAccount', 'onWorkspaceAccount', 'onGuide', 'onAdmin'].map((name) => [name, () => actions.push(name)])),
  };
}

test('paper canvas uses the shared desktop header with peer navigation and complete account actions', async () => {
  const actions = [];
  try {
    render(React.createElement(WorkbenchHeader, headerProps(actions)));
    assert.ok(screen.getByRole('heading', { name: '图研 · 论文画布' }));
    assert.equal(screen.getByRole('link', { name: '论文画布', exact: true }).getAttribute('aria-current'), 'page');
    assert.equal(screen.getByRole('link', { name: '工作台', exact: true }).getAttribute('href'), '/');
    assert.equal(Boolean(screen.queryByRole('link', { name: '排行榜', exact: true })), BENCH_ENABLED);
    for (const name of ['账户与钱包', '使用教程', '站长', '登录 / 注册']) await userEvent.click(screen.getByRole('button', { name, exact: true }));
    assert.deepEqual(actions, ['onWorkspaceAccount', 'onGuide', 'onAdmin', 'onSignIn']);
  } finally { cleanup(); }
});

test('paper canvas mobile More exposes return navigation, wallet and account security independently', async () => {
  const originalMedia = window.matchMedia;
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const actions = [];
  try {
    render(React.createElement(WorkbenchHeader, { ...headerProps(actions), currentUser: { id: 'author', email: 'author@example.test' } }));
    assert.ok(screen.getByText('论文画布', { selector: '.mobile-brand-copy span' }));
    assert.equal(screen.queryByRole('navigation', { name: '网站导航' }), null);
    await userEvent.click(screen.getByRole('button', { name: '账户', exact: true }));
    assert.deepEqual(actions, ['onAccount']);
    await userEvent.click(screen.getByRole('button', { name: '更多', exact: true }));
    const dialog = within(screen.getByRole('dialog', { name: '更多功能' }));
    assert.equal(dialog.getByRole('link', { name: '工作台', exact: true }).getAttribute('href'), '/');
    assert.equal(dialog.getByRole('link', { name: '论文画布', exact: true }).getAttribute('aria-current'), 'page');
    assert.equal(dialog.getAllByRole('button', { name: '账户与钱包', exact: true }).length, 1);
    await userEvent.click(dialog.getByRole('button', { name: '账户与钱包', exact: true }));
    assert.equal(actions.at(-1), 'onWorkspaceAccount');
    assert.equal(screen.queryByRole('dialog'), null);
  } finally { cleanup(); window.matchMedia = originalMedia; }
});

test('workbench keeps its existing brand and does not duplicate its workspace account actions', () => {
  try {
    render(React.createElement(WorkbenchHeader, { ...headerProps(), section: 'workbench' }));
    assert.ok(screen.getByRole('heading', { name: '图研Tuyan工作台' }));
    assert.equal(screen.getByRole('link', { name: '论文画布', exact: true }).getAttribute('aria-current'), null);
    assert.equal(screen.queryByRole('button', { name: '账户与钱包', exact: true }), null);
  } finally { cleanup(); }
});

test('leaderboard English locale names the shared canvas link Figure Canvas', () => {
  const previous = window.localStorage.getItem(BENCHMARK_LANGUAGE_KEY);
  window.localStorage.setItem(BENCHMARK_LANGUAGE_KEY, 'en');
  try {
    render(React.createElement(BenchmarkLocaleProvider, null, React.createElement(WorkbenchHeader, { ...headerProps(), section: 'leaderboard' })));
    assert.ok(screen.getByRole('link', { name: 'Figure Canvas', exact: true }));
    assert.ok(screen.getByRole('link', { name: 'Workbench', exact: true }));
    assert.equal(screen.queryByRole('link', { name: 'Leaderboard', exact: true }), null);
  } finally {
    cleanup();
    if (previous === null) window.localStorage.removeItem(BENCHMARK_LANGUAGE_KEY);
    else window.localStorage.setItem(BENCHMARK_LANGUAGE_KEY, previous);
  }
});

test('editor styles leave embedded shared model controls and source SVG colors intact', () => {
  const shared = document.createElement('style');
  shared.textContent = '.model-picker button { padding: 17px; border-radius: 20px; color: rgb(1, 2, 3); background: rgb(240, 241, 242); font-size: 15px; }';
  const editor = document.createElement('div');
  editor.className = 'figure-studio';
  editor.innerHTML = '<div class="fs-model-settings"><div class="model-picker"><button>shared model</button></div></div><div class="fs-svg-host"><svg><rect fill="#2463dc" stroke="#182235"></rect></svg></div>';
  document.head.append(shared);
  document.body.append(editor);
  const button = editor.querySelector('button');
  const properties = ['padding', 'borderRadius', 'color', 'backgroundColor', 'fontSize'];
  const before = properties.map((property) => getComputedStyle(button)[property]);
  const studio = document.createElement('style');
  studio.textContent = readFileSync(new URL('../src/figure-studio/figure-studio.css', import.meta.url), 'utf8');
  try {
    document.head.append(studio);
    assert.deepEqual(properties.map((property) => getComputedStyle(button)[property]), before);
    assert.equal(editor.querySelector('rect').getAttribute('fill'), '#2463dc');
    assert.equal(editor.querySelector('rect').getAttribute('stroke'), '#182235');
    assert.doesNotMatch(studio.textContent, /--fs-(?:blue|ink|muted)|#(?:2463dc|182235)/u);
  } finally { studio.remove(); shared.remove(); editor.remove(); }
});
