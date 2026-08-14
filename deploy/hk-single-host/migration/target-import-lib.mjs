import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

import {
  EXPORT_FORMAT,
  assertSafeRegularFile,
  createVerifiedReadStream,
  mapLimit,
  normalizeHeaders,
  sha256File,
  uploadHeaders,
  validateManifestEntry,
  validateObjectKey,
  validatePositiveInteger,
} from './common.mjs';

function requireCount(value, label) {
  return validatePositiveInteger(value, label, { allowZero: true });
}

async function sha256Path(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

function validateSummary(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Export summary is malformed');
  if (value.format !== EXPORT_FORMAT) throw new Error(`Unsupported export format: ${value.format || 'missing'}`);
  const summary = {
    format: value.format,
    objectCount: requireCount(value.objectCount, 'Summary objectCount'),
    pageCount: validatePositiveInteger(value.pageCount, 'Summary pageCount'),
    totalBytes: requireCount(value.totalBytes, 'Summary totalBytes'),
    manifestSha256: value.manifestSha256,
  };
  if (typeof summary.manifestSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(summary.manifestSha256)) {
    throw new Error('Summary manifestSha256 is invalid');
  }
  return summary;
}

export async function loadBundle(bundleDir) {
  if (typeof bundleDir !== 'string' || !bundleDir.trim()) throw new Error('Migration bundle directory is required');
  const root = resolve(bundleDir);
  const summaryPath = await assertSafeRegularFile(root, 'export-summary.json');
  const manifestPath = await assertSafeRegularFile(root, 'manifest.jsonl');
  let summary;
  try {
    summary = validateSummary(JSON.parse(await readFile(summaryPath, 'utf8')));
  } catch (error) {
    if (/Export summary|Summary|Unsupported export format/u.test(String(error?.message))) throw error;
    throw new Error(`Export summary is malformed: ${error?.message || error}`);
  }
  const actualManifestSha256 = await sha256Path(manifestPath);
  if (actualManifestSha256 !== summary.manifestSha256) throw new Error('Manifest SHA-256 does not match export summary');

  const entries = [];
  const keys = new Set();
  const files = new Set();
  const reader = createInterface({ input: createReadStream(manifestPath), crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of reader) {
    lineNumber += 1;
    if (!line.trim()) throw new Error(`Manifest line ${lineNumber} is empty`);
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new Error(`Manifest line ${lineNumber} is malformed JSON: ${error?.message || error}`);
    }
    const rawKey = validateObjectKey(parsed?.key);
    if (keys.has(rawKey)) throw new Error(`Duplicate manifest key: ${rawKey}`);
    if (typeof parsed?.file === 'string' && files.has(parsed.file)) {
      throw new Error(`Duplicate manifest file: ${parsed.file}`);
    }
    const entry = validateManifestEntry(parsed);
    keys.add(entry.key);
    files.add(entry.file);
    entries.push(entry);
  }
  if (entries.length !== summary.objectCount) {
    throw new Error(`Manifest count mismatch: summary ${summary.objectCount}, manifest ${entries.length}`);
  }
  const totalBytes = entries.reduce((total, entry) => total + entry.size, 0);
  if (!Number.isSafeInteger(totalBytes) || totalBytes !== summary.totalBytes) {
    throw new Error(`Manifest byte count mismatch: summary ${summary.totalBytes}, manifest ${totalBytes}`);
  }

  for (const entry of entries) {
    const path = await assertSafeRegularFile(root, entry.file);
    const digest = await sha256File(path, entry.size);
    if (digest.size !== entry.size) {
      throw new Error(`File size mismatch for ${entry.key}: manifest ${entry.size}, file ${digest.size}`);
    }
    if (digest.sha256 !== entry.sha256) throw new Error(`SHA-256 mismatch for ${entry.key}`);
    entry.path = path;
  }
  return { root, summary, entries };
}

function assertVerificationClient(client) {
  const required = ['put', 'getObjectMeta', 'getStream', 'list'];
  if (!client || required.some((name) => typeof client[name] !== 'function')) {
    throw new Error('Target client is missing put, metadata, stream, or list verification interfaces');
  }
}

function firstDefined(object, names) {
  for (const name of names) {
    if (object?.[name] !== undefined) return object[name];
  }
  return undefined;
}

export async function listAllTargetObjects(client, { initialMarker } = {}) {
  if (!client || typeof client.list !== 'function') throw new Error('Target client has no list verification interface');
  let marker = initialMarker;
  let pageCount = 0;
  const objects = [];
  const keys = new Set();
  const usedMarkers = new Set();
  if (marker !== undefined) usedMarkers.add(marker);

  do {
    const page = await client.list({ marker, 'max-keys': 1000 });
    pageCount += 1;
    if (!Array.isArray(page?.objects)) throw new Error('Target object listing is missing an object array');
    for (const rawObject of page.objects) {
      const key = validateObjectKey(firstDefined(rawObject, ['name', 'Key', 'key']));
      if (keys.has(key)) throw new Error(`Duplicate target object key: ${key}`);
      keys.add(key);
      objects.push({ key, size: Number(firstDefined(rawObject, ['size', 'Size'])) });
    }
    if (typeof page.isTruncated !== 'boolean') throw new Error('Target listing is missing an explicit truncation flag');
    if (!page.isTruncated) break;
    const nextMarker = page.nextMarker || firstDefined(page.objects.at(-1), ['name', 'Key', 'key']);
    if (typeof nextMarker !== 'string' || !nextMarker || nextMarker === marker || usedMarkers.has(nextMarker)) {
      throw new Error('Target object pagination did not advance');
    }
    marker = nextMarker;
    usedMarkers.add(marker);
  } while (true);
  return { objects, pageCount };
}

function responseHeaders(result) {
  return normalizeHeaders(result?.headers || result?.res?.headers || result?.response?.headers);
}

function responseStatus(result) {
  return result?.status ?? result?.res?.status ?? result?.response?.status;
}

function comparableContentType(value) {
  return String(value || '').trim().toLowerCase();
}

async function verifyTargetObject(client, entry) {
  const metadata = await client.getObjectMeta(entry.key);
  const metadataStatus = responseStatus(metadata);
  if (metadataStatus !== undefined && metadataStatus !== 200) {
    throw new Error(`Target metadata returned unexpected status ${metadataStatus} for ${entry.key}`);
  }
  const headers = responseHeaders(metadata);
  const size = Number(headers['content-length']);
  if (!Number.isSafeInteger(size) || size !== entry.size) {
    throw new Error(`Target size mismatch for ${entry.key}: expected ${entry.size}, received ${headers['content-length']}`);
  }
  if (
    headers['content-type']
    && comparableContentType(headers['content-type']) !== comparableContentType(entry.contentType)
  ) {
    throw new Error(
      `Target Content-Type mismatch for ${entry.key}: expected ${entry.contentType}, received ${headers['content-type'] || 'missing'}`,
    );
  }

  const download = await client.getStream(entry.key);
  const status = responseStatus(download);
  if (status !== undefined && status !== 200 && status !== 206) {
    throw new Error(`Target download returned unexpected status ${status} for ${entry.key}`);
  }
  const stream = download?.stream || download?.body;
  if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
    throw new Error(`Target download did not return a stream for ${entry.key}`);
  }
  const downloadHeaders = responseHeaders(download);
  const downloadedContentType = downloadHeaders['content-type'] || headers['content-type'];
  if (comparableContentType(downloadedContentType) !== comparableContentType(entry.contentType)) {
    stream.destroy?.();
    throw new Error(
      `Target Content-Type mismatch for ${entry.key}: expected ${entry.contentType}, received ${downloadedContentType || 'missing'}`,
    );
  }
  const hash = createHash('sha256');
  let downloadedSize = 0;
  try {
    for await (const value of stream) {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      downloadedSize += chunk.byteLength;
      if (downloadedSize > entry.size) throw new Error(`Target download exceeds manifest size for ${entry.key}`);
      hash.update(chunk);
    }
  } catch (error) {
    stream.destroy?.(error instanceof Error ? error : undefined);
    throw error;
  }
  if (downloadedSize !== entry.size) {
    throw new Error(`Target download size mismatch for ${entry.key}: expected ${entry.size}, received ${downloadedSize}`);
  }
  if (hash.digest('hex') !== entry.sha256) throw new Error(`Target SHA-256 mismatch for ${entry.key}`);
}

