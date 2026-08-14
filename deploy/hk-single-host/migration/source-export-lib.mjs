import { createHash } from 'node:crypto';
import { lstat, mkdir, open, rename, rm, writeFile } from 'node:fs/promises';
import { request as httpsRequest } from 'node:https';
import { dirname, resolve } from 'node:path';

import {
  EXPORT_FORMAT,
  keyToRelativePath,
  mapLimit,
  normalizeHeaders,
  selectSettableMetadata,
  validateObjectKey,
  validatePositiveInteger,
} from './common.mjs';

const DEFAULT_MAX_OBJECT_BYTES = 5 * 1024 * 1024 * 1024;
const DEFAULT_SIGNED_URL_EXPIRES_SECONDS = 900;

export function rawSignedGet(value, { requestImpl = httpsRequest } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return Promise.reject(new Error('Source bucket returned an invalid signed download URL'));
  }
  if (url.protocol !== 'https:') {
    return Promise.reject(new Error('Source signed downloads must use HTTPS'));
  }
  return new Promise((resolvePromise, rejectPromise) => {
    const request = requestImpl(url, {
      method: 'GET',
      headers: { 'Accept-Encoding': 'identity' },
    }, (response) => {
      const status = response.statusCode;
      resolvePromise({
        ok: Number.isInteger(status) && status >= 200 && status < 300,
        status,
        headers: response.headers,
        body: response,
      });
    });
    request.once('error', (error) => {
      const code = typeof error?.code === 'string' ? ` (${error.code})` : '';
      rejectPromise(new Error(`Source signed download request failed${code}`));
    });
    request.end();
  });
}

function firstDefined(object, names) {
  for (const name of names) {
    if (object?.[name] !== undefined) return object[name];
  }
  return undefined;
}

function pageObjects(page) {
  const contents = firstDefined(page, ['Contents', 'contents', 'objects']);
  if (!Array.isArray(contents)) throw new Error('Source object listing is missing an object array');
  return contents;
}

function isTruncated(page) {
  const value = firstDefined(page, ['IsTruncated', 'isTruncated']);
  if (typeof value !== 'boolean') throw new Error('Source object listing is missing an explicit truncation flag');
  return value;
}

function normalizeListedObject(object) {
  const key = validateObjectKey(firstDefined(object, ['Key', 'key', 'name']));
  const rawSize = firstDefined(object, ['Size', 'size']);
  const size = rawSize === undefined ? undefined : Number(rawSize);
  if (size !== undefined && (!Number.isSafeInteger(size) || size < 0)) {
    throw new Error(`Source object ${key} has an invalid listed size`);
  }
  return {
    key,
    size,
    etag: String(firstDefined(object, ['ETag', 'etag']) ?? ''),
    lastModified: String(firstDefined(object, ['LastModified', 'lastModified']) ?? ''),
  };
}

