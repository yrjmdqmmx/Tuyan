import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const distribution = JSON.parse(await readFile(resolve(root, 'distribution.json'), 'utf8'));
if (process.env.CI && (distribution.sourceDirty || !/^[a-f0-9]{40}$/.test(distribution.sourceRevision || ''))) throw new Error('Distribution must come from a committed canonical revision');
for (const [path, expected] of Object.entries(distribution.files)) {
  if (path.startsWith('/') || path.split('/').includes('..')) throw new Error('Invalid distribution path');
  const bytes = await readFile(resolve(root, path));
  if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error(`Distribution drift: ${path}`);
}
console.log(`Verified ${Object.keys(distribution.files).length} files, knowledge ${distribution.knowledgeVersion}.`);
