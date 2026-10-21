import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { TUYAN_SKILL_FILES } from '../apps/web/scripts/publish-agent-skills.mjs';

const root = resolve(process.argv[2] || 'apps/web/dist', '.well-known/skills');
const index = JSON.parse(await readFile(join(root, 'index.json'), 'utf8'));
const skill = index.skills?.find(item => item.name === 'tuyan-scientific-figure');
if (!skill || JSON.stringify(skill.files) !== JSON.stringify(TUYAN_SKILL_FILES)) throw new Error('SKILL_DISTRIBUTION_INVALID: incomplete file list');
for (const path of TUYAN_SKILL_FILES) {
  const bytes = await readFile(join(root, skill.name, path));
  if (createHash('sha256').update(bytes).digest('hex') !== skill.fileHashes[path]) throw new Error(`SKILL_DISTRIBUTION_INVALID: hash mismatch ${path}`);
}
const snapshot = JSON.parse(await readFile(join(root, skill.name, 'references/offline-snapshot.v1.json'), 'utf8'));
if (snapshot.manifest.knowledgeVersion !== skill.knowledgeVersion || snapshot.manifest.knowledgeHash !== skill.knowledgeHash) throw new Error('SKILL_DISTRIBUTION_INVALID: knowledge mismatch');
console.log(`Verified ${skill.files.length} Skill files, knowledge ${skill.knowledgeVersion} (${skill.knowledgeHash}).`);
