import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Plus } from 'lucide-react';
import { referenceLibraryRequest } from '@paperbanana/api';
import { attachFeaturedTemplateImages, featuredTemplateRequest, FEATURED_TEMPLATE_REFERENCE_IDS } from '../lib/featuredTemplates.js';
import { appPath } from '../appPaths.js';
import { API_BASE_DEFAULT } from '../config.js';
import WorkspaceDialog from './WorkspaceDialog.jsx';

const categories = { method_framework:'方法框架', workflow:'实验流程', mechanism:'机制通路', system_architecture:'系统架构', data_stat:'统计图表' };
const localImage = (template, preview = true) => appPath(`/reference-library/${preview ? 'previews/' : ''}${template.sourceReferenceId.replace('journal_', '')}.${preview ? 'webp' : 'png'}`);
const wrap = (value, length) => ((value % length) + length) % length;
const distance = (index, center, length) => { const d = wrap(index - center, length); return d > length / 2 ? d - length : d; };
// Interpolate the existing fan poses so depth, tilt and scale follow the gesture too.
function pose(d, mobile) {
  const abs = Math.min(Math.abs(d), 2), near = Math.min(abs, 1), far = Math.max(0, abs - 1);
  return { x:Math.sign(d) * (near * (mobile ? 100 : 145) + far * (mobile ? 111 : 158)),
    y:near * 12 + far * 20, z:-near * 45 - far * 55, rotation:d * 7, turn:-d * 7,
    scale:1 - near * .14 - far * .13, opacity:1 - near * .16 - far * .84 };
}
const transform = p => `translate3d(${p.x}px,${p.y}px,${p.z}px) rotateZ(${p.rotation}deg) rotateY(${p.turn}deg) scale(${p.scale})`;

