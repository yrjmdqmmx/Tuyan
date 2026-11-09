import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkspaceModelCatalog from '../src/workspace/WorkspaceModelCatalog.jsx';
import WorkspaceRoleFilter from '../src/workspace/WorkspaceRoleFilter.jsx';

afterEach(cleanup);

test('role picker supports keyboard preview, cancel, commit and natural Tab order', async () => {
  const user = userEvent.setup();
  function Form() {
    const [value, setValue] = useState('');
    return React.createElement('div', null,
      React.createElement(WorkspaceRoleFilter, { value, onChange: setValue }),
      React.createElement('button', null, '下一项'));
  }
  render(React.createElement(Form));
  const trigger = screen.getByRole('combobox', { name: '模型角色' });
  await user.tab();
  assert.equal(document.activeElement, trigger);
  await user.keyboard('{ArrowDown}{End}');
  assert.equal(screen.getByRole('option', { name: '视觉理解' }).id, trigger.getAttribute('aria-activedescendant'));
  assert.equal(trigger.textContent, '全部角色', 'browsing options does not prematurely filter');
  await user.keyboard('{Escape}');
  assert.equal(screen.queryByRole('listbox'), null);
  assert.equal(document.activeElement, trigger);
  assert.equal(trigger.textContent, '全部角色');
  await user.keyboard('{Enter}{End}{Enter}');
  assert.equal(trigger.textContent, '视觉理解');
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  await user.keyboard(' {Home}{ArrowDown}{Tab}');
  assert.equal(trigger.textContent, '主模型');
  assert.equal(screen.queryByRole('listbox'), null);
  assert.equal(document.activeElement, screen.getByRole('button', { name: '下一项' }));
});

for (const mode of ['catalog', 'library']) {
  test(`${mode} uses the role popup to filter cards and dismisses on outside click`, async () => {
    const user = userEvent.setup();
    const entries = [
      { id: 'text', label: 'Text model', roles: ['main'] },
      { id: 'image', label: 'Image model', roles: ['image'] },
    ];
    render(React.createElement(WorkspaceModelCatalog, { mode, models: {
      ready: true, registryStatus: 'ready', registry: { providers: { openai: { models: entries } } },
      library: { connections: [{ id: 'direct', provider: 'openai', label: 'Direct' }],
        models: entries.map(model => ({ id: model.id, modelId: model.id, connectionId: 'direct' })) },
    } }));
    const trigger = screen.getByRole('combobox', { name: '模型角色' });
    await user.click(trigger);
    assert.equal(screen.getAllByRole('option').length, 4);
    assert.equal(screen.getByRole('option', { name: '全部角色' }).getAttribute('aria-selected'), 'true');
    await user.click(screen.getByRole('option', { name: '绘图模型' }));
    assert.equal(screen.getAllByRole('article').length, 1);
    assert.ok(screen.getByRole('heading', { name: 'Image model' }));
    assert.equal(document.activeElement, trigger);
    await user.click(trigger);
    await user.click(screen.getByRole('textbox'));
    assert.equal(screen.queryByRole('listbox'), null);
    assert.equal(trigger.textContent, '绘图模型');
  });
}
