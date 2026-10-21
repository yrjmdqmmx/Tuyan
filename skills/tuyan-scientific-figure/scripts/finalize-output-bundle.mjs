import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateArtifactDocument, verifyKnowledgeEvidence, sha256Canonical, FIGURE_TAXONOMY } from './knowledge-runtime.mjs';

const isSvgPath = path => /\.svg$/i.test(path);
const isPngPath = path => /\.png$/i.test(path);

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
    const status = await lstat(absolute);
    if (status.isSymbolicLink()) throw new Error(`OUTPUT_BUNDLE_INVALID: symbolic link ${relativePath}`);
    if (relativePath === 'manifest.json') continue;
    if (status.isDirectory()) results.push(...await filesUnder(root, absolute));
    else if (status.isFile()) results.push(relativePath);
  }
  return results.sort();
}

export async function buildOutputManifest(directory, {
  retrieverStatus = 'not-requested',
  datasetRevision = retrieverStatus === 'enabled' ? REVISION : null,
  selectedReferences = [],
  createdAt = new Date().toISOString(),
} = {}) {
  if (!RETRIEVER_STATUSES.has(retrieverStatus)) throw new Error(`OUTPUT_BUNDLE_INVALID: retriever status ${retrieverStatus}`);
  const root = resolve(directory);
  const paths = await filesUnder(root);
  const figureSpecPath = join(root, 'figure-spec.json');
  const figureSpec = await readFile(figureSpecPath).catch(() => null);
  if (!figureSpec) throw new Error('OUTPUT_BUNDLE_INVALID: figure-spec.json is required');
  const spec = validateArtifactDocument(JSON.parse(figureSpec));
  const knowledgePath = 'knowledge-used.json';
  const files = [];
  for (const path of paths) {
    const bytes = await readFile(join(root, path));
    files.push({ kind: kind(path), path, sha256: sha256(bytes), mediaType: mediaType(path) });
  }
  // Read only files already enumerated inside the bundle; symlinks and outside
  // references cannot be followed by a critique or knowledge evidence file.
  if (!paths.includes(knowledgePath)) throw new Error('OUTPUT_BUNDLE_INVALID: knowledge-used.json is required; capture actual MCP responses or prepare explicit offline knowledge');
  const evidence = verifyKnowledgeEvidence(JSON.parse(await readFile(join(root, knowledgePath), 'utf8')));
  const { manifest: knowledge, workflow, journalProfile } = evidence;
  if (spec.operation !== workflow.workflow.operation || spec.visualCategory !== workflow.workflow.visualCategory || spec.output.format !== workflow.execution.outputFormat || spec.locale !== workflow.workflow.locale) throw new Error('OUTPUT_BUNDLE_INVALID: FigureSpec differs from captured workflow');
  if (spec.taxonomyVersion !== knowledge.taxonomyVersion) throw new Error('OUTPUT_BUNDLE_INVALID: taxonomy version mismatch');
  if (sha256Canonical(spec.journalSelection ?? null) !== sha256Canonical(journalProfile?.snapshot.selection ?? null)) throw new Error('OUTPUT_BUNDLE_INVALID: journal selection differs from captured rules');
  if (journalProfile && journalProfile.operation !== ({ create: 'generate', refine: 'generative-refine', evaluate: 'evaluate' })[spec.operation] && !(spec.operation === 'refine' && journalProfile.operation === 'non-generative-edit' && ['code', 'vector-authoring'].includes(spec.output.renderer))) throw new Error('OUTPUT_BUNDLE_INVALID: journal operation does not match actual workflow');
  const assertFileHash = (path, hash) => {
    if (!files.some(file => file.path === path && file.sha256 === hash)) throw new Error(`OUTPUT_BUNDLE_INVALID: missing or changed evidence file ${path}`);
  };
  for (const data of [spec.data, ...(spec.panels || []).map(panel => panel.data)].filter(Boolean)) assertFileHash(data.sourcePath, data.sourceSha256);
  const dataFigure = spec.visualCategory === 'data_stat' || FIGURE_TAXONOMY.types.some(type => type.id === spec.visualCategory && type.kind === 'data') || spec.panels?.some(panel => FIGURE_TAXONOMY.types.some(type => type.id === panel.visualCategory && type.kind === 'data'));
  const critiques = [];
  for (const file of files.filter(file => file.kind === 'critique' && file.path.endsWith('.json'))) {
    const record = validateArtifactDocument(JSON.parse(await readFile(join(root, file.path), 'utf8')));
    if (record.schemaVersion !== 'tuyan.critique-record/v2') throw new Error('OUTPUT_BUNDLE_INVALID: critique schema v2 required');
    assertFileHash(record.figureSpecPath || 'figure-spec.json', record.figureSpecSha256);
    assertFileHash(record.artifactPath, record.artifactSha256);
    if (record.renderedArtifact) assertFileHash(record.renderedArtifact.path, record.renderedArtifact.sha256);
    if (isSvgPath(record.artifactPath) && record.renderedArtifact?.path === record.artifactPath) throw new Error('OUTPUT_BUNDLE_INVALID: SVG render evidence must be a separate raster image');
    if (record.renderedArtifact && !/\.(png|jpe?g|webp)$/i.test(record.renderedArtifact.path)) throw new Error('OUTPUT_BUNDLE_INVALID: inspect a raster rendering of SVG');
    if (!isSvgPath(record.artifactPath) && !record.inspected.includes('raster')) throw new Error('OUTPUT_BUNDLE_INVALID: actual raster inspection is required');
    if (record.figureSpecSha256 === sha256(figureSpec) && record.decision === 'finalize' && dataFigure && !record.numericChecks?.length) throw new Error('OUTPUT_BUNDLE_INVALID: numeric evidence is required separately from visual review');
    critiques.push({ path: file.path, record });
  }
  const reviewSummary = [];
  const incompleteNumericPackage = dataFigure && (!files.some(file => file.kind === 'plot-code') || !files.some(file => file.kind === 'final' && isPngPath(file.path)) || !files.some(file => file.kind === 'final' && isSvgPath(file.path)));
  for (const file of files.filter(file => file.kind === 'final' && /\.(png|svg|jpe?g|webp)$/i.test(file.path))) {
    if (isSvgPath(file.path)) {
      const svg = await readFile(join(root, file.path), 'utf8');
      if (!/<svg\b/i.test(svg) || !/<(?:path|text|rect|circle|line|polyline|polygon|ellipse|use)\b/i.test(svg)) throw new Error('OUTPUT_BUNDLE_INVALID: final SVG must contain real vector content, not a renamed/wrapped bitmap');
    }
    const review = critiques.filter(({ record }) => record.figureSpecSha256 === sha256(figureSpec) && (record.artifactSha256 === file.sha256 || record.renderedArtifact?.sha256 === file.sha256)).sort((a, b) => b.record.round - a.record.round || Number(a.record.decision === 'finalize') - Number(b.record.decision === 'finalize'))[0];
    const unresolvedJournal = journalProfile && (!review?.record.journalChecks?.length || journalProfile.rules.some(rule => !review.record.journalChecks.some(check => check.ruleId === rule.id && ['passed', 'not-applicable'].includes(check.status))));
    const missingInput = [...spec.inputEvidence, ...(spec.panels || []).flatMap(panel => panel.inputEvidence)].some(input => input.status !== 'available');
    reviewSummary.push({ path: file.path, sha256: file.sha256, status: !review ? 'unreviewed' : review.record.decision === 'finalize' && !unresolvedJournal && !missingInput && !journalProfile?.blocksExecution && !incompleteNumericPackage && spec.output.renderer !== 'spec-only' ? 'accepted' : 'needs-review', ...(review ? { critiquePath: review.path } : {}) });
  }
  const result = {
    schemaVersion: 'tuyan.output-bundle/v2',
    createdAt,
    figureSpecSha256: sha256(figureSpec),
    knowledge: {
      version: knowledge.knowledgeVersion,
      sha256: knowledge.knowledgeHash,
      source: evidence.source,
      evidencePath: knowledgePath,
      workflowSha256: workflow.contentHash,
      taxonomyVersion: knowledge.taxonomyVersion,
      journalVersion: journalProfile?.snapshot.version || knowledge.journalVersion,
    },
    retriever: {
      status: retrieverStatus,
      datasetRevision,
      selectedReferences: [...selectedReferences],
    },
    files,
    reviewSummary,
  };
  return validateArtifactDocument(result);
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
      await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, { flag: constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW });
      console.log(path);
    })
    .catch((error) => {
      console.error(String(error?.message || error));
      process.exitCode = 1;
    });
}
