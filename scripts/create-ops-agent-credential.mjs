#!/usr/bin/env node
// Offline only. Generates NEW service credentials; never reads existing secrets.
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

const [directory, id = 'grokbot'] = process.argv.slice(2);
if (!directory || !isAbsolute(directory) || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
  console.error('Usage: node scripts/create-ops-agent-credential.mjs /absolute/NEW/private-directory [agent-id]');
  process.exit(1);
}
try {
  // Refuse existing directories so credentials can never be overwritten by a retry.
  await mkdir(directory, { mode: 0o700 });
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 90 * 86_400_000).toISOString();
  await writeFile(join(directory, 'agent-secret.json'), JSON.stringify({ id, token, expiresAt }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  await writeFile(join(directory, 'gateway-token-record.json'), JSON.stringify([{ id,
    sha256: createHash('sha256').update(token).digest('hex'),
    scopes: ['overview:read', 'failures:read', 'health:read'], expiresAt,
  }]) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(`Created private credential files in ${directory}; secret values were not printed.`);
} catch {
  console.error('Credential files were not completed. Check the private directory and permissions; existing files were not overwritten.');
  process.exit(1);
}
