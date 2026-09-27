// Mount at /app/runtime-image-smoke.mjs and run as node with --network none.
// No provider credentials, Mongo, OSS, generation or Judge calls are used.
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

assert.equal(process.getuid(), 1000);
assert.equal(process.arch, 'x64');
const provenance = JSON.parse(await readFile('/app/build-provenance.json', 'utf8'));
assert.match(provenance.codeSha, /^[a-f0-9]{40}$/);
if (process.env.EXPECTED_CODE_SHA) assert.equal(provenance.codeSha, process.env.EXPECTED_CODE_SHA);
assert.equal(execFileSync('dpkg-query', ['-W', '-f=${Version}', 'fonts-noto-cjk'], { encoding: 'utf8' }), '1:20220127+repack1-1');
assert.match(execFileSync('fc-match', ['Noto Sans CJK SC'], { encoding: 'utf8' }), /NotoSansCJK/);
await access('/etc/ssl/certs/ca-certificates.crt');
// Keep fixture rendering isolated from Core's process-wide raster-only decoders.
execFileSync(process.execPath, ['/app/dist/calibration-snapshot.mjs']);
const imageRuntime = await import('/app/dist/image-runtime.mjs');
assert.equal(typeof imageRuntime.callImageModel, 'function');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" fill="white"/><text x="20" y="85" font-family="Noto Sans CJK SC" font-size="36">图研 科学校准</text></svg>';
await initWasm(await readFile('/app/node_modules/@resvg/resvg-wasm/index_bg.wasm'));
const renderer = new Resvg(svg, { font: { fontBuffers: [await readFile('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')] } });
const png = renderer.render().asPng();
assert.equal((await sharp(png).metadata()).format, 'png');
assert.ok(png.byteLength > 1000);
const webp = await sharp(png).webp().toBuffer();
assert.equal((await sharp(webp).metadata()).format, 'webp');
renderer.free();
console.log(JSON.stringify({ ok: true, arch: process.arch, uid: process.getuid(), codeSha: provenance.codeSha,
  calibrationSnapshots: 'passed', coreImageRuntimeImport: 'passed', resvgWasm: 'passed', pngAndWebp: 'passed',
  providerCalls: 0 }));
