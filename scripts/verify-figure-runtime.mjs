#!/usr/bin/env node
// Run in the figure-export-smoke image. This verifies the production converter
// and fonts; it does not certify object identity or external editor round trips.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const normalize = (value) => value.replace(/\s+/gu, '');
export function compareExtractedText(text) {
  const compact = normalize(text);
  return {
    latin: ['Input 123', 'Output 456'].every((label) => compact.includes(normalize(label))),
    chinese: compact.includes('中文注释'),
    scientificSymbols: compact.includes(normalize('Explicit α β ≥ 10 μm')),
    latinFontScientificSymbols: compact.includes(normalize('Latin α β ≥ 10 μm')),
    defaultFontMixed: compact.includes(normalize('Mixed 中文注释 α β ≥ 10 μm')),
  };
}

export function assertRequiredRuntimeChecks(report) {
  assert.equal(report.sharpWebpToPng, true, 'Existing Core WebP-to-PNG runtime failed');
  assert.equal(report.formats.pdf.parsedAndRendered, true, 'PDF parser/render smoke failed');
  assert.equal(report.formats.eps.parsedAndRendered, true, 'EPS parser/render smoke failed');
  assert.equal(report.formats.eps.independentLatinLabels, true, 'EPS labels merged after internal import');
  assert.equal(report.formats.eps.directPixelsUnchanged, true, 'EPS compatibility processing changed rendered pixels');
  assert.equal(report.formats.eps.fallbackPixelsUnchanged, true, 'EPS ordinary PostScript fallback changed rendered pixels');
  for (const format of ['pdf', 'eps']) {
    for (const [name, passed] of Object.entries(report.formats[format].text)) {
      assert.equal(passed, true, `${format.toUpperCase()} ${name} text was not preserved`);
    }
    // Exact fixture text does not certify independent objects or editor round trips.
    assert.equal(report.formats[format].textCompatibilityPassed,
      Object.values(report.formats[format].text).every(Boolean), `${format} compatibility result is inconsistent`);
  }
}

