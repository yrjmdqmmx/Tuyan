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

test('bounded reader fails immediately after the first byte beyond the limit', async () => {
  let reachedUnboundedTail = false;
  const request = {
    async *[Symbol.asyncIterator]() {
      yield Buffer.from('abc');
      yield Buffer.from('def');
      reachedUnboundedTail = true;
      await new Promise(() => {});
    },
  };

  await Promise.race([
    assert.rejects(() => readBoundedBody(request, 4), BodyLimitError),
    new Promise((_, reject) => setTimeout(() => reject(new Error('oversized body did not fail fast')), 100)),
  ]);
  assert.equal(reachedUnboundedTail, false);
});

test('bounded reader does not retain and concatenate one object per tiny chunk', async () => {
  const originalConcat = Buffer.concat;
  Buffer.concat = () => {
    throw new Error('chunk-per-object concatenation is forbidden');
  };
  try {
    const request = {
      async *[Symbol.asyncIterator]() {
        for (let index = 0; index < 20_000; index += 1) yield Buffer.from('x');
      },
    };
    const body = await readBoundedBody(request, 20_000);
    assert.equal(body.byteLength, 20_000);
    assert.equal(body[0], 120);
    assert.equal(body[19_999], 120);
  } finally {
    Buffer.concat = originalConcat;
  }
});

test('a one-byte slow request does not reserve the full one MiB limit', async () => {
  const request = fakeRequest(['x']);
  const body = await readBoundedBody(request, 1024 * 1024);
  assert.equal(body.byteLength, 1);
  assert.ok(body.buffer.byteLength <= 16 * 1024, `unexpected backing buffer: ${body.buffer.byteLength}`);
});
