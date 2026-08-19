export function collectJobImages(job = {}) {
  const resultImages = (job.result_images || []).map((image, index) => ({
    url: image.url,
    filename: `results/result-${index + 1}.${extensionFor(image)}`,
  }));
  const referenceImages = (job.reference_images || []).map((image, index) => ({
    url: image.url,
    filename: `references/reference-${index + 1}.${extensionFor(image)}`,
  }));
  const stageImages = (job.stages || [])
    .filter((stage) => stage.image?.url)
    .map((stage, index) => ({
      url: stage.image.url,
      filename: `stages/stage-${String(index + 1).padStart(2, '0')}-${stage.type || 'stage'}.${extensionFor(stage.image)}`,
    }));
  return [...resultImages, ...referenceImages, ...stageImages].filter((item) => item.url);
}

export async function prepareJobArchive(job, options = {}) {
  const resolveUrl = options.resolveUrl || ((url) => url);
  const fetchBlob = options.fetchBlob || defaultFetchBlob;
  const loadZip = options.loadZip || defaultLoadZip;
  const Zip = await loadZip();
  const zip = new Zip();
  const failures = [];
  let includedCount = 0;

  zip.file('metadata.json', JSON.stringify(job, null, 2));
  for (const item of collectJobImages(job)) {
    try {
      const blob = await fetchBlob(resolveUrl(item.url));
      zip.file(item.filename, blob);
      includedCount += 1;
    } catch (error) {
      failures.push({
        filename: item.filename,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (failures.length) {
    zip.file(
      'download-errors.txt',
      failures.map((item) => `${item.filename}: ${item.reason}`).join('\n'),
    );
  }

  return {
    blob: await zip.generateAsync({ type: 'blob' }),
    failures,
    includedCount,
  };
}

async function defaultLoadZip() {
  const module = await import('jszip');
  return module.default || module;
}

async function defaultFetchBlob(url) {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.blob();
}

function extensionFor(image = {}) {
  const mimeType = image.mime_type || image.mimeType || '';
  if (mimeType.includes('svg')) return 'svg';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}
