import { useAppLocale } from './BenchmarkLocale.jsx'
import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { resolveImageUrl } from '../utils';

export default function ResultFigure({ image, apiBase, labelPrefix = '候选图', outputFormat = '', onUseForRefine }) {
  const { t } = useAppLocale()
  const [isDownloading, setIsDownloading] = useState(false);
  const url = resolveImageUrl(apiBase, image.url);
  const candidateNumber = Number(image.candidate_id ?? 0) + 1;
  const format = inferFormat(image.mime_type, outputFormat);
  const filenameKind = labelPrefix === '结果图' ? 'result' : labelPrefix === '参考图' ? 'reference' : 'candidate';
  const filename = `paperbanana-${filenameKind}-${candidateNumber}.${format}`;

  async function downloadImage() {
    if (!url || isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await fetchImageBlob(url);
      triggerDownload(URL.createObjectURL(blob), filename, true);
    } catch {
      triggerDownload(url, filename, false);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <figure>
      <img src={url} alt={`${labelPrefix} ${candidateNumber}`} loading="lazy" />
      <figcaption className="result-caption">
        <span>{labelPrefix} {candidateNumber} · {format.toUpperCase()}</span>
        {url ? (
          <span className="result-actions">
            {onUseForRefine ? (
              <button type="button" onClick={() => onUseForRefine(url, image)} aria-label={t(`${labelPrefix === '精修结果' ? '继续精修结果' : `精修${labelPrefix}`} ${candidateNumber}`)} >
                {t(labelPrefix === '精修结果' ? '继续精修' : '精修')}
              </button>
            ) : null}
            <button type="button" onClick={downloadImage} disabled={isDownloading} aria-label={t("下载{v0} {v1}", {v0: labelPrefix, v1: candidateNumber})}>
              <FileDown size={15} />
              {t(isDownloading ? '准备中' : '下载')}
            </button>
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

function inferFormat(mimeType = '', outputFormat = '') {
  if (outputFormat === 'svg' || mimeType.includes('svg')) return 'svg';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

async function fetchImageBlob(url) {
  if (url.startsWith('data:')) {
    const response = await fetch(url);
    return await response.blob();
  }
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.blob();
}

function triggerDownload(url, filename, revokeAfterClick) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (revokeAfterClick) {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
