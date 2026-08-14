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

test('source listing follows NextMarker, nextMarker, and last-key fallback over the whole bucket', async () => {
  const { listAllSourceObjects } = await subject('../source-export-lib.mjs');
  const calls = [];
  const pages = [
    { Contents: [{ Key: 'a', Size: 1 }], IsTruncated: true, NextMarker: 'm1' },
    { contents: [{ key: 'b', size: 2 }], isTruncated: true, nextMarker: 'm2' },
    { objects: [{ name: 'c', size: 3 }], isTruncated: true },
    { Contents: [{ Key: 'd', Size: 4 }], IsTruncated: false },
  ];
  const bucket = {
    async listFiles(options) {
      calls.push(options);
      return pages.shift();
    },
  };

  const result = await listAllSourceObjects(bucket);

  assert.deepEqual(calls, [
    { Marker: undefined },
    { Marker: 'm1' },
    { Marker: 'm2' },
    { Marker: 'c' },
  ]);
  assert.equal(result.pageCount, 4);
  assert.deepEqual(result.objects.map((object) => object.key), ['a', 'b', 'c', 'd']);
});

test('source listing fails closed on a non-advancing marker and duplicate keys', async () => {
  const { listAllSourceObjects } = await subject('../source-export-lib.mjs');

  await assert.rejects(
    listAllSourceObjects({
      async listFiles() {
        return { Contents: [{ Key: 'a', Size: 1 }], IsTruncated: true, NextMarker: 'same' };
      },
    }, { initialMarker: 'same' }),
    /pagination did not advance/i,
  );

  let page = 0;
  await assert.rejects(
    listAllSourceObjects({
      async listFiles() {
        page += 1;
        return page === 1
          ? { Contents: [{ Key: 'a', Size: 1 }], IsTruncated: true, NextMarker: 'next' }
          : { Contents: [{ Key: 'a', Size: 1 }], IsTruncated: false };
      },
    }),
    /duplicate source object key/i,
  );
});

test('source export streams signed GETs, hashes bytes, and records only settable metadata', async () => {
  const { exportSourceBucket } = await subject('../source-export-lib.mjs');
  const parent = await mkdtemp(join(tmpdir(), 'paperbanana-source-export-'));
  const outputDir = join(parent, 'bundle');
  const calls = [];
  const logs = [];
  const secretUrl = 'https://signed.invalid/private?credential=do-not-log';
  const bucket = {
    async listFiles({ Marker }) {
      assert.equal(Marker, undefined);
      return {
        Contents: [{ Key: 'results/a.png', Size: 6, ETag: 'list-etag', LastModified: 'list-time' }],
        IsTruncated: false,
      };
    },
    async getDownloadUrl(key, expires) {
      assert.equal(key, 'results/a.png');
      assert.equal(expires, 900);
      return secretUrl;
    },
  };
  const fetchImpl = async (url) => {
    calls.push(url);
    return new Response(Buffer.from('123456'), {
      status: 200,
      headers: {
        'content-length': '6',
        'content-type': 'image/png',
        'cache-control': 'public,max-age=60',
        'content-disposition': 'inline',
        'content-encoding': 'identity',
        expires: 'Wed, 21 Oct 2026 07:28:00 GMT',
        etag: 'get-etag',
        'last-modified': 'get-time',
        'x-oss-meta-origin': 'paperbanana',
        'x-secret-header': 'discard-me',
      },
    });
  };

  const result = await exportSourceBucket({
    bucket,
    outputDir,
    fetchImpl,
    concurrency: 2,
    maxObjectBytes: 10,
    signedUrlExpiresSeconds: 900,
    logger: { info(message) { logs.push(String(message)); } },
  });

  assert.deepEqual(calls, [secretUrl]);
  assert.equal(result.objectCount, 1);
  assert.equal(result.pageCount, 1);
  assert.equal(result.totalBytes, 6);
  assert.equal(logs.some((line) => line.includes(secretUrl)), false);
  const manifest = JSON.parse((await readFile(join(outputDir, 'manifest.jsonl'), 'utf8')).trim());
  assert.deepEqual(manifest, {
    key: 'results/a.png',
    file: 'objects/cmVzdWx0cy9hLnBuZw.object',
    size: 6,
    sha256: digest(Buffer.from('123456')),
    contentType: 'image/png',
    settableMetadata: {
      'Cache-Control': 'public,max-age=60',
      'Content-Disposition': 'inline',
      'Content-Encoding': 'identity',
      Expires: 'Wed, 21 Oct 2026 07:28:00 GMT',
      'x-oss-meta-origin': 'paperbanana',
    },
    etag: 'get-etag',
    lastModified: 'get-time',
    metadataSource: 'signed-get',
  });
  assert.equal(await readFile(join(outputDir, manifest.file), 'utf8'), '123456');
});

