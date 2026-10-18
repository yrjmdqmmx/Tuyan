import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import WorkspaceStatus from '../src/workspace/WorkspaceStatus.jsx';
afterEach(cleanup);
test('production workspace tools show account service and omit all simulation examples', () => {
  render(React.createElement(WorkspaceStatus, {sync:{saveStatus:'已保存'}, execution:{health:{executionMode:'production',executionEnabled:true}}, issues:[], open:true}));
  assert.ok(screen.getByRole('heading',{name:'执行服务'}));
  assert.equal(Boolean(screen.queryByRole('button',{name:'载入示例'})),false);
  assert.equal(Boolean(screen.queryByRole('button',{name:'竖图示例'})),false);
  assert.equal(Boolean(screen.queryByRole('button',{name:'模拟失败'})),false);
  assert.equal(screen.getByRole('link',{name:'原工作台'}).getAttribute('href'), '/?view=legacy');
  assert.ok(screen.getByText('任务与版本随账号保存，执行使用所选渠道。'));
});
