import { useEffect, useRef, useState } from 'react';
import { abortReferenceUploadRequest, finalizeReferenceUploadRequest, prepareReferenceUploadRequest } from '@paperbanana/api';
import { putRefineFile, readImageDimensions, validateRefineDimensions, validateRefineFile } from '../lib/refineUpload';

export default function useRefineUpload({ apiBase, health, limits, authReady, ownerId }) {
  const [source, updateSource] = useState({ url: '', objectKey: '' });
  const [upload, setUpload] = useState({ status: 'idle', progress: 0, error: '' });
  const operation = useRef({ sequence: 0, controller: null, preview: '', file: null });

  function reset() {
    operation.current.sequence += 1;
    operation.current.controller?.abort();
    operation.current.cleanup?.();
    operation.current.cleanup = null;
    if (operation.current.preview) URL.revokeObjectURL(operation.current.preview);
    operation.current.preview = '';
    operation.current.file = null;
  }

  function setSource(next) {
    reset();
    updateSource(next);
    setUpload({ status: 'idle', progress: 0, error: '' });
  }

  useEffect(() => {
    setSource({ url: '', objectKey: '' });
    return reset;
  }, [apiBase, ownerId]);

  async function selectFiles(files) {
    if (!files?.length) return;
    if (files.length !== 1) { setUpload((value) => ({ ...value, error: '每次请选择一张原图。' })); return; }
    const file = files[0];
    try {
      if (!authReady) throw new Error('请先登录，再上传精修原图。');
      validateRefineFile(file, limits);
    } catch (error) {
      setUpload((value) => ({ ...value, error: error.message }));
      return;
    }
    reset();
    const sequence = operation.current.sequence;
    const controller = new AbortController();
    const preview = URL.createObjectURL(file);
    operation.current = { sequence, controller, preview, file };
    const current = () => operation.current.sequence === sequence && !controller.signal.aborted;
    updateSource({ url: preview, objectKey: '', filename: file.name, size: file.size, mimeType: file.type });
    setUpload({ status: 'validating', progress: 0, error: '' });
    let uploads;
    try {
      const dimensions = await readImageDimensions(preview);
      validateRefineDimensions(dimensions, limits);
      if (!current()) return;
      updateSource((value) => ({ ...value, ...dimensions }));
      const prepared = await prepareReferenceUploadRequest(apiBase, health, [{ clientId: 'refine-source', filename: file.name, mimeType: file.type, size: file.size }]);
      uploads = prepared.uploads?.map(({ objectKey, uploadToken, mimeType, size, filename, uploadUrl, expiresAt }) => ({ objectKey, uploadToken, mimeType, size, filename, uploadUrl, expiresAt }));
      if (!current()) throw new DOMException('已取消上传', 'AbortError');
      if (uploads?.length !== 1 || !uploads[0].uploadUrl) throw new Error('无法获取图片上传地址，请重试。');
      setUpload({ status: 'uploading', progress: 0, error: '' });
      await putRefineFile(uploads[0].uploadUrl, file, { signal: controller.signal, expiresAt: uploads[0].expiresAt, onProgress: (progress) => {
        if (current()) setUpload({ status: 'uploading', progress, error: '' });
      } });
      if (!current()) throw new DOMException('已取消上传', 'AbortError');
      setUpload({ status: 'checking', progress: 100, error: '' });
      const lifecycleUploads = uploads.map(({ uploadUrl, ...upload }) => upload);
      const finalized = await finalizeReferenceUploadRequest(apiBase, health, lifecycleUploads, { purpose: 'refine' });
      if (!current()) throw new DOMException('已取消上传', 'AbortError');
      operation.current.cleanup = () => { void abortReferenceUploadRequest(apiBase, health, lifecycleUploads).catch(() => {}); };
      updateSource({ url: preview, objectKey: uploads[0].objectKey, uploaded: true, filename: file.name, mimeType: file.type, size: file.size, ...dimensions, ...finalized.source });
      setUpload({ status: 'ready', progress: 100, error: '' });
    } catch (error) {
      if (uploads?.length) await abortReferenceUploadRequest(apiBase, health, uploads.map(({ uploadUrl, ...upload }) => upload)).catch(() => {});
      if (current()) setUpload({ status: 'failed', progress: 0, error: error.message || '图片上传失败，请重试。' });
    }
  }

  return { source, setSource, upload, selectFiles, retry: () => { if (operation.current.file) void selectFiles([operation.current.file]); } };
}
