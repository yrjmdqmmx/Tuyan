import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { OPS_KINDS } from '../../../packages/api/src/ops-read-contract.mjs';

export function loadOpsConfig(env = process.env) {
  if (env.TUYAN_OPS_AGENT_ENABLED !== 'true') return { enabled: false };
  const invalid = () => { throw new Error('Invalid TUYAN_OPS_AGENT configuration; see docs/operations/agent-read-access.md'); };
  let tokens;
  try { tokens = JSON.parse(env.TUYAN_OPS_AGENT_TOKENS || ''); } catch { invalid(); }
  if (!Array.isArray(tokens) || tokens.length < 1 || tokens.length > 8) invalid();
  const otherSecrets = ['PAPERBANANA_GATEWAY_TOKEN', 'ADMIN_TOKEN', 'PAPERBANANA_ADMIN_TOKEN', 'PAPERBANANA_ADMIN_TRANSPORT_TOKEN',
    'PAPERBANANA_BENCH_DISCOVERY_TOKEN', 'BETTER_AUTH_SECRET', 'PAPERBANANA_GUEST_COOKIE_SECRET'].map(key => String(env[key] || '').trim()).filter(Boolean);
  const protectedSecrets = [...otherSecrets, String(env.PAPERBANANA_OPERATIONS_TOKEN || '').trim()].filter(Boolean);
  const protectedHashes = protectedSecrets.map(secret => createHash('sha256').update(secret).digest('hex'));
  const ids = new Set(), hashes = new Set();
  for (const token of tokens) {
    if (!token || Object.keys(token).some(key => !['id', 'sha256', 'scopes', 'expiresAt'].includes(key))
      || typeof token.id !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(token.id)
      || typeof token.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(token.sha256)
      || ids.has(token.id) || hashes.has(token.sha256) || protectedHashes.includes(token.sha256)
      || !Array.isArray(token.scopes) || !token.scopes.length || token.scopes.length > 3
      || token.scopes.some(scope => !OPS_KINDS.map(kind => `${kind}:read`).includes(scope))
      || typeof token.expiresAt !== 'string' || !Number.isFinite(Date.parse(token.expiresAt))) invalid();
    ids.add(token.id); hashes.add(token.sha256);
  }
  const internalToken = String(env.PAPERBANANA_OPERATIONS_TOKEN || '').trim();
  if (internalToken.length < 32 || otherSecrets.includes(internalToken)) invalid();
  const hostSnapshotFile = String(env.TUYAN_OPS_HOST_SNAPSHOT_FILE || '');
  if (hostSnapshotFile && !isAbsolute(hostSnapshotFile)) invalid();
  return { enabled: true, tokens, internalToken, hostSnapshotFile };
}
