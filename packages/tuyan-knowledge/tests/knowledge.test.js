import assert from 'node:assert/strict';
import test from 'node:test';

let knowledge = {};
try {
  knowledge = await import('../src/index.js');
} catch {
  // RED starts before the package implementation exists.
}

const categoryIds = [
  'method_framework',
  'workflow',
  'system_architecture',
  'mechanism',
  'comparison',
  'timeline',
  'data_stat',
  'concept_map',
];

test('exports the exact version-one workflow dimensions', () => {
  assert.deepEqual(knowledge.VISUAL_CATEGORIES, categoryIds);
  assert.deepEqual(knowledge.OPERATIONS, ['create', 'refine', 'evaluate']);
  assert.deepEqual(knowledge.OUTPUT_FORMATS, ['png', 'svg']);
  assert.deepEqual(knowledge.LOCALES, ['zh-CN', 'en-US']);
  assert.equal(knowledge.KNOWLEDGE_VERSION, '1.0.0');
});

test('keeps bilingual category coverage in lockstep', () => {
  for (const locale of ['zh-CN', 'en-US']) {
    assert.deepEqual(Object.keys(knowledge.CATEGORY_CATALOG?.[locale] || {}), categoryIds);
    for (const category of categoryIds) {
      const item = knowledge.CATEGORY_CATALOG[locale][category];
      assert.equal(typeof item.label, 'string');
      assert.ok(item.label.length > 0);
      assert.equal(typeof item.description, 'string');
      assert.ok(item.description.length > 0);
      assert.ok(item.requiredChecks.length >= 3);
    }
  }
});

test('workflow input accepts only the closed public enum contract', () => {
  const valid = {
    operation: 'create',
    visualCategory: 'method_framework',
    outputFormat: 'png',
    locale: 'zh-CN',
    knowledgeMajor: 1,
  };
  assert.deepEqual(knowledge.validateWorkflowInput(valid), valid);

  for (const invalid of [
    { ...valid, prompt: 'private paper content' },
    { ...valid, paper: 'private paper content' },
    { ...valid, knowledgeMajor: 2 },
    { ...valid, visualCategory: 'poster' },
    { ...valid, operation: 'generate' },
    { ...valid, outputFormat: 'pdf' },
    { ...valid, locale: 'fr-FR' },
  ]) {
    assert.throws(() => knowledge.validateWorkflowInput(invalid), /INVALID_WORKFLOW_INPUT/);
  }
});

test('workflow bundles are localized, deterministic, and never contain caller material', () => {
  const input = {
    operation: 'refine',
    visualCategory: 'mechanism',
    outputFormat: 'svg',
    locale: 'en-US',
    knowledgeMajor: 1,
  };
  const first = knowledge.getWorkflowBundle(input);
  const second = knowledge.getWorkflowBundle({ ...input });

  assert.deepEqual(second, first);
  assert.equal(first.request, undefined);
  assert.equal(first.workflow.operation, 'refine');
  assert.equal(first.workflow.visualCategory, 'mechanism');
  assert.equal(first.execution.renderer, 'agent-image-tool');
  assert.equal(first.execution.defaultAspectRatio, '16:9');
  assert.equal(first.execution.defaultResolution, '1K');
  assert.equal(first.execution.outputFormat, 'svg');
  assert.equal(first.execution.bitmapAsSvgForbidden, true);
  assert.equal(first.stopPolicy.consecutiveNoImprovementRounds, 2);
  assert.ok(first.schemas.figureSpec.startsWith('tuyan://schemas/'));
  assert.match(first.contentHash, /^[a-f0-9]{64}$/);
});

test('data statistics bundles require reproducible code and true SVG', () => {
  const bundle = knowledge.getWorkflowBundle({
    operation: 'create',
    visualCategory: 'data_stat',
    outputFormat: 'png',
    locale: 'zh-CN',
    knowledgeMajor: 1,
  });

  assert.equal(bundle.execution.renderer, 'code');
  assert.deepEqual(bundle.execution.requiredArtifacts, ['source-data', 'plot-code', 'png', 'svg']);
  assert.ok(bundle.workflow.rules.some((rule) => rule.includes('单位')));
  assert.equal(bundle.execution.realSvgRequired, true);
});

