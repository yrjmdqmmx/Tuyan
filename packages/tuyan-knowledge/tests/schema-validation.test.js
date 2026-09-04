import assert from 'node:assert/strict';
import test from 'node:test';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import {
  CRITIQUE_RECORD_SCHEMA,
  FIGURE_SPEC_SCHEMA,
  OUTPUT_BUNDLE_SCHEMA,
} from '../src/index.js';

function validator(schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

function figureSpec(overrides = {}) {
  return {
    schemaVersion: 'tuyan.figure-spec/v1',
    operation: 'create',
    visualCategory: 'method_framework',
    locale: 'zh-CN',
    intent: 'Show one method flow.',
    canvas: { aspectRatio: '16:9', resolution: '1K' },
    content: {
      title: 'Method',
      nodes: [{ id: 'a', label: 'Input' }],
      relationships: [],
      annotations: [],
    },
    output: { format: 'png', renderer: 'agent-image-tool' },
    ...overrides,
  };
}

test('FigureSpec requires data contracts for data_stat and preservation contracts for refine', () => {
  const validate = validator(FIGURE_SPEC_SCHEMA);
  assert.equal(validate(figureSpec()), true, JSON.stringify(validate.errors));
  assert.equal(validate(figureSpec({ visualCategory: 'data_stat', output: { format: 'svg', renderer: 'code' } })), false);
  assert.equal(validate(figureSpec({ operation: 'refine' })), false);
  assert.equal(validate(figureSpec({
    visualCategory: 'data_stat',
    data: {
      columns: [{ name: 'x' }, { name: 'y', unit: '%' }],
      rows: [[1, 20]],
      xAxis: 'x',
      yAxis: 'y (%)',
      legend: ['series'],
    },
    output: { format: 'svg', renderer: 'code' },
  })), true, JSON.stringify(validate.errors));
  assert.equal(validate(figureSpec({
    operation: 'refine',
    refinement: { targetChanges: ['remove duplicate'], preserve: ['all other labels'] },
  })), true, JSON.stringify(validate.errors));
});

test('CritiqueRecord rejects numeric scoring and accepts qualitative evidence', () => {
  const validate = validator(CRITIQUE_RECORD_SCHEMA);
  const record = {
    schemaVersion: 'tuyan.critique-record/v1',
    figureSpecSha256: 'a'.repeat(64),
    round: 1,
    artifactPath: 'drafts/round-01.png',
    issues: [{ dimension: 'logic', severity: 'material', evidence: 'Duplicate node', correction: 'Remove it' }],
    preservationChecks: [{ target: 'labels', preserved: true }],
    decision: 'continue',
  };
  assert.equal(validate(record), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...record, score: 9 }), false);
});

test('OutputBundle binds enabled retrieval to a concrete dataset revision', () => {
  const validate = validator(OUTPUT_BUNDLE_SCHEMA);
  const bundle = {
    schemaVersion: 'tuyan.output-bundle/v1',
    createdAt: '2026-09-04T00:00:00.000Z',
    figureSpecSha256: 'b'.repeat(64),
    knowledge: { version: '1.0.0', sha256: 'c'.repeat(64) },
    retriever: { status: 'enabled', datasetRevision: null, selectedReferences: [] },
    files: [{ kind: 'figure-spec', path: 'figure-spec.json', sha256: 'd'.repeat(64), mediaType: 'application/json' }],
  };
  assert.equal(validate(bundle), false);
  bundle.retriever.datasetRevision = 'a876264bcd1e826a0320f805f8fb1cd705cf510f';
  assert.equal(validate(bundle), true, JSON.stringify(validate.errors));
});
