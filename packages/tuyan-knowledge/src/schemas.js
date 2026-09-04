import { LOCALES, OPERATIONS, OUTPUT_FORMATS, VISUAL_CATEGORIES } from './catalog.js';

const sha256 = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const relativePath = { type: 'string', minLength: 1, pattern: '^(?!/)(?!.*(?:^|/)\\.\\.(?:/|$)).+$' };

const canvasSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['aspectRatio', 'resolution'],
  properties: {
    aspectRatio: { type: 'string', minLength: 3 },
    resolution: { type: 'string', minLength: 2 },
    width: { type: 'integer', minimum: 1 },
    height: { type: 'integer', minimum: 1 },
  },
};

const contentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'nodes', 'relationships', 'annotations'],
  properties: {
    title: { type: 'string' },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label'],
        properties: {
          id: { type: 'string', minLength: 1 },
          label: { type: 'string', minLength: 1 },
          group: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
    relationships: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'to', 'type'],
        properties: {
          from: { type: 'string', minLength: 1 },
          to: { type: 'string', minLength: 1 },
          type: { type: 'string', minLength: 1 },
          label: { type: 'string' },
        },
      },
    },
    annotations: { type: 'array', items: { type: 'string' } },
  },
};

const dataSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['columns', 'rows', 'xAxis', 'yAxis', 'legend'],
  properties: {
    columns: {
      type: 'array',
      minItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: { name: { type: 'string', minLength: 1 }, unit: { type: 'string' } },
      },
    },
    rows: {
      type: 'array',
      items: { type: 'array', items: { type: ['string', 'number', 'null'] } },
    },
    xAxis: { type: 'string', minLength: 1 },
    yAxis: { type: 'string', minLength: 1 },
    legend: { type: 'array', items: { type: 'string' } },
  },
};

export const FIGURE_SPEC_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'tuyan://schemas/figure-spec/v1',
  title: 'Tuyan FigureSpec v1',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'operation', 'visualCategory', 'locale', 'intent', 'canvas', 'content', 'output'],
  allOf: [
    {
      if: { properties: { visualCategory: { const: 'data_stat' } }, required: ['visualCategory'] },
      then: {
        required: ['data'],
        properties: {
          output: { properties: { renderer: { const: 'code' } }, required: ['renderer'] },
        },
      },
    },
    {
      if: { properties: { operation: { const: 'refine' } }, required: ['operation'] },
      then: { required: ['refinement'] },
    },
  ],
  properties: {
    schemaVersion: { const: 'tuyan.figure-spec/v1' },
    operation: { enum: OPERATIONS },
    visualCategory: { enum: VISUAL_CATEGORIES },
    locale: { enum: LOCALES },
    intent: { type: 'string', minLength: 1 },
    sourceDigestSha256: sha256,
    referenceSources: { type: 'array', items: { type: 'string', minLength: 1 } },
    canvas: canvasSchema,
    content: contentSchema,
    data: dataSchema,
    style: {
      type: 'object',
      additionalProperties: false,
      required: ['direction', 'palette', 'typography'],
      properties: {
        direction: { enum: ['left-to-right', 'top-to-bottom', 'radial', 'free'] },
        palette: { type: 'array', items: { type: 'string' } },
        typography: { type: 'string', minLength: 1 },
      },
    },
    output: {
      type: 'object',
      additionalProperties: false,
      required: ['format', 'renderer'],
      properties: {
        format: { enum: OUTPUT_FORMATS },
        renderer: { enum: ['agent-image-tool', 'code', 'spec-only'] },
        transparentBackground: { type: 'boolean' },
      },
    },
    refinement: {
      type: 'object',
      additionalProperties: false,
      required: ['targetChanges', 'preserve'],
      properties: {
        targetChanges: { type: 'array', minItems: 1, items: { type: 'string' } },
        preserve: { type: 'array', items: { type: 'string' } },
      },
    },
  },
});

export const CRITIQUE_RECORD_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'tuyan://schemas/critique-record/v1',
  title: 'Tuyan CritiqueRecord v1',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'figureSpecSha256', 'round', 'artifactPath', 'issues', 'preservationChecks', 'decision'],
  properties: {
    schemaVersion: { const: 'tuyan.critique-record/v1' },
    figureSpecSha256: sha256,
    round: { type: 'integer', minimum: 1 },
    artifactPath: relativePath,
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dimension', 'severity', 'evidence', 'correction'],
        properties: {
          dimension: { enum: ['fidelity', 'logic', 'legibility', 'layout', 'aesthetics', 'data-integrity'] },
          severity: { enum: ['blocking', 'material', 'minor'] },
          evidence: { type: 'string', minLength: 1 },
          correction: { type: 'string', minLength: 1 },
        },
      },
    },
    preservationChecks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['target', 'preserved'],
        properties: {
          target: { type: 'string', minLength: 1 },
          preserved: { type: 'boolean' },
          evidence: { type: 'string' },
        },
      },
    },
    revisedPromptPath: relativePath,
    decision: { enum: ['continue', 'finalize', 'stop'] },
    stopReason: { enum: ['no-material-issue', 'capability-unavailable', 'two-rounds-no-improvement', 'user-requested'] },
  },
});

export const OUTPUT_BUNDLE_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'tuyan://schemas/output-bundle/v1',
  title: 'Tuyan OutputBundle v1',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'createdAt', 'figureSpecSha256', 'knowledge', 'retriever', 'files'],
  properties: {
    schemaVersion: { const: 'tuyan.output-bundle/v1' },
    createdAt: { type: 'string', format: 'date-time' },
    figureSpecSha256: sha256,
    knowledge: {
      type: 'object',
      additionalProperties: false,
      required: ['version', 'sha256'],
      properties: { version: { type: 'string', pattern: '^1\\.' }, sha256 },
    },
    retriever: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'datasetRevision'],
      allOf: [{
        if: { properties: { status: { const: 'enabled' } }, required: ['status'] },
        then: { properties: { datasetRevision: { type: 'string', minLength: 1 } } },
      }],
      properties: {
        status: { enum: ['enabled', 'skipped', 'download-failed', 'validation-failed', 'not-requested'] },
        datasetRevision: { type: ['string', 'null'] },
        selectedReferences: { type: 'array', items: { type: 'string' } },
      },
    },
    files: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'path', 'sha256'],
        properties: {
          kind: { enum: ['figure-spec', 'source', 'reference', 'prompt', 'draft', 'critique', 'data', 'plot-code', 'final'] },
          path: relativePath,
          sha256,
          mediaType: { type: 'string' },
        },
      },
    },
  },
});

export const WORKFLOW_INPUT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['operation', 'visualCategory', 'outputFormat', 'locale', 'knowledgeMajor'],
  properties: {
    operation: { type: 'string', enum: OPERATIONS },
    visualCategory: { type: 'string', enum: VISUAL_CATEGORIES },
    outputFormat: { type: 'string', enum: OUTPUT_FORMATS },
    locale: { type: 'string', enum: LOCALES },
    knowledgeMajor: { type: 'integer', const: 1 },
  },
});
