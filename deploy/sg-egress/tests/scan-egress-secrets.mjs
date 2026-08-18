#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const [root] = process.argv.slice(2);
if (!root) {
  process.stderr.write('usage: scan-egress-secrets.mjs <deploy-root>\n');
  process.exit(2);
}

const findings = [];

function isExactKnownFixture(path, kind, value) {
  const file = relative(root, path);
  if ((file === 'tests/squid-policy-validator.mjs' || file === 'tests/scan-egress-secrets.mjs') && kind === 'non-reserved public IPv6' &&
      new Set(['a::Fac', '1000::', '2000::', '4000::', '8000::', 'c000::', 'e000::']).has(value)) {
    return true;
  }
  if (file === 'tests/behavior.test.mjs' || file === 'tests/scan-egress-secrets.mjs') {
    return new Set([
      '8.8.8.8', '192.0.1.1', '192.2.1.1', '198.51.42.7', '203.0.5.7',
      '2001:4860:4860::8888', '2001:4860::10', '::ffff:8.8.8.8', '::ffff:0808:0808',
    ]).has(value);
  }
  return false;
}

function addFinding(path, kind, value = '') {
  if (!isExactKnownFixture(path, kind, value)) findings.push(`${relative(root, path)}: ${kind}${value ? ` ${value}` : ''}`);
}

function isReservedIPv4(value) {
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && ((b === 0 && (c === 0 || c === 2)) || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113) ||
    a === 255;
}

function ipv6ToBigInt(value) {
  const normalized = value.replace(/^\[|\]$/g, '').toLowerCase();
  if (!/^[0-9a-f:.]+$/.test(normalized)) return null;
  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  const expand = (half) => (half ? half.split(':') : []);
  const left = expand(halves[0]);
  const right = halves.length === 2 ? expand(halves[1]) : [];
  const dottedParts = [...left, ...right].filter((part) => part.includes('.'));
  if (dottedParts.length > 1) return null;
  if (dottedParts.length === 1) {
    const dotted = dottedParts[0];
    const tail = halves.length === 2 ? right : left;
    if (tail.at(-1) !== dotted) return null;
    const ipv4 = ipv4ToNumber(dotted);
    if (ipv4 === null) return null;
    tail.splice(-1, 1, (ipv4 >>> 16).toString(16), (ipv4 & 0xffff).toString(16));
  }
  if (left.some((part) => part.includes('.')) || right.some((part) => part.includes('.'))) return null;
  if (left.length + right.length > 8 || (halves.length === 1 && left.length !== 8)) return null;
  const groups = [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  let result = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    result = (result << 16n) + BigInt(`0x${group}`);
  }
  return result;
}

function ipv4ToNumber(value) {
  const parts = value.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((number, part) => (number << 8) + Number(part), 0) >>> 0;
}

function mappedIPv4(value) {
  const address = ipv6ToBigInt(value);
  if (address === null || (address >> 32n) !== 0xffffn) return null;
  const mapped = Number(address & 0xffffffffn);
  return [mapped >>> 24, (mapped >>> 16) & 0xff, (mapped >>> 8) & 0xff, mapped & 0xff].join('.');
}

function ipv6InCidr(value, cidr) {
  const [network, prefixText] = cidr.split('/');
  const address = ipv6ToBigInt(value);
  const networkAddress = ipv6ToBigInt(network);
  const prefix = Number(prefixText);
  if (address === null || networkAddress === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 128) return false;
  const mask = prefix === 0 ? 0n : ((1n << BigInt(prefix)) - 1n) << BigInt(128 - prefix);
  return (address & mask) === (networkAddress & mask);
}

function isReservedIPv6(value) {
  const mapped = mappedIPv4(value);
  if (mapped !== null) return isReservedIPv4(mapped);
  return [
    '::/128',
    '::1/128',
    '::/96',
    '64:ff9b::/96',
    '100::/64',
    '2001:db8::/32',
    'fc00::/7',
    'fe80::/10',
    'ff00::/8',
  ].some((cidr) => ipv6InCidr(value, cidr));
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
    if (pattern.test(text)) addFinding(path, kind);
  }
  for (const match of text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
    if (!isReservedIPv4(match[0])) addFinding(path, 'non-reserved public IPv4', match[0]);
  }
  for (const match of text.matchAll(/(?:[0-9A-Fa-f]{0,4}:){2,}[0-9A-Fa-f:.]*/g)) {
    const candidate = match[0];
    if (ipv6ToBigInt(candidate) !== null && !isReservedIPv6(candidate)) {
      addFinding(path, 'non-reserved public IPv6', candidate);
    }
  }
}

function walk(path) {
  const info = statSync(path);
  if (info.isDirectory()) {
    for (const entry of readdirSync(path)) {
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
