import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import ControlField from '../src/components/ControlField.jsx';
import MenuSelect from '../src/components/MenuSelect.jsx';
import TokenDancePanel from '../src/components/TokenDancePanel.jsx';

const h = React.createElement;
afterEach(cleanup);

// Read the actual CSS, including combined selectors, without loading @imports.
const sheets = new Map();
function rule(file, selector) {
  if (!sheets.has(file)) {
    const css = fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8').replace(/^@import[^;]+;/gm, '');
    const dom = new JSDOM(`<style>${css}</style>`);
    sheets.set(file, [...dom.window.document.styleSheets[0].cssRules]);
    dom.window.close();
  }
  const found = sheets.get(file).find(item => item.selectorText === selector);
  assert.ok(found, `${file}: missing ${selector}`);
  return found;
}
const base = () => rule('styles.css', '.field :is(span, label)');
const role = () => rule('styles.css', '.universal-role .field :is(span, label), .universal-role .control-field > label');
const connection = () => rule('workspace/workspaceModels.css', '.tw-connection-fields > :is(label, .control-field) > :is(span, label)');
const directConnection = () => rule('workspace/workspace.css', '.tw-connection-form>:is(label, .control-field)>:is(span,label)');

function declarations(cssRule, expected) {
  for (const [property, value] of Object.entries(expected)) assert.equal(cssRule.style.getPropertyValue(property), value, property);
}
function field(menu, className = 'field', captionClass = '') {
  return renderToStaticMarkup(h(ControlField, { className, label: h('span', { className: captionClass }, '标题') }, menu
    ? h(MenuSelect, null, h('option', { value: 'a' }, '甲'))
    : h('input')));
}
function computed(markup, css) {
  // Resolve this source token explicitly: JSDOM does not resolve CSS var().
  const inkSoft = rule('styles.css', ':root').style.getPropertyValue('--ink-soft').trim();
  const dom = new JSDOM(`<style>body{color:#202322;font-size:14px;font-weight:400}${css.replaceAll('var(--ink-soft)', inkSoft)}</style>${markup}`);
  try {
    const caption = dom.window.document.querySelector('.control-field-label, [data-before]');
    const style = dom.window.getComputedStyle(caption);
    return Object.fromEntries(['font-size', 'font-weight', 'color', 'display', 'align-items', 'gap'].map(key => [key, style.getPropertyValue(key)]));
  } finally { dom.window.close(); }
}
function sameTypography(actual, expected) {
  for (const property of ['font-size', 'font-weight', 'color']) assert.equal(actual[property], expected[property], property);
}

test('model-config base caption selector preserves span typography on labels with the shared #250 hunk', () => {
  declarations(base(), { color: 'var(--ink-soft)', 'font-size': '13px', 'font-weight': '680' });
  const before = computed('<label class="field"><span data-before>标题</span><input></label>', `.field span {${base().style.cssText}}`);
  for (const menu of [false, true]) {
    const after = computed(field(menu), base().cssText);
    sameTypography(after, before);
    assert.equal(after['font-size'], '13px');
    assert.equal(after['font-weight'], '680');
    assert.equal(after.color, 'rgb(52, 50, 48)');
  }
});

test('universal model-config label and menu captions retain the 12px role override', () => {
  declarations(role(), { 'font-size': '12px' });
  const before = computed('<fieldset class="universal-role"><label class="field"><span data-before>标题</span><input></label></fieldset>',
    `.field span {${base().style.cssText}} .universal-role .field span {${role().style.cssText}}`);
  for (const menu of [false, true]) {
    const after = computed(`<fieldset class="universal-role">${field(menu)}</fieldset>`, base().cssText + role().cssText);
    sameTypography(after, before);
    assert.equal(after['font-size'], '12px');
    assert.equal(after['font-weight'], '680');
  }
});

