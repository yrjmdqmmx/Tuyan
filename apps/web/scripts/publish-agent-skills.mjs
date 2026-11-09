import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

export const TUYAN_SKILL_FILES = Object.freeze([
  'SKILL.md',
  'references/client-installation.md',
  'references/offline-snapshot.v1.json',
  'references/paperbanana-bench.md',
  'references/journal-rules.md',
  'references/runtime-licenses.txt',
  'scripts/finalize-output-bundle.mjs',
  'scripts/retrieve-paperbanana-bench.mjs',
  'scripts/verify-paperbanana-bench.mjs',
  'scripts/knowledge-runtime.mjs',
  'scripts/prepare-knowledge.mjs',
]);

function descriptionFromSkill(text) {
  const match = /^---\n[\s\S]*?^description: (.+)$[\s\S]*?^---$/m.exec(text);
  if (!match) throw new Error('Published skill needs a one-line frontmatter description');
  return match[1].trim();
}

export async function publishTuyanSkill({ sourceRoot, outputRoot }) {
  const skillName = 'tuyan-scientific-figure';
  const destinationRoot = join(resolve(outputRoot), '.well-known', 'skills');
  const skillDestination = join(destinationRoot, skillName);
  const skillSource = await readFile(join(resolve(sourceRoot), 'SKILL.md'), 'utf8');
  const snapshot = JSON.parse(await readFile(join(resolve(sourceRoot), 'references/offline-snapshot.v1.json'), 'utf8'));
  const fileHashes = {};

  for (const path of TUYAN_SKILL_FILES) {
    const destination = join(skillDestination, path);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(resolve(sourceRoot), path), destination);
    fileHashes[path] = createHash('sha256').update(await readFile(destination)).digest('hex');
  }

  const manifest = {
    version: 1,
    skills: [{
      name: skillName,
      description: descriptionFromSkill(skillSource),
      files: [...TUYAN_SKILL_FILES],
      knowledgeVersion: snapshot.manifest.knowledgeVersion,
      knowledgeHash: snapshot.manifest.knowledgeHash,
      taxonomyVersion: snapshot.manifest.taxonomyVersion,
      journalVersion: snapshot.manifest.journalVersion,
      fileHashes,
    }],
  };
  await mkdir(destinationRoot, { recursive: true });
  await writeFile(join(destinationRoot, 'index.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const repositoryRoot = resolve(webRoot, '../..');
  publishTuyanSkill({
    sourceRoot: join(repositoryRoot, 'skills', 'tuyan-scientific-figure'),
    outputRoot: join(webRoot, 'dist'),
  }).catch((error) => {
    console.error(String(error?.message || error));
    process.exitCode = 1;
  });
}
