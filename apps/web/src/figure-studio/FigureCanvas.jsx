import { useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { applyCommands, connectorEndpoints, renderSvg } from '@paperbanana/figure-core';
import { movePatch, objectBounds } from './state.js';

export default function FigureCanvas({ document, selectedId, onSelect, onCommands, readOnly }) {
  const [zoom, setZoom] = useState(1);
  const [draft, setDraft] = useState(null);
  const [dragging, setDragging] = useState(false);
  const hostRef = useRef(null);
  const dragRef = useRef(null);
  const visibleDoc = draft || document;
  const svg = useMemo(() => renderSvg(visibleDoc), [visibleDoc]);
  const selected = visibleDoc.elements.find((element) => element.id === selectedId);
  const bounds = selected && objectBounds('x1' in selected ? { ...selected, ...connectorEndpoints(selected, visibleDoc.elements) } : selected);
  const { widthMm, heightMm } = visibleDoc.canvas;

  function pointerDown(event) {
    if (readOnly || event.button !== 0) return;
    const elementId = event.target.closest('[data-element-id]')?.getAttribute('data-element-id');
    onSelect(elementId || null);
    if (!elementId) return;
    const element = document.elements.find((item) => item.id === elementId);
    if (element.fromId || element.toId) return;
    const svgNode = hostRef.current.querySelector('svg');
    const rect = svgNode.getBoundingClientRect();
    dragRef.current = { element, startX: event.clientX, startY: event.clientY, rect, patch: null, revision: document.revision };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }
  function pointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) * widthMm / drag.rect.width;
    const dy = (event.clientY - drag.startY) * heightMm / drag.rect.height;
    if (Math.abs(dx) + Math.abs(dy) < 0.1) return;
    drag.patch = movePatch(drag.element, Math.round(dx * 10) / 10, Math.round(dy * 10) / 10);
    try {
      setDraft(applyCommands(document, [{ type: 'update', id: drag.element.id, patch: drag.patch }], { baseRevision: drag.revision }));
      setDragging(true);
    } catch { /* Pointer previews outside the document constraints stay at the last valid position. */ }
  }
  function pointerEnd(event) {
    const drag = dragRef.current;
    dragRef.current = null; setDraft(null); setDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (drag?.patch) onCommands([{ type: 'update', id: drag.element.id, patch: drag.patch }], drag.revision);
  }

  return <section className="fs-stage" aria-label="图稿画布">
    <div className="fs-canvas-heading"><span>{readOnly ? '图稿预览' : '画布'}</span><span>{widthMm} × {heightMm} mm</span></div>
    <div className="fs-stage-scroll">
      <div className={`fs-page ${dragging ? 'is-dragging' : ''}`} style={{ width: `${zoom * 100}%`, aspectRatio: `${widthMm} / ${heightMm}` }}>
        <div ref={hostRef} className="fs-svg-host" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={() => { dragRef.current = null; setDraft(null); setDragging(false); }} dangerouslySetInnerHTML={{ __html: svg }} />
        {!readOnly && bounds && <div className="fs-selection" aria-hidden="true" style={{ left: `${bounds.x / widthMm * 100}%`, top: `${bounds.y / heightMm * 100}%`, width: `${Math.max(bounds.width, 0.6) / widthMm * 100}%`, height: `${Math.max(bounds.height, 0.6) / heightMm * 100}%` }}><i /><i /><i /><i /></div>}
        {!document.elements.length && <div className="fs-blank-canvas"><span>从一个想法开始</span><p>{readOnly ? '这是空白图稿。请在电脑上添加内容。' : '添加文字、形状或图片，\n也可以先在左侧梳理图示结构。'}</p></div>}
      </div>
    </div>
    <div className="fs-canvas-footer"><span>{document.elements.length} 个独立对象 · 版本 {document.revision}</span><div className="fs-zoom"><button aria-label="缩小画布" disabled={zoom <= 0.5} onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}><Minus size={14} /></button><span>{Math.round(zoom * 100)}%</span><button aria-label="放大画布" disabled={zoom >= 2.5} onClick={() => setZoom(Math.min(2.5, zoom + 0.25))}><Plus size={14} /></button><button aria-label="适合窗口" onClick={() => setZoom(1)}><Maximize2 size={14} /></button></div></div>
  </section>;
}
