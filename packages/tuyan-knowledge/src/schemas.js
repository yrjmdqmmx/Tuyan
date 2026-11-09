import { FIGURE_TYPES } from '../../figure-taxonomy/src/index.js';
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
      if: { properties: { visualCategory: { enum: ['data_stat', ...FIGURE_TYPES.filter(type=>type.kind==='data').map(type=>type.id)] } }, required: ['visualCategory'] },
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

// v1 resources remain readable. New runs use v2 so stronger evidence requirements
// are not silently imposed on existing files with additionalProperties:false.
const journalSelection = {
  type: 'object', additionalProperties: false,
  required: ['journalId', 'version', 'stage', 'purpose', 'contentType', 'rasterKind', 'widthMm'],
  properties: {
    journalId: { type: 'string', minLength: 1 }, version: { type: 'string', minLength: 1 },
    stage: { enum: ['initial', 'revision', 'production'] },
    purpose: { enum: ['main', 'supplementary', 'graphical_abstract', 'toc', 'cover'] },
    contentType: { enum: ['schematic', 'data', 'primary', 'illustration'] },
    rasterKind: { enum: ['color', 'grayscale', 'lineart'] },
    widthMm: { type: 'number', minimum: 10, maximum: 1000 },
  },
};
const inputEvidence = {
  type: 'array', minItems: 1, items: {
    type: 'object', additionalProperties: false, required: ['requirement', 'status', 'evidence'],
    properties: {
      requirement: { type: 'string', minLength: 1 }, status: { enum: ['available', 'missing', 'unverified'] },
      evidence: { type: 'string', minLength: 1 }, sourcePath: relativePath, sourceSha256: sha256,
    },
  },
};
const artifactData = {
  type: 'object', additionalProperties: false, required: ['sourcePath', 'sourceSha256', 'units'],
  properties: {
    sourcePath: relativePath, sourceSha256: sha256,
    units: { type: 'object', additionalProperties: { type: 'string', minLength: 1 } },
    columns: dataSchema.properties.columns,
    rows: { type: 'array', minItems: 1, items: { anyOf: [{ type: 'object' }, { type: 'array' }] } },
    analysisMethod: { type: 'string' }, analysisDescription: { type: 'string' },
    xAxis: { type: 'string' }, yAxis: { type: 'string' }, legend: dataSchema.properties.legend,
  },
};
const numericCategories = ['data_stat', ...FIGURE_TYPES.filter(type => type.kind === 'data').map(type => type.id)];
const panelSchema = {
  type: 'object', additionalProperties: false, required: ['label', 'visualCategory', 'inputEvidence', 'renderer'],
  properties: {
    label: { type: 'string', minLength: 1 },
    visualCategory: { enum: FIGURE_TYPES.filter(type => type.kind !== 'composite').map(type => type.id) },
    inputEvidence, data: artifactData,
    renderer: { enum: ['code', 'vector-authoring', 'agent-image-tool', 'spec-only'] },
    artifactPath: relativePath,
  },
  allOf: [
    { if: { properties: { visualCategory: { enum: numericCategories } } }, then: { properties: { renderer: { enum: ['code', 'spec-only'] } } } },
    { if: { properties: { visualCategory: { enum: numericCategories }, renderer: { not: { const: 'spec-only' } } } }, then: { required: ['data'] } },
  ],
};
const figureV2 = structuredClone(FIGURE_SPEC_SCHEMA);
figureV2.$id = 'tuyan://schemas/figure-spec/v2';
figureV2.title = 'Tuyan FigureSpec v2';
figureV2.properties.schemaVersion = { const: 'tuyan.figure-spec/v2' };
figureV2.properties.data = artifactData;
figureV2.properties.inputEvidence = inputEvidence;
figureV2.properties.taxonomyVersion = { type: 'string', minLength: 1 };
figureV2.properties.journalSelection = journalSelection;
figureV2.properties.panels = { type: 'array', minItems: 2, maxItems: 12, items: panelSchema };
figureV2.properties.output.properties.renderer.enum = ['agent-image-tool', 'code', 'vector-authoring', 'mixed-panels', 'spec-only'];
figureV2.required.push('inputEvidence', 'taxonomyVersion');
figureV2.allOf[0].then.properties.output.properties.renderer = { enum: ['code', 'spec-only'] };
figureV2.allOf[0].then.required = [];
figureV2.allOf.push({ if: { properties: { visualCategory: { enum: numericCategories }, output: { properties: { renderer: { not: { const: 'spec-only' } } } } } }, then: { required: ['data'] } });
figureV2.allOf.push({ if: { properties: { visualCategory: { enum: ['multipanel', 'small_multiples'] } } }, then: { required: ['panels'], properties: { output: { properties: { renderer: { enum: ['mixed-panels', 'spec-only'] } } } } } });
export const FIGURE_SPEC_V2_SCHEMA = Object.freeze(figureV2);

