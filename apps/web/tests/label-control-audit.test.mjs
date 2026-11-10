import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneCodeForm from '../src/components/PhoneCodeForm.jsx';
import FigureReferencePreferences from '../src/components/FigureReferencePreferences.jsx';
import { scanLabelControls } from './label-control-source.mjs';

const scope = JSON.parse(fs.readFileSync(new URL('./fixtures/label-control-scope.json', import.meta.url), 'utf8'));

test('moved files keep controls outside labels except the explicit R15 choices and uploads', () => {
  const wrappers = [];
  for (const file of scope.files.filter(file => file.endsWith('.jsx')).sort()) {
    const source = fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    for (const row of scanLabelControls(file, source).wrappers) {
      const where = `${file}:${row.line}`;
      assert.equal(row.controls.length, 1, `${where}: only one intentional control may be wrapped`);
      const control = row.controls[0];
      assert.equal(control.tag, 'input', where);
      assert.ok(['checkbox', 'radio', 'file', 'range'].includes(control.type), where);
      wrappers.push({ file, type: control.type });
    }
  }
  assert.ok(scope.allowedWrappers.every(row => row.reason.length > 10), 'every exception needs a concrete reason');
  assert.deepEqual(wrappers, scope.allowedWrappers.map(({ file, type }) => ({ file, type })));
});

test('source audit detects nested, conditional, native and custom controls inside labels', () => {
  const source = `<><label><div><input /></div></label>
    <label>{enabled ? <textarea /> : <select />}</label>
    <label><MenuSelect /></label><label><Select /></label>
    <label><input type="checkbox" /><button>Help</button></label>
    <label htmlFor="separate">Separate caption</label><input id="separate" /></>`;
  const { wrappers } = scanLabelControls('fixture.jsx', source);
  assert.deepEqual(wrappers.map(row => row.controls.map(control => control.tag)), [
    ['input'], ['textarea', 'select'], ['MenuSelect'], ['Select'], ['input', 'button'],
  ]);
});

const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve('vite/package.json'))('postcss');
const srcRoot = new URL('../src/', import.meta.url);
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    return entry.isDirectory() ? sourceFiles(url) : [url];
  });
}

test('every moved ControlField caption keeps span heading rules when rendered as a label (all CSS and inline selectors)', () => {
  const rules = [];
  for (const file of sourceFiles(srcRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    if (file.pathname.endsWith('.css')) {
      postcss.parse(source).walkRules(rule => rules.push({ selectors: rule.selectors, where: `${file.pathname}:${rule.source.start.line}` }));
    } else if (/\.[jt]sx?$/.test(file.pathname)) {
      // Inline style objects cannot contain combinators, but CSS strings / DOM
      // selectors can. Include those in the same check without executing JSX.
      for (const match of source.matchAll(/(['"`])([^'"`\n]*[>+~]\s*span\b[^'"`\n]*)\1/g)) {
        rules.push({ selectors: [match[2]], where: `${file.pathname}:${source.slice(0, match.index).split('\n').length}` });
      }
    }
  }
  let captions = 0;
  for (const file of scope.files.filter(file => file.endsWith('.jsx'))) {
    const { fields } = scanLabelControls(file, fs.readFileSync(new URL(file, srcRoot), 'utf8'));
    for (const field of fields) {
      captions++;
      const parent = document.createElement('div');
      parent.className = `control-field ${field.className}`;
      const span = document.createElement('span'), label = document.createElement('label');
      span.className = label.className = 'control-field-label';
      parent.append(span);
      for (const rule of rules) {
        // Compare the parent/caption suffix even when its outer page wrapper is
        // supplied by another component (drawer, gallery, mobile media query).
        const suffixes = rule.selectors.filter(selector => !selector.startsWith('.universal-role '))
          // .universal-role is owned entirely by #245; its span-only override
          // is recorded in selector-list.md for that PR, outside this scope.
          .map(selector => selector.match(/([.#][\w-]+|:scope)\s*(?:[>+~]|\s)\s*(?:span|label|:is\([^)]*\))(?:[.#:\w()=-]*)$/)?.[0]).filter(Boolean);
        if (!suffixes.some(selector => span.matches(selector))) continue;
        span.replaceWith(label);
        assert.ok(suffixes.some(selector => label.matches(selector)),
          `${file}:${field.line}: heading loses ${rule.selectors.join(', ')} at ${rule.where}`);
        label.replaceWith(span);
      }
    }
  }
  assert.equal(captions, 134, 'all migrated caption sites are covered, including conditional and repeated fields');
});

function applyHeadingStyles(files) {
  const style = document.createElement('style');
  // JSDOM does not implement all stylesheet features. Load the actual heading
  // declarations, including base typography, rather than duplicating values.
  for (const file of files) {
    postcss.parse(fs.readFileSync(new URL(file, srcRoot), 'utf8')).walkRules(rule => {
      if (rule.selectors.some(selector => /\.field\b|\.phone-code-field\b/.test(selector)) &&
          rule.nodes.some(node => node.type === 'decl' && node.prop === 'font-size')) style.textContent += `${rule.toString()}\n`;
    });
  }
  document.head.append(style);
  return () => style.remove();
}

test('phone, captcha and SMS captions retain identical declared typography and native focus', async () => {
  const removeStyles = applyHeadingStyles(['styles.css', 'components/phone-auth.css']);
  const requests = [];
  try {
    render(React.createElement(PhoneCodeForm, { controller: { request: async action => {
      requests.push(action);
      assert.equal(action, 'challenge', 'fixture must never send SMS or verify an account');
      return { challengeId: 'fixture', image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' };
    } } }));
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: '手机号' }), '13800138000');
    await user.click(screen.getByRole('button', { name: '获取验证码' }));
    const typography = [];
    for (const name of ['手机号', '图形验证码', '短信验证码']) {
      const caption = screen.getByText(name, { selector: 'label' });
      const style = window.getComputedStyle(caption);
      typography.push([style.fontSize, style.fontWeight, style.color]);
      await user.click(caption);
      assert.equal(document.activeElement, screen.getByRole('textbox', { name }));
    }
    assert.deepEqual(typography, Array(3).fill(['13px', '500', 'rgb(88, 103, 92)']));
    assert.deepEqual(requests, ['challenge']);
  } finally { cleanup(); removeStyles(); }
});

test('reference preference native and menu headings retain matching declared sizes and layout', () => {
  const removeStyles = applyHeadingStyles(['styles.css', 'components/generationSettingsDrawer.css']);
  try {
    const view = render(React.createElement(FigureReferencePreferences, { mode: 'auto', onChange: () => {} }));
    const captions = [...view.container.querySelectorAll('.control-field-label')];
    assert.deepEqual(captions.map(caption => caption.tagName), ['LABEL', 'SPAN', 'SPAN']);
    for (const caption of captions) {
      const style = window.getComputedStyle(caption);
      assert.equal(style.fontSize, '12px');
      assert.equal(style.display, 'flex');
      assert.equal(style.alignItems, 'center');
      assert.equal(style.gap, '8px');
    }
  } finally { cleanup(); removeStyles(); }
});
