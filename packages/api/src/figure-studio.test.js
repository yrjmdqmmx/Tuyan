import assert from 'node:assert/strict';
import test from 'node:test';
import { figureStudioRequest } from './figure-studio.js';

test('Figure Studio uses one authenticated request and preserves billing failure details without retry', async () => {
  const previous = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ code: 422, error: 'invalid model output', requestState: 'unknown', billingStatus: 'unconfirmed' }); };
  try {
    await assert.rejects(figureStudioRequest('/paperbanana-api', 'figureStudioPlan', { materials: 'source', action: 'createJob' }), error => error.details.billingStatus === 'unconfirmed');
    assert.equal(calls.length, 1); assert.equal(calls[0].options.credentials, 'include'); assert.equal(JSON.parse(calls[0].options.body).action, 'figureStudioPlan');
    assert.throws(() => figureStudioRequest('/paperbanana-api', 'arbitraryAction'));
  } finally { globalThis.fetch = previous; }
});