const critiqueV2 = structuredClone(CRITIQUE_RECORD_SCHEMA);
critiqueV2.$id = 'tuyan://schemas/critique-record/v2';
critiqueV2.title = 'Tuyan CritiqueRecord v2';
critiqueV2.properties.schemaVersion = { const: 'tuyan.critique-record/v2' };
Object.assign(critiqueV2.properties, {
  artifactSha256: sha256, artifactVersion: { type: 'string', minLength: 1 },
  figureSpecPath: relativePath,
  inspected: { type: 'array', minItems: 1, uniqueItems: true, items: { enum: ['raster', 'svg-source', 'svg-render'] } },
  renderedArtifact: { type: 'object', additionalProperties: false, required: ['path', 'sha256'], properties: { path: relativePath, sha256 } },
  uncertainties: { type: 'array', items: { type: 'string', minLength: 1 } },
  numericChecks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['target', 'status', 'evidence'], properties: { target: { type: 'string', minLength: 1 }, status: { enum: ['passed', 'unverified', 'failed'] }, evidence: { type: 'string', minLength: 1 } } } },
  journalChecks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['ruleId', 'status', 'evidence'], properties: { ruleId: { type: 'string', minLength: 1 }, status: { enum: ['passed', 'unmet', 'manual', 'pending', 'conflict', 'not-applicable'] }, evidence: { type: 'string', minLength: 1 } } } },
});
critiqueV2.required.push('artifactSha256', 'artifactVersion', 'inspected', 'uncertainties');
critiqueV2.properties.issues.items.properties.dimension.enum.push('journal', 'preservation', 'export');
critiqueV2.allOf = [
  { if: { properties: { artifactPath: { pattern: '\\.[sS][vV][gG]$' } } }, then: { required: ['renderedArtifact'], properties: { inspected: { allOf: [{ contains: { const: 'svg-source' } }, { contains: { const: 'svg-render' } }] } } } },
  { if: { properties: { decision: { const: 'finalize' } } }, then: { properties: {
    uncertainties: { maxItems: 0 },
    issues: { items: { properties: { severity: { const: 'minor' } } } },
    preservationChecks: { items: { properties: { preserved: { const: true } } } },
    numericChecks: { items: { properties: { status: { const: 'passed' } } } },
  } } },
];
export const CRITIQUE_RECORD_V2_SCHEMA = Object.freeze(critiqueV2);

const outputV2 = structuredClone(OUTPUT_BUNDLE_SCHEMA);
outputV2.$id = 'tuyan://schemas/output-bundle/v2';
outputV2.title = 'Tuyan OutputBundle v2';
outputV2.properties.schemaVersion = { const: 'tuyan.output-bundle/v2' };
Object.assign(outputV2.properties.knowledge.properties, {
  source: { enum: ['mcp', 'offline'] }, evidencePath: relativePath, workflowSha256: sha256,
  taxonomyVersion: { type: 'string' }, journalVersion: { type: 'string' },
});
outputV2.properties.knowledge.required.push('source', 'evidencePath', 'workflowSha256', 'taxonomyVersion', 'journalVersion');
outputV2.properties.reviewSummary = { type: 'array', items: {
  type: 'object', additionalProperties: false, required: ['path', 'sha256', 'status'],
  properties: { path: relativePath, sha256, status: { enum: ['accepted', 'needs-review', 'unreviewed'] }, critiquePath: relativePath },
} };
outputV2.required.push('reviewSummary');
export const OUTPUT_BUNDLE_V2_SCHEMA = Object.freeze(outputV2);
