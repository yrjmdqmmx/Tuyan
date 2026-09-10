const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.resolve(__dirname, '../paperbanana-api.ts');
const source = fs.readFileSync(sourcePath, 'utf8');

assert.ok(
  source.includes("@resvg/resvg-wasm"),
  'Laf backend should load @resvg/resvg-wasm for server-side SVG rasterization.',
);

assert.ok(
  source.includes('rasterizeSvgReferenceToPng'),
  'Laf backend should rasterize SVG reference images when no analysis PNG is supplied.',
);

assert.ok(
  !source.includes("if (mimeType === 'image/svg+xml' && !normalized.analysisObjectKey)"),
  'SVG reference uploads must not require clients to provide analysisObjectKey.',
);

assert.ok(
  source.includes('image.analysisObjectKey = key'),
  'Rasterized SVG references should be saved back to bucket as analysisObjectKey for records and model input.',
);

console.log('svg-reference-rasterization policy ok');