export async function listAllSourceObjects(bucket, { initialMarker } = {}) {
  if (!bucket || typeof bucket.listFiles !== 'function') {
    throw new Error('Source bucket does not provide the listFiles interface');
  }
  let marker = initialMarker;
  let pageCount = 0;
  const objects = [];
  const keys = new Set();
  const usedMarkers = new Set();
  if (marker !== undefined) usedMarkers.add(marker);

  do {
    const page = await bucket.listFiles({ Marker: marker });
    pageCount += 1;
    const listed = pageObjects(page).map(normalizeListedObject);
    for (const object of listed) {
      if (keys.has(object.key)) throw new Error(`Duplicate source object key: ${object.key}`);
      keys.add(object.key);
      objects.push(object);
    }
    if (!isTruncated(page)) break;

    const lastKey = listed.at(-1)?.key;
    const nextMarker = firstDefined(page, ['NextMarker', 'nextMarker']) || lastKey;
    if (typeof nextMarker !== 'string' || !nextMarker || nextMarker === marker || usedMarkers.has(nextMarker)) {
      throw new Error('Source object pagination did not advance');
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

function validateOpenDownload(result, key, metadataSource, maxObjectBytes) {
  const stream = result?.stream || result?.body;
  if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
    throw new Error(`Source download interface did not return a stream for ${key}`);
  }
  const status = responseStatus(result);
  if (status !== undefined && status !== 200 && status !== 206) {
    throw new Error(`Source download returned unexpected status ${status} for ${key}`);
  }
  const headers = responseHeaders(result);
  if (!Object.keys(headers).length) throw new Error(`Source download is missing metadata headers for ${key}`);
  const contentLength = Number(headers['content-length']);
  if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
    throw new Error(`Source metadata headers have no valid Content-Length for ${key}`);
  }
  if (!headers['content-type']?.trim()) throw new Error(`Source metadata headers have no Content-Type for ${key}`);
  if (contentLength > maxObjectBytes) throw new Error(`Source object ${key} exceeds the ${maxObjectBytes} byte limit`);
  return { stream, headers, metadataSource, advertisedSize: contentLength };
}

export async function openSourceObject(bucket, key, {
  fetchImpl = rawSignedGet,
  maxObjectBytes = DEFAULT_MAX_OBJECT_BYTES,
  signedUrlExpiresSeconds = DEFAULT_SIGNED_URL_EXPIRES_SECONDS,
} = {}) {
  validateObjectKey(key);
  validatePositiveInteger(maxObjectBytes, 'Maximum object bytes');
  validatePositiveInteger(signedUrlExpiresSeconds, 'Signed URL expiry');

  for (const name of ['getFileStream', 'readFileStream']) {
    if (typeof bucket?.[name] === 'function') {
      const result = await bucket[name](key);
      return validateOpenDownload(result, key, 'direct-stream', maxObjectBytes);
    }
  }

  if (typeof bucket?.getDownloadUrl !== 'function' || typeof fetchImpl !== 'function') {
    throw new Error(`Source bucket has no supported bounded stream or signed download interface for ${key}`);
  }
  const signed = await bucket.getDownloadUrl(key, signedUrlExpiresSeconds);
  const url = typeof signed === 'string'
    ? signed
    : signed?.url || signed?.downloadUrl || signed?.signedUrl;
  if (typeof url !== 'string' || !url) throw new Error(`Source bucket returned no signed download URL for ${key}`);
  const response = await fetchImpl(url, { method: 'GET', redirect: 'error' });
  if (!response?.ok) {
    response?.body?.destroy?.();
    throw new Error(`Source signed download returned unexpected status ${response?.status} for ${key}`);
  }
  return validateOpenDownload(response, key, 'signed-get', maxObjectBytes);
}

async function streamObjectToFile(stream, path, { key, expectedSize, maxObjectBytes }) {
  const handle = await open(path, 'wx', 0o600);
  const hash = createHash('sha256');
  let size = 0;
  try {
    for await (const value of stream) {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      size += chunk.byteLength;
      if (size > maxObjectBytes) throw new Error(`Source object ${key} exceeds the ${maxObjectBytes} byte limit`);
      hash.update(chunk);
      await handle.write(chunk);
    }
    if (size !== expectedSize) {
      throw new Error(`Source object ${key} size mismatch: expected ${expectedSize}, received ${size}`);
    }
  } catch (error) {
    stream.destroy?.(error instanceof Error ? error : undefined);
    throw error;
  } finally {
    await handle.close();
  }
  return { size, sha256: hash.digest('hex') };
}

function manifestEntry(listed, download, file, digest) {
  const contentType = download.headers['content-type']?.trim();
  if (!contentType) throw new Error(`Source object ${listed.key} has no Content-Type metadata`);
  return {
    key: listed.key,
    file,
    size: digest.size,
    sha256: digest.sha256,
    contentType,
    settableMetadata: selectSettableMetadata(download.headers),
    etag: download.headers.etag || listed.etag,
    lastModified: download.headers['last-modified'] || listed.lastModified,
    metadataSource: download.metadataSource,
  };
}

export async function exportSourceBucket({
  bucket,
  outputDir,
  fetchImpl = rawSignedGet,
  concurrency = 4,
  maxObjectBytes = DEFAULT_MAX_OBJECT_BYTES,
  signedUrlExpiresSeconds = DEFAULT_SIGNED_URL_EXPIRES_SECONDS,
  logger = console,
}) {
  if (typeof outputDir !== 'string' || !outputDir.trim()) throw new Error('Output directory is required');
  validatePositiveInteger(concurrency, 'Concurrency');
  validatePositiveInteger(maxObjectBytes, 'Maximum object bytes');
  const finalDir = resolve(outputDir);
  const partialDir = `${finalDir}.partial-${process.pid}-${Date.now()}`;
  await mkdir(dirname(finalDir), { recursive: true });
  try {
    await lstat(finalDir);
    throw new Error(`Output directory already exists: ${finalDir}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  try {
    await mkdir(partialDir, { recursive: false, mode: 0o700 });
    const listing = await listAllSourceObjects(bucket);
    const entries = await mapLimit(listing.objects, concurrency, async (listed) => {
      const file = keyToRelativePath(listed.key);
      const path = resolve(partialDir, file);
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      const download = await openSourceObject(bucket, listed.key, {
        fetchImpl,
        maxObjectBytes,
        signedUrlExpiresSeconds,
      });
      if (listed.size !== undefined && listed.size !== download.advertisedSize) {
        throw new Error(
          `Source object ${listed.key} metadata size mismatch: listed ${listed.size}, download ${download.advertisedSize}`,
        );
      }
      const digest = await streamObjectToFile(download.stream, path, {
        key: listed.key,
        expectedSize: download.advertisedSize,
        maxObjectBytes,
      });
      return manifestEntry(listed, download, file, digest);
    });
    const manifest = entries.map((entry) => JSON.stringify(entry)).join('\n') + (entries.length ? '\n' : '');
    const totalBytes = entries.reduce((total, entry) => total + entry.size, 0);
    const summary = {
      format: EXPORT_FORMAT,
      objectCount: entries.length,
      pageCount: listing.pageCount,
      totalBytes,
      manifestSha256: createHash('sha256').update(manifest).digest('hex'),
    };
    await writeFile(resolve(partialDir, 'manifest.jsonl'), manifest, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await writeFile(
      resolve(partialDir, 'export-summary.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
      { encoding: 'utf8', mode: 0o600, flag: 'wx' },
    );
    await rename(partialDir, finalDir);
    logger?.info?.(`Export complete: ${summary.objectCount} objects, ${summary.pageCount} pages, ${summary.totalBytes} bytes`);
    return summary;
  } catch (error) {
    await rm(partialDir, { recursive: true, force: true });
    throw error;
  }
}
