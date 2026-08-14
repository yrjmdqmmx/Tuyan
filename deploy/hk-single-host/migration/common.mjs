import { createHash } from 'node:crypto';
import { constants as fsConstants, createReadStream } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

export const EXPORT_FORMAT = 'paperbanana-object-export-v1';

const MAX_OBJECT_KEY_BYTES = 1023;
const BASE64URL_COMPONENT_LENGTH = 180;
const CANONICAL_METADATA_NAMES = new Map([
  ['cache-control', 'Cache-Control'],
  ['content-disposition', 'Content-Disposition'],
  ['content-encoding', 'Content-Encoding'],
  ['expires', 'Expires'],
]);

function assertHeaderValue(value, label) {
  if (typeof value !== 'string' || /[\r\n\0]/u.test(value)) {
    throw new Error(`${label} must be a safe string`);
  }
  return value;
}

export function validateObjectKey(key) {
  if (typeof key !== 'string' || key.length === 0) throw new Error('Object key must be a non-empty string');
  const encoded = Buffer.from(key, 'utf8');
  if (encoded.byteLength > MAX_OBJECT_KEY_BYTES || encoded.toString('utf8') !== key) {
    throw new Error(`Object key is not valid UTF-8 or exceeds ${MAX_OBJECT_KEY_BYTES} bytes`);
  }
  if (key.startsWith('/') || key.includes('\\') || /[\0-\x1f\x7f]/u.test(key)) {
    throw new Error('Object key contains an absolute path, separator, or control character');
  }
  if (key.split('/').some((part) => part === '.' || part === '..')) {
    throw new Error('Object key contains a path traversal segment');
  }
  return key;
}

export function keyToRelativePath(key) {
  const encoded = Buffer.from(validateObjectKey(key), 'utf8').toString('base64url');
  const components = [];
  for (let offset = 0; offset < encoded.length; offset += BASE64URL_COMPONENT_LENGTH) {
    components.push(encoded.slice(offset, offset + BASE64URL_COMPONENT_LENGTH));
  }
  const filename = `${components.pop()}.object`;
  return ['objects', ...components, filename].join('/');
}

export function normalizeHeaders(headers) {
  const normalized = {};
  if (!headers) return normalized;
  if (typeof headers.entries === 'function') {
    for (const [name, value] of headers.entries()) normalized[String(name).toLowerCase()] = String(value);
    return normalized;
  }
  for (const [name, rawValue] of Object.entries(headers)) {
    if (rawValue === undefined || rawValue === null) continue;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    normalized[name.toLowerCase()] = String(value);
  }
  return normalized;
}

export function selectSettableMetadata(headers) {
  const selected = {};
  for (const [lowerName, value] of Object.entries(normalizeHeaders(headers))) {
    const canonicalName = CANONICAL_METADATA_NAMES.get(lowerName);
    if (canonicalName) {
      selected[canonicalName] = assertHeaderValue(value, canonicalName);
    } else if (/^x-oss-meta-[a-z0-9][a-z0-9-]*$/u.test(lowerName)) {
      selected[lowerName] = assertHeaderValue(value, lowerName);
    }
  }
  return selected;
}

export function validateSettableMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Manifest settableMetadata must be an object');
  }
  const validated = {};
  for (const [name, value] of Object.entries(metadata)) {
    const lowerName = name.toLowerCase();
    const canonicalName = CANONICAL_METADATA_NAMES.get(lowerName);
    if (canonicalName) {
      if (name !== canonicalName) throw new Error(`Manifest metadata name must be canonical: ${canonicalName}`);
      validated[canonicalName] = assertHeaderValue(value, canonicalName);
      continue;
    }
    if (!/^x-oss-meta-[a-z0-9][a-z0-9-]*$/u.test(name)) {
      throw new Error(`Manifest metadata header is not settable: ${name}`);
    }
    validated[name] = assertHeaderValue(value, name);
  }
  return validated;
}

