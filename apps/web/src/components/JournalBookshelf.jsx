import {forwardRef,useEffect,useImperativeHandle,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,Check,ChevronDown,Search,X} from 'lucide-react';
import books from '../data/journal-books.json';
import {JOURNALS,JOURNAL_STATUS} from '../../../../packages/api/src/journal-rules.js';

export const JOURNAL_CATEGORIES=['综合科学','人工智能与工程','材料与化学','生命科学','经济与管理','人文与社会科学'];
const tags=['心理学','人口学','图书情报','金融','经济学','人工智能','医学','材料科学'];
export function filterJournalBooks(query='',category='',tag='') {
  const words=query.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  return JOURNALS.filter(j=>{
    const b=books[j.id];
    const haystack=[j.name,j.publisher,...(j.subjects||[]),b?.category,...(b?.tags||[]),...(b?.aliases||[])].join(' ').normalize('NFKC').toLowerCase();
    return (!category||b?.category===category)&&(!tag||b?.tags.includes(tag))&&words.every(w=>haystack.includes(w));
  }).sort((a,b)=>JOURNAL_CATEGORIES.indexOf(books[a.id]?.category)-JOURNAL_CATEGORIES.indexOf(books[b.id]?.category));
}

export function JournalCover({id,name,generic=false}) {
  const cover=books[id]?.cover;
  const [failed,setFailed]=useState(false);
  const src=cover?.src&&`${import.meta.env?.BASE_URL||'/'}${cover.src.slice(1)}`;
  return <span className={`journal-book-cover ${generic?'is-generic':''} ${!src||failed?'is-placeholder':''}`}>
    {src&&!failed?<img src={src} alt={`${name} 展示图`} width={cover.width} height={cover.height} loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<span className="journal-cover-lettering"><strong>{name}</strong>{!generic&&<small>{failed?'封面暂未载入':'刊名占位'}</small>}</span>}
  </span>;
}

