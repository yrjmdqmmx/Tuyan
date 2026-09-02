import { useId, useMemo } from 'react'
import { Check, Loader2, RefreshCcw, Sparkles, X } from 'lucide-react'
import AccessibleDialog from './AccessibleDialog'
import { createInputDiff } from '../lib/inputDiff'

function DiffText({ segments, side }) {
  return segments.map((segment, index) => {
    const key = `${side}-${index}`
    if (segment.type === 'removed') return <del key={key}>{segment.text}</del>
    if (segment.type === 'added') return <ins key={key}>{segment.text}</ins>
    return <span key={key}>{segment.text}</span>
  })
}

export default function InputOptimizationDialog({
  open,
  targetLabel,
  original,
  candidate,
  status,
  error,
  onClose,
  onRetry,
  onAdopt,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const diff = useMemo(() => createInputDiff(original, candidate), [candidate, original])

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      className="input-optimization-dialog"
    >
      <header className="input-optimization-dialog-head">
        <div>
          <span><Sparkles size={15} /> 输入优化</span>
          <h2 id={titleId}>优化{targetLabel}</h2>
          <p id={descriptionId}>原文保持不变，确认采用后才会写回这一栏。</p>
        </div>
        <button type="button" data-autofocus aria-label="关闭输入优化" onClick={onClose}><X size={19} /></button>
      </header>

      <div className="input-optimization-dialog-body">
        <div className="input-optimization-comparison">
          <section className="input-optimization-side original-side">
            <header><span>原文</span><small>删除内容</small></header>
            <div className="input-optimization-copy" role="region" aria-label="原文，删除内容已标记">
              <DiffText segments={status === 'success' ? diff.before : [{ type: 'unchanged', text: original }]} side="before" />
            </div>
          </section>
          <section className="input-optimization-side candidate-side">
            <header><span>优化稿</span><small>新增内容</small></header>
            <div className="input-optimization-copy" role="region" aria-label="优化稿，新增内容已标记">
              {status === 'loading' ? (
                <div className="input-optimization-pending" aria-hidden="true"><Loader2 className="spin" size={22} /><span>正在生成候选…</span></div>
              ) : status === 'error' ? (
                <div className="input-optimization-empty" aria-hidden="true">本次没有生成候选，原文未改变。</div>
              ) : (
                <DiffText segments={diff.after} side="after" />
              )}
            </div>
          </section>
        </div>

        {status === 'loading' ? (
          <p className="input-optimization-live" role="status" aria-live="polite"><Loader2 className="spin" size={16} />正在优化，请稍候。关闭不会取消远端请求，但结果不会写入输入区。</p>
        ) : status === 'error' ? (
          <p className="input-optimization-live error" role="alert">优化失败：{error || '暂时无法生成候选，请稍后重试。'}</p>
        ) : (
          <p className="input-optimization-live success" role="status" aria-live="polite"><Check size={16} />优化完成。请比较标记内容后决定是否采用。</p>
        )}
      </div>

      <footer className="input-optimization-actions">
        <button type="button" onClick={onClose}>取消</button>
        {status !== 'loading' ? <button type="button" onClick={onRetry}><RefreshCcw size={16} />重新优化</button> : null}
        {status === 'success' ? <button type="button" className="primary-button" onClick={onAdopt}><Check size={16} />采用优化稿</button> : null}
      </footer>
    </AccessibleDialog>
  )
}
