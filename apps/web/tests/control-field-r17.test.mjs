import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render, screen, cleanup, fireEvent} from '@testing-library/react';
import ControlField from '../src/components/ControlField.jsx';
import MenuSelect from '../src/components/MenuSelect.jsx';
import TokenDancePanel from '../src/components/TokenDancePanel.jsx';
const h = React.createElement;
afterEach(cleanup);
for (const tag of ['input', 'textarea', 'select']) for (const association of ['generated', 'id', 'htmlFor', 'both']) {
  test(`R17 ${tag} native label association: ${association}`, () => {
    const id = ['id', 'both'].includes(association) ? 'existing-field' : undefined;
    const htmlFor = ['htmlFor', 'both'].includes(association) ? 'existing-field' : undefined;
    const view = render(h(ControlField, {label: h('span', {className:'caption'}, '字段标题'), htmlFor},
      h(React.Fragment, null, h('div', null, h(tag, {id, defaultValue:tag === 'select' ? 'a' : '原值'}, tag === 'select' ? h('option', {value:'a'}, '选项') : undefined)))));
    const control = view.container.querySelector(tag), label = view.container.querySelector('label');
    assert.ok(control.id);
    assert.equal(label.htmlFor, control.id);
    assert.equal(label.control, control);
    assert.equal(screen.getByLabelText('字段标题'), control);
    assert.equal(label.contains(control), false);
    assert.equal(control.closest('label'), null);
    assert.equal(label.className, 'caption');
    if (id || htmlFor) assert.equal(control.id, 'existing-field');
    const before = control.id;
    fireEvent.click(label);
    assert.equal(label.control, control); // jsdom exposes activation through the native association.
    assert.equal(control.id, before);
  });
}
test('R17 generated IDs are unique; existing ID and accessible name survive rerender', () => {
  const scene = () => h('div', null,
    h(ControlField, {label:'一个'}, h('input', {defaultValue:'one'})),
    h(ControlField, {label:'两个'}, h('textarea', {defaultValue:'two'})),
    h(ControlField, {label:'可见标题', htmlFor:'existing'}, h('input', {id:'existing', 'aria-label':'独立名称'})));
  const view = render(scene()), controls = [...view.container.querySelectorAll('input,textarea')];
  const ids = controls.map(c => c.id);
  assert.equal(new Set(ids).size, 3);
  view.rerender(scene());
  assert.deepEqual([...view.container.querySelectorAll('input,textarea')].map(c => c.id), ids);
  assert.equal(screen.getByRole('textbox', {name:'独立名称'}), controls[2]);
});
test('R17 MenuSelect keeps a separate non-clickable heading and aria-labelledby', () => {
  const view = render(h(ControlField, {label:'菜单标题'}, h(MenuSelect, {defaultValue:'a'}, h('option', {value:'a'}, '选项'))));
  const control = screen.getByRole('combobox', {name:'菜单标题'});
  const heading = document.getElementById(control.getAttribute('aria-labelledby'));
  assert.ok(heading);
  assert.equal(heading.tagName, 'SPAN');
  assert.equal(view.container.querySelector('label'), null);
  assert.equal(heading.contains(control), false);
  fireEvent.click(heading);
  assert.equal(control.getAttribute('aria-expanded'), 'false');
});
test('R17 TokenDance recharge label targets the original input without creating a payment', () => {
  let payments = 0;
  render(h(TokenDancePanel, {controller:{userId:'fixture', connection:{connected:true}, balance:async()=>null, recoverPayment:async()=>{}, createPayment:()=>{payments++}}}));
  const label = screen.getByText('充值金额（人民币元）');
  const input = screen.getByRole('spinbutton', {name:'观猹 TokenDance 充值金额'});
  assert.equal(label.tagName, 'LABEL');
  assert.equal(label.htmlFor, 'td-recharge-amount');
  assert.equal(label.control, input);
  assert.equal(input.id, label.htmlFor);
  assert.equal(label.contains(input), false);
  fireEvent.click(label);
  assert.equal(payments, 0);
});
