import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from 'lucide-react'
import AccessibleDialog from './AccessibleDialog'

export default function ImagePreviewDialog({ item, imageUrl, isSelected, selectionDisabled, hasPrevious, hasNext, onPrevious, onNext, onToggle, onClose }) {
  const titleId = useId()
  const descriptionId = useId()
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }) }
  useEffect(reset, [item?.id])
  const changeZoom = (next) => setZoom(Math.min(4, Math.max(0.5, next)))

  return (
    <AccessibleDialog open={Boolean(item && imageUrl)} onClose={onClose} labelledBy={titleId} describedBy={descriptionId} className="image-preview-dialog">
      <header className="image-preview-toolbar">
        <div className="image-preview-zoom"><button type="button" aria-label="缩小" onClick={() => changeZoom(zoom - 0.25)}><Minus size={17} /></button><span>{Math.round(zoom * 100)}%</span><button type="button" aria-label="放大" onClick={() => changeZoom(zoom + 0.25)}><Plus size={17} /></button><button type="button" aria-label="重置" onClick={reset}><RotateCcw size={17} /> 重置</button></div>
        <button type="button" className="image-preview-close" aria-label="关闭大图预览" onClick={onClose}><X size={20} /></button>
      </header>
      <div className="image-preview-layout">
        <div
          className="image-preview-stage"
          onWheel={(event) => { event.preventDefault(); changeZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2)) }}
          onPointerDown={(event) => { dragRef.current = { x: event.clientX, y: event.clientY, origin: pan }; event.currentTarget.setPointerCapture(event.pointerId) }}
          onPointerMove={(event) => { if (!dragRef.current) return; setPan({ x: dragRef.current.origin.x + event.clientX - dragRef.current.x, y: dragRef.current.origin.y + event.clientY - dragRef.current.y }) }}
          onPointerUp={() => { dragRef.current = null }}
        >
          <img src={imageUrl} alt={item?.titleZh || item?.title || '参考案例大图'} draggable="false" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
          <button type="button" className="image-preview-nav previous" aria-label="上一张" onClick={onPrevious} disabled={!hasPrevious}><ChevronLeft size={22} /></button><button type="button" className="image-preview-nav next" aria-label="下一张" onClick={onNext} disabled={!hasNext}><ChevronRight size={22} /></button>
        </div>
        <aside className="image-preview-details">
          <div className="reference-card-tags"><span>{item?.visualCategory}</span><span>{item?.researchDomain}</span></div>
          <h2 id={titleId}>{item?.titleZh || item?.title}</h2><p id={descriptionId}>{item?.detailZh || item?.shortIntroZh || item?.introZh || item?.summary}</p>
          {item?.keywords?.length ? <div className="image-preview-keywords" aria-label="关键词">{item.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div> : null}
          <details className="image-preview-original"><summary>英文原文 <ChevronDown size={15} /></summary><strong lang="en">{item?.title}</strong><p lang="en">{item?.summary}</p></details>
          <button type="button" className={isSelected ? 'preview-select active' : 'preview-select'} aria-pressed={isSelected} disabled={selectionDisabled} onClick={onToggle}>{isSelected ? <><X size={16} /> 取消选用</> : <><Check size={16} /> 选用此案例</>}</button>
        </aside>
      </div>
    </AccessibleDialog>
  )
}
