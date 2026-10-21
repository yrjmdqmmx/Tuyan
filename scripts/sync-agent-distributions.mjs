import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { TUYAN_MANIFEST } from '../packages/tuyan-knowledge/src/index.js';
import { TUYAN_SKILL_FILES } from '../apps/web/scripts/publish-agent-skills.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [kind, destination, flag] = process.argv.slice(2);
if (!['skill', 'mcp'].includes(kind) || !destination || flag && flag !== '--check') throw new Error('Usage: sync-agent-distributions.mjs skill|mcp <existing-independent-repo> [--check]');
const target = resolve(destination);
if (target === root || target.startsWith(`${root}/`)) throw new Error('Independent distribution must be outside the canonical repository');
const check = flag === '--check';
const files = new Map();
const copy = async (from, to = from) => files.set(to, await readFile(join(root, from)));
const put = (path, value) => files.set(path, Buffer.from(typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`));
const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
pkg.version = TUYAN_MANIFEST.knowledgeVersion;
pkg.engines = { ...pkg.engines, node: '>=24' };
pkg.scripts.test = `node scripts/verify-distribution.mjs && ${kind === 'skill' ? 'node --test tuyan-scientific-figure/tests/*.test.mjs' : 'node --test tests/*.test.js packages/tuyan-knowledge/tests/*.test.js'}`;
await copy('scripts/distribution-templates/verify-distribution.mjs', 'scripts/verify-distribution.mjs');

if (kind === 'skill') {
  for (const path of TUYAN_SKILL_FILES) await copy(`skills/tuyan-scientific-figure/${path}`, `tuyan-scientific-figure/${path}`);
  for (const name of ['skill.test.mjs', 'standalone.test.mjs']) await copy(`skills/tuyan-scientific-figure/tests/${name}`, `tuyan-scientific-figure/tests/${name}`);
  put('README.md', `# Tuyan scientific figure Skill\n\nKnowledge **${TUYAN_MANIFEST.knowledgeVersion}**. Full scientific-figure taxonomy, versioned journal rules, local PNG/SVG workflows and artifact-bound qualitative review.\n\nInstall the complete [tuyan-scientific-figure](tuyan-scientific-figure) directory; see the [installation guide](tuyan-scientific-figure/references/client-installation.md). Node.js 24+ is needed for local helpers; no npm installation or model call is needed. Preserve existing installations before updating.\n\nPublic indices: [domestic](https://tuyansci.cn/.well-known/skills/index.json) and [mirror](https://www.paperbanana.asia/.well-known/skills/index.json). Hosted anonymous MCP: https://api.paperbanana.asia/mcp . Research data never goes to MCP.\n\nThis repository is exported from the production Tuyan monorepo with scripts/sync-agent-distributions.mjs. distribution.json records source revision, knowledge versions and file hashes. Do not independently edit generated runtime or snapshot files.\n\nRun npm test for offline contract/provenance validation. These tests do not establish real-model quality or publisher acceptance. Bundled validator licenses are in references/runtime-licenses.txt within the Skill.\n`);
} else {
  await copy('apps/auth-gateway/src/mcp.js', 'src/mcp.js');
  await copy('scripts/distribution-templates/mcp.test.js', 'tests/mcp.test.js');
  for (const directory of ['packages/tuyan-knowledge/src', 'packages/tuyan-knowledge/tests', 'packages/figure-taxonomy/src', 'packages/api/src']) {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.js') || directory === 'packages/api/src' && !entry.name.startsWith('journal-')) continue;
      await copy(`${directory}/${entry.name}`);
    }
  }
  await copy('packages/tuyan-knowledge/package.json');
  await copy('packages/figure-taxonomy/package.json');
  put('README.md', `# Tuyan anonymous MCP\n\nKnowledge **${TUYAN_MANIFEST.knowledgeVersion}**. Public read-only figure taxonomy, workflows, schemas, versioned journal rules and provenance metadata. The single tool tuyan.get_workflow_bundle keeps its five enum fields. No research inputs, credentials, accounts or generation jobs are accepted.\n\nHosted endpoint: https://api.paperbanana.asia/mcp . [Skill source](https://github.com/yrjmdqmmx/Tuyan-Skill).\n\nFor local hosting use Node.js 24+, npm ci, npm test, then npm start. HOST defaults to 127.0.0.1 and PORT to 3000; MCP_HOST controls the permitted host. The listener is /mcp. Local tests use fake dependencies and public knowledge only.\n\nResources include tuyan://manifest, tuyan://figures/taxonomy/v1, tuyan://journals/index/v1 and every listed immutable journal version. Both v1 historical artifact schemas and v2 evidence-bound schemas remain available. Journal filtering occurs in the client, never by sending study contents to MCP.\n\nThis repository is exported from the production Tuyan monorepo with scripts/sync-agent-distributions.mjs, including all figure-taxonomy and journal source dependencies. distribution.json records version and source file hashes. Run the exporter and tests for updates rather than editing an independent catalog.\n`);
}
put('package.json', pkg);
put('.github/workflows/verify.yml', `name: Verify Agent distribution\non: [push, pull_request, workflow_dispatch]\npermissions:\n  contents: read\njobs:\n  offline:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 24\n${kind === 'mcp' ? '      - run: npm ci\n' : ''}      - run: npm test\n`);
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
put('distribution.json', {
  sourceRepository: 'https://github.com/yrjmdqmmx/Tuyan',
  sourceRevision: dirty ? null : execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceDirty: dirty, knowledgeVersion: TUYAN_MANIFEST.knowledgeVersion, knowledgeHash: TUYAN_MANIFEST.knowledgeHash,
  taxonomyVersion: TUYAN_MANIFEST.taxonomyVersion, journalVersion: TUYAN_MANIFEST.journalVersion,
  files: Object.fromEntries([...files].map(([path, bytes]) => [path, createHash('sha256').update(bytes).digest('hex')])),
});
for (const [path, bytes] of files) {
  const output = join(target, path);
  if (check) {
    if (!(await readFile(output)).equals(bytes)) throw new Error(`DISTRIBUTION_DRIFT: ${kind}/${path}`);
  } else {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, bytes);
  }
}
console.log(`${check ? 'Verified' : 'Exported'} ${kind}: ${files.size} files, knowledge ${TUYAN_MANIFEST.knowledgeVersion}`);
