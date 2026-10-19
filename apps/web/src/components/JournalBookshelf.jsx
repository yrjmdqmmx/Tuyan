import {forwardRef,useEffect,useImperativeHandle,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,Check,Search} from 'lucide-react';
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
const JournalBookshelf=forwardRef(function JournalBookshelf({value,onBrowse,onNone,onDismiss,children,footer},ref) {
  const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[tag,setTag]=useState('');
  const [active,setActive]=useState(null),[flight,setFlight]=useState(null),[phase,setPhase]=useState('shelf');
  const bodyRef=useRef(null),shelfScrollRef=useRef(null),headingRef=useRef(null),originRef=useRef(null),flightRef=useRef(null);
  const animations=useRef([]),serial=useRef(0),afterClose=useRef(null),focusFrame=useRef(null);
  const activeJournal=JOURNALS.find(j=>j.id===active),meta=books[active];
  const matches=filterJournalBooks(query,category,tag);
  const cancelAnimations=()=>{serial.current++;animations.current.forEach(a=>a.cancel());animations.current=[];};
  useEffect(()=>()=>{cancelAnimations();cancelAnimationFrame(focusFrame.current);},[]);
  useEffect(()=>{if(shelfScrollRef.current)shelfScrollRef.current.scrollTop=0;},[query,category,tag]);
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||!window.Element.prototype.animate;
  const rectOf=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const targetFor=origin=>{
    const body=bodyRef.current.getBoundingClientRect();
    const pages=bodyRef.current.querySelector('.journal-reading-pages');
    if(pages&&body.width>600){const r=pages.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y,width:r.width/2,height:r.height};}
    const scale=Math.min(2.4,(body.height-60)/origin.height,(body.width-40)/(2*origin.width));
    return {x:body.x+body.width/2,y:body.y+(body.height-origin.height*scale)/2,width:origin.width*scale,height:origin.height*scale};
  };
  const browse=(journal,event)=>{
    if(phase!=='shelf')return;
    originRef.current=event.currentTarget;
    onBrowse(journal.id);
    setActive(journal.id);
    if(reduced()){setPhase('open');return;}
    const from=rectOf(event.currentTarget.querySelector('.journal-book-cover'));
    setPhase('opening');setFlight({from,to:targetFor(from),direction:'open'});
  };
  const back=(done)=>{
    if(done)afterClose.current=done;
    if(!active){afterClose.current?.();afterClose.current=null;return;}
    if(phase==='closing')return;
    const origin=originRef.current?.querySelector('.journal-book-cover');
    const end=()=>{setActive(null);setFlight(null);setPhase('shelf');if(afterClose.current){const cb=afterClose.current;afterClose.current=null;cb();}else focusFrame.current=requestAnimationFrame(()=>originRef.current?.focus({preventScroll:true}));};
    if(reduced()||!origin){cancelAnimations();end();return;}
    const to=rectOf(origin);
    const from=phase==='opening'&&flightRef.current?rectOf(flightRef.current):targetFor(to);
    const leaf=flightRef.current?.querySelector('.journal-flight-leaf');
    const faceFrom=leaf?getComputedStyle(leaf).transform:undefined;
    cancelAnimations();setPhase('closing');setFlight({from,to,direction:'close',faceFrom});
  };
  useImperativeHandle(ref,()=>({dismiss:back}));
  useLayoutEffect(()=>{
    if(!flight||!flightRef.current)return;
    const token=++serial.current,{from,direction,faceFrom}=flight,el=flightRef.current;
    // Measure after the reader mounts so the moving book meets the final page edges.
    const to=direction==='open'?targetFor(from):flight.to;
    const frame=r=>({left:r.x,top:r.y,width:r.width,height:r.height});
    const duration=direction==='open'?520:420;
    const motion=el.animate([{...frame(from),opacity:1},{...frame(to),opacity:1,offset:.84},{...frame(to),opacity:direction==='open'?0:1}],{duration,easing:'cubic-bezier(.22,.68,.2,1)',fill:'forwards'});
    const face=el.querySelector('.journal-flight-leaf').animate(direction==='open'?[{transform:'rotateY(0deg)'},{transform:'rotateY(0deg)',offset:.48},{transform:'rotateY(-180deg)',offset:.94},{transform:'rotateY(-180deg)'}]:[{transform:faceFrom||'rotateY(-180deg)'},{transform:'rotateY(0deg)',offset:.4},{transform:'rotateY(0deg)'}],{duration,easing:'ease-in-out',fill:'forwards'});
    animations.current=[motion,face];
    motion.onfinish=()=>{
      if(token!==serial.current)return;
      animations.current=[];setFlight(null);
      if(direction==='open')setPhase('open');
      else {setActive(null);setPhase('shelf');if(afterClose.current){const cb=afterClose.current;afterClose.current=null;cb();}else focusFrame.current=requestAnimationFrame(()=>originRef.current?.focus({preventScroll:true}));}
    };
    return ()=>{motion.cancel();face.cancel();};
  },[flight]);
  useEffect(()=>{if(phase==='open')headingRef.current?.focus({preventScroll:true});},[phase]);
  const reset=()=>{setQuery('');setCategory('');setTag('');};
  return <div ref={bodyRef} className={`journal-library phase-${phase}`}>
    <div className="journal-shelf-view" inert={active?true:undefined} aria-hidden={active?true:undefined}>
      <div className="journal-shelf-tools">
        <label className="journal-search"><Search size={17}/><input data-autofocus type="search" aria-label="搜索期刊" placeholder="搜索刊名、简称或出版社" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <label className="journal-category-filter"><span>学科</span><select aria-label="学科筛选" value={category} onChange={e=>setCategory(e.target.value)}><option value="">全部学科</option>{JOURNAL_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
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
      <div className="journal-shelf-count">{matches.length} 本期刊 · 点击封面查看规则</div>
      {onDismiss&&<div className="journal-shelf-dismiss"><button type="button" onClick={onDismiss}>关闭书架</button></div>}
    </div>
    {activeJournal&&<section className="journal-reader" aria-label={`${activeJournal.name} 详情`}>
      <div className="journal-reading-pages" inert={phase==='open'?undefined:true}>
        <div className="journal-introduction">
          <button type="button" className="journal-back" onClick={()=>back()}><ArrowLeft size={16}/>返回书架</button>
          <div className="journal-reader-cover"><JournalCover key={active} id={active} name={activeJournal.name}/></div>
          <h3 ref={headingRef} tabIndex={-1}>{activeJournal.name}</h3>
          <p className="journal-publisher">{activeJournal.publisher}</p>
          <p className="journal-subjects">{meta?.tags.join(' · ')}</p>
          <p className="journal-description">{meta?.description||'期刊介绍待补充。'}</p>
          <a className="journal-about-link" href={meta?.descriptionSource} target="_blank" rel="noreferrer">期刊官方介绍 ↗</a>
          {meta?.homepageUrl&&<a className="journal-about-link" href={meta.homepageUrl} target="_blank" rel="noreferrer">期刊官网 ↗</a>}
          {meta?.submissionUrl&&<a className="journal-about-link" href={meta.submissionUrl} target="_blank" rel="noreferrer">官方投稿入口 ↗</a>}
        </div>
        <div className="journal-detail">{children}</div>
      </div>
      <div className="journal-reader-footer" inert={phase==='open'?undefined:true}><button type="button" className="journal-back" onClick={()=>back()}><ArrowLeft size={16}/>返回书架</button>{footer}</div>
    </section>}
    {flight&&activeJournal&&<div className="journal-book-flight" ref={flightRef} aria-hidden="true" style={{left:flight.from.x,top:flight.from.y,width:flight.from.width,height:flight.from.height}}><div className="journal-flight-leaf"><JournalCover id={active} name={activeJournal.name}/><span className="journal-flight-verso"/></div></div>}
  </div>;
});
export default JournalBookshelf;
