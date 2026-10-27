import assert from 'node:assert/strict';
import { fireEvent } from '@testing-library/react';

// Exercise the public popup interactions instead of dispatching a native select
// change on a button. Text inputs continue to use their regular change event.
export function chooseMenuOption(control, value) {
  assert.equal(control.getAttribute('role'), 'combobox');
  assert.equal(control.disabled, false, 'selector must be enabled');
  if (control.getAttribute('aria-expanded') !== 'true') fireEvent.click(control);
  const popup = document.getElementById(control.getAttribute('aria-controls'));
  const option = [...popup.querySelectorAll('[role="option"]')].find(item => item.dataset.value === String(value));
  assert.ok(option, `missing option: ${value}`);
  assert.notEqual(option.getAttribute('aria-disabled'), 'true', `disabled option: ${value}`);
  fireEvent.click(option);
}
export function changeControl(control, event) {
  if (control.getAttribute('role') === 'combobox') chooseMenuOption(control, event.target.value);
  else fireEvent.change(control, event);
}
export function menuOptions(control) {
  const wasOpen = control.getAttribute('aria-expanded') === 'true';
  if (!wasOpen) fireEvent.click(control);
  const popup = document.getElementById(control.getAttribute('aria-controls'));
  const result = [...popup.querySelectorAll('[role="option"]')].map(item => ({
    value: item.dataset.value, textContent: item.textContent,
    disabled: item.getAttribute('aria-disabled') === 'true',
  }));
  if (!wasOpen) fireEvent.keyDown(control, { key: 'Escape' });
  return result;
}
