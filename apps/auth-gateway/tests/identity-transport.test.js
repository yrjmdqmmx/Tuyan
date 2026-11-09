import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityTransport, loadIdentityProxy } from '../src/identity-transport.js';

test('identity transport pins destination and proxy, disables redirects, and never retries', async () => {
  let constructed = 0, closed = 0; const requests = [];
  class Agent { constructor(options) { constructed++; assert.equal(options.uri, 'http://10.78.0.1:3129'); } async close() { closed++; } }
  const transport = createIdentityTransport('http://10.78.0.1:3129', { Agent, fetchImpl: async (url, options) => {
    requests.push({url, options}); throw Error('network unavailable');
  } });
  await assert.rejects(() => transport.fetch('https://oauth2.googleapis.com/token', {method:'POST',redirect:'follow'}), /network unavailable/);
  assert.equal(requests.length, 1); assert.equal(requests[0].options.redirect, 'error');
  assert.ok(requests[0].options.dispatcher instanceof Agent); assert.equal(constructed, 1);
  for (const url of ['http://api.github.com/user','https://api.github.com.evil.test/user','https://api.github.com/user?token=x','https://api.openai.com/v1/models','http://127.0.0.1/']) {
    assert.throws(() => transport.fetch(url), /ENDPOINT_DENIED/);
  }
  assert.equal(requests.length, 1); await transport.close(); assert.equal(closed, 1);
  for (const value of ['http://10.78.0.1:3128','https://proxy.test','http://user:pass@10.78.0.1:3129']) assert.throws(() => loadIdentityProxy({AUTH_IDENTITY_PROXY_URL:value}), /PROXY_INVALID/);
});

test('local identity tests retain direct transport without constructing a proxy', async () => {
  const transport = createIdentityTransport('', { Agent: class { constructor() { throw Error('unexpected proxy'); } }, fetchImpl: async (_url, options) => options });
  const options = await transport.fetch('https://api.github.com/user');
  assert.equal(options.dispatcher, undefined); assert.equal(options.redirect, 'error');
  await transport.close();
});