test('source export supports a bounded direct stream and rejects missing download or metadata interfaces', async () => {
  const { openSourceObject } = await subject('../source-export-lib.mjs');
  const headers = {
    'content-length': '3',
    'content-type': 'text/plain',
  };

  const direct = await openSourceObject({
    async getFileStream(key) {
      assert.equal(key, 'a.txt');
      return { stream: Readable.from([Buffer.from('abc')]), headers };
    },
  }, 'a.txt', { maxObjectBytes: 3 });
  assert.equal(direct.metadataSource, 'direct-stream');
  assert.equal(direct.headers['content-type'], 'text/plain');

  await assert.rejects(
    openSourceObject({ async getFileStream() { return { stream: Readable.from(['x']) }; } }, 'a', { maxObjectBytes: 3 }),
    /metadata headers/i,
  );
  await assert.rejects(openSourceObject({}, 'a', { maxObjectBytes: 3 }), /download interface/i);
});

test('default signed GET transport preserves encoded bytes without fetch decompression', async () => {
  const { rawSignedGet } = await subject('../source-export-lib.mjs');
  const encoded = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
  const calls = [];
  const requestImpl = (url, options, onResponse) => {
    calls.push({ url: url.href, options });
    const request = new EventEmitter();
    request.end = () => {
      const response = Readable.from([encoded]);
      response.statusCode = 200;
      response.headers = {
        'content-length': String(encoded.byteLength),
        'content-type': 'application/octet-stream',
        'content-encoding': 'gzip',
      };
      onResponse(response);
    };
    return request;
  };

  const response = await rawSignedGet('https://signed.invalid/object?signature=redacted', { requestImpl });
  const chunks = [];
  for await (const chunk of response.body) chunks.push(Buffer.from(chunk));

  assert.deepEqual(Buffer.concat(chunks), encoded);
  assert.equal(calls[0].options.headers['Accept-Encoding'], 'identity');
});

test('source export refuses an existing destination before listing the bucket', async () => {
  const { exportSourceBucket } = await subject('../source-export-lib.mjs');
  const parent = await mkdtemp(join(tmpdir(), 'paperbanana-existing-export-'));
  const outputDir = join(parent, 'bundle');
  await mkdir(outputDir);
  let listCalls = 0;

  await assert.rejects(
    exportSourceBucket({
      outputDir,
      bucket: {
        async listFiles() {
          listCalls += 1;
          return { Contents: [], IsTruncated: false };
        },
      },
      logger: { info() {} },
    }),
    /output directory already exists/i,
  );
  assert.equal(listCalls, 0);
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
    async list(query) {
      listCalls.push(query);
      if (!query.marker) return { objects: [], isTruncated: true, nextMarker: 'page-2' };
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
    { marker: undefined, 'max-keys': 1000 },
    { marker: 'page-2', 'max-keys': 1000 },
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
    { marker: undefined, 'max-keys': 1000 },
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

test('source and target CLIs stay role-separated and expose secret-free usage', async () => {
  const migrationRoot = new URL('../', import.meta.url);
  const sourcePath = new URL('source-export.mjs', migrationRoot);
  const targetPath = new URL('target-import.mjs', migrationRoot);
  const sourceText = await readFile(sourcePath, 'utf8');
  const targetText = await readFile(targetPath, 'utf8');

  assert.match(sourceText, /@lafjs\/cloud/u);
  assert.doesNotMatch(sourceText, /ali-oss/u);
  assert.match(targetText, /ali-oss/u);
  assert.doesNotMatch(targetText, /@lafjs\/cloud/u);

  for (const path of [sourcePath, targetPath]) {
    assert.equal((await stat(path)).mode & 0o111, 0o111, `${path} must be executable`);
    const result = spawnSync(process.execPath, [fileURLToPath(path), '--help'], { encoding: 'utf8', env: {} });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage:/u);
    assert.doesNotMatch(result.stdout, /LTAI[A-Za-z0-9]{12,}|credential=|AccessKeySecret/u);
  }
});

test('migration package and README provide locked, credential-free execution instructions', async () => {
  const migrationRoot = new URL('../', import.meta.url);
  const packageJson = JSON.parse(await readFile(new URL('package.json', migrationRoot), 'utf8'));
  const lock = await readFile(new URL('package-lock.json', migrationRoot), 'utf8');
  const readme = await readFile(new URL('README.md', migrationRoot), 'utf8');

  assert.equal(packageJson.private, true);
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.dependencies['ali-oss'], '^6.23.0');
  assert.equal(packageJson.scripts.test, 'node --test tests/*.test.mjs');
  assert.match(lock, /"ali-oss": "\^6\.23\.0"/u);
  assert.match(readme, /npm ci --omit=dev/u);
  assert.match(readme, /source-export\.mjs/u);
  assert.match(readme, /target-import\.mjs/u);
  assert.match(readme, /PAPERBANANA_BUCKET/u);
  assert.match(readme, /OSS_INTERNAL_ENDPOINT/u);
  assert.match(readme, /whole bucket|entire bucket/iu);
  assert.match(readme, /empty target bucket/iu);
  assert.doesNotMatch(readme, /LTAI[A-Za-z0-9]{12,}|-----BEGIN (?:OPENSSH|RSA) PRIVATE KEY-----/u);
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
