import { useEffect, useRef, useState } from 'react';
import { Clock3, LoaderCircle, X } from 'lucide-react';
import StageTimeline from '../components/StageTimeline.jsx';
import { elapsedLabel } from './workspaceProgress.js';

// Overlays the canvas without resizing its viewport or remounting the editor.
export default function GenerationProgressPanel({ id, run, progress, taskId, triggerRef, onClose }) {
  const panel = useRef(null), closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [now, setNow] = useState(Date.now());
  const snapshot = progress?.taskId === taskId && progress?.runId === run.id ? progress : null;
  const stages = snapshot?.stages || [];
  useEffect(() => {
    panel.current.querySelector('button')?.focus({ preventScroll: true });
    const outside = event => {
      if (!panel.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) closeRef.current(false);
    };
    const escape = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(true); }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape, true);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape, true); };
  }, [triggerRef]);
  const started = new Date(snapshot?.createdAt || run.createdAt).getTime();
  const elapsed = Number.isFinite(started) ? elapsedLabel(now - started) : '计时待确认';
  const waiting = snapshot?.status === 'awaiting_provider';
  const stale = snapshot?.refreshFailed || (snapshot?.receivedAt && now - snapshot.receivedAt > 20000);
  const delivered = ['succeeded', 'completed'].includes(snapshot?.status);
  const status = stale ? '进度更新暂时延迟，正在重新查询' : delivered ? '正在载入已返回结果…' : waiting ? '等待渠道恢复，未重新提交' : !run.accepted ? '正在核对提交状态' : ['queued', 'pending'].includes(snapshot?.status) ? '等待开始执行' : stages.length ? '等待下一阶段返回…' : '等待阶段记录…';
  return <aside ref={panel} id={id} className="tw-generation-panel" role="dialog" aria-modal="false" aria-label="阶段记录">
    <header><div><strong>阶段记录</strong><span><Clock3 size={13} />已用 {elapsed}</span></div><button type="button" aria-label="关闭阶段记录" onClick={() => onClose(true)}><X size={18} /></button></header>
    <div className="tw-generation-records tw-run-evidence">
      <StageTimeline job={{ stages }} apiBase={snapshot?.base || ''} />
      <p className="tw-generation-next" role="status"><LoaderCircle size={15} className={waiting || stale ? '' : 'tw-spin'} />{status}</p>
    </div>
  </aside>;
}
