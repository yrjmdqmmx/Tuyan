import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

let publisher = {};
try {
  publisher = await import('../scripts/publish-agent-skills.mjs');
} catch {
  // RED starts before the build publisher exists.
}

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const sourceRoot = join(repositoryRoot, 'skills', 'tuyan-scientific-figure');

test('publishes one canonical skill source as a complete well-known bundle', async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), 'tuyan-skill-publish-'));
  const result = await publisher.publishTuyanSkill?.({ sourceRoot, outputRoot });
  assert.ok(result, 'publisher must return its manifest');

  const index = JSON.parse(await readFile(join(outputRoot, '.well-known', 'skills', 'index.json'), 'utf8'));
  assert.equal(index.version, 1);
  assert.equal(index.skills.length, 1);
  const [skill] = index.skills;
  assert.equal(skill.name, 'tuyan-scientific-figure');
  assert.deepEqual(skill.files, [
    'SKILL.md',
    'references/client-installation.md',
    'references/offline-snapshot.v1.json',
    'references/paperbanana-bench.md',
    'scripts/finalize-output-bundle.mjs',
    'scripts/retrieve-paperbanana-bench.mjs',
    'scripts/verify-paperbanana-bench.mjs',
  ]);

  for (const path of skill.files) {
    assert.equal(
      await readFile(join(outputRoot, '.well-known', 'skills', skill.name, path), 'utf8'),
      await readFile(join(sourceRoot, path), 'utf8'),
      `${path} must be copied byte-for-byte from the canonical source`,
    );
  }
});

test('published index description matches SKILL.md frontmatter', async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), 'tuyan-skill-publish-'));
  const result = await publisher.publishTuyanSkill?.({ sourceRoot, outputRoot });
  const source = await readFile(join(sourceRoot, 'SKILL.md'), 'utf8');
  const description = /^description: (.+)$/m.exec(source)?.[1];
  assert.equal(result?.skills[0].description, description);
});