test('universal size captions outside .field keep the existing 12px label coverage', () => {
  const size = rule('styles.css', '.universal-size-row :is(label, .control-field)');
  declarations(size, { 'font-size': '11px', 'min-width': '0px' });
  const wrap = inner => `<fieldset class="universal-role"><div class="universal-size-row">${inner}</div></fieldset>`;
  const before = computed(wrap('<div class="control-field"><label data-before>标题</label><input></div>'),
    `.universal-role .control-field > label {font-size:12px} ${size.cssText}`);
  const after = computed(wrap(field(false, '')), role().cssText + size.cssText);
  sameTypography(after, before);
  assert.equal(after['font-size'], '12px');
});

test('connection-field captions match span and label with unchanged typography and icon spacing', () => {
  const parent = rule('workspace/workspaceModels.css', '.tw-connection-basics > :is(label, .control-field),.tw-connection-fields > :is(label, .control-field)');
  declarations(parent, { 'font-size': '13px', 'font-weight': '500' });
  declarations(connection(), { display: 'flex', 'align-items': 'center', gap: '7px' });
  const wrap = inner => `<form class="tw-connection-form"><div class="tw-connection-fields">${inner}</div></form>`;
  const before = computed(wrap('<label><span data-before>标题</span><input></label>'),
    `${parent.cssText} .tw-connection-fields > label > span {${connection().style.cssText}}`);
  for (const menu of [false, true]) {
    const after = computed(wrap(field(menu, '')), parent.cssText + connection().cssText);
    assert.deepEqual(after, before);
    assert.equal(after['font-size'], '13px');
    assert.equal(after['font-weight'], '500');
  }
});

test('direct connection-form heading compatibility keeps the original 8px gap', () => {
  declarations(directConnection(), { display: 'flex', 'align-items': 'center', gap: '8px' });
  const before = computed('<form class="tw-connection-form"><label><span data-before>标题</span><input></label></form>',
    `.tw-connection-form>label>span {${directConnection().style.cssText}}`);
  for (const menu of [false, true]) {
    const after = computed(`<form class="tw-connection-form">${field(menu, '')}</form>`, directConnection().cssText);
    assert.deepEqual(after, before);
  }
});

test('ordinary preset retains its caption class and typography after canonical class merging', () => {
  const preset = rule('styles.css', '.model-picker-label');
  declarations(preset, { 'font-size': '12px', 'font-weight': '760', color: 'var(--ink-soft)' });
  const before = computed('<div class="tw-field"><span data-before class="model-picker-label">普通预设</span></div>', preset.cssText);
  const after = computed(field(true, 'tw-field', 'model-picker-label'), preset.cssText);
  sameTypography(after, before);
});

test('actual TokenDance recharge caption stays outside its original input after the R17 test merge', () => {
  render(h(TokenDancePanel, { controller: {
    userId: 'fixture', connection: { connected: true }, balance: async () => null,
    recoverPayment: async () => {}, createPayment: () => assert.fail('caption rendering must never create a payment'),
  } }));
  const input = screen.getByRole('spinbutton', { name: '观猹 TokenDance 充值金额' });
  const caption = screen.getByText('充值金额（人民币元）');
  assert.equal(caption.control, input);
  assert.equal(caption.contains(input), false);
  assert.ok(caption.classList.contains('control-field-label'));
});

test('R17 explicit accessible name still resolves to the same native control after rerender', () => {
  const scene = () => h('div', null,
    h(ControlField, { label: '一个' }, h('input', { defaultValue: 'one' })),
    h(ControlField, { label: '两个' }, h('textarea', { defaultValue: 'two' })),
    h(ControlField, { label: '可见标题', htmlFor: 'existing' }, h('input', { id: 'existing', 'aria-label': '独立名称' })));
  const view = render(scene());
  const control = view.container.querySelector('#existing');
  view.rerender(scene());
  assert.equal(screen.getByRole('textbox', { name: '独立名称' }), control);
});