export default function HomeTemplateCarousel({ onApply, stopped = false, paused = false, mobile = false }) {
  const [templates, setTemplates] = useState(() => attachFeaturedTemplateImages([]));
  const [active, setActive] = useState(0), [selectedId, setSelectedId] = useState('');
  const [sourceLoaded, setSourceLoaded] = useState(false), [attempt, setAttempt] = useState(0), [sourceError, setSourceError] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true);
  const [hidden, setHidden] = useState(() => document.hidden), [dragging, setDragging] = useState(false), [focused, setFocused] = useState(false);
  const cards = useRef([]), deckRef = useRef(null), triggerRef = useRef(null), position = useRef(0), frame = useRef(null), focusAfterSnap = useRef(false), gesture = useRef(null), ignoreClick = useRef(false);
  const selected = templates.find(template => template.id === selectedId);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media?.matches ?? true), visibility = () => setHidden(document.hidden);
    media?.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { media?.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (stopped || paused || reduced || hidden || selectedId || dragging || focused) return;
    const timer = setTimeout(() => setActive(index => (index + 1) % templates.length), 4000);
    return () => clearTimeout(timer);
  }, [active, stopped, paused, reduced, hidden, selectedId, dragging, focused, templates.length]);
  // Keep the homepage local and lightweight; reuse the existing source/permission lookup only for a preview.
  useEffect(() => {
    if (!selectedId || sourceLoaded) return;
    const ac = new AbortController(); setSourceError(false);
    referenceLibraryRequest(API_BASE_DEFAULT, { runtime:'gateway' }, { ...featuredTemplateRequest(), signal:ac.signal })
      .then(result => {
        if (ac.signal.aborted) return;
        if (result.references?.length !== FEATURED_TEMPLATE_REFERENCE_IDS.length || result.references.some((reference, index) => reference?.id !== FEATURED_TEMPLATE_REFERENCE_IDS[index])) throw new Error('Template sources unavailable');
        setTemplates(attachFeaturedTemplateImages(result.references)); setSourceLoaded(true);
      })
      .catch(() => { if (!ac.signal.aborted) setSourceError(true); });
    return () => ac.abort();
  }, [selectedId, sourceLoaded, attempt]);
  function stopAnimation() { cancelAnimationFrame(frame.current); frame.current = null; }
  function paint(value) {
    position.current = value;
    cards.current.forEach((card, index) => {
      if (!card) return;
      const d = distance(index, value, templates.length), p = pose(d, mobile);
      Object.assign(card.style, { transform:transform(p), opacity:p.opacity, zIndex:Math.round(100 - Math.abs(d) * 20), filter:`blur(${Math.min(1.2, Math.abs(d) * 1.2)}px)` });
    });
  }
  function settle(index) {
    stopAnimation();
    const from = position.current, to = from + distance(index, from, templates.length);
    if (reduced || Math.abs(to - from) < .001) { paint(to); return; }
    const started = performance.now();
    const step = now => {
      const t = Math.min(1, (now - started) / 480);
      paint(from + (to - from) * (1 - (1 - t) ** 3));
      frame.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
  }
  useLayoutEffect(() => {
    if (!gesture.current) settle(active);
    if (focusAfterSnap.current) { focusAfterSnap.current = false; cards.current[active]?.focus({preventScroll:true}); }
    return stopAnimation;
  }, [active, reduced, mobile, templates.length]);
  // Losing the window mid-drag must never leave the deck grabbed or autoplay paused.
  useEffect(() => {
    const cancel = () => endGesture({type:'pointercancel'});
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => { window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', cancel); };
  }, [active, mobile, reduced]);
  function move(delta, focusCard = false) {
    const next = (active + delta + templates.length) % templates.length;
    setActive(next);
    if (focusCard) cards.current[next]?.focus({preventScroll:true});
  }
  function startGesture(event) {
    if (event.button !== 0 || event.isPrimary === false || gesture.current) return;
    stopAnimation(); ignoreClick.current = false;
    const capture = event.target.closest('button') || event.currentTarget;
    gesture.current = { id:event.pointerId, x:event.clientX, y:event.clientY, dx:0, start:position.current, dragged:false, capture, samples:[{x:event.clientX, t:event.timeStamp}] };
    setDragging(true); capture.setPointerCapture?.(event.pointerId);
  }
  function trackGesture(event) {
    const g = gesture.current; if (!g || g.id !== event.pointerId) return;
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (!g.dragged && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) { endGesture({type:'pointercancel'}); return; }
    g.dx = dx;
    g.samples = [...g.samples, {x:event.clientX, t:event.timeStamp}].filter(sample => event.timeStamp - sample.t <= 100);
    if (g.dragged || Math.abs(dx) > 8) {
      g.dragged = true;
      paint(g.start - dx / (mobile ? 100 : 145));
    }
  }
  function endGesture(event) {
    const g = gesture.current; if (!g || (event.pointerId != null && g.id !== event.pointerId)) return;
    // Include the release sample: a held drag has no flick momentum.
    if (event.type === 'pointerup') trackGesture(event);
    if (gesture.current !== g) return;
    gesture.current = null; setDragging(false);
    if (g.capture?.hasPointerCapture?.(g.id)) g.capture.releasePointerCapture(g.id);
    let next = active;
    if (g.dragged) {
      ignoreClick.current = true;
      const first = g.samples[0], last = g.samples.at(-1);
      const velocity = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
      const stride = mobile ? 100 : 145;
      if (event.type === 'pointerup' && (Math.abs(g.dx) >= stride * .28 || Math.abs(velocity) >= .45)) {
        const projected = position.current - Math.max(-1, Math.min(1, velocity * 180 / stride));
        const direction = Math.sign(position.current - g.start || -velocity);
        next = wrap(Math.round(projected), templates.length);
        if (next === active) next = wrap(active + direction, templates.length);
      }
    }
    if (next === active) settle(active);
    else {
      if (cards.current.includes(document.activeElement)) {
        document.activeElement.blur(); focusAfterSnap.current = true;
      }
      setActive(next);
    }
  }
  return <>
    <section className="tw-home-templates" aria-label="绘图模板轮播" aria-roledescription="轮播" data-template-index={active}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={event => { ignoreClick.current = false; if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1, true); } }}>
      <div ref={deckRef} className={`tw-template-deck${dragging ? ' is-dragging' : ''}`}
        onPointerDown={startGesture} onPointerMove={trackGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture}>
        <div className="tw-template-deck-inner">{templates.map((template, index) => {
          const d = distance(index, active, templates.length), p = pose(distance(index, position.current, templates.length), mobile), visible = Math.abs(d) <= 1;
          return <button type="button" key={template.id} ref={node => {cards.current[index]=node;}} className="tw-home-template" data-active={index === active}
            style={{transform:transform(p), opacity:p.opacity, zIndex:Math.round(100-Math.abs(distance(index, position.current, templates.length))*20), filter:`blur(${Math.min(1.2, Math.abs(distance(index, position.current, templates.length)) * 1.2)}px)`, pointerEvents:visible?'auto':'none'}} aria-hidden={!visible} tabIndex={index === active ? 0 : -1}
            aria-label={`${index === active ? '预览' : '切换到'}${template.title}`} onClick={event => {
              if (ignoreClick.current) return;
              if (index !== active) { setActive(index); return; }
              triggerRef.current=event.currentTarget; setSelectedId(template.id);
            }}>
            <img src={localImage(template)} alt={`${template.title}参考图`} draggable="false" onError={event => { const fallback = localImage(template,false); if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src=fallback; }}/>
            <span className="tw-home-template-label"><strong>{template.title}</strong><small>{categories[template.category]}</small><ArrowUpRight size={14} aria-hidden="true"/></span>
          </button>;
        })}</div>
      </div>
    </section>
    {selected && createPortal(<WorkspaceDialog title={selected.title} wide returnFocusRef={triggerRef} onClose={() => setSelectedId('')}>
      <div className="tw-template-detail">
        <img src={localImage(selected,false)} alt={`${selected.title}参考图`}/>
        <p className="tw-muted">论文原图 · 仅参考结构</p>
        <details className="tw-template-source"><summary>论文原图来源与许可</summary><p>{selected.attribution || (sourceError ? '来源信息暂未加载。' : '正在加载来源信息…')}</p>
          {sourceError && <button type="button" onClick={() => setAttempt(value=>value+1)}>重试加载来源</button>}
          <div>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer">查看原论文 <ArrowUpRight size={14}/></a>}{selected.licenseUrl && <a href={selected.licenseUrl} target="_blank" rel="noreferrer">查看许可 <ArrowUpRight size={14}/></a>}</div>
        </details>
        <h3>教学模板内容</h3><p>{selected.methodContent}</p><p className="tw-muted">{selected.caption}</p>
        <div className="tw-template-apply"><p>使用模板会新建任务，保留当前任务和草稿。确认内容后再生成图片。</p><button type="button" className="tw-primary" onClick={() => {onApply(selected);setSelectedId('');}}><Plus size={16}/>使用模板新建任务</button></div>
      </div>
    </WorkspaceDialog>, document.body)}
  </>;
}
