import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import JobStatus from '../src/components/JobStatus.jsx';
import JobFailureNotice from '../src/components/JobFailureNotice.jsx';

afterEach(cleanup);

test('rendered failure keeps the Chinese cause, billing uncertainty and saved-step explanation together', () => {
  const message = '图示规划失败：本次合计 10 张图片，上限 8 张。请减少图片。';
  render(React.createElement(JobStatus, { job: {
    status: 'failed', error: 'old generic error', failure: { message, billingMessage: '此前已有成功调用，费用以渠道账单为准。' },
    recovery: { canResume: false, message: '已成功步骤保留；失败步骤未发起模型调用。' },
    referenceSelection: { selectedCount: 2, imageCount: 3, mode: 'images' },
    stages: [], result_images: [], reference_images: [],
  } }));
  const notice = screen.getByRole('alert');
  assert.ok(notice.textContent.includes(message));
  assert.match(notice.textContent, /账单/);
  assert.match(notice.textContent, /成功步骤保留/);
  assert.doesNotMatch(notice.textContent, /old generic/);
  assert.match(screen.getByText(/参考图选择：/).textContent, /实际采用 2 张.*合计提交 3 张/);
  assert.equal(screen.queryByRole('button', { name: /重试|继续/ }), null);
});

test('old jobs remain readable and unknown billing never becomes a zero-charge promise', () => {
  const view = render(React.createElement(JobFailureNotice, { job: { error: '网络超时，请先核对调用记录。', recovery: { message: '结果未知，自动重试已停止。' } } }));
  assert.match(screen.getByRole('alert').textContent, /结果未知/);
  assert.doesNotMatch(screen.getByRole('alert').textContent, /未扣费|免费/);
  view.rerender(React.createElement(JobFailureNotice, { job: { status: 'succeeded' } }));
  assert.equal(screen.queryByRole('alert'), null);
});

test('plot timeout exposes collapsed channel evidence without blaming the configured image model', () => {
  render(React.createElement(JobFailureNotice, {job:{error:'failed',imageModelName:'seedream-5.0-pro',failure:{
    message:'统计图代码生成失败：等待模型响应超时。',billingMessage:'请求结果及费用尚未确认。',
    diagnostic:{channel:'tokendance',phase:'response_body',requestedModel:'qwen3.8-flash',requestId:'request-code-fixture',elapsedMs:600532},
  }}}));
  const notice=screen.getByRole('alert');
  assert.match(notice.textContent,/统计图代码生成失败/);
  assert.match(notice.textContent,/qwen3.8-flash/);
  assert.match(notice.textContent,/request-code-fixture/);
  assert.match(notice.textContent,/600\.5 秒/);
  assert.match(notice.textContent,/读取响应内容/);
  assert.equal(notice.querySelector('details').open,false);
  assert.doesNotMatch(notice.textContent,/seedream|未扣费|免费/);
  assert.equal(screen.queryByRole('button',{name:/重试|继续/}),null);
});

for (const [timeoutKind, label, limit] of [
  ['first_response', '未等到首个有效模型事件', 180000],
  ['stream_idle', '模型输出连续停顿', 180000],
  ['total', '达到单次请求总时限', 1800000],
]) test(`TokenDance ${timeoutKind} identifies its actual timeout without offering replay`, () => {
  render(React.createElement(JobFailureNotice, { job: { error: 'timeout', failure: {
    message: '统计图代码生成失败：等待模型响应超时。', billingMessage: '请求结果及费用尚未确认，自动重试已停止。',
    diagnostic: { channel: 'tokendance', phase: 'response_body', timeoutKind, timeoutMs: limit, elapsedMs: limit },
  } } }));
  const notice = screen.getByRole('alert');
  assert.ok(notice.textContent.includes(label));
  assert.ok(notice.textContent.includes(`上限 ${limit / 1000} 秒`));
  assert.match(notice.textContent, /费用尚未确认/);
  assert.equal(screen.queryByRole('button', { name: /重试|继续/ }), null);
});
