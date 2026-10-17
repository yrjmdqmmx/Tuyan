import JournalExportPanel from './JournalExportPanel.jsx';
import { useAppLocale } from './BenchmarkLocale.jsx'
import { reviewStatusText } from '../lib/workflowSettings.js';
import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { resolveImageUrl } from '../utils';

export default function ResultFigure({ image, apiBase, labelPrefix = '候选图', outputFormat = '', onUseForRefine, journalProfile, jobId }) {
  const { t } = useAppLocale()
  const [isDownloading, setIsDownloading] = useState(false);
  const url = resolveImageUrl(apiBase, image.url);
  const candidateNumber = Number(image.candidate_id ?? 0) + 1;
  const format = inferFormat(image.mime_type, outputFormat);
  const filenameKind = labelPrefix === '结果图' ? 'result' : labelPrefix === '参考图' ? 'reference' : 'candidate';
  const filename = `paperbanana-${filenameKind}-${candidateNumber}.${format}`;
  // Exhausting the configured rounds is a normal completion, not a result warning.
  // Keep the stored review and show interrupted/failed reviews as before.
  const completedRevision = image.review?.status === 'modified_unreviewed'
    && image.review.limit > 0 && image.review.roundsUsed >= image.review.limit;

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
      <img style={image.review?.displayBackground === '#ffffff' ? { background: '#ffffff' } : undefined} src={url} alt={`${labelPrefix} ${candidateNumber}`} loading="lazy" />
      <figcaption className="result-caption">
        <span>{labelPrefix} {candidateNumber} · {format.toUpperCase()}</span>
        {url ? (
          <span className="result-actions">
            {onUseForRefine ? (
              <button type="button" onClick={() => onUseForRefine(url, {...image,outputFormat:format})} aria-label={format==='svg'?`修改 SVG ${candidateNumber}`:t(`${labelPrefix === '精修结果' ? '继续精修结果' : `精修${labelPrefix}`} ${candidateNumber}`)} >
                {format==='svg'?'修改 SVG':t(labelPrefix === '精修结果' ? '继续精修' : '精修')}
              </button>
            ) : null}
            {journalProfile?<JournalExportPanel jobId={jobId} snapshot={journalProfile} candidateId={image.candidate_id??0} apiBase={apiBase} svg={format==='svg'}/>:<button type="button" onClick={downloadImage} disabled={isDownloading} aria-label={t("下载{v0} {v1}", {v0: labelPrefix, v1: candidateNumber})}>
              <FileDown size={15} />
              {t(isDownloading ? '准备中' : '下载')}
            </button>}
          </span>
        ) : null}
      </figcaption>
      {journalProfile&&<p className="journal-muted">{image.journalCheck?.checks?`期刊格式：已检查 ${image.journalCheck.checks.filter(c=>c.status==='checked').length} 项 · 未满足 ${image.journalCheck.checks.filter(c=>c.status==='unmet').length} 项 · 无法检查 ${image.journalCheck.checks.filter(c=>c.status==='uncheckable').length} 项 · 待确认 ${image.journalCheck.checks.filter(c=>c.status==='pending').length} 项。详情见检查与导出。`:image.journalCheck?.error||'此记录未保存生成时的期刊检查；可检查并导出实际文件。'}</p>}
      {image.review && !completedRevision ? <p className={`result-review ${image.review.status}`} role="status">{reviewStatusText(image.review, t)}{image.review.note ? <><br />{image.review.note}</> : null}</p> : null}
    </figure>
  );
}

function inferFormat(mimeType = '', outputFormat = '') {
  if (mimeType.includes('svg')) return 'svg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return outputFormat === 'svg' ? 'svg' : 'png';
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
