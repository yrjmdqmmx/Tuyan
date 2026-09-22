import assert from 'node:assert/strict';
import test from 'node:test';
import { figureStudioRequest } from './figure-studio.js';

test('Figure Studio uses one authenticated request and preserves billing failure details without retry', async () => {
  const previous = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ code: 422, error: 'invalid model output', requestState: 'unknown', billingStatus: 'unconfirmed' }); };
  try {
    await assert.rejects(figureStudioRequest('/paperbanana-api', 'figureStudioPlan', { requestId: 'canvas-test-request-001', materials: 'source', action: 'createJob' }), error => error.details.billingStatus === 'unconfirmed');
    assert.equal(calls.length, 1); assert.equal(calls[0].options.credentials, 'include'); assert.equal(JSON.parse(calls[0].options.body).action, 'figureStudioPlan');
    assert.throws(() => figureStudioRequest('/paperbanana-api', 'arbitraryAction'));
  } finally { globalThis.fetch = previous; }
});

test('operation lookup and explicit resume preserve the original identity and never retry', async () => {
  const previous = globalThis.fetch; const calls = [];
  const requestId = 'canvas-test-request-002';
  globalThis.fetch = async (url, options) => {
    calls.push(JSON.parse(options.body));
    if (calls.length === 1) throw new TypeError('connection lost');
    return Response.json({ code: 0, operation: { requestId, status: 'blocked', recovery: { canResume: false, requestState: 'unknown' } } });
  };
  try {
    assert.throws(() => figureStudioRequest('/paperbanana-api', 'figureStudioPlan', {}), error => error.details.requestState === 'not_sent');
    assert.equal(calls.length, 0);
    await assert.rejects(figureStudioRequest('/paperbanana-api', 'figureStudioEdit', { requestId, document: {} }));
    assert.equal(calls.length, 1);
    const result = await figureStudioRequest('/paperbanana-api', 'figureStudioOperation', { requestId });
    assert.equal(result.operation.recovery.canResume, false);
    await figureStudioRequest('/paperbanana-api', 'figureStudioResume', { requestId });
    assert.deepEqual(calls.map(call => [call.action, call.requestId]), [
      ['figureStudioEdit', requestId], ['figureStudioOperation', requestId], ['figureStudioResume', requestId],
    ]);
  } finally { globalThis.fetch = previous; }
});

test('oversized source fails locally and request cancellation uses the shared transport', async () => {
  const previous = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ code: 0 }); };
  try {
    assert.throws(() => figureStudioRequest('/paperbanana-api', 'figureStudioExport', { data: 'x'.repeat(768 * 1024) }), error => error.details.requestState === 'not_sent');
    assert.equal(calls.length, 0);
    const controller = new AbortController();
    await figureStudioRequest('/paperbanana-api', 'figureStudioCapabilities', {}, { signal: controller.signal });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.signal, controller.signal);
  } finally { globalThis.fetch = previous; }
});
