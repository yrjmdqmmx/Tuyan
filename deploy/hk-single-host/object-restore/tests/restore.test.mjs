import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';

async function subject(path) {
  try {
    return await import(new URL(path, import.meta.url));
  } catch (error) {
    assert.fail(`expected migration module ${path} to load: ${error?.message || error}`);
  }
}

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function makeBundle(entries) {
  const { keyToRelativePath } = await subject('../common.mjs');
  const root = await mkdtemp(join(tmpdir(), 'paperbanana-migration-bundle-'));
  const manifestLines = [];
  let totalBytes = 0;

  for (const item of entries) {
    const bytes = Buffer.from(item.bytes);
    const file = item.file || keyToRelativePath(item.key);
    const path = join(root, file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    totalBytes += bytes.byteLength;
    manifestLines.push(JSON.stringify({
      key: item.key,
      file,
      size: item.size ?? bytes.byteLength,
      sha256: item.sha256 || digest(bytes),
      contentType: item.contentType || 'application/octet-stream',
      settableMetadata: item.settableMetadata || {},
      etag: item.etag || '',
      lastModified: item.lastModified || '',
      metadataSource: item.metadataSource || 'signed-get',
    }));
  }

  const manifest = `${manifestLines.join('\n')}\n`;
  await writeFile(join(root, 'manifest.jsonl'), manifest);
  await writeFile(join(root, 'export-summary.json'), `${JSON.stringify({
    format: 'paperbanana-object-export-v1',
    objectCount: entries.length,
    pageCount: 1,
    totalBytes,
    manifestSha256: digest(Buffer.from(manifest)),
  }, null, 2)}\n`);
  return root;
}

test('base64url storage paths are deterministic, collision-safe, and reject traversal-like keys', async () => {
  const { keyToRelativePath, validateObjectKey } = await subject('../common.mjs');

  assert.equal(keyToRelativePath('results/a b.png'), 'objects/cmVzdWx0cy9hIGIucG5n.object');
  assert.notEqual(keyToRelativePath('results/a+b.png'), keyToRelativePath('results/a b.png'));
  const longPath = keyToRelativePath(`results/${'长'.repeat(330)}.png`);
  assert.ok(longPath.split('/').every((component) => component.length <= 187));

  for (const key of ['', '/absolute', '../escape', 'safe/../../escape', 'safe\\escape', 'safe\0bad']) {
    assert.throws(() => validateObjectKey(key), /object key/i, key);
  }
});

test('bundle validation rejects duplicate keys, duplicate files, traversal, and hash mismatch before upload', async () => {
  const { loadBundle } = await subject('../target-import-lib.mjs');
  const duplicateKey = await makeBundle([
    { key: 'a', bytes: 'one' },
    { key: 'a', bytes: 'two' },
  ]);
  await assert.rejects(loadBundle(duplicateKey), /duplicate manifest key/i);

  const duplicateFile = await makeBundle([
    { key: 'a', bytes: 'one' },
    { key: 'b', bytes: 'two', file: 'objects/YQ.object' },
  ]);
  await assert.rejects(loadBundle(duplicateFile), /duplicate manifest file/i);

  const traversal = await makeBundle([{ key: 'a', bytes: 'one', file: '../outside.object' }]);
  await assert.rejects(loadBundle(traversal), /manifest file|traversal/i);

  const corrupt = await makeBundle([{ key: 'a', bytes: 'one', sha256: digest(Buffer.from('other')) }]);
  await assert.rejects(loadBundle(corrupt), /sha-?256 mismatch/i);
});

test('target import preserves the allowlist, uploads exact keys, paginates, and verifies bytes', async () => {
  const { importTargetBundle } = await subject('../target-import-lib.mjs');
  const bundleDir = await makeBundle([{
    key: 'results/精修 a.svg',
    bytes: '<svg/>',
    contentType: 'image/svg+xml',
    settableMetadata: {
      'Cache-Control': 'private,max-age=60',
      'Content-Disposition': 'inline',
      'Content-Encoding': 'identity',
      Expires: 'Wed, 21 Oct 2026 07:28:00 GMT',
      'x-oss-meta-origin': 'paperbanana',
    },
  }]);
  const stored = new Map();
  const putCalls = [];
  const listCalls = [];
  const logs = [];
  const client = {
    async put(key, stream, options) {
      const chunks = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      const bytes = Buffer.concat(chunks);
      stored.set(key, { bytes, headers: options.headers });
      putCalls.push({ key, headers: options.headers, contentLength: options.contentLength });
      return { name: key };
    },
    async getObjectMeta(key) {
      const value = stored.get(key);
      return { res: { status: 200, headers: {
        'content-length': String(value.bytes.byteLength),
      } } };
    },
    async getStream(key) {
      return {
        stream: Readable.from([stored.get(key).bytes]),
        res: { status: 200, headers: {
          'content-length': String(stored.get(key).bytes.byteLength),
          'content-type': stored.get(key).headers['Content-Type'],
        } },
      };
    },
    async listV2(query) {
      listCalls.push(query);
      if (!query['continuation-token']) {
        return { objects: [], isTruncated: true, nextContinuationToken: 'page-2' };
      }
      return { objects: [{ name: 'results/精修 a.svg', size: 6 }], isTruncated: false };
    },
  };

  const result = await importTargetBundle({
    bundleDir,
    client,
    concurrency: 2,
    logger: { info(message) { logs.push(String(message)); } },
  });

  assert.deepEqual(putCalls, [{
    key: 'results/精修 a.svg',
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'private,max-age=60',
      'Content-Disposition': 'inline',
      'Content-Encoding': 'identity',
      Expires: 'Wed, 21 Oct 2026 07:28:00 GMT',
      'x-oss-meta-origin': 'paperbanana',
    },
    contentLength: 6,
  }]);
  assert.deepEqual(listCalls, [
    { 'max-keys': 1000 },
    { 'max-keys': 1000, 'continuation-token': 'page-2' },
  ]);
  assert.deepEqual(result, {
    manifestCount: 1,
    uploadedCount: 1,
    verifiedCount: 1,
    targetPageCount: 2,
    targetObjectCount: 1,
    totalBytes: 6,
  });
  assert.equal(logs.length, 1);
  assert.match(logs[0], /manifestCount=1/u);
  assert.match(logs[0], /totalBytes=6/u);
});

