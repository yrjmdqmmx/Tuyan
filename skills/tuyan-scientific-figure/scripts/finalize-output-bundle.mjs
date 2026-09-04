import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RETRIEVER_STATUSES = new Set(['enabled', 'skipped', 'download-failed', 'validation-failed', 'not-requested']);
const REVISION = 'a876264bcd1e826a0320f805f8fb1cd705cf510f';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function mediaType(path) {
  return ({
    '.csv': 'text/csv', '.json': 'application/json', '.md': 'text/markdown', '.png': 'image/png',
    '.py': 'text/x-python', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.js': 'text/javascript',
    '.mjs': 'text/javascript', '.ts': 'text/typescript', '.yaml': 'application/yaml', '.yml': 'application/yaml',
  })[extname(path).toLowerCase()] || 'application/octet-stream';
}

function kind(path) {
  if (path === 'figure-spec.json') return 'figure-spec';
  if (path.startsWith('prompts/')) return 'prompt';
  if (path.startsWith('critiques/')) return 'critique';
  if (path.startsWith('drafts/')) return 'draft';
  if (path.startsWith('references/')) return 'reference';
  if (path.startsWith('final/')) return 'final';
  if (path.startsWith('data/')) return 'data';
  if (path.startsWith('code/') || /(?:^|\/)plot\.(?:py|js|mjs|ts)$/i.test(path)) return 'plot-code';
  return 'source';
}

async function filesUnder(root, directory = root) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    const relativePath = relative(root, absolute).split(sep).join('/');
    if (relativePath === 'manifest.json') continue;
    const status = await lstat(absolute);
    if (status.isSymbolicLink()) throw new Error(`OUTPUT_BUNDLE_INVALID: symbolic link ${relativePath}`);
    if (status.isDirectory()) results.push(...await filesUnder(root, absolute));
    else if (status.isFile()) results.push(relativePath);
  }
  return results.sort();
}

function snapshotPath() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../references/offline-snapshot.v1.json');
}

export async function buildOutputManifest(directory, {
  retrieverStatus = 'not-requested',
  datasetRevision = retrieverStatus === 'enabled' ? REVISION : null,
  selectedReferences = [],
  createdAt = new Date().toISOString(),
} = {}) {
  if (!RETRIEVER_STATUSES.has(retrieverStatus)) throw new Error(`OUTPUT_BUNDLE_INVALID: retriever status ${retrieverStatus}`);
  const root = resolve(directory);
  const figureSpecPath = join(root, 'figure-spec.json');
  const figureSpec = await readFile(figureSpecPath).catch(() => null);
  if (!figureSpec) throw new Error('OUTPUT_BUNDLE_INVALID: figure-spec.json is required');
  const snapshot = JSON.parse(await readFile(snapshotPath(), 'utf8'));
  const paths = await filesUnder(root);
  const files = [];
  for (const path of paths) {
    const bytes = await readFile(join(root, path));
    files.push({ kind: kind(path), path, sha256: sha256(bytes), mediaType: mediaType(path) });
  }
  return {
    schemaVersion: 'tuyan.output-bundle/v1',
    createdAt,
    figureSpecSha256: sha256(figureSpec),
    knowledge: {
      version: snapshot.manifest.knowledgeVersion,
      sha256: snapshot.manifest.knowledgeHash,
    },
    retriever: {
      status: retrieverStatus,
      datasetRevision,
      selectedReferences: [...selectedReferences],
    },
    files,
  };
}

function parseArgs(argv) {
  const directory = argv[0];
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--retriever-status') options.retrieverStatus = argv[++index];
    else if (flag === '--dataset-revision') options.datasetRevision = argv[++index];
    else if (flag === '--selected-reference') (options.selectedReferences ||= []).push(argv[++index]);
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!directory) throw new Error('Usage: node finalize-output-bundle.mjs <bundle-directory> [--retriever-status <status>]');
  return { directory, options };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  Promise.resolve()
    .then(() => parseArgs(process.argv.slice(2)))
    .then(async ({ directory, options }) => {
      const manifest = await buildOutputManifest(directory, options);
      const path = join(resolve(directory), 'manifest.json');
      await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'w' });
      console.log(path);
    })
    .catch((error) => {
      console.error(String(error?.message || error));
      process.exitCode = 1;
    });
}