test('all public schemas are versioned and closed at the root', () => {
  const schemas = [
    knowledge.FIGURE_SPEC_SCHEMA,
    knowledge.CRITIQUE_RECORD_SCHEMA,
    knowledge.OUTPUT_BUNDLE_SCHEMA,
  ];
  for (const schema of schemas) {
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false);
    assert.match(schema.$id, /^tuyan:\/\/schemas\/.+\/v1$/);
    assert.ok(schema.required.length > 0);
  }
  assert.equal(JSON.stringify(knowledge.CRITIQUE_RECORD_SCHEMA).includes('score'), false);
});

test('dataset manifest pins the upstream bytes and explicit license status', () => {
  assert.deepEqual(knowledge.PAPERBANANA_BENCH_MANIFEST, {
    id: 'paperbanana-bench',
    version: 1,
    upstream: 'https://huggingface.co/datasets/dwzhu/PaperBananaBench',
    revision: 'a876264bcd1e826a0320f805f8fb1cd705cf510f',
    archivePath: 'PaperBananaBench.zip',
    archiveBytes: 265846711,
    archiveSha256: 'a980d23954c0cb47017cdaa8a9029dbea3598791fd269a457482033821927e37',
    expectedReferenceCount: 306,
    sourceCounts: { diagram: 298, plot: 240 },
    expectedCounts: { diagram: 66, plot: 240 },
    selection: {
      plotIds: 'ref_0..ref_239',
      diagramIds: knowledge.PAPERBANANA_BENCH_DIAGRAM_IDS,
    },
    licenseDeclared: false,
  });
});

test('dataset selection validates the exact 306-record retriever corpus', () => {
  const plotRows = Array.from({ length: 240 }, (_, index) => ({ id: `ref_${index}`, source: 'plot' }));
  const diagramRows = [
    ...knowledge.PAPERBANANA_BENCH_DIAGRAM_IDS.map((id) => ({ id, source: 'diagram' })),
    ...Array.from({ length: 232 }, (_, index) => ({ id: `other_${index}`, source: 'diagram' })),
  ];
  const selected = knowledge.selectPaperBananaBenchReferences({ plotRows, diagramRows });
  assert.equal(selected.length, 306);
  assert.deepEqual(selected.slice(0, 240).map(({ id }) => id), plotRows.map(({ id }) => id));
  assert.deepEqual(
    selected.slice(240).map(({ id }) => id),
    knowledge.PAPERBANANA_BENCH_DIAGRAM_IDS,
  );
  assert.throws(
    () => knowledge.selectPaperBananaBenchReferences({ plotRows: plotRows.slice(1), diagramRows }),
    /DATASET_VALIDATION_FAILED/,
  );
});

test('resources have a stable order and resolve without mutable state', () => {
  const resources = knowledge.listResources();
  assert.deepEqual(resources.map((resource) => resource.uri), [
    'tuyan://manifest',
    'tuyan://schemas/figure-spec/v1',
    'tuyan://schemas/critique-record/v1',
    'tuyan://schemas/output-bundle/v1',
    'tuyan://datasets/paperbanana-bench/v1',
  ]);
  assert.deepEqual(knowledge.readResource('tuyan://manifest'), knowledge.TUYAN_MANIFEST);
  assert.deepEqual(
    knowledge.readResource('tuyan://datasets/paperbanana-bench/v1'),
    knowledge.PAPERBANANA_BENCH_MANIFEST,
  );
  assert.throws(() => knowledge.readResource('tuyan://unknown'), /RESOURCE_NOT_FOUND/);
});

test('offline snapshot hash binds every version-one public knowledge object', () => {
  const snapshot = knowledge.createOfflineSnapshot();
  assert.equal(snapshot.manifest.knowledgeVersion, '1.0.0');
  assert.match(snapshot.manifest.knowledgeHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(snapshot.categories, knowledge.CATEGORY_CATALOG);
  assert.deepEqual(snapshot.schemas.figureSpec, knowledge.FIGURE_SPEC_SCHEMA);
  assert.deepEqual(snapshot.dataset, knowledge.PAPERBANANA_BENCH_MANIFEST);
  assert.equal(snapshot.workflowContract.executionDefaults.defaultAspectRatio, '16:9');
  assert.equal(snapshot.workflowContract.executionDefaults.defaultResolution, '1K');
  assert.equal(snapshot.workflowContract.stopPolicy.consecutiveNoImprovementRounds, 2);
  assert.equal(snapshot.workflowContract.localOutput, './tuyan-output/<timestamp>-<slug>/');
  assert.equal(knowledge.sha256Canonical({ b: 2, a: 1 }), knowledge.sha256Canonical({ a: 1, b: 2 }));
});