export async function verifyFigureRuntime() {
  assert.notEqual(process.getuid?.(), 0, 'The converter smoke must run as the production non-root user');
  const require = createRequire(path.join(process.env.FIGURE_RUNTIME_APP_ROOT || process.cwd(), 'package.json'));
  const sharp = require('sharp');
  const { createDocument, normalizeEpsFontSubsetNames, preserveEpsTextBoundaries, renderPrintSvg, renderSvg } = await import(pathToFileURL(require.resolve('@paperbanana/figure-core')).href);
  const converter = process.env.PAPERBANANA_INKSCAPE_PATH || 'inkscape';
  const directory = await mkdtemp(path.join(tmpdir(), 'tuyan-runtime-smoke-'));
  const file = (name) => path.join(directory, name);
  const environment = { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin', HOME: directory, TMPDIR: directory, XDG_CONFIG_HOME: directory, LANG: 'C.UTF-8' };
  const run = (binary, args) => execFileSync(binary, args, { cwd: directory, env: environment, encoding: 'utf8', timeout: 20_000, maxBuffer: 8 * 1024 * 1024 });
  const ink = (args) => run(converter, ['--batch-process', `--app-id-tag=tuyan-${randomUUID()}`, ...args]);
  const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const report = { checkedAt: new Date().toISOString(), platform: process.platform, architecture: process.arch, uid: process.getuid?.(), converterVersion: '', fonts: {}, sharpWebpToPng: false, formats: {}, externalObjectEditing: 'not_verified', sameFormatSaveAndReopen: 'not_verified' };
  try {
    report.converterVersion = run(converter, ['--version']).trim();
    for (const font of ['Liberation Sans', 'WenQuanYi Micro Hei']) {
      const matched = run('fc-match', ['--format', '%{family}', font]);
      assert.ok(matched.split(',').includes(font), `Required open font ${font} is missing; matched ${matched}`);
      report.fonts[font] = matched;
    }
    // Record, but never relabel a substitute as the proprietary Arial font.
    report.fonts.ArialFallback = run('fc-match', ['--format', '%{family}', 'Arial']);
    report.fonts.ArialCjkFallback = run('fc-match', ['--format', '%{family}', 'Arial:charset=4e2d']);
    const raster = await sharp(Buffer.from('UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAdQuFr1q/+BiOh/AAA=', 'base64')).png().toBuffer();
    report.sharpWebpToPng = (await sharp(raster).metadata()).format === 'png';
    const document = createDocument({ id: 'runtime-smoke', title: 'Synthetic export runtime fixture', canvas: { widthMm: 89, heightMm: 70, background: '#ffffff' }, elements: [
      { id: 'input-box', type: 'rect', x: 5, y: 6, width: 32, height: 15, fill: '#eef4ee', stroke: '#243c2a', strokeWidth: 0.3 },
      { id: 'input', type: 'text', x: 8, y: 11, width: 30, height: 6, text: 'Input 123', fontFamily: 'Liberation Sans', fontSize: 6 },
      { id: 'output', type: 'text', x: 48, y: 11, width: 32, height: 6, text: 'Output 456', fontFamily: 'Arial', fontSize: 6 },
      { id: 'symbols', type: 'text', x: 8, y: 27, width: 70, height: 6, text: 'Explicit α β ≥ 10 μm', fontFamily: 'WenQuanYi Micro Hei', fontSize: 6 },
      { id: 'chinese', type: 'text', x: 8, y: 37, width: 70, height: 6, text: '中文注释', fontFamily: 'WenQuanYi Micro Hei', fontSize: 6 },
      { id: 'latin-symbols', type: 'text', x: 8, y: 47, width: 70, height: 6, text: 'Latin α β ≥ 10 μm', fontFamily: 'Arial', fontSize: 6 },
      { id: 'mixed', type: 'text', x: 8, y: 57, width: 70, height: 6, text: 'Mixed 中文注释 α β ≥ 10 μm', fontFamily: 'Arial', fontSize: 6 },
    ] });
    const svg = renderSvg(document);
    await writeFile(file('source.svg'), svg, { mode: 0o600 });
    const pdfSource = renderPrintSvg(document);
    await writeFile(file('pdf-source.svg'), pdfSource, { mode: 0o600 });
    report.sourceSvgSha256 = digest(Buffer.from(svg));
    report.pdfSourceSvgSha256 = digest(Buffer.from(pdfSource));
    for (const format of ['pdf', 'eps']) {
      ink([file('pdf-source.svg'), `--export-type=${format}`, '--export-area-page', `--export-filename=${file(`figure.${format}`)}`]);
      let exported = await readFile(file(`figure.${format}`));
      let renamedFontSubsets = 0;
      if (format === 'eps') {
        await writeFile(file('raw-cairo.eps'), exported);
        const normalized = normalizeEpsFontSubsetNames(exported.toString('latin1'));
        exported = Buffer.from(preserveEpsTextBoundaries(normalized.eps).eps, 'latin1');
        renamedFontSubsets = normalized.renamedFonts.length;
        await writeFile(file('figure.eps'), exported);
      }
      assert.ok(exported.length > 100 && exported.length <= 8 * 1024 * 1024, `${format} output size is invalid`);
      assert.ok(exported.subarray(0, 100).toString().startsWith(format === 'pdf' ? '%PDF-' : '%!PS-Adobe-'), `${format} signature is invalid`);
      assert.match(exported.subarray(-4096).toString('latin1'), /%%EOF\s*$/u, `${format} trailer is incomplete`);
      const pdf = format === 'pdf' ? file('figure.pdf') : file('eps-converted.pdf');
      if (format === 'eps') run('gs', ['-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-sDEVICE=pdfwrite', `-sOutputFile=${pdf}`, file('figure.eps')]);
      const extracted = run('pdftotext', ['-enc', 'UTF-8', pdf, '-']);
      const pageInfo = run('pdfinfo', [pdf]);
      assert.match(pageInfo, /Pages:\s+1\b/u, 'Export must contain exactly one page');
      const pageSize = /Page size:\s+([\d.]+) x ([\d.]+) pts/u.exec(pageInfo);
      assert.ok(pageSize, 'Missing physical page dimensions');
      // EPS uses an integer PostScript bounding box; allow at most one point.
      assert.ok(Math.abs(Number(pageSize[1]) - 89 * 72 / 25.4) < 1 && Math.abs(Number(pageSize[2]) - 70 * 72 / 25.4) < 1, `${format} page size changed`);
      run('pdftoppm', ['-png', '-singlefile', '-r', '72', pdf, file(`${format}-render`)]);
      const rendered = await sharp(file(`${format}-render.png`)).stats();
      assert.ok(rendered.channels.slice(0, 3).some((channel) => channel.min < 128), `${format} rendering is blank`);
      const text = compareExtractedText(extracted);
      report.formats[format] = { bytes: exported.length, sha256: digest(exported), parsedAndRendered: true, text, extractedFixtureText: extracted.trim(), textCompatibilityPassed: Object.values(text).every(Boolean), renamedFontSubsets, fonts: run('pdffonts', [pdf]).trim() };
      if (format === 'eps') {
        ink([pdf, '--export-plain-svg', `--export-filename=${file('eps-internal-import.svg')}`]);
        const imported = await readFile(file('eps-internal-import.svg'), 'utf8');
        const textObjects = [...imported.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gu)].map(match => normalize(match[1].replace(/<[^>]*>/gu, '')));
        const independentLatinLabels = ['Input123', 'Output456'].every(label => textObjects.includes(label));
        const pixels = {};
        // Force the standard fallback as well as Ghostscript's native pdfmark.
        const fallback = exported.toString('latin1').replace('/pdfmark where {pop}', '/tuyan_missing_pdfmark where {pop}');
        await writeFile(file('fallback.eps'), Buffer.from(fallback, 'latin1'));
        for (const [name, source] of [['raw', 'raw-cairo.eps'], ['final', 'figure.eps'], ['fallback', 'fallback.eps']]) {
          run('gs', ['-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-r144', '-sDEVICE=png16m', `-sOutputFile=${file(`eps-${name}-direct.png`)}`, file(source)]);
          pixels[name] = await sharp(file(`eps-${name}-direct.png`)).raw().toBuffer();
        }
        Object.assign(report.formats.eps, { independentLatinLabels, internalTextObjects: textObjects, directPixelsUnchanged: pixels.raw.equals(pixels.final), fallbackPixelsUnchanged: pixels.raw.equals(pixels.fallback) });
      }
    }
    assertRequiredRuntimeChecks(report);
    return report;
  } catch (error) {
    error.runtimeReport = report;
    throw error;
  } finally {
    // Optional synthetic-fixture evidence for local/CI inspection. This script
    // never processes user documents and this directory is not a service env.
    try {
      if (process.env.FIGURE_RUNTIME_EVIDENCE_DIR) {
        const evidence = path.resolve(process.env.FIGURE_RUNTIME_EVIDENCE_DIR);
        await mkdir(evidence, { recursive: true, mode: 0o700 });
        await writeFile(path.join(evidence, 'automated-report.json'), JSON.stringify(report, null, 2));
        for (const name of ['source.svg', 'pdf-source.svg', 'figure.pdf', 'raw-cairo.eps', 'figure.eps', 'eps-converted.pdf', 'pdf-render.png', 'eps-render.png', 'eps-internal-import.svg', 'eps-raw-direct.png', 'eps-final-direct.png', 'eps-fallback-direct.png']) {
          await copyFile(file(name), path.join(evidence, name)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
        }
      }
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  verifyFigureRuntime().then((report) => {
    console.log(JSON.stringify(report, null, 2));
    console.log('Fixture text checks passed; independent objects and external-editor save/reopen remain unverified.');
  }).catch((error) => { if (error.runtimeReport) console.error(JSON.stringify(error.runtimeReport, null, 2)); console.error(`Figure runtime smoke failed: ${error.message}`); process.exitCode = 1; });
}
