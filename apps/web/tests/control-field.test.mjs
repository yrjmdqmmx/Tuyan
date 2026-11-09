import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ControlField from '../src/components/ControlField.jsx';
import MenuSelect from '../src/components/MenuSelect.jsx';
import TokenDancePanel from '../src/components/TokenDancePanel.jsx';

const h = React.createElement;
afterEach(cleanup);

// Canonical precedence (shared with #245): htmlFor wins, then the first native
// child's own id, then useId. Only an id-less primary control may receive an id;
// with htmlFor, assignment is allowed only if ALL native children are id-less.
for (const tag of ['input', 'textarea', 'select']) {
  for (const association of ['generated', 'id', 'htmlFor', 'both']) {
    test(`nested native ${tag} label association and focus: ${association}`, async () => {
      const id = ['id', 'both'].includes(association) ? 'existing-field' : undefined;
      const htmlFor = ['htmlFor', 'both'].includes(association) ? 'existing-field' : undefined;
      const view = render(h(ControlField, { label: h('span', { className: 'caption' }, '字段标题'), htmlFor, className: 'field' },
        h(React.Fragment, null, h('div', null,
          h(tag, { id, defaultValue: 'a' }, tag === 'select' ? h('option', { value: 'a' }, '甲') : undefined)))));
      const control = screen.getByLabelText('字段标题');
      const label = view.container.querySelector('label');
      assert.equal(control.tagName.toLowerCase(), tag);
      assert.ok(control.id);
      if (id || htmlFor) assert.equal(control.id, 'existing-field');
      assert.equal(label.htmlFor, control.id);
      assert.equal(label.control, control);
      assert.ok(label.classList.contains('caption'));
      assert.ok(label.classList.contains('control-field-label'));
      assert.ok(!label.contains(control));
      assert.ok(!control.closest('label'));
      assert.ok(!view.container.firstChild.hasAttribute('for'));
      const before = control.id;
      await userEvent.setup().click(label);
      assert.ok(document.activeElement === control, 'clicking the caption focuses the native field');
      assert.equal(control.id, before);
    });
  }
}

for (const firstId of [undefined, 'other-control']) {
  test(`htmlFor targets the matching nested native even after a ${firstId ? 'differently identified' : 'id-less'} control`, async () => {
    const view = render(h(ControlField, { label: '目标', htmlFor: 'target' },
      h('input', { id: firstId }),
      h(React.Fragment, null, h('div', null, h('textarea', { id: 'target' })))));
    const first = view.container.querySelector('input'), target = view.container.querySelector('textarea');
    const label = view.container.querySelector('label');
    assert.equal(first.getAttribute('id'), firstId ?? null);
    assert.equal(target.id, 'target');
    assert.equal(label.htmlFor, 'target');
    assert.equal(label.control, target);
    await userEvent.setup().click(label);
    assert.equal(document.activeElement, target);
  });
}

test('explicit htmlFor remains the target when existing native ids differ; no id is overwritten or invented', () => {
  const view = render(h(ControlField, { label: '目标', htmlFor: 'external' },
    h('input', { id: 'original' }), h('textarea')));
  assert.equal(view.container.querySelector('label').htmlFor, 'external');
  assert.equal(view.container.querySelector('label').control, null);
  assert.equal(view.container.querySelector('input').id, 'original');
  assert.ok(!view.container.querySelector('textarea').hasAttribute('id'));
});

test('an id-less first child stays id-less when another native has a nonmatching id and htmlFor is given', () => {
  const view = render(h(ControlField, { label: '目标', htmlFor: 'requested' },
    h('input'), h('textarea', { id: 'other' })));
  assert.equal(view.container.querySelector('label').htmlFor, 'requested');
  assert.equal(view.container.querySelector('label').control, null);
  assert.ok(!view.container.querySelector('input').hasAttribute('id'));
  assert.equal(view.container.querySelector('textarea').id, 'other');
});

for (const htmlFor of [undefined, 'requested']) {
  test(`only the first of multiple id-less native children receives ${htmlFor ? 'htmlFor' : 'a generated id'}`, async () => {
    const view = render(h(ControlField, { label: '目标', htmlFor }, h('input'), h('textarea')));
    const first = view.container.querySelector('input');
    assert.ok(first.id);
    if (htmlFor) assert.equal(first.id, htmlFor);
    assert.ok(!view.container.querySelector('textarea').hasAttribute('id'));
    assert.equal(view.container.querySelector('label').control, first);
    await userEvent.setup().click(view.container.querySelector('label'));
    assert.equal(document.activeElement, first);
  });
}

