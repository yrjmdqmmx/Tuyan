import { FileImage } from 'lucide-react';
import { resolveImageUrl } from '../utils.js';
import FigureViewport from './FigureViewport.jsx';

export default function GenerationCanvas({ run, progress, taskId }) {
  const snapshot = progress?.taskId === taskId && progress?.runId === run.id ? progress : null;
  const last = snapshot?.stages.at(-1);
  const waiting = snapshot?.status === 'awaiting_provider';
  const queued = ['queued', 'pending'].includes(snapshot?.status);
  const headline = waiting ? '等待渠道恢复' : !run.accepted ? '正在确认提交' : queued ? '任务排队中' : last ? last.title : '等待执行服务返回进展';
  const image = snapshot?.preview && resolveImageUrl(snapshot.base || '', snapshot.preview.url);
  return <section className="tw-generation" aria-label="实时生成画布" aria-busy="true">
    {image ? <FigureViewport key={snapshot.preview.id} previewLabel={`过程图：${snapshot.preview.title}`} version={{ url: image, review: '过程图 · 尚未交付', origin: snapshot.preview.title }} />
      : <div className="tw-generation-placeholder"><FileImage size={34} strokeWidth={1.3} /><span>{last && !waiting && !queued ? '最近进展' : '执行状态'}</span><h2 key={headline}>{headline}</h2><p>{waiting ? '恢复后将继续当前任务。' : '生成服务返回过程图后，将在此画布展示。'}</p></div>}
  </section>;
}
