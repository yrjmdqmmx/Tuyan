import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkbenchHeader from '../src/components/WorkbenchHeader.jsx';
import { BenchmarkLocaleProvider } from '../src/components/BenchmarkLocale.jsx';
import { APP_LANGUAGE_KEY, BENCHMARK_LANGUAGE_KEY } from '../src/components/benchmarkLocale.js';
import { sitePageLinks } from '../src/components/siteNavigation.js';

const sections = ['workbench', 'figure-studio', 'leaderboard', 'changelog'];
const peerLabels = ['工作台', '论文画布', '排行榜', 'openacad', '更新日志'];

function controlEntries(container) {
  return [...container.querySelectorAll('a,button')].map((element) => ({
    tag: element.tagName,
    label: element.getAttribute('aria-label') || element.textContent.trim() || element.querySelector('img')?.alt,
    href: element.getAttribute('href'),
    className: element.className,
  }));
}

function assertPeerLinks(container, section) {
  const links = [...container.querySelectorAll('.header-group-pages a')];
  assert.deepEqual(links.map((link) => link.textContent.trim()), peerLabels);
  assert.deepEqual(links.map((link) => link.getAttribute('href')), ['/', '/figure-studio/', '/leaderboard', 'https://openacad.xyz/', '/changelog']);
  const current = [...container.querySelectorAll('[aria-current="page"]')];
  const expectedLabel = { workbench: '工作台', 'figure-studio': '论文画布', leaderboard: '排行榜', changelog: '更新日志' }[section];
  assert.deepEqual(current.map((item) => item.textContent.trim()), [expectedLabel]);
}

function headerProps(actions = []) {
  return {
    section: 'figure-studio',
    ...Object.fromEntries(['onContact', 'onFeedback', 'onMiniProgram', 'onAgentConnection', 'onSignOut', 'onSignIn', 'onAccount', 'onWorkspaceAccount', 'onGuide', 'onAdmin'].map((name) => [name, () => actions.push(name)])),
  };
}

test('one public navigation table preserves all 3.8 entries with Figure Canvas beside Workbench', () => {
  assert.deepEqual(sitePageLinks().map(({ id, path, href, label }) => ({ id, destination: path || href, label })), [
    { id: 'workbench', destination: '/', label: '工作台' },
    { id: 'figure-studio', destination: '/figure-studio/', label: '论文画布' },
    { id: 'leaderboard', destination: '/leaderboard', label: '排行榜' },
    { id: 'openacad', destination: 'https://openacad.xyz/', label: 'openacad' },
    { id: 'changelog', destination: '/changelog', label: '更新日志' },
  ]);
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
        assert.deepEqual([...navigation.querySelectorAll('.header-group')].map(group => group.getAttribute('aria-label')), ['页面导航', '工具与生态', '支持与交流', '语言与账户']);
        assert.equal(navigation.querySelectorAll('[data-site-language]').length, 1);
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
          assert.equal(dialog.querySelectorAll('[data-site-language]').length, 0);
          assert.ok(within(dialog).getByRole('button', { name: '使用教程', exact: true }));
          assert.equal(Boolean(within(dialog).queryByRole('button', { name: '站长', exact: true })), signedIn);
          assert.equal(within(dialog).getAllByRole('button', { name: '账户与钱包', exact: true }).length, 1);
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
    assert.ok(screen.getByText('论文画布', { selector: '.site-brand-copy > span' }));
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
  const previous = window.localStorage.getItem(APP_LANGUAGE_KEY);
  window.localStorage.setItem(APP_LANGUAGE_KEY, 'en');
  try {
    render(React.createElement(BenchmarkLocaleProvider, null, React.createElement(WorkbenchHeader, { ...headerProps(), section: 'leaderboard' })));
    assert.ok(screen.getByRole('link', { name: 'Figure Canvas', exact: true }));
    assert.ok(screen.getByRole('link', { name: 'Workbench', exact: true }));
    assert.ok(screen.getByRole('link', { name: 'Leaderboard', exact: true }));
    assert.ok(screen.getByRole('link', { name: 'Changelog', exact: true }));
  } finally {
    cleanup();
    if (previous === null) window.localStorage.removeItem(APP_LANGUAGE_KEY);
    else window.localStorage.setItem(APP_LANGUAGE_KEY, previous);
  }
});

for (const compact of [false, true]) {
  test(`every public page can switch the common navigation language (${compact ? 'mobile' : 'desktop'})`, async () => {
    const originalMedia = window.matchMedia;
    const originalLanguage = document.documentElement.lang;
    const stored = [APP_LANGUAGE_KEY, BENCHMARK_LANGUAGE_KEY].map(key => [key, window.localStorage.getItem(key)]);
    window.matchMedia = () => ({ matches: compact, addEventListener() {}, removeEventListener() {} });
    try {
      for (const section of sections) {
        window.localStorage.setItem(APP_LANGUAGE_KEY, 'zh-CN');
        render(React.createElement(BenchmarkLocaleProvider, null, React.createElement(WorkbenchHeader, { ...headerProps(), section })));
        assert.equal(document.querySelectorAll('[data-site-language]').length, 1);
        await userEvent.click(screen.getByRole('button', { name: 'Switch to English', exact: true }));
        if (compact) await userEvent.click(screen.getByRole('button', { name: 'More', exact: true }));
        const navigation = screen.getByRole('navigation', { name: 'Site navigation' });
        assert.deepEqual([...navigation.querySelectorAll('.header-group-pages a')].map(link => link.textContent.trim()), ['Workbench', 'Figure Canvas', 'Leaderboard', 'openacad', 'Changelog']);
        assert.deepEqual([...navigation.querySelectorAll('[aria-current="page"]')].map(link => link.getAttribute('href')), [sitePageLinks().find(link => link.id === section).path]);
        assert.equal(document.querySelectorAll('[data-site-language]').length, 1);
        cleanup();
      }
    } finally {
      cleanup();
      window.matchMedia = originalMedia;
      document.documentElement.lang = originalLanguage;
      for (const [key, value] of stored) {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      }
    }
  });
}

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
