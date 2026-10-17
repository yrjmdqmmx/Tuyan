import {useId, useMemo, useState, useEffect, useRef, useLayoutEffect} from 'react'
import {Check, ChevronDown, Search, Shapes, X, Expand} from 'lucide-react'
import AccessibleDialog from './AccessibleDialog'
import FigurePreviewImage from './FigurePreviewImage'
import {FIGURE_TYPE_PREVIEWS} from '../data/figure-type-previews.js'
import {FIGURE_GROUPS, FIGURE_TYPES, getFigureType, figureTypePath, searchFigureTypes} from '../../../../packages/figure-taxonomy/src/index.js'
import {REFERENCE_COVERAGE} from '../../../../packages/figure-taxonomy/src/reference-coverage.js'

export default function FigureTypePicker({value, onChange, coverage=REFERENCE_COVERAGE}) {
 const [open,setOpen]=useState(false)
 const [query,setQuery]=useState('')
 const [group,setGroup]=useState(getFigureType(value)?.group||'schematic')
 const [page,setPage]=useState(1)
 const [previewTypeId,setPreviewTypeId]=useState(null)
 const [showOriginal,setShowOriginal]=useState(false)
 const title=useId(), description=useId()
 const previewTitle=useId(), previewDescription=useId()
 const navRef=useRef(null)
 const resultsRef=useRef(null)
 useLayoutEffect(()=>{if(resultsRef.current)resultsRef.current.scrollTop=0},[open,group,query,page])
 useEffect(()=>{if(open&&!query)navRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView?.({block:'nearest',inline:'nearest'})},[open,group,query])
 const selected=getFigureType(value)
 const previewType=getFigureType(previewTypeId)
 const preview=FIGURE_TYPE_PREVIEWS[previewTypeId]
 const matches=useMemo(()=>searchFigureTypes(query,query?'':group),[query,group])
 const pageCount=Math.max(1,Math.ceil(matches.length/12))
 return <section className="figure-type-setting" data-focus-setting="figure-type">
  <label htmlFor={`${title}-trigger`}>信息图类别</label>
  <button type="button" id={`${title}-trigger`} className="figure-type-trigger" aria-haspopup="dialog" onClick={()=>{setGroup(selected?.group||'schematic');setQuery('');setPage(1);setPreviewTypeId(null);setOpen(true)}}><Shapes size={18}/><span>{figureTypePath(value)}</span><ChevronDown size={16}/></button>
  <p>{selected?.definition||'这是历史大类，请选择本次要绘制的具体图型。'}</p>
  <AccessibleDialog open={open} onClose={()=>setOpen(false)} labelledBy={title} describedBy={description} className="figure-type-dialog" backdropClassName="figure-picker-backdrop">
   <header className="figure-picker-head"><div><span>图研 · 科研图型</span><h2 id={title}>选择信息图类别</h2><p id={description}>点击图片认识图型，点击名称选择。预览用于说明结构，不代表生成效果。</p></div><button type="button" aria-label="关闭图类选择" onClick={()=>setOpen(false)}><X size={20}/></button></header>
   <label className="figure-picker-search"><Search size={18}/><input data-autofocus aria-label="搜索图类" type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="搜索中文、英文或别名，例如：箱线 / box / PCA"/></label>
   <div className="figure-picker-body">
    <nav ref={navRef} className="figure-group-nav" aria-label="图类大类">{FIGURE_GROUPS.map(g=><button key={g.id} type="button" aria-pressed={!query&&group===g.id} onClick={()=>{setGroup(g.id);setQuery('');setPage(1)}}><span>{g.label}</span><small>{FIGURE_TYPES.filter(t=>t.group===g.id).length}</small></button>)}</nav>
    <div ref={resultsRef} className="figure-picker-results"><div className="figure-picker-count" aria-live="polite">{query?`“${query}” 的搜索结果`:FIGURE_GROUPS.find(g=>g.id===group)?.label} · {matches.length} 种</div>
     <div className="figure-type-grid">{matches.slice((page-1)*12,page*12).map(type=><article key={type.id} className={`figure-type-card ${value===type.id?'selected':''}`}>
      <button type="button" className="figure-type-preview" aria-label={`查看${type.label}预览`} aria-haspopup="dialog" onClick={()=>{setPreviewTypeId(type.id);setShowOriginal(false)}}>
       <span className="figure-preview-frame"><FigurePreviewImage preview={FIGURE_TYPE_PREVIEWS[type.id]} lazy/></span>
       <span className="figure-preview-label"><span>{FIGURE_TYPE_PREVIEWS[type.id]?.source==='journal'?'论文插图':'结构示例'}</span><span><Expand size={13}/> 放大查看</span></span>
      </button>
      {FIGURE_TYPE_PREVIEWS[type.id]?.source==='journal'?<p className="figure-preview-source"><span title={FIGURE_TYPE_PREVIEWS[type.id].paper.title}>{FIGURE_TYPE_PREVIEWS[type.id].paper.authors[0]} 等 · {FIGURE_TYPE_PREVIEWS[type.id].paper.journal} · {FIGURE_TYPE_PREVIEWS[type.id].paper.year}</span><a href={FIGURE_TYPE_PREVIEWS[type.id].license.url} target="_blank" rel="noreferrer">{FIGURE_TYPE_PREVIEWS[type.id].license.id}</a></p>:null}
      <button type="button" className="figure-type-choice" aria-pressed={value===type.id} onClick={()=>{onChange(type.id);setOpen(false)}}>
       <div><strong>{type.label}</strong>{value===type.id?<Check size={17}/>:null}</div><small lang="en">{type.en}</small><span className="figure-card-status">AI 绘图 · 质量待本次成图评审</span>
       {query?<span className="figure-card-path">{figureTypePath(type.id)}</span>:null}<p>{FIGURE_TYPE_PREVIEWS[type.id]?.focus||type.definition}</p><span className="figure-input-hint">需要：{type.requiredInputs.slice(0,3).join('、')}</span>
      </button>
      <details><summary>输入与规范 <ChevronDown size={13}/></summary><div className="figure-type-detail">
       <p><b>必要输入</b> {type.requiredInputs.join('；')}</p><p><b>不适用</b> {type.unsuitable}</p>
       <ul>{type.encodingRules.map(rule=><li key={rule}>{rule}</li>)}</ul>
       <p><b>容易混淆</b> {type.confusable.map(id=>getFigureType(id)?.label).filter(Boolean).join('、')}</p>
       <p><b>变体</b> {type.variants.map(v=>v.label).join('、')}</p>
       <p><b>合格论文案例</b> {coverage[type.id]||0} 个{!coverage[type.id]?' · 暂无合格案例，不使用无关图片补位。':''}</p>
       {type.referenceExamples.slice(0,2).map(ref=><p key={ref.id}><a href={ref.url} target="_blank" rel="noreferrer">{ref.paperTitle} · {ref.figure}{ref.panels.length?` (${ref.panels.join(', ')})`:''}</a></p>)}

       <p className="figure-support-note">PNG 由生图模型绘制，SVG 由主模型编写源码。预览和图型规范不代表已通过该图型真实模型验收；数字、坐标及结论须对照材料检查。</p>
      </div></details>
     </article>)}</div>
     {!matches.length?<p className="figure-no-match">没有匹配的图型，试试常用英文名或缩写。</p>:null}
     {pageCount>1?<nav className="figure-picker-pagination" aria-label="图类分页"><button type="button" disabled={page===1} onClick={()=>setPage(p=>p-1)}>上一页</button><span>{page} / {pageCount}</span><button type="button" disabled={page===pageCount} onClick={()=>setPage(p=>p+1)}>下一页</button></nav>:null}
    </div>
   </div>
   <footer className="figure-picker-footer">当前选择：{figureTypePath(value)}</footer>
  </AccessibleDialog>
  <AccessibleDialog open={open&&Boolean(preview)} onClose={()=>setPreviewTypeId(null)} labelledBy={previewTitle} describedBy={previewDescription} className="figure-preview-dialog" backdropClassName="figure-preview-backdrop">
   {preview&&previewType?<>
    <header className="figure-preview-head"><div><p>{figureTypePath(previewType.id)}</p><h2 id={previewTitle}>{previewType.label}<small lang="en">{previewType.en}</small></h2></div><button type="button" aria-label="关闭图型预览" onClick={()=>setPreviewTypeId(null)}><X size={20}/></button></header>
    <div className="figure-preview-body">
     <figure className={showOriginal?'figure-preview-original':''}><FigurePreviewImage key={`${preview.typeId}-${showOriginal}`} preview={preview} original={showOriginal}/><figcaption>{preview.source==='journal'?`${preview.paper.journal} · ${preview.paper.year} · ${preview.figure}${!showOriginal&&preview.panel?` · ${preview.panel} 面板`:''} · ${showOriginal?'完整原图':preview.crop?.some((n,i)=>n!==[0,0,100,100][i])?'局部预览':'论文原图'}`:previewType.kind==='data'?'图研原创教学预览 · 模拟数据':'图研原创结构示例 · 非真实研究数据'}</figcaption></figure>
     {preview.source==='journal'?<div className="figure-preview-view-toggle"><button type="button" aria-pressed={showOriginal} onClick={()=>setShowOriginal(v=>!v)}>{showOriginal?'返回图型局部预览':'查看完整论文原图'}</button></div>:<p className="figure-preview-fallback">{preview.fallbackReason}</p>}
     <p id={previewDescription} className="figure-preview-focus">{preview.focus}</p>
     <dl><dt>适合表达</dt><dd>{previewType.definition}</dd><dt>需要准备</dt><dd>{previewType.requiredInputs.join('、')}</dd></dl>
     <p className="figure-preview-capability">预览用于认识图型，不代表生成效果保证；本次 AI 成图仍需评审。</p>
     {preview.source==='journal'?<section className="figure-preview-provenance" aria-label="论文来源与许可"><h3>论文来源与许可</h3><a href={preview.paper.sourceUrl} target="_blank" rel="noreferrer">{preview.paper.title}</a><p>{preview.paper.authors.join('、')} · {preview.paper.journal}（{preview.paper.year}）· {preview.figure}</p><p>DOI：{preview.paper.doi} · <a href={preview.license.url} target="_blank" rel="noreferrer">{preview.license.id}</a> · 逐图许可已核验</p><p>{preview.modifications.join(' ')}</p><details><summary>原始图注与使用说明</summary><p lang="en">{preview.originalCaption}</p><p>原论文的数据、显著性和结论属于原研究，不迁移为本次任务的结果。</p></details></section>:null}
     <section className="figure-preview-papers" aria-label="同类论文案例"><h3>同类论文案例</h3>{preview.references.length?<ul>{preview.references.map(ref=><li key={ref.id}><a href={ref.url} target="_blank" rel="noreferrer">{ref.title} · {ref.figure}{ref.panels.length?`（子图 ${ref.panels.join('、')}）`:''}</a></li>)}</ul>:<p>{preview.source==='journal'?'暂无其他同类论文案例。':'暂无适合作为预览的同类论文案例。'}</p>}</section>
    </div>
    <footer><button type="button" onClick={()=>setPreviewTypeId(null)}>返回图型列表</button></footer>
   </>:null}
  </AccessibleDialog>
 </section>
}
