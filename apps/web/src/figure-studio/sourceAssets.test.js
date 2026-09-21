import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSourceAssets } from './sourceAssets.js';

test('source raster imports decode sequentially and release every allocated bitmap', async () => {
  const events = [];
  const source = { assets: { first: { pixelWidth: 2, pixelHeight: 3 }, second: { pixelWidth: 4, pixelHeight: 5 } } };
  await validateSourceAssets(source, async (asset) => {
    events.push(`decode:${asset.pixelWidth}`);
    return { width: asset.pixelWidth, height: asset.pixelHeight, close: () => events.push(`close:${asset.pixelWidth}`) };
  });
  assert.deepEqual(events, ['decode:2', 'close:2', 'decode:4', 'close:4']);
});

test('valid-looking asset headers do not bypass a pixel-decoding error', async () => {
  const current = { id: 'current', assets: {}, elements: [] };
  const before = JSON.stringify(current);
  const incoming = { assets: { broken: { pixelWidth: 2, pixelHeight: 2 } } };
  await assert.rejects(validateSourceAssets(incoming, async () => { throw new Error('corrupt IDAT stream'); }), /无法完整解码/);
  assert.equal(JSON.stringify(current), before);
});

test('declared and decoded image dimensions must agree; bitmap is closed on failure', async () => {
  let closed = false;
  await assert.rejects(validateSourceAssets({ assets: { mismatch: { pixelWidth: 2, pixelHeight: 2 } } }, async () => ({ width: 3, height: 2, close: () => { closed = true; } })), /尺寸不一致/);
  assert.equal(closed, true);
});

test('32 megapixel budget is checked before allocating any bitmap', async () => {
  let called = false;
  await assert.rejects(validateSourceAssets({ assets: { huge: { pixelWidth: 8000, pixelHeight: 5000 } } }, async () => { called = true; }), /3200 万像素/);
  assert.equal(called, false);
});