test('without htmlFor the first native wins even when a later child has an existing id', () => {
  const view = render(h(ControlField, { label: '目标' }, h('input'), h('textarea', { id: 'later' })));
  const first = view.container.querySelector('input');
  assert.ok(first.id);
  assert.notEqual(first.id, 'later');
  assert.equal(view.container.querySelector('label').control, first);
  assert.equal(view.container.querySelector('textarea').id, 'later');
});

for (const menu of [false, true]) {
  test(`caption span props survive on the rendered ${menu ? 'span' : 'label'}`, async () => {
    const ref = createRef(), clicks = [];
    const view = render(h(ControlField, { label: h('span', {
      ref, id: 'caption-id', className: 'caption custom-caption', title: '提示',
      'data-heading': 'preserved', lang: 'zh', style: { fontSize: '17px' }, onClick: () => clicks.push('caption'),
    }, '标题') }, menu ? h(MenuSelect, null, h('option', { value: 'a' }, '甲')) : h('input')));
    const caption = view.container.querySelector('.control-field-label');
    assert.equal(caption.tagName, menu ? 'SPAN' : 'LABEL');
    assert.equal(ref.current, caption);
    assert.equal(caption.id, 'caption-id');
    assert.ok(caption.classList.contains('caption'));
    assert.ok(caption.classList.contains('custom-caption'));
    assert.equal(caption.title, '提示');
    assert.equal(caption.dataset.heading, 'preserved');
    assert.equal(caption.lang, 'zh');
    assert.equal(caption.style.fontSize, '17px');
    assert.equal(caption.textContent, '标题');
    await userEvent.setup().click(caption);
    assert.deepEqual(clicks, ['caption']);
    if (menu) {
      const trigger = screen.getByRole('combobox', { name: '标题' });
      assert.equal(trigger.getAttribute('aria-labelledby'), caption.id);
      assert.equal(trigger.getAttribute('aria-expanded'), 'false');
      assert.notEqual(document.activeElement, trigger);
    } else assert.equal(document.activeElement, screen.getByLabelText('标题'));
  });
}

test('generated ids are unique and stable across rerenders', () => {
  const fields = () => h(React.Fragment, null,
    h(ControlField, { label: '甲' }, h('input')),
    h(ControlField, { label: '乙' }, h('textarea')),
    h(ControlField, { label: '可见标题', htmlFor: 'existing' }, h('input', { id: 'existing', 'aria-label': '独立名称' })));
  const view = render(fields());
  const ids = [...view.container.querySelectorAll('input,textarea')].map(control => control.id);
  assert.equal(new Set(ids).size, 3);
  assert.equal(screen.getByRole('textbox', { name: '独立名称' }).id, 'existing');
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
  await user.click(view.container.querySelector('label.caption'));
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

// #245 owns TokenDance's wrapper migration. Keep the actual panel's original-id /
// no-payment contract here, and exercise the separate caption with its exact
// recharge field shape below so this canonical file runs unchanged in both PRs.
test('TokenDance recharge caption retains the original input id and never creates a payment', async () => {
  let payments = 0;
  render(h(TokenDancePanel, { controller: {
    userId: 'fixture', connection: { connected: true }, balance: async () => null,
    recoverPayment: async () => {}, createPayment: () => { payments++; },
  } }));
  const label = screen.getByText('充值金额（人民币元）');
  const input = screen.getByRole('spinbutton', { name: '观猹 TokenDance 充值金额' });
  assert.equal(label.tagName, 'LABEL');
  assert.equal(label.htmlFor, 'td-recharge-amount');
  assert.equal(label.control, input);
  assert.equal(input.id, label.htmlFor);
  await userEvent.setup().click(label);
  assert.equal(document.activeElement, input);
  assert.equal(payments, 0);
});

test('canonical TokenDance recharge field has a separate label and an independent payment button', async () => {
  let payments = 0;
  const view = render(h('div', { className: 'td-recharge' },
    h(ControlField, { label: '充值金额（人民币元）', htmlFor: 'td-recharge-amount' },
      h('input', { id: 'td-recharge-amount', 'aria-label': '观猹 TokenDance 充值金额', type: 'number',
        inputMode: 'numeric', min: '1', max: '100000', step: '1', defaultValue: '10' })),
    h('button', { type: 'button', onClick: () => { payments++; } }, '创建充值单')));
  const label = view.container.querySelector('label');
  const input = screen.getByRole('spinbutton', { name: '观猹 TokenDance 充值金额' });
  assert.equal(label.htmlFor, 'td-recharge-amount');
  assert.equal(label.control, input);
  assert.equal(input.id, label.htmlFor);
  assert.equal(label.contains(input), false);
  await userEvent.setup().click(label);
  assert.equal(document.activeElement, input);
  assert.equal(payments, 0);
});
