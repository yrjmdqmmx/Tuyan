#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

function fail(code) {
  console.error(`BENCHMARK_ADMIN_RESULT_${code}`);
  process.exit(1);
}

const [rawPath, resultPath, operation] = process.argv.slice(2);
if (!rawPath || !resultPath || !/^(candidates|approve_quick|control_quick|attest)$/.test(operation || '')) fail('INVALID_ARGUMENTS');

let raw;
try { raw = readFileSync(rawPath); } catch { fail('READ_FAILED'); }
if (raw.length < 2) fail('EMPTY');
if (raw.length > 1024 * 1024) fail('TOO_LARGE');

const parsed = new Map();
function consider(text) {
  if (!text) return;
  try {
    const value = JSON.parse(text);
    if (value && typeof value === 'object' && !Array.isArray(value)) parsed.set(JSON.stringify(value), value);
  } catch {}
}

const stream = raw.toString('utf8');
consider(stream.trim());
for (const line of stream.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  consider(trimmed);
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) consider(trimmed.slice(firstBrace, lastBrace + 1));
}

const matches = [...parsed.values()].filter(value => value.schemaVersion === 1
  && value.operation === operation && value.workerEnabled === false
  && value.data && typeof value.data === 'object' && !Array.isArray(value.data));
if (matches.length === 0) fail('NO_ENVELOPE');
if (matches.length !== 1) fail('AMBIGUOUS');

const forbidden = /secret|token|credential|password|access.?key|private.?key/i;
function validate(entry) {
  if (Array.isArray(entry)) { for (const item of entry) validate(item); return; }
  if (!entry || typeof entry !== 'object') return;
  for (const [key, value] of Object.entries(entry)) {
    if (forbidden.test(key)) fail('FORBIDDEN_KEY');
    validate(value);
  }
}
validate(matches[0]);

try { writeFileSync(resultPath, `${JSON.stringify(matches[0])}\n`, { mode: 0o600, flag: 'wx' }); }
catch { fail('WRITE_FAILED'); }
