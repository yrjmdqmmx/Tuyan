import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { referenceLibraryRequest } from '@paperbanana/api';
import { attachFeaturedTemplateImages, featuredTemplateRequest, FEATURED_TEMPLATE_REFERENCE_IDS } from '../lib/featuredTemplates.js';
import { appPath } from '../appPaths.js';
import { API_BASE_DEFAULT } from '../config.js';
import WorkspaceDialog from './WorkspaceDialog.jsx';

const categories = { method_framework:'方法框架', workflow:'实验流程', mechanism:'机制通路', system_architecture:'系统架构', data_stat:'统计图表' };
const localImage = (template, preview = true) => appPath(`/reference-library/${preview ? 'previews/' : ''}${template.sourceReferenceId.replace('journal_', '')}.${preview ? 'webp' : 'png'}`);
const distance = (index, center, length) => { const d = (index - center + length) % length; return d > length / 2 ? d - length : d; };
function pose(d, mobile) {
  const abs = Math.abs(d);
  return { x:Math.sign(d) * (abs === 1 ? mobile ? 100 : 145 : abs ? mobile ? 211 : 303 : 0), y:abs === 0 ? 0 : abs === 1 ? 12 : 32,
    z:abs === 0 ? 0 : abs === 1 ? -45 : -100, rotation:d * 7, turn:-d * 7, scale:abs === 0 ? 1 : abs === 1 ? .86 : .73, opacity:abs === 0 ? 1 : abs === 1 ? .84 : 0 };
}
const transform = p => `translate3d(${p.x}px,${p.y}px,${p.z}px) rotateZ(${p.rotation}deg) rotateY(${p.turn}deg) scale(${p.scale})`;

export default function HomeTemplateCarousel({ onApply, stopped = false, paused = false, mobile = false }) {
  const [templates, setTemplates] = useState(() => attachFeaturedTemplateImages([]));
  const [active, setActive] = useState(0), [selectedId, setSelectedId] = useState('');
  const [sourceLoaded, setSourceLoaded] = useState(false), [attempt, setAttempt] = useState(0), [sourceError, setSourceError] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true);
  const [hidden, setHidden] = useState(() => document.hidden), [dragging, setDragging] = useState(false), [focused, setFocused] = useState(false);
  const cards = useRef([]), deckRef = useRef(null), triggerRef = useRef(null), previous = useRef(0), gesture = useRef(null), ignoreClick = useRef(0);
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
  useLayoutEffect(() => {
    const old = previous.current; previous.current = active;
    const animations = [];
    cards.current.forEach((card, index) => {
      card?.getAnimations?.().forEach(animation => animation.cancel());
      if (!card?.animate || old === active || reduced) return;
      const d = distance(index, active, templates.length), oldD = distance(index, old, templates.length);
      const to = pose(d, mobile), from = pose(oldD, mobile);
      const start = Math.abs(d - oldD) > templates.length / 2 ? { ...to, opacity:0 } : from;
      const middle = { ...to, x:(start.x + to.x) / 2, y:(start.y + to.y) / 2 - (d === 0 || oldD === 0 ? 18 : 5), z:(start.z + to.z) / 2 + 8,
        rotation:(start.rotation + to.rotation) / 2, turn:(start.turn + to.turn) / 2, scale:(start.scale + to.scale) / 2, opacity:(start.opacity + to.opacity) / 2 };
      animations.push(card.animate([start, middle, to].map((p, i) => ({ transform:transform(p), opacity:p.opacity, offset:[0,.48,1][i] })), { duration:760, easing:'cubic-bezier(.22,.7,.18,1)' }));
    });
    return () => animations.forEach(animation => animation.cancel());
  }, [active, reduced, mobile, templates.length]);
  function move(delta) { setActive(index => (index + delta + templates.length) % templates.length); }
  function endGesture(event) {
    const g = gesture.current; if (!g) return;
    gesture.current = null; setDragging(false); deckRef.current?.style.removeProperty('--template-drag');
    if (g.capture?.hasPointerCapture?.(g.id)) g.capture.releasePointerCapture(g.id);
    if (g.dragged) { ignoreClick.current = performance.now() + 350; if (event.type === 'pointerup' && Math.abs(g.dx) > 40) move(g.dx < 0 ? 1 : -1); }
  }
  return <>
    <section className="tw-home-templates" aria-label="绘图模板轮播" aria-roledescription="轮播" data-template-index={active}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } }}>
      <div ref={deckRef} className={`tw-template-deck${dragging ? ' is-dragging' : ''}`}
        onPointerDown={event => { if (event.button !== 0) return; const capture=event.target.closest('button') || event.currentTarget; gesture.current = {id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,dragged:false,capture}; setDragging(true); capture.setPointerCapture?.(event.pointerId); }}
        onPointerMove={event => { const g = gesture.current; if (!g || g.id !== event.pointerId) return; const dx = event.clientX-g.x, dy = event.clientY-g.y;
          if (!g.dragged && Math.abs(dy)>Math.abs(dx) && Math.abs(dy)>12) { endGesture({type:'pointercancel'}); return; }
          g.dx=dx; if (g.dragged || Math.abs(dx)>10) { g.dragged=true;event.currentTarget.style.setProperty('--template-drag',`${Math.max(-36,Math.min(36,dx*.2))}px`); }
        }} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture}>
        <div className="tw-template-deck-inner">{templates.map((template, index) => {
          const d = distance(index, active, templates.length), p = pose(d, mobile), visible = Math.abs(d) <= 1;
          return <button type="button" key={template.id} ref={node => {cards.current[index]=node;}} className="tw-home-template" data-active={index === active}
            style={{transform:transform(p), opacity:p.opacity, zIndex:10-Math.abs(d)*2, pointerEvents:visible?'auto':'none'}} aria-hidden={!visible} tabIndex={index === active ? 0 : -1}
            aria-label={`${index === active ? '预览' : '切换到'}${template.title}`} onClick={event => {
              if (performance.now() < ignoreClick.current) return;
              if (index !== active) { setActive(index); return; }
              triggerRef.current=event.currentTarget; setSelectedId(template.id);
            }}>
            <img src={localImage(template)} alt={`${template.title}参考图`} draggable="false" onError={event => { const fallback = localImage(template,false); if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src=fallback; }}/>
            <span className="tw-home-template-label"><strong>{template.title}</strong><small>{categories[template.category]}</small><ArrowUpRight size={14} aria-hidden="true"/></span>
          </button>;
        })}</div>
      </div>
    </section>
    {selected && <WorkspaceDialog title={selected.title} wide returnFocusRef={triggerRef} onClose={() => setSelectedId('')}>
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
    </WorkspaceDialog>}
  </>;
}
