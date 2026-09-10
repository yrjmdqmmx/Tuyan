import { referenceUploadTimeout } from './referenceUploadPolicy.js';
// Finish all active PUTs before callers abort/clean up signed objects on failure.
export async function uploadReferenceFiles(items, uploads, concurrency = 2, fetcher = fetch) {
  let next = 0;
  let failure;
  const worker = async () => {
    while (!failure && next < items.length) {
      const item = items[next++];
      try {
        const upload = uploads.get(item.clientId);
        if (!upload?.uploadUrl) throw new Error('参考图上传地址创建失败。');
        const timeout = referenceUploadTimeout(upload.expiresAt);
        if (!timeout) throw new Error('参考图上传地址已过期，请重试；已选原图会保留。');
        const response = await fetcher(upload.uploadUrl, {
          method: 'PUT', headers: { 'Content-Type': item.mimeType }, body: item.file,
          signal: AbortSignal.timeout(timeout),
        });
        if (!response.ok) throw new Error(`参考图上传失败：HTTP ${response.status}`);
      } catch (error) { failure ||= error; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, Math.min(2, concurrency))) }, worker));
  if (failure) throw failure;
}
