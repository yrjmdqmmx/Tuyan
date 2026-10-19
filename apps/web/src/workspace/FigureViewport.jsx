import { useLayoutEffect, useRef, useState } from 'react';
import { Expand, Minimize2, Minus, Plus, Scan } from 'lucide-react';
import { versionLabel } from './workspaceState.js';

const EDGE = 4;

// Read-only preview for both saved PNG and SVG results. The actual SVG editor
// owns its separate grid, selection handles and editing tools.
export default function FigureViewport({ version, onFullscreen, fullscreen = false, onInteract, interactionKey = 'idle', previewLabel }) {
  const viewport = useRef(null), previous = useRef(null), interacted = useRef(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(null), [failed, setFailed] = useState(false);
  const ready = natural.width > 0 && natural.height > 0 && !failed;
  const fit = ready && box.width && box.height ? Math.min(Math.max(1, box.width - EDGE * 2) / natural.width, Math.max(1, box.height - EDGE * 2) / natural.height) : 1;
  const scale = zoom ?? fit;
  const size = { width: natural.width * scale, height: natural.height * scale };
  const stage = { width: Math.max(box.width, size.width + EDGE * 2), height: Math.max(box.height, size.height + EDGE * 2) };

  useLayoutEffect(() => {
    const node = viewport.current;
    const measure = () => setBox(old => node.clientWidth === old.width && node.clientHeight === old.height ? old : { width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const node = viewport.current, old = previous.current;
    // Keep the viewed center reachable when zooming, including portrait images.
    const x = zoom === null || !old ? .5 : (node.scrollLeft + old.boxWidth / 2) / old.width;
    const y = zoom === null || !old ? .5 : (node.scrollTop + old.boxHeight / 2) / old.height;
    node.scrollLeft = Math.max(0, stage.width * x - box.width / 2);
    node.scrollTop = Math.max(0, stage.height * y - box.height / 2);
    previous.current = { ...stage, boxWidth: box.width, boxHeight: box.height };
  }, [stage.width, stage.height, box.width, box.height, zoom]);

  function interact() {
    if (interacted.current !== interactionKey) { interacted.current = interactionKey; onInteract?.(); }
  }
  function changeZoom(next) { interact(); setZoom(next === null ? null : Math.max(.05, Math.min(4, next))); }
  return <div className={`tw-figure-viewport ${zoom === null ? 'is-fit' : ''} ${fullscreen ? 'is-fullscreen' : ''}`}>
    <div ref={viewport} className="tw-figure-scroll" tabIndex={0} role="region" aria-label="作品预览，放大后可滚动查看" onPointerDown={interact} onWheel={interact} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) interact(); }}>
      {failed ? <div className="tw-preview-failure" role="alert">此版本预览加载失败，原记录仍保留。<button type="button" onClick={() => { setFailed(false); setNatural({ width: 0, height: 0 }); }}>重新载入</button></div>
        : <div className="tw-figure-stage" style={ready ? stage : undefined}><img src={version.url} alt={previewLabel || versionLabel(version, true)} draggable={false} style={ready ? size : { visibility: 'hidden' }} onLoad={e => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} onError={() => setFailed(true)} /></div>}
    </div>
    <div className="tw-view-tools" role="toolbar" aria-label="预览工具">
      <span className="tw-view-meta">{version.review}<span> · {version.origin}</span></span>
      <button type="button" aria-label="缩小预览" title="缩小" disabled={!ready || scale <= .05} onClick={() => changeZoom(scale / 1.25)}><Minus size={16} /></button>
      <button type="button" className="tw-zoom-value" aria-label="按原始大小查看（100%）" title="按原始大小查看（100%）" disabled={!ready} onClick={() => changeZoom(1)}>{ready ? `${Math.round(scale * 100)}%` : '—'}</button>
      <button type="button" aria-label="放大预览" title="放大" disabled={!ready || scale >= 4} onClick={() => changeZoom(scale * 1.25)}><Plus size={16} /></button>
      <span className="tw-view-divider" aria-hidden="true" />
      <button type="button" aria-label="适应画布" aria-pressed={zoom === null} title="完整显示图片" disabled={!ready} onClick={() => changeZoom(null)}><Scan size={16} /><span>适应</span></button>
      {onFullscreen && <button type="button" aria-label={fullscreen ? '退出全屏预览' : '全屏预览'} title={fullscreen ? '退出全屏' : '全屏预览'} onClick={onFullscreen}>{fullscreen ? <Minimize2 size={16} /> : <Expand size={16} />}</button>}
    </div>
  </div>;
}
