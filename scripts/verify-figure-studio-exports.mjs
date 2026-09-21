#!/usr/bin/env node
// Optional local compatibility probe. Requires Inkscape, Poppler and Ghostscript.
// It deliberately does not certify visual fidelity or external editability.
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDocument, renderSvg, evaluateRules } from '../packages/figure-core/src/index.js';

const output = path.resolve(process.argv[2] || mkdtempSync(path.join(tmpdir(), 'tuyan-figure-compat-')));
mkdirSync(output, { recursive: true });
const inkscape = process.env.PAPERBANANA_INKSCAPE_PATH || 'inkscape';
const run = (binary, args) => execFileSync(binary, binary === inkscape ? [`--app-id-tag=tuyan-${randomUUID()}`, '--batch-process', ...args] : args, { encoding: 'utf8', timeout: 45_000, maxBuffer: 8 * 1024 * 1024 });
const file = name => path.join(output, name);
const sha = name => createHash('sha256').update(readFileSync(file(name))).digest('hex');
const document = createDocument({ id: 'compatibility-fixture', title: 'Compatibility fixture — synthetic content',
  canvas: { widthMm: 89, heightMm: 70, background: '#ffffff' },
  elements: [
    { id: 'panel-a', type: 'panel', x: 4, y: 4, width: 81, height: 61, fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 0.25 },
    { id: 'panel-label', type: 'text', parentId: 'panel-a', x: 7, y: 7, width: 8, height: 5, text: 'a', fontSize: 8, fontWeight: 700, role: 'panel-label' },
    { id: 'input-box', type: 'rect', parentId: 'panel-a', x: 10, y: 25, width: 25, height: 14, fill: '#eff6ff', stroke: '#2563eb', strokeWidth: 0.3 },
    { id: 'output-box', type: 'ellipse', parentId: 'panel-a', x: 53, y: 25, width: 25, height: 14, fill: '#ecfdf5', stroke: '#047857', strokeWidth: 0.3 },
    { id: 'input-text', type: 'text', parentId: 'panel-a', x: 13, y: 29, width: 21, height: 7, text: 'Input 123', fontSize: 6 },
    { id: 'output-text', type: 'text', parentId: 'panel-a', x: 57, y: 29, width: 20, height: 7, text: 'Output 456', fontSize: 6 },
    { id: 'link', type: 'arrow', parentId: 'panel-a', x1: 35, y1: 32, x2: 53, y2: 32, fromId: 'input-box', toId: 'output-box', stroke: '#334155', strokeWidth: 0.4 },
    { id: 'note', type: 'text', parentId: 'panel-a', x: 10, y: 49, width: 67, height: 8, text: 'Synthetic fixture / α β ≥ 10 μm / 中文注释', fontSize: 6, fontFamily: process.env.FIGURE_PROBE_CJK_FONT || 'Arial' },
  ],
});
writeFileSync(file('source.tuyan.json'), JSON.stringify(document, null, 2));
writeFileSync(file('figure.svg'), renderSvg(document));
const report = { checkedAt: new Date().toISOString(), output, inkscapeVersion: run(inkscape, ['--version']).trim(), documentRules: evaluateRules(document), formats: {} };
run(inkscape, [file('figure.svg'), '--export-area-page', '--export-type=png', '--export-dpi=144', `--export-filename=${file('svg-render.png')}`]);
for (const format of ['pdf', 'eps']) {
  try {
  const name = `figure.${format}`;
  run(inkscape, [file('figure.svg'), '--export-area-page', `--export-type=${format}`, `--export-filename=${file(name)}`]);
  const pdf = format === 'pdf' ? name : 'eps-converted.pdf';
  if (format === 'eps') run('gs', ['-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-sDEVICE=pdfwrite', `-sOutputFile=${file(pdf)}`, file(name)]);
  const text = run('pdftotext', [file(pdf), '-']);
  const fonts = run('pdffonts', [file(pdf)]);
  const info = run('pdfinfo', [file(pdf)]);
  writeFileSync(file(`${format}-text.txt`), text);
  writeFileSync(file(`${format}-fonts.txt`), fonts);
  run('pdftoppm', ['-png', '-singlefile', '-r', '144', file(pdf), file(`${format}-render`)]);
  report.formats[format] = { sha256: sha(name), bytes: readFileSync(file(name)).length,
    parsedAndRendered: true, expectedLatinTextExtracted: ['Input 123', 'Output 456', 'Synthetic fixture'].every(label => text.includes(label)),
    chineseTextExtracted: text.includes('中文注释'), scientificSymbolsExtracted: text.includes('α β ≥ 10 μm'), fontReport: fonts, pageInfo: info,
    visualFidelity: 'needs_human_review', independentObjectEditing: 'not_verified', saveAndReopen: 'not_verified',
  };
  } catch (error) {
    report.formats[format] = { parsedAndRendered: false, error: String(error.message), visualFidelity: 'not_verified', independentObjectEditing: 'not_verified', saveAndReopen: 'not_verified' };
  }
}
writeFileSync(file('automated-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, inkscapeVersion: report.inkscapeVersion, formats: Object.fromEntries(Object.entries(report.formats).map(([key, value]) => [key, { parsedAndRendered: value.parsedAndRendered, expectedLatinTextExtracted: value.expectedLatinTextExtracted, chineseTextExtracted: value.chineseTextExtracted, scientificSymbolsExtracted: value.scientificSymbolsExtracted }])) }, null, 2));
if (Object.values(report.formats).some(value => !value.parsedAndRendered)) process.exitCode = 1;