export async function importTargetBundle({ bundleDir, client, concurrency = 4, logger = console }) {
  validatePositiveInteger(concurrency, 'Concurrency');
  const bundle = await loadBundle(bundleDir);
  assertVerificationClient(client);

  await mapLimit(bundle.entries, concurrency, async (entry) => {
    const stream = createVerifiedReadStream(entry.path);
    try {
      await client.put(entry.key, stream, { headers: uploadHeaders(entry), contentLength: entry.size });
    } catch (error) {
      stream.destroy();
      throw new Error(`Target upload failed for ${entry.key}: ${error?.message || error}`, { cause: error });
    }
  });

  await mapLimit(bundle.entries, concurrency, async (entry) => {
    try {
      await verifyTargetObject(client, entry);
    } catch (error) {
      throw new Error(`Target verification failed for ${entry.key}: ${error?.message || error}`, { cause: error });
    }
  });
  const target = await listAllTargetObjects(client);
  const manifestKeys = new Set(bundle.entries.map((entry) => entry.key));
  const targetKeys = new Set(target.objects.map((object) => object.key));
  const missing = [...manifestKeys].filter((key) => !targetKeys.has(key));
  const extra = [...targetKeys].filter((key) => !manifestKeys.has(key));
  if (missing.length || extra.length || target.objects.length !== bundle.entries.length) {
    throw new Error(
      `Target bucket count/key mismatch: manifest ${bundle.entries.length}, target ${target.objects.length}, `
      + `missing ${missing.length}, extra ${extra.length}`,
    );
  }
  const result = {
    manifestCount: bundle.entries.length,
    uploadedCount: bundle.entries.length,
    verifiedCount: bundle.entries.length,
    targetPageCount: target.pageCount,
    targetObjectCount: target.objects.length,
    totalBytes: bundle.summary.totalBytes,
  };
  logger?.info?.(
    `Import complete: manifestCount=${result.manifestCount}, uploadedCount=${result.uploadedCount}, `
    + `verifiedCount=${result.verifiedCount}, targetObjectCount=${result.targetObjectCount}, `
    + `targetPageCount=${result.targetPageCount}, totalBytes=${result.totalBytes}`,
  );
  return result;
}

export function validateInternalEndpoint(endpoint) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('OSS internal endpoint must be a valid HTTPS Alibaba internal endpoint');
  }
  const validHostname = /^oss-[a-z0-9-]+-internal\.aliyuncs\.com$/u.test(url.hostname);
  if (
    url.protocol !== 'https:'
    || !validHostname
    || url.username
    || url.password
    || (url.pathname && url.pathname !== '/')
    || url.search
    || url.hash
  ) {
    throw new Error('OSS internal endpoint must use HTTPS and an oss-*-internal.aliyuncs.com hostname');
  }
  return url.origin;
}
