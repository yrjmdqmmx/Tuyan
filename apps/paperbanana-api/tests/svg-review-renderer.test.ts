import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { Worker } from 'node:worker_threads'
import { build } from 'esbuild'
import sharp from 'sharp'
import { renderSvgForReview, SVG_REVIEW_LIMITS } from '../src/svg-review.js'

const wrap = (body: string, attributes = 'width="640" height="240" viewBox="0 0 640 240"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${body}</svg>`
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')

async function resourceSubprocess(scenario: string) {
  const directory = await mkdtemp(path.join(tmpdir(), 'svg-review-resource-'))
  const packageRoot = fileURLToPath(new URL('../', import.meta.url))
  try {
    const bundle = path.join(directory, 'renderer.cjs')
    await build({ entryPoints: [path.join(packageRoot, 'src/svg-review.ts')], bundle: true,
      platform: 'node', format: 'cjs', outfile: bundle,
      define: { 'import.meta.url': JSON.stringify('file:///fixture/legacy-override.js') } })
    const script = `const assert = require('node:assert/strict');
      const { readFileSync } = require('node:fs');
      const { createHash } = require('node:crypto');
      const { Worker } = require('node:worker_threads');
      const { renderSvgForReview, SVG_REVIEW_LIMITS } = require(${JSON.stringify(bundle)});
      const packageRoot = ${JSON.stringify(packageRoot)};
      let peakRss = process.memoryUsage().rss;
      const watchdog = setInterval(() => {
        peakRss = Math.max(peakRss, process.memoryUsage().rss);
        if (peakRss > 768 * 1024 * 1024) { console.error('resource test RSS watchdog exceeded'); process.exit(98); }
      }, 20);
      (async () => { ${scenario} })().then(() => {
        clearInterval(watchdog); console.log('RESOURCE_TEST_OK ' + JSON.stringify({ peakRss }));
      }).catch(error => { clearInterval(watchdog); console.error(error); process.exitCode = 1; });`
    const result = await promisify(execFile)(process.execPath, ['--max-old-space-size=256', '-e', script], {
      cwd: packageRoot, timeout: 25_000, maxBuffer: 1024 * 1024,
    })
    assert.match(result.stdout, /RESOURCE_TEST_OK/)
    return result.stdout
  } finally { await rm(directory, { recursive: true, force: true }) }
}

test('the pinned resvg module has an enforced 256MiB maximum without changing its disk binary', async () => {
  await resourceSubprocess(`
    const { compileBoundedResvgWasm, MAX_WASM_MEMORY_BYTES } = require(packageRoot + '/assets/svg-review/wasm-memory.cjs');
    const source = readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm'));
    const original = Buffer.from(source);
    const bounded = compileBoundedResvgWasm(source);
    assert.equal(MAX_WASM_MEMORY_BYTES, 256 * 1024 * 1024);
    assert.equal(bounded.maximumBytes, MAX_WASM_MEMORY_BYTES);
    const imports = { wbg: {} };
    for (const item of WebAssembly.Module.imports(bounded.module)) {
      assert.equal(item.kind, 'function'); imports.wbg[item.name] = () => 0;
    }
    const instance = new WebAssembly.Instance(bounded.module, imports);
    const initial = instance.exports.memory.buffer.byteLength;
    assert.throws(() => instance.exports.memory.grow(4097), RangeError);
    assert.equal(instance.exports.memory.buffer.byteLength, initial);
    const small = compileBoundedResvgWasm(source, 4 * 1024 * 1024);
    const smallInstance = new WebAssembly.Instance(small.module, imports);
    smallInstance.exports.memory.grow(64 - smallInstance.exports.memory.buffer.byteLength / 65536);
    assert.equal(smallInstance.exports.memory.buffer.byteLength, 4 * 1024 * 1024);
    assert.throws(() => smallInstance.exports.memory.grow(1), RangeError);
    assert.deepEqual(source, original);
    assert.deepEqual(readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')), original);
    const altered = Buffer.from(source); altered[altered.length - 1] ^= 1;
    assert.throws(() => compileBoundedResvgWasm(altered), /SVG_REVIEW_RUNTIME_INCOMPATIBLE/);
    assert.throws(() => compileBoundedResvgWasm(source, 512 * 1024 * 1024), /SVG_REVIEW_RESOURCE_LIMIT/);
  `)
})

test('actual resvg allocation failure reports a resource limit, and 8MP Chinese/scientific rendering still succeeds', async () => {
  await resourceSubprocess(`
    const worker = new Worker(packageRoot + '/assets/svg-review/renderer-worker.cjs', {
      workerData: { svg: ${JSON.stringify(wrap('<text x="20" y="80">科研 α₂</text>'))},
        limits: { ...SVG_REVIEW_LIMITS, maxWasmMemoryBytes: 4 * 1024 * 1024 } }, execArgv: [],
      resourceLimits: { maxOldGenerationSizeMb: 192, stackSizeMb: 4 },
    });
    const message = await new Promise((resolve, reject) => { worker.once('message', resolve); worker.once('error', reject); });
    await worker.terminate();
    assert.equal(message.ok, false);
    assert.match(message.error, /SVG_REVIEW_RESOURCE_LIMIT/);
    assert.equal(message.png, undefined);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="2000"><rect width="4000" height="2000" fill="white"/><text x="100" y="300" font-size="100">科研流程 α β ∑ ∫ ℝ 𝑥₂ H₂O</text></svg>';
    const rendered = await renderSvgForReview(svg);
    assert.deepEqual([rendered.width, rendered.height], [4000, 2000]);
    assert.ok(rendered.png.length > 1000); assert.match(rendered.renderer, /memory-256MiB/);
  `)
})

test('nested SVG and symbol viewports consume the clip budget; marker depth is bounded without limiting ordinary arrow counts', async () => {
  await resourceSubprocess(`
    const canvas = body => '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000">' + body + '</svg>';
    await assert.rejects(renderSvgForReview(canvas('<svg width="2000" height="2000">'.repeat(3) + '<rect width="2000" height="2000"/>' + '</svg>'.repeat(3))), /SVG_REVIEW_COMPOSITING/);
    await assert.rejects(renderSvgForReview(canvas('<defs><symbol id="a" viewBox="0 0 2000 2000"><symbol id="b" viewBox="0 0 2000 2000"><rect width="2000" height="2000"/></symbol><use href="#b"/></symbol></defs><use href="#a"/>')), /SVG_REVIEW_COMPOSITING/);
    const markers = '<defs>' + Array.from({ length: 4 }, (_, i) => '<marker id="m' + i + '" markerWidth="8" markerHeight="8"><path d="M0 0L8 4L0 8Z"' + (i < 3 ? ' marker-end="url(#m' + (i + 1) + ')"' : '') + '/></marker>').join('') + '</defs>';
    await assert.rejects(renderSvgForReview(canvas(markers + '<path d="M0 0L100 100" marker-end="url(#m0)"/>')), /SVG_REVIEW_COMPOSITING/);
    const normal = '<defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z"/></marker></defs>' + Array.from({length:20}, (_, i) => '<path d="M10 ' + (10 + 50*i) + 'L200 ' + (10 + 50*i) + '" stroke="black" marker-end="url(#a)"/>').join('');
    const rendered = await renderSvgForReview(canvas(normal)); assert.equal(rendered.width, 2000);
  `)
})

test('renders actual SVG pixels, preserves the entire delivered source, and hashes both artifacts', async () => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n${wrap('<rect width="640" height="240" fill="#fff"/><circle cx="100" cy="100" r="40" fill="#ab1234"/>')}`
  const result = await renderSvgForReview(svg)
  assert.equal(result.svg, svg)
  assert.equal(result.svgHash, hash(svg))
  assert.equal(result.pngHash, hash(result.png))
  assert.deepEqual([result.width, result.height], [640, 240])
  assert.equal((await sharp(result.png).metadata()).format, 'png')
  const pixel = await sharp(result.png).extract({ left: 100, top: 100, width: 1, height: 1 }).removeAlpha().raw().toBuffer()
  assert.deepEqual([...pixel], [171, 18, 52])
  const repeated = await renderSvgForReview(svg)
  assert.equal(repeated.pngHash, result.pngHash)
  assert.equal(repeated.svgHash, result.svgHash)
  assert.match(result.renderer, /resvg.*2\.6\.2/)
})

test('Chinese, Latin, Greek, and mathematical labels produce real, distinct glyph pixels', async () => {
  const background = '<rect width="640" height="240" fill="white"/>'
  const blank = await renderSvgForReview(wrap(background))
  for (const label of ['科研流程 数据分析', 'Gene A α β Δ μm ∑ ∫ ℝ 𝑥₂']) {
    const result = await renderSvgForReview(wrap(`${background}<text x="24" y="90" font-family="Arial, sans-serif" font-size="32">${label}</text>`))
    assert.notEqual(result.pngHash, blank.pngHash, label)
    const pixels = await sharp(result.png).extract({ left: 20, top: 35, width: 550, height: 70 }).removeAlpha().raw().toBuffer()
    assert.ok([...pixels].filter(value => value < 128).length > 1000, `${label}: text must occupy the expected region`)
    assert.ok(result.fontInfo?.families.includes('Noto Sans CJK SC'))
    assert.ok(Object.values(result.fontInfo?.sha256 ?? {}).every(value => /^[a-f0-9]{64}$/.test(value)))
  }
  const a = await renderSvgForReview(wrap('<text x="20" y="80" font-size="40">研</text>'))
  const b = await renderSvgForReview(wrap('<text x="20" y="80" font-size="40">究</text>'))
  assert.notEqual(a.pngHash, b.pngHash, 'Chinese glyphs cannot all collapse to the same missing-glyph box')
})

test('supports ordinary SVG defs, markers, gradients, styles, groups, and internal references', async () => {
  const svg = wrap(`<defs><linearGradient id="shade"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z"/></marker>
    <g id="dot"><circle cx="15" cy="15" r="10"/></g></defs><style>.panel { fill: url(#shade); } text { font-size: 20px; }</style>
    <g><rect class="panel" x="10" y="10" width="200" height="100"/><path d="M30 160 L200 160" stroke="black" marker-end="url(#arrow)"/>
    <use href="#dot" x="240" y="30"/><text x="20" y="220">科学 α</text></g>`)
  const result = await renderSvgForReview(svg)
  assert.ok(result.png.length > 1000)
})

test('supports viewBox-only and physical dimensions with bounded output', async () => {
  const a = await renderSvgForReview(wrap('<rect width="10" height="10"/>', 'viewBox="0 0 200 100"'))
  assert.deepEqual([a.width, a.height], [200, 100])
  const b = await renderSvgForReview(wrap('<rect width="10" height="10"/>', 'width="2in" height="1in" viewBox="0 0 200 100"'))
  assert.deepEqual([b.width, b.height], [192, 96])
})

test('rejects malformed XML instead of trying to repair or partially render it', async () => {
  for (const svg of [
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><g></svg>',
    wrap('<rect x="0" x="1"/>'), wrap('<text>&undefined;</text>'), wrap('<text>bad & text</text>'),
    `${wrap('')}${wrap('')}`, '<svg width="20" height="20"/>', wrap('<x:g/>'),
  ]) await assert.rejects(renderSvgForReview(svg), /SVG_REVIEW_(?:XML|UNSAFE|DIMENSIONS)/)
})

test('rejects active, external, embedded-raster, DTD, and obfuscated URL content', async () => {
  for (const content of [
    '<script>alert(1)</script>', '<foreignObject><div>hi</div></foreignObject>', '<image href="data:image/png;base64,AAAA"/>',
    '<rect onclick="alert(1)"/>', '<use href="https://example.com/a.svg#x"/>', '<use href="file:///tmp/a.svg#x"/>',
    '<use href="&#106;avascript:alert(1)"/>', '<a href="https://example.com"><text>hi</text></a>',
    '<style>@import "https://example.com/a.css";</style>', '<style>text{fill:u/**/rl(https://example.com/x)}</style>',
    '<style>text{fill:u\\72l(https://example.com/x)}</style>', '<text style="font-family: a; src: url(https://example.com/a.woff)">x</text>',
    '<style>text{fill:u<![CDATA[rl(https://example.com/x)]]>}</style>',
    '<style>text{background-image:image-set("relative.png" 1x)}</style>',
    '<animate attributeName="href" values="https://example.com"/>', '<g xml:base="https://example.com"><use href="#x"/></g>',
    '<feImage href="#x"/>', '<g xmlns="https://example.com"><text>x</text></g>',
  ]) await assert.rejects(renderSvgForReview(wrap(content)), /SVG_REVIEW_UNSAFE/)
  await assert.rejects(renderSvgForReview(`<!DOCTYPE svg [<!ENTITY x "abc">]>${wrap('<text>&x;</text>')}`), /SVG_REVIEW_UNSAFE/)
  await assert.rejects(renderSvgForReview(`<?xml-stylesheet href="https://example.com/a.css"?>${wrap('')}`), /SVG_REVIEW_UNSAFE/)
})

test('enforces UTF-8 bytes, canvas pixels, element count, nesting, and recursive use limits', async () => {
  await assert.rejects(renderSvgForReview(wrap(`<!--${'中'.repeat(Math.ceil(SVG_REVIEW_LIMITS.maxBytes / 3))}-->`)), /SVG_REVIEW_SIZE/)
  for (const dims of ['width="4097" height="10"', 'width="3000" height="3000"', 'width="1e100" height="1"', 'width="0" height="20"', 'viewBox="0 0 -10 20"']) {
    await assert.rejects(renderSvgForReview(wrap('', dims)), /SVG_REVIEW_(?:DIMENSIONS|PIXELS)/)
  }
  await assert.rejects(renderSvgForReview(wrap('<g>'.repeat(70) + '</g>'.repeat(70))), /SVG_REVIEW_COMPLEXITY/)
  await assert.rejects(renderSvgForReview(wrap('<rect/>'.repeat(SVG_REVIEW_LIMITS.maxElements + 1))), /SVG_REVIEW_COMPLEXITY/)
  await assert.rejects(renderSvgForReview(wrap('<defs><g id="a"><use href="#b"/></g><g id="b"><use href="#a"/></g></defs><use href="#a"/>')), /SVG_REVIEW_REFERENCE/)
  await assert.rejects(renderSvgForReview(wrap('<use href="#missing"/>')), /SVG_REVIEW_REFERENCE/)
})

test('keeps long valid SVG intact and reports code diagnostics without asserting visual approval', async () => {
  const svg = wrap(`<!--${'source '.repeat(12000)}--><text x="10" y="30" font-size="4" font-family="Missing Font">tiny</text>`)
  const result = await renderSvgForReview(svg)
  assert.equal(result.svg, svg)
  assert.equal(result.svgHash, hash(svg))
  assert.ok(result.codeIssues.some(issue => /font|字体/i.test(issue)))
  assert.ok(result.codeIssues.some(issue => /4|small|字号/i.test(issue)))
  assert.equal('visualPass' in result, false)
})

test('unsupported text glyphs fail explicitly instead of silently removing or replacing labels', async () => {
  await assert.rejects(renderSvgForReview(wrap('<text x="20" y="80">\u{10ffff}</text>')), /SVG_REVIEW_(?:FONT_GLYPH|XML)/)
})

test('a packaged runtime without fonts fails explicitly before returning a text raster', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'svg-review-no-fonts-'))
  const packageRoot = fileURLToPath(new URL('../', import.meta.url))
  let worker: Worker | undefined
  try {
    await copyFile(path.join(packageRoot, 'assets/svg-review/renderer-worker.cjs'), path.join(directory, 'renderer-worker.cjs'))
    await copyFile(path.join(packageRoot, 'assets/svg-review/wasm-memory.cjs'), path.join(directory, 'wasm-memory.cjs'))
    await symlink(path.join(packageRoot, 'node_modules'), path.join(directory, 'node_modules'))
    const message: any = await new Promise((resolve, reject) => {
      worker = new Worker(path.join(directory, 'renderer-worker.cjs'), {
        workerData: { svg: wrap('<text x="20" y="80">科学</text>'), limits: SVG_REVIEW_LIMITS }, execArgv: [],
      })
      worker.once('message', resolve)
      worker.once('error', reject)
    })
    assert.equal(message.ok, false)
    assert.match(message.error, /SVG_REVIEW_FONT_UNAVAILABLE/)
    assert.equal(message.png, undefined)
  } finally {
    if (worker) await worker.terminate()
    await rm(directory, { recursive: true, force: true })
  }
})

test('CJS fixtures terminate timed-out workers and release slots for a subsequent real render', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'svg-review-timeout-'))
  const packageRoot = fileURLToPath(new URL('../', import.meta.url))
  try {
    const bundle = path.join(directory, 'fixture.cjs')
    await build({ entryPoints: [path.join(packageRoot, 'src/svg-review.ts')], bundle: true,
      platform: 'node', format: 'cjs', outfile: bundle,
      define: { 'import.meta.url': JSON.stringify('file:///fixture/legacy-override.js') } })
    await mkdir(path.join(directory, 'assets/svg-review'), { recursive: true })
    // Fault injection only: this worker never returns an image. Every successful
    // rendering assertion in this suite uses the actual XML + font + resvg path.
    await writeFile(path.join(directory, 'assets/svg-review/renderer-worker.cjs'), 'while (true) {}\n')
    const script = `const assert = require('node:assert/strict');
      const renderer = require(${JSON.stringify(bundle)});
      const originalTimer = global.setTimeout;
      global.setTimeout = (callback, delay, ...args) => originalTimer(callback, delay === 15000 ? 60 : delay, ...args);
      (async () => {
        const failures = await Promise.allSettled([renderer.renderSvgForReview(${JSON.stringify(wrap(''))}), renderer.renderSvgForReview(${JSON.stringify(wrap(''))})]);
        for (const result of failures) { assert.equal(result.status, 'rejected'); assert.match(result.reason.message, /SVG_REVIEW_TIMEOUT/); }
        global.setTimeout = originalTimer;
        process.chdir(${JSON.stringify(packageRoot)});
        const real = await renderer.renderSvgForReview(${JSON.stringify(wrap('<text x="20" y="80">科学 α₂</text>'))});
        assert.equal(real.width, 640); assert.ok(real.png.length > 1000);
        console.log('timeout workers terminated; CJS actual render recovered');
      })().catch(error => { console.error(error); process.exitCode = 1; });`
    const result = await promisify(execFile)(process.execPath, ['-e', script], { cwd: directory, timeout: 10_000 })
    assert.match(result.stdout, /CJS actual render recovered/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('bounded XML rejects small inputs with excessive offscreen allocation or cloned geometry before rasterization', async () => {
  await resourceSubprocess(`
    const canvas = s => '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000">' + s + '</svg>';
    for (const content of [
      '<defs><filter id="f">' + Array.from({length:100}, (_,i) => '<feFlood result="r' + i + '"/>').join('') + '</filter></defs><rect width="2000" height="2000" filter="url(#f)"/>',
      '<defs><pattern id="p" width="8000" height="8000" patternUnits="userSpaceOnUse"><rect width="8000" height="8000"/></pattern></defs><rect width="2000" height="2000" fill="url(#p)"/>',
      '<defs><mask id="m"><rect width="2000" height="2000"/></mask></defs><g mask="url(#m)"><rect width="2000" height="2000"/></g>',
      '<g opacity="0.9">'.repeat(20) + '<rect width="2000" height="2000"/>' + '</g>'.repeat(20),
      '<g style="mix-blend-mode:multiply">'.repeat(20) + '<rect width="2000" height="2000"/>' + '</g>'.repeat(20),
      '<defs><clipPath id="c"><rect width="2000" height="2000"/></clipPath></defs>' + '<g clip-path="url(#c)">'.repeat(20) + '<rect width="2000" height="2000"/>' + '</g>'.repeat(20),
      '<defs><path id="p" d="M0 0 ' + 'L1 2 '.repeat(5000) + '"/></defs>' + '<use href="#p"/>'.repeat(2000),
    ]) await assert.rejects(renderSvgForReview(canvas(content)), /SVG_REVIEW_(UNSAFE|COMPOSITING|COMPLEXITY)/);
    const basic = await renderSvgForReview(canvas('<g>'.repeat(20) + '<rect width="2000" height="2000" fill-opacity="0.9"/>' + '</g>'.repeat(20)));
    assert.equal(basic.width, 2000);
  `)
})
