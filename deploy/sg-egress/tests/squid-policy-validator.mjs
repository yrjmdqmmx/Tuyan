#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function parseConfig(text) {
  const acls = new Map();
  const accessRules = [];
  for (const original of text.split('\n')) {
    const line = original.trim();
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    if (fields[0] === 'acl' && fields.length >= 4) {
      const definition = { type: fields[2], values: fields.slice(3) };
      const existing = acls.get(fields[1]) ?? [];
      existing.push(definition);
      acls.set(fields[1], existing);
    }
    if (fields[0] === 'http_access' && fields.length >= 3) {
      accessRules.push({ action: fields[1], names: fields.slice(2) });
    }
  }
  if (accessRules.length === 0) die('no http_access policy found');
  return { acls, accessRules };
}

function parseAuthority(authority) {
  if (typeof authority !== 'string') return null;
  const bracketed = authority.match(/^\[([^\]]+)\]:(\d+)$/);
  if (bracketed) return { host: bracketed[1].toLowerCase(), port: Number(bracketed[2]), bracketed: true };
  const plain = authority.match(/^([^:]+):(\d+)$/);
  if (!plain) return null;
  return { host: plain[1].toLowerCase(), port: Number(plain[2]), bracketed: false };
}

function ipv4ToNumber(value) {
  const parts = value.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((number, part) => (number << 8) + Number(part), 0) >>> 0;
}

function ipv6ToBigInt(value) {
  const normalized = value.replace(/^\[|\]$/g, '').toLowerCase();
  if (!/^[0-9a-f:.]+$/.test(normalized)) return null;
  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  const expand = (half) => (half ? half.split(':') : []);
  const left = expand(halves[0]);
  const right = halves.length === 2 ? expand(halves[1]) : [];
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

function cidrContains(address, cidr) {
  const [network, prefixText] = cidr.split('/');
  const prefix = Number(prefixText);
  const addressV4 = ipv4ToNumber(address);
  const networkV4 = ipv4ToNumber(network);
  if (addressV4 !== null || networkV4 !== null) {
    if (addressV4 === null || networkV4 === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (addressV4 & mask) === (networkV4 & mask);
  }
  const addressV6 = ipv6ToBigInt(address);
  const networkV6 = ipv6ToBigInt(network);
  if (addressV6 === null || networkV6 === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 128) return false;
  const mask = prefix === 0 ? 0n : ((1n << BigInt(prefix)) - 1n) << BigInt(128 - prefix);
  return (addressV6 & mask) === (networkV6 & mask);
}

function matchDefinition(definition, request, authority) {
  switch (definition.type) {
    case 'src':
      return definition.values.some((cidr) => cidrContains(request.source, cidr));
    case 'method':
      return definition.values.includes(request.method ?? 'CONNECT');
    case 'port':
      return definition.values.some((value) => Number(value) === authority.port);
    case 'dstdomain': {
      const domains = definition.values.filter((value) => value !== '-n');
      // The validator deliberately ignores request.ptr: the generated policy's -n
      // means a PTR name cannot change the CONNECT authority decision.
      return domains.some((domain) => authority.host === domain.toLowerCase());
    }
    case 'url_regex': {
      const values = [...definition.values];
      const insensitive = values[0] === '-i';
      if (insensitive) values.shift();
      const pattern = values.join(' ');
      return new RegExp(pattern, insensitive ? 'i' : '').test(request.authority);
    }
    case 'dst':
      return definition.values.some((cidr) => cidrContains(request.resolved, cidr));
    default:
      die(`unsupported ACL type: ${definition.type}`);
  }
}

function matchesAcl(acls, name, request, authority) {
  if (name === 'all') return true;
  if (name === 'none') return false;
  const definitions = acls.get(name);
  if (!definitions) die(`http_access references unknown ACL: ${name}`);
  return definitions.some((definition) => matchDefinition(definition, request, authority));
}

function evaluate(policy, request) {
  const authority = parseAuthority(request.authority);
  if (!authority || !Number.isInteger(authority.port)) die('invalid CONNECT authority');
  if (typeof request.source !== 'string' || typeof request.resolved !== 'string') die('source and resolved destination are required');
  for (const rule of policy.accessRules) {
    const matches = rule.names.every((rawName) => {
      const negated = rawName.startsWith('!');
      const matched = matchesAcl(policy.acls, negated ? rawName.slice(1) : rawName, request, authority);
      return negated ? !matched : matched;
    });
    if (matches) return rule.action === 'allow' ? 'allow' : 'deny';
  }
  return 'deny';
}

const [, , configPath, requestText] = process.argv;
if (!configPath || !requestText) die('usage: squid-policy-validator.mjs <squid.conf> <request-json>');
let request;
try {
  request = JSON.parse(requestText);
} catch {
  die('request must be JSON');
}
const policy = parseConfig(readFileSync(configPath, 'utf8'));
process.stdout.write(`${evaluate(policy, request)}\n`);
