#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const [root] = process.argv.slice(2);
if (!root) {
  process.stderr.write('usage: scan-egress-secrets.mjs <deploy-root>\n');
  process.exit(2);
}

const findings = [];

function isReservedIPv4(value) {
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 2 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113) ||
    a === 255;
}

function inspectFile(path) {
  const text = readFileSync(path, 'utf8');
  const patterns = [
    ['PEM private key', /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/],
    ['Alibaba access key', /\bLTAI[A-Za-z0-9]{12,}\b/],
    ['OpenAI secret', /\bsk-[A-Za-z0-9_-]{8,}\b/],
    ['Gemini secret', /\bAIza[A-Za-z0-9_-]{8,}\b/],
    ['Bearer token', /\bBearer\s+[A-Za-z0-9._~-]{8,}\b/i],
    ['WireGuard key-shaped literal', /(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{43}=(?![A-Za-z0-9+/])/],
  ];
  for (const [kind, pattern] of patterns) {
    if (pattern.test(text)) findings.push(`${relative(root, path)}: ${kind}`);
  }
  for (const match of text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
    if (!isReservedIPv4(match[0])) findings.push(`${relative(root, path)}: non-reserved public IPv4 ${match[0]}`);
  }
}

function walk(path) {
  const info = statSync(path);
  if (info.isDirectory()) {
    for (const entry of readdirSync(path)) {
      // Tests intentionally contain non-secret fixtures that exercise this scanner.
      // Every deployable script, systemd unit, document and config generator remains in scope.
      if (entry === 'tests') continue;
      walk(join(path, entry));
    }
    return;
  }
  if (info.isFile()) inspectFile(path);
}

walk(root);

if (findings.length > 0) {
  process.stderr.write(`${findings.join('\n')}\n`);
  process.exit(1);
}
