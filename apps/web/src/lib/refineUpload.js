import { activeReferenceUploadPolicy, referenceProcessingHint, referenceUploadTimeout } from './referenceUploadPolicy';
export function refineUploadLimits(limits, route, workflow = 'refine') {
  if (!limits) return undefined;
  if (limits.version >= 2) {
    const policy = activeReferenceUploadPolicy({ version: 2, platform: { ...limits, maxCount: 1 } }, route, workflow);
    return { ...limits, submissionPolicy: policy, processingHint: referenceProcessingHint(policy) };
  }
  const modelMaxBytes = limits.modelMaxBytes?.[`${route?.accessProvider}/${route?.modelId}`];
  return { ...limits, maxBytes: Math.min(limits.maxBytes, modelMaxBytes || Infinity) };
}

export function validateRefineFile(file, limits) {
  if (!limits?.mimeTypes?.length) throw new Error('后端尚未提供精修上传能力，请稍后重试。');
  if (!file || !limits.mimeTypes.includes(file.type)) throw new Error('请选择 PNG、JPG 或 WebP 图片。');
  if (!file.size || file.size > limits.maxBytes) throw new Error(`图片不能为空，且不能超过 ${(limits.maxBytes / 1024 / 1024).toFixed(1)} MiB。`);
}

export function validateRefineDimensions({ width, height }, limits) {
  if (!width || !height || width > limits.maxDimension || height > limits.maxDimension || width * height > limits.maxPixels) {
    throw new Error(`图片尺寸超限：单边最多 ${limits.maxDimension} 像素，总像素不超过 ${limits.maxPixels / 1e6} MP。`);
  }
}

export function readImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('无法读取图片，请检查文件是否损坏或更换图片。'));
    image.src = url;
  });
}

// The browser reports actual transmitted bytes; completion still waits for server validation.
export function putRefineFile(url, file, { signal, onProgress, expiresAt }) {
  return new Promise((resolve, reject) => {
    const timeout = referenceUploadTimeout(expiresAt);
    if (!timeout) { reject(new Error('原图上传地址已过期，请重试。')); return; }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = (error) => {
      signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolve();
    };
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.timeout = timeout;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 300 ? null : new Error(`图片上传失败（HTTP ${xhr.status}），请重试。`));
    xhr.onerror = () => finish(new Error('图片上传失败，请检查网络连接后重试。'));
    xhr.ontimeout = () => finish(new Error('图片上传超时，请重试。'));
    xhr.onabort = () => finish(new DOMException('已取消上传', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) return finish(new DOMException('已取消上传', 'AbortError'));
    xhr.send(file);
  });
}
