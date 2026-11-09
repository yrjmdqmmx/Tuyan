import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ControlField from '../src/components/ControlField.jsx';
import MenuSelect from '../src/components/MenuSelect.jsx';

const h = React.createElement;
afterEach(cleanup);

for (const tag of ['input', 'textarea', 'select']) {
  test(`native ${tag} has a separate label that focuses its generated-id control`, async () => {
    const view = render(h(ControlField, { label: h('span', null, '字段标题'), className: 'field' },
      h(tag, { defaultValue: 'a' }, tag === 'select' ? h('option', { value: 'a' }, '甲') : undefined)));
    const control = screen.getByLabelText('字段标题');
    const label = view.container.querySelector('label');
    assert.equal(control.tagName.toLowerCase(), tag);
    assert.ok(control.id);
    assert.equal(label.htmlFor, control.id);
    assert.ok(!label.contains(control));
    assert.ok(!control.closest('label'));
    await userEvent.setup().click(label);
    assert.ok(document.activeElement === control, 'clicking the caption focuses the native field');
  });
}

for (const [name, fieldProps, controlProps, expectedId] of [
  ['existing control id', {}, { id: 'original' }, 'original'],
  ['explicit htmlFor without control id', { htmlFor: 'requested' }, {}, 'requested'],
  ['matching id and htmlFor', { htmlFor: 'matching' }, { id: 'matching' }, 'matching'],
]) {
  test(`native label respects ${name}`, async () => {
    const view = render(h(ControlField, { label: '指定字段', ...fieldProps }, h('input', controlProps)));
    const control = screen.getByLabelText('指定字段');
    assert.equal(control.id, expectedId);
    assert.equal(view.container.querySelector('label').htmlFor, expectedId);
    assert.ok(!view.container.firstChild.hasAttribute('for'));
    await userEvent.setup().click(view.container.querySelector('label'));
    assert.ok(document.activeElement === control);
  });
}

test('generated ids are unique and stable across rerenders', () => {
  const fields = () => h(React.Fragment, null,
    h(ControlField, { label: '甲' }, h('input')),
    h(ControlField, { label: '乙' }, h('textarea')));
  const view = render(fields());
  const ids = [...view.container.querySelectorAll('input,textarea')].map(control => control.id);
  assert.equal(new Set(ids).size, 2);
  view.rerender(fields());
  assert.deepEqual([...view.container.querySelectorAll('input,textarea')].map(control => control.id), ids);
});

test('nested native control keeps its ref, accessible name, hint, events and independent action button', async () => {
  const ref = createRef(), changes = [], actions = [];
  const view = render(h(ControlField, { label: h('span', { className: 'caption' }, '电话'), 'data-field': 'phone' },
    h(React.Fragment, null, h('div', { className: 'phone-number-input' },
      h('span', { 'aria-hidden': true }, '+86'),
      h('input', { ref, type: 'tel', name: 'phone', placeholder: '号码', 'aria-label': '电话号码',
        'aria-describedby': 'phone-hint', onChange: event => changes.push(event.target.value) }),
      h('button', { type: 'button', onClick: () => actions.push('clear') }, '清除'))),
    h('small', { id: 'phone-hint' }, '说明')));
  const control = screen.getByRole('textbox', { name: '电话号码' }), user = userEvent.setup();
  assert.ok(ref.current === control);
  assert.equal(control.name, 'phone');
  assert.equal(control.placeholder, '号码');
  assert.equal(control.getAttribute('aria-describedby'), 'phone-hint');
  assert.ok(!control.hasAttribute('aria-labelledby'));
  await user.click(view.container.querySelector('label .caption'));
  assert.ok(document.activeElement === control);
  await user.type(control, '123');
  assert.equal(changes.at(-1), '123');
  await user.click(screen.getByRole('button', { name: '清除' }));
  assert.deepEqual(actions, ['clear']);
  assert.ok(document.activeElement !== control);
});

test('native label preserves explicit aria-labelledby and disabled state', async () => {
  const view = render(h(ControlField, { label: '字段' },
    h('span', { id: 'external-name' }, '外部名称'),
    h('input', { disabled: true, 'aria-labelledby': 'external-name' })));
  const control = screen.getByRole('textbox', { name: '外部名称' });
  await userEvent.setup().click(view.container.querySelector('label'));
  assert.equal(control.disabled, true);
  assert.equal(control.getAttribute('aria-labelledby'), 'external-name');
  assert.ok(document.activeElement !== control);
});

test('MenuSelect heading neither focuses nor opens the menu; trigger and keyboard still work', async () => {
  const changes = [], user = userEvent.setup();
  const view = render(h(ControlField, { label: h('span', { className: 'caption' }, '选择项目'), htmlFor: 'menu' },
    h(MenuSelect, { id: 'menu', defaultValue: 'a', onChange: event => changes.push(event.target.value) },
      h('option', { value: 'a' }, '甲'), h('option', { value: 'b' }, '乙'))));
  const control = screen.getByRole('combobox', { name: '选择项目' });
  const caption = document.getElementById(control.getAttribute('aria-labelledby'));
  assert.ok(caption.classList.contains('caption'));
  assert.equal(caption.tagName, 'SPAN');
  assert.ok(!view.container.querySelector('label'));
  assert.ok(!caption.contains(control));
  await user.hover(caption);
  await user.click(caption);
  assert.equal(control.getAttribute('aria-expanded'), 'false');
  assert.ok(document.activeElement !== control);
  assert.deepEqual(changes, []);
  await user.tab();
  assert.ok(document.activeElement === control);
  await user.keyboard('{ArrowDown}{End}{Enter}');
  assert.deepEqual(changes, ['b']);
  await user.click(control);
  assert.equal(control.getAttribute('aria-expanded'), 'true');
  await user.keyboard('{Escape}');
  assert.equal(control.getAttribute('aria-expanded'), 'false');
});

for (const attributes of [{ 'aria-label': '自定义名称' }, { 'aria-labelledby': 'custom-name' }]) {
  test(`MenuSelect preserves explicit ${Object.keys(attributes)[0]}`, () => {
    const view = render(h(ControlField, { label: '默认名称' },
      h('span', { id: 'custom-name' }, '自定义名称'),
      h(MenuSelect, attributes, h('option', { value: 'a' }, '甲'))));
    const control = screen.getByRole('combobox', { name: '自定义名称' });
    for (const [key, value] of Object.entries(attributes)) assert.equal(control.getAttribute(key), value);
    assert.ok(!view.container.querySelector('label'));
  });
}

test('conditional field switches between native focus and a non-clickable MenuSelect heading', async () => {
  const field = menu => h(ControlField, { label: '着色字段' }, menu
    ? h(MenuSelect, null, h('option', { value: 'a' }, '甲'))
    : h('input', { defaultValue: 'a' }));
  const user = userEvent.setup(), view = render(field(false));
  const inputId = screen.getByRole('textbox').id;
  await user.click(view.container.querySelector('label'));
  assert.ok(document.activeElement === screen.getByRole('textbox'));
  view.rerender(field(true));
  const menu = screen.getByRole('combobox', { name: '着色字段' });
  assert.ok(!view.container.querySelector('label'));
  fireEvent.click(document.getElementById(menu.getAttribute('aria-labelledby')));
  assert.equal(menu.getAttribute('aria-expanded'), 'false');
  view.rerender(field(false));
  assert.equal(screen.getByLabelText('着色字段').id, inputId);
});
