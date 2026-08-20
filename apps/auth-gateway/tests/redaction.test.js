import assert from 'node:assert/strict';
import test from 'node:test';

import { redactText } from '../src/redaction.js';

test('redacts secrets embedded in JSON-shaped log strings', () => {
  const value = redactText(
    'failed body={"email":"safe@example.com","password":"hunter2","token":"tok-secret","apiKey":"key-secret","cookie":"session-secret"}',
  );
  assert.match(value, /safe@example\.com/);
  assert.doesNotMatch(value, /hunter2|tok-secret|key-secret|session-secret/);
  assert.equal((value.match(/\[REDACTED\]/g) || []).length, 4);
});

test('continues to redact Mongo credentials, authorization and URL query secrets', () => {
  const value = redactText(
    'mongodb://owner:mongo-secret@mongodb:27017/auth Authorization: Bearer bearer-secret https://example.test/?api_key=query-secret&safe=value',
  );
  assert.doesNotMatch(value, /mongo-secret|bearer-secret|query-secret/);
  assert.match(value, /owner:\[REDACTED\]@mongodb/);
  assert.match(value, /safe=value/);
});

test('redacts project tokens, single-quoted objects, escaped JSON and the full Cookie header', () => {
  const value = redactText(
    String.raw`{"adminToken":"admin-secret","gatewayToken":"gateway-secret"} `
      + `{ password: 'single-secret' } Cookie: first=one-secret; __Host-paperbanana_guest=guest-secret; safeCookie=three`,
  );
  assert.doesNotMatch(value, /admin-secret|gateway-secret|single-secret|one-secret|guest-secret|safeCookie=three/);
});

test('redacts every API key in route-shaped multi-provider payloads', () => {
  const value = redactText(JSON.stringify({
    apiKeys: { ark: 'ark-secret', openai: 'openai-secret', bailian: 'bailian-secret' },
    modelRoutes: { image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' } },
  }));
  assert.doesNotMatch(value, /ark-secret|openai-secret|bailian-secret/);
  assert.match(value, /wan2\.7-image-pro/);
  assert.match(value, /\[REDACTED\]/);
});

test('redacts API key maps with unquoted keys and brace-containing values', () => {
  const value = redactText(
    `{ apiKeys: { openai: 'openai-secret', nested: { note: 'safe' }, bailian: 'bailian-secret' } } `
      + `{"apiKeys":{"ark":"key-{brace-secret}"}}`,
  );
  assert.doesNotMatch(value, /openai-secret|bailian-secret|brace-secret/);
  assert.match(value, /\[REDACTED\]/);
});

test('redacts apiKeys and api_keys values regardless of scalar, array, or malformed serialized shape', () => {
  const value = redactText(
    `{"apiKeys":["array-secret",{"nested":"second-secret"}]} `
      + `{ api_keys: 'string-secret' } `
      + `{"apiKeys":"malformed-secret`,
  );
  assert.doesNotMatch(value, /array-secret|second-secret|string-secret|malformed-secret/);
  assert.equal((value.match(/\[REDACTED\]/g) || []).length, 3);
});

test('does not redact unrelated key-like words', () => {
  const value = redactText(`{"monkey":"banana","tokenizer":"safe","safe":"visible"}`);
  assert.match(value, /monkey/);
  assert.match(value, /banana/);
  assert.match(value, /tokenizer/);
  assert.match(value, /visible/);
});