test('target pagination falls back to a lowercase key when nextMarker is absent', async () => {
  const { listAllTargetObjects } = await subject('../target-import-lib.mjs');
  const calls = [];
  const pages = [
    { objects: [{ key: 'a', size: 1 }], isTruncated: true },
    { objects: [{ key: 'b', size: 2 }], isTruncated: false },
  ];
  const result = await listAllTargetObjects({
    async list(query) {
      calls.push(query);
      return pages.shift();
    },
  });

  assert.deepEqual(calls, [
    { 'max-keys': 1000 },
    { marker: 'a', 'max-keys': 1000 },
  ]);
  assert.deepEqual(result.objects.map((object) => object.key), ['a', 'b']);
  assert.equal(result.pageCount, 2);
});

test('target pagination stalls and unsupported verification clients fail closed', async () => {
  const { importTargetBundle, listAllTargetObjects } = await subject('../target-import-lib.mjs');
  await assert.rejects(
    listAllTargetObjects({
      async list() { return { objects: [], isTruncated: true, nextMarker: 'same' }; },
    }, { initialMarker: 'same' }),
    /pagination did not advance/i,
  );

  const bundleDir = await makeBundle([{ key: 'a', bytes: 'one' }]);
  await assert.rejects(
    importTargetBundle({ bundleDir, client: { async put() {} } }),
    /metadata.*stream.*list|verification interface/i,
  );
});

test('target import reports the failing operation and object key without swallowing the SDK error', async () => {
  const { importTargetBundle } = await subject('../target-import-lib.mjs');
  const bundleDir = await makeBundle([{ key: 'objects/problem key.png', bytes: 'one' }]);
  const client = {
    async put() { throw new Error('signature mismatch'); },
    async getObjectMeta() {},
    async getStream() {},
    async list() {},
  };

  await assert.rejects(
    importTargetBundle({ bundleDir, client }),
    /target upload failed for objects\/problem key\.png: signature mismatch/i,
  );
});

test('target endpoint validation permits only HTTPS Alibaba internal endpoints', async () => {
  const { validateInternalEndpoint } = await subject('../target-import-lib.mjs');

  assert.equal(
    validateInternalEndpoint('https://oss-cn-hongkong-internal.aliyuncs.com'),
    'https://oss-cn-hongkong-internal.aliyuncs.com',
  );
  for (const endpoint of [
    'http://oss-cn-hongkong-internal.aliyuncs.com',
    'https://oss-cn-hongkong.aliyuncs.com',
    'https://evil.example.com',
  ]) {
    assert.throws(() => validateInternalEndpoint(endpoint), /internal endpoint/i);
  }
});

test('operator error redaction removes signed URLs and configured secret values', async () => {
  const { redactSensitiveText } = await subject('../common.mjs');
  const redacted = redactSensitiveText(
    'request https://signed.invalid/a?credential=abc failed with target-secret',
    ['target-secret'],
  );
  assert.doesNotMatch(redacted, /signed\.invalid|credential=abc|target-secret/u);
  assert.match(redacted, /\[redacted-url\]/u);
  assert.match(redacted, /\[redacted-secret\]/u);
});
