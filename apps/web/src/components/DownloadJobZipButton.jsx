import {journalFigureExportRequest} from '@paperbanana/api';
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
      if(job.journalProfile){
        const {default:Zip}=await import('jszip');const zip=new Zip();
        for(const image of job.result_images||[]){
          const result=await journalFigureExportRequest(apiBase,{jobId:job.id,candidateId:image.candidate_id,format:'original',download:true});
          zip.file(result.file.filename,result.file.base64,{base64:true});
          zip.file(result.file.filename+'.check.json',JSON.stringify(result.report,null,2));
        }
        zip.file('journal-rules.json',JSON.stringify(job.journalProfile,null,2));
        zip.file('README.txt','仅打包最终结果及逐文件检查；过程图与参考图不在此期刊导出包内。请阅读未满足、待确认、无法检查和 AI 政策事项；本检查不保证投稿合规。');
        triggerDownload(URL.createObjectURL(await zip.generateAsync({type:'blob'})),`tuyan-${job.id}-journal-checked.zip`);
        setStatusMessage('已打包最终结果与逐文件检查报告；存在未满足或待确认事项时仍需处理。');
        return;
      }
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
        {isPreparing ? '打包中' : job.journalProfile?'检查并打包结果':'下载全部'}
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