export function validateManifestEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Manifest entry must be an object');
  const key = validateObjectKey(entry.key);
  const expectedFile = keyToRelativePath(key);
  if (entry.file !== expectedFile) throw new Error(`Manifest file does not match object key: ${key}`);
  if (!Number.isSafeInteger(entry.size) || entry.size < 0) throw new Error(`Manifest size is invalid for ${key}`);
  if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(entry.sha256)) {
    throw new Error(`Manifest SHA-256 is invalid for ${key}`);
  }
  const contentType = assertHeaderValue(entry.contentType, `Content-Type for ${key}`).trim();
  if (!contentType) throw new Error(`Manifest Content-Type is missing for ${key}`);
  if (typeof entry.etag !== 'string' || typeof entry.lastModified !== 'string') {
    throw new Error(`Manifest ETag or Last-Modified is invalid for ${key}`);
  }
  if (typeof entry.metadataSource !== 'string' || !entry.metadataSource.trim()) {
    throw new Error(`Manifest metadataSource is missing for ${key}`);
  }
  return {
    key,
    file: expectedFile,
    size: entry.size,
    sha256: entry.sha256,
    contentType,
    settableMetadata: validateSettableMetadata(entry.settableMetadata),
    etag: entry.etag,
    lastModified: entry.lastModified,
    metadataSource: entry.metadataSource,
  };
}

export function uploadHeaders(entry) {
  const validated = validateManifestEntry(entry);
  return { 'Content-Type': validated.contentType, ...validated.settableMetadata };
}

export function validatePositiveInteger(value, label, { allowZero = false } = {}) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`${label} must be ${allowZero ? 'a non-negative' : 'a positive'} safe integer`);
  }
  return value;
}

export async function mapLimit(values, concurrency, worker) {
  validatePositiveInteger(concurrency, 'Concurrency');
  const results = new Array(values.length);
  let cursor = 0;
  let failure;
  async function run() {
    while (!failure) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      try {
        results[index] = await worker(values[index], index);
      } catch (error) {
        failure = error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(values.length, 1)) }, run));
  if (failure) throw failure;
  return results;
}

export async function sha256File(path, expectedSize) {
  const handle = await open(path, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
  const hash = createHash('sha256');
  let size = 0;
  try {
    const stream = handle.createReadStream({ autoClose: false });
    for await (const value of stream) {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      size += chunk.byteLength;
      if (expectedSize !== undefined && size > expectedSize) throw new Error(`File size exceeds manifest size: ${path}`);
      hash.update(chunk);
    }
  } finally {
    await handle.close();
  }
  return { size, sha256: hash.digest('hex') };
}

export async function assertSafeRegularFile(bundleRoot, relativeFile) {
  if (typeof relativeFile !== 'string' || relativeFile.startsWith('/') || relativeFile.includes('\\')) {
    throw new Error(`Manifest file path is invalid: ${relativeFile}`);
  }
  const segments = relativeFile.split('/');
  if (segments.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Manifest file path contains traversal: ${relativeFile}`);
  }
  const canonicalRoot = await realpath(bundleRoot);
  let current = canonicalRoot;
  for (const segment of segments) {
    current = resolve(current, segment);
    if (current !== canonicalRoot && !current.startsWith(`${canonicalRoot}${sep}`)) {
      throw new Error(`Manifest file escapes bundle: ${relativeFile}`);
    }
    const stats = await lstat(current);
    if (stats.isSymbolicLink()) throw new Error(`Manifest file path contains a symbolic link: ${relativeFile}`);
  }
  const stats = await lstat(current);
  if (!stats.isFile()) throw new Error(`Manifest file is not a regular file: ${relativeFile}`);
  return current;
}

export function createVerifiedReadStream(path) {
  return createReadStream(path, { flags: fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0) });
}

export function redactSensitiveText(value, secrets = []) {
  let text = String(value?.message || value || 'Unknown error');
  text = text.replace(/https?:\/\/[^\s"'<>]+/giu, '[redacted-url]');
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret) text = text.split(secret).join('[redacted-secret]');
  }
  return text;
}
