import test from 'node:test';
import assert from 'node:assert/strict';
import { activeReferenceUploadPolicy, referenceUploadContract, referenceUploadSelectionError } from './referenceUploadPolicy.js';
import { uploadReferenceFiles } from './referenceUpload.js';

test('upload policy follows the image consumer, keeps originals on stricter model changes, and respects old servers', () => {
  const qwen = activeReferenceUploadPolicy(referenceUploadContract(), { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' });
  const files = Array.from({ length: 8 }, (_, i) => ({ filename: `${i}.png`, size: 6 * 1024 * 1024 }));
  assert.equal(referenceUploadSelectionError(files, qwen), '');
  assert.equal(qwen.platform.maxBytes, 20 * 1024 * 1024);
  const small = activeReferenceUploadPolicy(referenceUploadContract(), { accessProvider: 'zhipu', modelId: 'glm-4v-flash' });
  assert.match(referenceUploadSelectionError(files, small), /最多提交 3 张.*文件已保留/);
  assert.equal(files.length, 8);
  assert.equal(referenceUploadSelectionError(files, qwen), '');
  const old = activeReferenceUploadPolicy(null, { accessProvider: 'tokendance', modelId: 'qwen3.8-flash' });
  assert.equal(old.platform.maxBytes, 5 * 1024 * 1024);
  assert.equal(old.maxCount, 3);
  assert.match(referenceUploadSelectionError([{ size: qwen.platform.maxBytes + 1 }], qwen), /单张原图/);
  assert.match(referenceUploadSelectionError(Array.from({length: 5}, () => ({ size: qwen.platform.maxBytes })), qwen), /合计/);
  assert.match(referenceUploadSelectionError([{ size: 100, width: 8001, height: 4000 }], qwen), /32MP/);
  const refine = activeReferenceUploadPolicy(referenceUploadContract(), { accessProvider: 'recraft', modelId: 'recraftv4_1' }, 'refine');
  const smallSource = [{ size: 100, width: 120, height: 80 }];
  assert.match(referenceUploadSelectionError(smallSource, refine), /短边至少 256px.*原图已保留/);
  assert.equal(referenceUploadSelectionError(smallSource, qwen), '');
});

test('uploads use two connections and finish active requests before cleanup after failure', async () => {
  const items = Array.from({ length: 8 }, (_, i) => ({ clientId: String(i), file: new Blob(['x']), mimeType: 'image/png' }));
  const uploads = new Map(items.map(x => [x.clientId, { uploadUrl: `https://storage.example/${x.clientId}` }]));
  let active = 0, peak = 0, completed = 0;
  await uploadReferenceFiles(items, uploads, 99, async () => {
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 3));
    active--; completed++;
    return { ok: true };
  });
  assert.equal(peak, 2); assert.equal(completed, 8);
  completed = 0;
  await assert.rejects(uploadReferenceFiles(items, uploads, 2, async url => {
    active++;
    await new Promise(resolve => setTimeout(resolve, url.endsWith('/0') ? 1 : 10));
    active--; completed++;
    return { ok: !url.endsWith('/0'), status: 503 };
  }), /503/);
  assert.equal(active, 0); assert.equal(completed, 2);
});