// The shelf stays mounted and inert while reading: filters, scroll and origin geometry survive.
// There is only one flight layer; a new transition cancels its predecessor before starting.
const JournalBookshelf=forwardRef(function JournalBookshelf({value,onBrowse,onNone,onDismiss,header,children,footer},ref) {
  const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[tag,setTag]=useState('');
  const [active,setActive]=useState(null),[flight,setFlight]=useState(null),[phase,setPhase]=useState('shelf');
  const bodyRef=useRef(null),readerRef=useRef(null),pagesRef=useRef(null),shelfScrollRef=useRef(null),headingRef=useRef(null),originRef=useRef(null),flightRef=useRef(null);
  const animations=useRef([]),serial=useRef(0),afterClose=useRef(null),returnFocus=useRef(false);
  const activeJournal=JOURNALS.find(j=>j.id===active),meta=books[active];
  const matches=filterJournalBooks(query,category,tag);
  const cancelAnimations=()=>{serial.current++;animations.current.forEach(a=>a.cancel());animations.current=[];};
  useEffect(()=>()=>{cancelAnimations();},[]);
  useEffect(()=>{if(shelfScrollRef.current)shelfScrollRef.current.scrollTop=0;},[query,category,tag]);
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||!window.Element.prototype.animate;
  const rectOf=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const browse=(journal,event)=>{
    if(phase!=='shelf')return;
    originRef.current=event.currentTarget;
    onBrowse(journal.id);
    setActive(journal.id);
    if(reduced()){setPhase('open');return;}
    const from=rectOf(event.currentTarget.querySelector('.journal-book-cover'));
    setPhase('opening');setFlight({origin:from,direction:'open'});
  };
  const back=(done)=>{
    if(done)afterClose.current=done;
    if(!active){afterClose.current?.();afterClose.current=null;return;}
    if(phase==='closing')return;
    const origin=originRef.current?.querySelector('.journal-book-cover');
    const end=()=>{setActive(null);setFlight(null);setPhase('shelf');if(afterClose.current){const cb=afterClose.current;afterClose.current=null;cb();}else returnFocus.current=true;};
    if(reduced()||!origin){cancelAnimations();end();return;}
    // Capture the rendered frame before cancelling: Escape/close during opening
    // reverses from what the user sees, not from a newly measured bounding box.
    const readerStyle=getComputedStyle(readerRef.current),pageStyle=getComputedStyle(pagesRef.current);
    const leaf=flightRef.current?.querySelector('.journal-flight-leaf');
    const leafStyle=leaf?getComputedStyle(leaf):null;
    const current={transform:readerStyle.transform,pagesOpacity:pageStyle.opacity,face:leafStyle?.transform||'rotateY(-180deg)',faceOpacity:flightRef.current?getComputedStyle(flightRef.current).opacity:'0'};
    cancelAnimations();setPhase('closing');setFlight({origin:rectOf(origin),direction:'close',current});
  };
  useImperativeHandle(ref,()=>({dismiss:back,backToShelf:()=>{if(!active)return false;back();return true;}}));
  useLayoutEffect(()=>{
    if(!flight||!flightRef.current||!readerRef.current)return;
    const token=++serial.current,{origin,direction,current}=flight;
    const body=bodyRef.current.getBoundingClientRect(),narrow=getComputedStyle(pagesRef.current).display==='block';
    const pageWidth=body.width/(narrow?1:2),sx=origin.width/pageWidth,sy=origin.height/body.height;
    const closed=`translate3d(${origin.x-body.x-(narrow?0:pageWidth*sx)}px,${origin.y-body.y}px,0) scale(${sx},${sy})`;
    const open='translate3d(0,0,0) scale(1,1)',opening=direction==='open';
    const duration=opening?680:460,options={duration,easing:'cubic-bezier(.22,.72,.18,1)',fill:'both'};
    // Move the actual spread using transforms; its pages and hinged cover reveal
    // together. No per-frame width/height layout or late swap to a second book.
    const motion=readerRef.current.animate(opening?[{transform:closed},{transform:open,offset:.78},{transform:open}]:[{transform:current.transform},{transform:current.transform,offset:.12},{transform:closed}],options);
    const face=flightRef.current.querySelector('.journal-flight-leaf').animate(opening?[
      {transform:'rotateY(0deg)'},{transform:'rotateY(-12deg)',offset:.22},
      {transform:'rotateY(-176deg)',offset:.86},{transform:'rotateY(-180deg)'},
    ]:[{transform:current.face},{transform:current.face,offset:.12},{transform:'rotateY(0deg)',offset:.65},{transform:'rotateY(0deg)'}],{...options,easing:'cubic-bezier(.4,0,.2,1)'});
    // Opacity belongs outside the 3D leaf: fading the leaf itself flattens its
    // faces and exposes a mirrored cover instead of the paper verso.
    const cover=flightRef.current.animate(opening?[{opacity:1},{opacity:1,offset:.64},{opacity:0}]:[{opacity:current.faceOpacity},{opacity:1,offset:.12},{opacity:1}],options);
    const pages=pagesRef.current.animate(opening?[{opacity:0},{opacity:0,offset:.16},{opacity:1,offset:.64},{opacity:1}]:[{opacity:current.pagesOpacity},{opacity:0,offset:.66},{opacity:0}],options);
    animations.current=[motion,face,cover,pages];
    motion.onfinish=()=>{
      if(token!==serial.current)return;
      animations.current=[];setFlight(null);
      if(direction==='open')setPhase('open');
      else {setActive(null);setPhase('shelf');if(afterClose.current){const cb=afterClose.current;afterClose.current=null;cb();}else returnFocus.current=true;}
    };
    return ()=>{motion.cancel();face.cancel();cover.cancel();pages.cancel();};
  },[flight]);
  useLayoutEffect(()=>{
    if(phase==='shelf'&&returnFocus.current){
      // The shelf must have lost inert before restoring focus after a WAAPI callback.
      returnFocus.current=false;originRef.current?.focus({preventScroll:true});
    }
  },[phase]);
  useEffect(()=>{if(phase==='open')headingRef.current?.focus({preventScroll:true});},[phase]);
  const reset=()=>{setQuery('');setCategory('');setTag('');};
  return <div ref={bodyRef} className={`journal-library phase-${phase}`}>
    <div className="journal-shelf-view" inert={active?true:undefined} aria-hidden={active?true:undefined}>
      {header}
      <div className="journal-shelf-tools">
        <label className="journal-search"><Search size={17}/><input data-autofocus type="search" aria-label="搜索期刊" placeholder="搜索刊名、简称或出版社" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <label className="journal-category-filter"><span>学科</span><span className="journal-category-select"><select aria-label="学科筛选" value={category} onChange={e=>setCategory(e.target.value)}><option value="">全部学科</option>{JOURNAL_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={16} aria-hidden="true"/></span></label>
      </div>
      <div className="journal-tag-filters" aria-label="细分学科"><button type="button" aria-pressed={!tag} onClick={()=>setTag('')}>全部</button>{tags.map(t=><button type="button" key={t} aria-pressed={tag===t} onClick={()=>setTag(tag===t?'':t)}>{t}</button>)}</div>
      <nav ref={shelfScrollRef} className="journal-shelves" aria-label="期刊列表">
        <button type="button" className="journal-book" aria-pressed={!value} aria-label={`不指定期刊${!value?' · 已选择':''}`} onClick={onNone}>
          <span className="journal-cover-space"><JournalCover generic name="不指定期刊"/></span><span className="journal-book-caption"><strong>不指定期刊</strong><small>{!value&&<Check size={12}/>}通用流程</small></span>
        </button>
        {matches.map(j=><button type="button" className="journal-book" key={j.id} data-reading={active===j.id?true:undefined} aria-pressed={value?.journalId===j.id} aria-label={`${j.name} · ${JOURNAL_STATUS[j.status]}${value?.journalId===j.id?' · 已选择':''}`} onClick={e=>browse(j,e)}>
          <span className="journal-cover-space"><JournalCover id={j.id} name={j.name}/></span>
          <span className="journal-book-caption"><strong>{j.name}</strong><small className={`journal-book-status ${j.status}`}>{value?.journalId===j.id&&<Check size={12}/>}<span>{JOURNAL_STATUS[j.status]}{value?.journalId===j.id?' · 已选择':''}</span></small><span className="journal-book-subject">{books[j.id]?.category}</span></span>
        </button>)}
        {!matches.length&&<div className="journal-shelf-empty" role="status"><p>没有符合当前搜索与筛选条件的期刊。</p><button type="button" onClick={reset}>重置搜索与筛选</button></div>}
      </nav>
    </div>
    {activeJournal&&<section ref={readerRef} className="journal-reader" aria-label={`${activeJournal.name} 详情`}>
      <div ref={pagesRef} className="journal-reading-pages" inert={phase==='open'?undefined:true}>
        <div className="journal-introduction">
          <button type="button" className="journal-back" onClick={()=>back()}><ArrowLeft size={16}/>返回书架</button>
          <div className="journal-introduction-copy">
          <div className="journal-reader-cover"><JournalCover key={active} id={active} name={activeJournal.name}/></div>
          <h3 ref={headingRef} tabIndex={-1}>{activeJournal.name}</h3>
          <p className="journal-publisher">{activeJournal.publisher}</p>
          <p className="journal-subjects">{meta?.tags.join(' · ')}</p>
          <p className="journal-description">{meta?.description||'期刊介绍待补充。'}</p>
          <a className="journal-about-link" href={meta?.descriptionSource} target="_blank" rel="noreferrer">期刊官方介绍 ↗</a>
          {meta?.homepageUrl&&<a className="journal-about-link" href={meta.homepageUrl} target="_blank" rel="noreferrer">期刊官网 ↗</a>}
          {meta?.submissionUrl&&<a className="journal-about-link" href={meta.submissionUrl} target="_blank" rel="noreferrer">官方投稿入口 ↗</a>}
          </div>
        </div>
        <div className="journal-rule-page">
          <div className="journal-detail">{children}</div>
          <div className="journal-reader-actions">{footer}</div>
        </div>
      </div>
      {onDismiss&&<button type="button" className="journal-reader-close" aria-label="关闭期刊规则" onClick={onDismiss}><X size={18}/></button>}
      {flight&&<div className="journal-book-flight" ref={flightRef} aria-hidden="true"><div className="journal-flight-leaf"><JournalCover id={active} name={activeJournal.name}/><span className="journal-flight-verso"/></div></div>}
    </section>}
  </div>;
});
export default JournalBookshelf;
