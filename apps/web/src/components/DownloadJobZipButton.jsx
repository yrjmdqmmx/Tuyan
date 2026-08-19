import { useState } from 'react';
import { Archive } from 'lucide-react';
import { collectJobImages, prepareJobArchive } from '../lib/jobArchive';
import { resolveImageUrl } from '../utils';

export default function DownloadJobZipButton({ job, apiBase }) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const images = collectJobImages(job);

  async function downloadZip() {
    if (!images.length || isPreparing) return;
    setIsPreparing(true);
    setStatusMessage('');
    try {
      const result = await prepareJobArchive(job, {
        resolveUrl: (url) => resolveImageUrl(apiBase, url),
      });
      triggerDownload(URL.createObjectURL(result.blob), `paperbanana-${job.id || 'job'}.zip`);
      if (result.failures.length) {
        setStatusMessage(`已打包 ${result.includedCount} 张，${result.failures.length} 张下载失败；详情见压缩包内说明。`);
      } else {
        setStatusMessage(`已打包 ${result.includedCount} 张图片。`);
      }
    } catch (error) {
      setStatusMessage(`打包失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsPreparing(false);
    }
  }

  if (!images.length) return null;

  return (
    <div className="zip-download-control">
      <button type="button" className="zip-download-button" onClick={downloadZip} disabled={isPreparing}>
        <Archive size={16} />
        {isPreparing ? '打包中' : '下载全部'}
      </button>
      {statusMessage ? <small className="zip-download-status" aria-live="polite">{statusMessage}</small> : null}
    </div>
  );
}

function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
