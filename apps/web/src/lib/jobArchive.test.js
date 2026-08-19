import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { collectJobImages, prepareJobArchive } from './jobArchive.js';

test('collectJobImages normalizes result, reference, and stage images', () => {
  const images = collectJobImages({
    result_images: [{ url: 'https://cdn.example/result', mime_type: 'image/webp' }],
    reference_images: [{ url: 'https://cdn.example/reference', mime_type: 'image/jpeg' }],
    stages: [{ type: 'critic', image: { url: 'https://cdn.example/stage', mimeType: 'image/png' } }],
  });

  assert.deepEqual(images, [
    { url: 'https://cdn.example/result', filename: 'results/result-1.webp' },
    { url: 'https://cdn.example/reference', filename: 'references/reference-1.jpg' },
    { url: 'https://cdn.example/stage', filename: 'stages/stage-01-critic.png' },
  ]);
});

test('prepareJobArchive keeps successful images and records individual download failures', async () => {
  const files = new Map();
  let zipLoads = 0;
  class FakeZip {
    file(name, value) {
      files.set(name, value);
    }

    async generateAsync() {
      return new Blob(['archive']);
    }
  }

  const job = {
    id: 'job-1',
    result_images: [
      { url: '/ok.png', mime_type: 'image/png' },
      { url: '/expired.png', mime_type: 'image/png' },
    ],
  };
  const result = await prepareJobArchive(job, {
    resolveUrl: (url) => `https://api.example${url}`,
    loadZip: async () => {
      zipLoads += 1;
      return FakeZip;
    },
    fetchBlob: async (url) => {
      if (url.endsWith('/expired.png')) throw new Error('HTTP 403');
      return new Blob(['ok']);
    },
  });

  assert.equal(zipLoads, 1);
  assert.equal(result.includedCount, 1);
  assert.deepEqual(result.failures, [{ filename: 'results/result-2.png', reason: 'HTTP 403' }]);
  assert.ok(result.blob instanceof Blob);
  assert.ok(files.has('metadata.json'));
  assert.ok(files.has('results/result-1.png'));
  assert.match(String(files.get('download-errors.txt')), /result-2\.png.*HTTP 403/);
});

test('jobArchive defers the JSZip dependency until archive preparation', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./jobArchive.js', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /^import .* from ['"]jszip['"]/m);
  assert.match(source, /import\(['"]jszip['"]\)/);
});
