import assert from 'node:assert/strict';
import test from 'node:test';

import { BodyLimitError, readBoundedBody } from '../src/auth-http.js';

function fakeRequest(chunks, headers = {}) {
  return {
    headers,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield Buffer.from(chunk);
    },
  };
}

test('bounded reader accepts a body exactly at the limit', async () => {
  const body = await readBoundedBody(fakeRequest(['ab', 'cd']), 4);
  assert.equal(body.toString('utf8'), 'abcd');
});

test('bounded reader rejects actual bytes beyond the limit despite a misleading small length', async () => {
  await assert.rejects(
    () => readBoundedBody(fakeRequest(['abc', 'def'], { 'content-length': '1' }), 4),
    (error) => error instanceof BodyLimitError,
  );
});
