import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Hand, Maximize2, Minus, Plus } from 'lucide-react';
import { applyCommands, connectorEndpoints, renderSvg } from '@paperbanana/figure-core';
import { movePatch, objectBounds } from './state.js';
import { fitZoom, MAX_MANUAL_ZOOM, MIN_MANUAL_ZOOM, pointerDeltaMm, viewportGeometry, zoomScroll } from './viewportGeometry.js';

export default function FigureCanvas({ document, selectedId, onSelect, onCommands, readOnly }) {
  const [view, setView] = useState({ mode: 'fit', zoom: 1 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [panTool, setPanTool] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [draft, setDraft] = useState(null);
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef(null);
  const hostRef = useRef(null);
  const dragRef = useRef(null);
  const spaceRef = useRef(false);
  const pendingZoom = useRef(null);
  const visibleDoc = draft || document;
  const svg = useMemo(() => renderSvg(visibleDoc), [visibleDoc]);
  const selected = visibleDoc.elements.find((element) => element.id === selectedId);
  const bounds = selected && objectBounds('x1' in selected ? { ...selected, ...connectorEndpoints(selected, visibleDoc.elements) } : selected);
  const { widthMm, heightMm } = document.canvas;
  const zoom = view.mode === 'fit' ? fitZoom(document.canvas, viewport) : view.zoom;
  const geometry = useMemo(() => viewportGeometry(document.canvas, viewport, zoom), [widthMm, heightMm, viewport, zoom]);
  const panActive = panTool || spaceHeld;

  useLayoutEffect(() => {
    const element = viewportRef.current;
    const measure = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (width > 0 && height > 0) setViewport((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (view.mode === 'fit') { element.scrollLeft = 0; element.scrollTop = 0; pendingZoom.current = null; }
    else if (pendingZoom.current) {
      const { geometry: previous, scroll } = pendingZoom.current;
      const next = zoomScroll(previous, geometry, scroll, viewport);
      element.scrollLeft = next.left; element.scrollTop = next.top;
      pendingZoom.current = null;
    }
  }, [geometry, viewport, view.mode]);

  function cancelGesture() {
    dragRef.current = null; setDraft(null); setDragging(false); setPanning(false);
  }

  useEffect(() => {
    const keyDown = (event) => {
      if ((event.code !== 'Space' && event.key !== ' ') || event.target?.closest?.('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]')) return;
      event.preventDefault();
      spaceRef.current = true; setSpaceHeld(true);
      if (dragRef.current?.kind === 'object') cancelGesture();
    };
    const keyUp = (event) => { if (event.code === 'Space' || event.key === ' ') { spaceRef.current = false; setSpaceHeld(false); } };
    const blur = () => { spaceRef.current = false; setSpaceHeld(false); cancelGesture(); };
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur); };
  }, []);

  useEffect(() => {
    if (dragRef.current?.kind === 'object' && dragRef.current.source !== document) cancelGesture();
  }, [document]);

  function changeZoom(multiplier) {
    cancelGesture();
    pendingZoom.current = { geometry, scroll: { left: viewportRef.current.scrollLeft, top: viewportRef.current.scrollTop } };
    setView({ mode: 'manual', zoom: Math.min(MAX_MANUAL_ZOOM, Math.max(MIN_MANUAL_ZOOM, zoom * multiplier)) });
  }
  function fit() { cancelGesture(); pendingZoom.current = null; setView({ mode: 'fit', zoom: 1 }); }
  function runViewportTool(event, action) {
    action();
    // Mouse/touch users continue working on the paper after a toolbar action.
    // A keyboard/screen-reader click has detail=0 and retains button semantics.
    if (event.detail > 0) viewportRef.current.focus({ preventScroll: true });
  }

  function pointerDown(event) {
    if (event.button !== 0 && event.button !== 1) return;
    if (panTool || spaceRef.current || event.button === 1) {
      dragRef.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
      setPanning(true);
      event.currentTarget.setPointerCapture?.(event.pointerId); event.preventDefault(); return;
    }
    if (readOnly) return;
    const elementId = event.target.closest('[data-element-id]')?.getAttribute('data-element-id');
    onSelect(elementId || null);
    if (!elementId) return;
    const element = document.elements.find((item) => item.id === elementId);
    if (!element || element.fromId || element.toId) return;
    const rect = hostRef.current.querySelector('svg').getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return;
    dragRef.current = { kind: 'object', element, startX: event.clientX, startY: event.clientY, rect, patch: null, revision: document.revision, source: document };
    event.currentTarget.setPointerCapture?.(event.pointerId); event.preventDefault();
  }
  function pointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === 'pan') {
      event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.startX);
      event.currentTarget.scrollTop = drag.top - (event.clientY - drag.startY);
      return;
    }
    const delta = pointerDeltaMm({ x: drag.startX, y: drag.startY }, { x: event.clientX, y: event.clientY }, drag.rect, drag.source.canvas);
    if (Math.abs(delta.x) + Math.abs(delta.y) < 0.1) {
      drag.patch = null; setDraft(null); setDragging(false); return;
    }
    const patch = movePatch(drag.element, Math.round(delta.x * 10) / 10, Math.round(delta.y * 10) / 10);
    try {
      setDraft(applyCommands(drag.source, [{ type: 'update', id: drag.element.id, patch }], { baseRevision: drag.revision }));
      drag.patch = patch; setDragging(true);
    } catch { /* Invalid pointer previews retain the last valid object position. */ }
  }
  function pointerEnd(event) {
    const drag = dragRef.current;
    cancelGesture();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (drag?.kind === 'object' && drag.patch && drag.source === document) onCommands([{ type: 'update', id: drag.element.id, patch: drag.patch }], drag.revision);
  }

  return <section className={`fs-stage fs-viewport-stage ${panActive ? 'is-pan-tool' : ''} ${panning ? 'is-panning' : ''}`} aria-label="图稿画布" data-zoom-mode={view.mode}>
    <div className="fs-canvas-heading"><span>{readOnly ? '图稿预览' : '画布'}<span className="fs-viewport-help">{panActive ? '抓手平移中' : '空格拖动可平移'}</span></span><span>{widthMm} × {heightMm} mm</span></div>
    <div ref={viewportRef} className="fs-stage-scroll" aria-label="画布视口" role="region" tabIndex={0}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={cancelGesture} onLostPointerCapture={cancelGesture}>
      <div className="fs-page-space" style={{ width: geometry.width, height: geometry.height }}>
        <div className={`fs-page ${dragging ? 'is-dragging' : ''}`} style={{ left: geometry.paperLeft, top: geometry.paperTop, width: geometry.paperWidth, height: geometry.paperHeight }}>
          <div ref={hostRef} className="fs-svg-host" dangerouslySetInnerHTML={{ __html: svg }} />
          {!readOnly && bounds && <div className="fs-selection" aria-hidden="true" style={{ left: `${bounds.x / widthMm * 100}%`, top: `${bounds.y / heightMm * 100}%`, width: `${Math.max(bounds.width, 0.6) / widthMm * 100}%`, height: `${Math.max(bounds.height, 0.6) / heightMm * 100}%` }}><i /><i /><i /><i /></div>}
          {!document.elements.length && <div className="fs-blank-canvas"><span>从一个想法开始</span><p>{readOnly ? '这是空白图稿。请在电脑上添加内容。' : '添加文字、形状或图片，\n也可以先在左侧梳理图示结构。'}</p></div>}
        </div>
      </div>
    </div>
    <div className="fs-canvas-footer"><span>{document.elements.length} 个独立对象 · 版本 {document.revision}</span><div className="fs-zoom">
      <button aria-label="抓手平移画布" aria-pressed={panTool} title="抓手模式：拖动只平移视口，不移动对象；也可按住空格" onClick={(event) => runViewportTool(event, () => { cancelGesture(); setPanTool(!panTool); })}><Hand size={15} /></button>
      <button aria-label="缩小画布" disabled={zoom <= MIN_MANUAL_ZOOM} onClick={(event) => runViewportTool(event, () => changeZoom(1 / 1.25))}><Minus size={14} /></button>
      <output aria-label="画布缩放比例" title="100% = 每英寸 96 CSS 像素，不改变图稿毫米尺寸">{Math.round(zoom * 1000) / 10}%</output>
      <button aria-label="放大画布" disabled={zoom >= MAX_MANUAL_ZOOM} onClick={(event) => runViewportTool(event, () => changeZoom(1.25))}><Plus size={14} /></button>
      <button aria-label="适合窗口" aria-pressed={view.mode === 'fit'} title="完整显示纸张，并随视口大小调整" onClick={(event) => runViewportTool(event, fit)}><Maximize2 size={14} /></button>
    </div></div>
  </section>;
}
