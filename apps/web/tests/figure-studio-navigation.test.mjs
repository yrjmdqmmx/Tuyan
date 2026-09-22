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
import { sitePageLinks } from '../src/components/siteNavigation.js';

const sections = ['workbench', 'figure-studio', 'leaderboard'];
const peerLabels = ['工作台', '论文画布', ...(BENCH_ENABLED ? ['排行榜'] : [])];

function controlEntries(container) {
  return [...container.querySelectorAll('a,button')].map((element) => ({
    tag: element.tagName,
    label: element.getAttribute('aria-label') || element.textContent.trim() || element.querySelector('img')?.alt,
    href: element.getAttribute('href'),
    className: element.className,
  }));
}

function assertPeerLinks(container, section) {
  const links = [...container.querySelectorAll('.header-links>a')];
  assert.deepEqual(links.slice(0, peerLabels.length).map((link) => link.textContent.trim()), peerLabels);
  assert.deepEqual(links.slice(0, peerLabels.length).map((link) => link.getAttribute('href')), ['/', '/figure-studio/', ...(BENCH_ENABLED ? ['/leaderboard'] : [])]);
  const current = [...container.querySelectorAll('[aria-current="page"]')];
  const expectedLabel = { workbench: '工作台', 'figure-studio': '论文画布', leaderboard: '排行榜' }[section];
  assert.deepEqual(current.map((item) => item.textContent.trim()), section === 'leaderboard' && !BENCH_ENABLED ? [] : [expectedLabel]);
}

function headerProps(actions = []) {
  return {
    section: 'figure-studio',
    ...Object.fromEntries(['onContact', 'onFeedback', 'onMiniProgram', 'onAgentConnection', 'onSignOut', 'onSignIn', 'onAccount', 'onWorkspaceAccount', 'onGuide', 'onAdmin'].map((name) => [name, () => actions.push(name)])),
  };
}

test('the shared peer page table keeps the same order with the site-wide leaderboard feature on or off', () => {
  assert.deepEqual(sitePageLinks({ benchmarkEnabled: true }).map(({ id, path, label }) => ({ id, path, label })), [
    { id: 'workbench', path: '/', label: '工作台' },
    { id: 'figure-studio', path: '/figure-studio/', label: '论文画布' },
    { id: 'leaderboard', path: '/leaderboard', label: '排行榜' },
  ]);
  assert.deepEqual(sitePageLinks({ benchmarkEnabled: false }).map(({ id }) => id), ['workbench', 'figure-studio']);
});

for (const signedIn of [false, true]) {
  test(`desktop public entry sequence and actions are identical across all pages (${signedIn ? 'signed in' : 'signed out'})`, async () => {
    let expectedEntries;
    for (const section of sections) {
      const actions = [];
      try {
        render(React.createElement(WorkbenchHeader, { ...headerProps(actions), section, currentUser: signedIn ? { id: 'author', email: 'author@example.test' } : null }));
        const navigation = screen.getByRole('navigation', { name: '网站导航' });
        assertPeerLinks(navigation, section);
        const entries = controlEntries(navigation);
        if (!expectedEntries) expectedEntries = entries;
        else assert.deepEqual(entries, expectedEntries, section);
        for (const label of ['账户与钱包', '使用教程', '站长']) assert.equal(screen.queryByRole('button', { name: label, exact: true }), null);
        for (const label of ['联系作者', '意见反馈', '微信小程序', '智能体接入']) await userEvent.click(screen.getByRole('button', { name: label, exact: true }));
        if (signedIn) {
          await userEvent.click(screen.getByRole('button', { name: 'author@example.test，账户', exact: true }));
          await userEvent.click(screen.getByRole('button', { name: '退出', exact: true }));
        } else await userEvent.click(screen.getByRole('button', { name: '登录 / 注册', exact: true }));
        assert.deepEqual(actions, ['onContact', 'onFeedback', 'onMiniProgram', 'onAgentConnection', ...(signedIn ? ['onAccount', 'onSignOut'] : ['onSignIn'])]);
      } finally { cleanup(); }
    }
  });

  test(`mobile More uses one public and workspace entry sequence on all pages (${signedIn ? 'signed in' : 'signed out'})`, async () => {
    const originalMedia = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    let expectedEntries;
    try {
      for (const section of sections) {
        const actions = [];
        try {
          const props = { ...headerProps(actions), section, currentUser: signedIn ? { id: 'author', email: 'author@example.test' } : null };
          if (!signedIn) delete props.onAdmin;
          render(React.createElement(WorkbenchHeader, props));
          assert.equal(screen.queryByRole('navigation', { name: '网站导航' }), null);
          await userEvent.click(screen.getByRole('button', { name: signedIn ? '账户' : '登录', exact: true }));
          assert.deepEqual(actions, [signedIn ? 'onAccount' : 'onSignIn']);
          await userEvent.click(screen.getByRole('button', { name: '更多', exact: true }));
          const dialog = screen.getByRole('dialog', { name: '更多功能' });
          assertPeerLinks(dialog, section);
          const entries = controlEntries(dialog);
          if (!expectedEntries) expectedEntries = entries;
          else assert.deepEqual(entries, expectedEntries, section);
          assert.deepEqual([...dialog.querySelectorAll('.mobile-workspace-links button')].map((button) => button.textContent.trim()), ['账户与钱包', '使用教程', ...(signedIn ? ['站长'] : [])]);
          await userEvent.click(within(dialog).getByRole('button', { name: '账户与钱包', exact: true }));
          assert.equal(actions.at(-1), 'onWorkspaceAccount');
          assert.equal(screen.queryByRole('dialog'), null);
        } finally { cleanup(); }
      }
    } finally { window.matchMedia = originalMedia; }
  });
}

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
    assert.equal(Boolean(screen.queryByRole('link', { name: 'Leaderboard', exact: true })), BENCH_ENABLED);
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
