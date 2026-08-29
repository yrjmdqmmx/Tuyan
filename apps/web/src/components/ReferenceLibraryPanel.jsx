import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { BookOpen, Check, ChevronLeft, ChevronRight, Loader2, RefreshCcw, Search, Trash2, X } from 'lucide-react'
import { localizeReferences } from '../referenceLocalization'
import { paginationItems, toggleReferenceSelection } from '../lib/referenceGallery'
import AccessibleDialog from './AccessibleDialog'
import ImagePreviewDialog from './ImagePreviewDialog'

const imageUrlFor = (item) => item.image_url || item.imageUrl || ''

export default function ReferenceLibraryPanel({ references, selectedIds, pageInfo, isLoading, error, onToggle, onClear, onRequest }) {
  const [showGallery, setShowGallery] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(-1)
  const [query, setQuery] = useState('')
  const [visualCategory, setVisualCategory] = useState('')
  const [researchDomain, setResearchDomain] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [failedImages, setFailedImages] = useState(() => new Set())
  const requestRef = useRef(onRequest)
  const galleryWasOpenRef = useRef(false)
  requestRef.current = onRequest
  const galleryTitleId = useId()
  const galleryDescriptionId = useId()
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const localizedReferences = useMemo(() => localizeReferences(references), [references])

  useEffect(() => {
    setSelectedItems((current) => {
      const cache = new Map(current.map((item) => [item.id, item]))
      localizedReferences.forEach((item) => cache.set(item.id, item))
      return selectedIds.map((id) => cache.get(id) || { id, titleZh: id })
    })
  }, [localizedReferences, selectedIds])

  useEffect(() => {
    const openedNow = showGallery && !galleryWasOpenRef.current
    galleryWasOpenRef.current = showGallery
    if (!showGallery || openedNow) return undefined
    const timer = window.setTimeout(() => requestRef.current?.({ page: 1, query, visualCategory, researchDomain }), 320)
    return () => window.clearTimeout(timer)
  }, [query, visualCategory, researchDomain, showGallery])

  const requestPage = (page) => requestRef.current?.({ page, query, visualCategory, researchDomain })
  const toggleItem = (item) => {
    try {
      toggleReferenceSelection(selectedItems, item)
      onToggle(item.id)
    } catch {
      // Buttons are disabled at the limit; this protects keyboard races.
    }
  }
  const currentPreview = previewIndex >= 0 ? localizedReferences[previewIndex] : null

  return (
    <div className="reference-library-panel">
      <div className="reference-library-head">
        <div><strong><BookOpen size={15} /> 手动参考案例</strong><span>从完整 PaperBananaBench 中选择最多 10 个案例。</span></div>
        <span className="reference-library-count">已选 {selected.size}/10</span>
      </div>
      <button type="button" className="reference-gallery-launcher" onClick={() => setShowGallery(true)}>
        <span><BookOpen size={17} /> 打开参考图库</span><small>{pageInfo?.totalItems ? `${pageInfo.totalItems} 个案例` : '浏览案例'}</small>
      </button>
      {error ? <p className="reference-upload-error">{error}</p> : null}

      <AccessibleDialog open={showGallery} onClose={() => setShowGallery(false)} labelledBy={galleryTitleId} describedBy={galleryDescriptionId} className="reference-gallery-dialog">
        <header className="reference-gallery-dialog-head">
          <div><span className="reference-gallery-eyebrow">PaperBananaBench · {pageInfo?.corpusVersion || '当前语料'}</span><h2 id={galleryTitleId}>参考案例图库</h2><p id={galleryDescriptionId}>图片点击进入完整预览；“选用”独立操作，选择会跨页、搜索与筛选保留。</p></div>
          <button type="button" className="reference-gallery-close" aria-label="关闭参考图库" onClick={() => setShowGallery(false)}><X size={20} /></button>
        </header>

        <div className="reference-gallery-toolbar">
          <label className="reference-gallery-search"><Search size={17} /><span className="sr-only">搜索参考案例</span><input data-autofocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索中英文标题、说明或关键词" /></label>
          <label className="reference-facet"><span>视觉类别</span><select value={visualCategory} onChange={(event) => setVisualCategory(event.target.value)}><option value="">全部</option>{(pageInfo?.facets?.visualCategories || []).map((facet) => <option key={facet.value} value={facet.value}>{facet.value}（{facet.count}）</option>)}</select></label>
          <label className="reference-facet"><span>研究领域</span><select value={researchDomain} onChange={(event) => setResearchDomain(event.target.value)}><option value="">全部</option>{(pageInfo?.facets?.researchDomains || []).map((facet) => <option key={facet.value} value={facet.value}>{facet.value}（{facet.count}）</option>)}</select></label>
          <button type="button" className="reference-refresh" aria-label="刷新图库" onClick={() => requestPage(pageInfo?.page || 1)} disabled={isLoading}>{isLoading ? <Loader2 className="spin" size={16} /> : <RefreshCcw size={16} />}</button>
        </div>
        <div className="reference-gallery-results" aria-live="polite"><span>总计 <strong>{pageInfo?.totalItems || 0}</strong> 个案例 · 第 {pageInfo?.page || 1}/{pageInfo?.totalPages || 1} 页 · 每页 12 个</span>{query || visualCategory || researchDomain ? <button type="button" onClick={() => { setQuery(''); setVisualCategory(''); setResearchDomain('') }}>清除筛选</button> : null}</div>
        {error ? <p className="reference-upload-error">{error}</p> : null}

        <div className="reference-library-grid" aria-busy={isLoading}>
          {isLoading && !localizedReferences.length ? Array.from({ length: 6 }, (_, index) => <div key={index} className="reference-card-skeleton" aria-hidden="true" />) : null}
          {localizedReferences.map((item, index) => {
            const imageUrl = imageUrlFor(item)
            const isSelected = selected.has(item.id)
            const imageFailed = failedImages.has(item.id)
            return (
              <article key={item.id} className={isSelected ? 'reference-library-card active' : 'reference-library-card'}>
                {imageUrl && !imageFailed ? <button type="button" className="reference-card-image-button" aria-label={`预览 ${item.titleZh} 大图`} onClick={() => setPreviewIndex(index)}><img src={imageUrl} alt={item.titleZh} loading="lazy" onError={() => setFailedImages((current) => new Set([...current, item.id]))} /><span className="sr-only">预览大图</span></button> : <button type="button" className="reference-card-placeholder" onClick={() => { setFailedImages((current) => { const next = new Set(current); next.delete(item.id); return next }); requestPage(pageInfo?.page || 1) }}><RefreshCcw size={17} /> 图片加载失败，重试</button>}
                <div className="reference-card-copy"><strong>{item.titleZh}</strong><p>{item.shortIntroZh || item.introZh}</p><div className="reference-card-tags"><span>{item.visualCategory || '未分类'}</span><span>{item.researchDomain || '通用研究'}</span></div></div>
                <button type="button" className="reference-card-select" aria-pressed={isSelected} disabled={!isSelected && selected.size >= 10} onClick={() => toggleItem(item)}>{isSelected ? <><Check size={16} /> 已选用，点击取消</> : <>选用</>}</button>
              </article>
            )
          })}
        </div>
        {!isLoading && !localizedReferences.length ? <p className="reference-empty">没有匹配的参考案例，请调整搜索或筛选。</p> : null}
        <nav className="reference-pagination" aria-label="参考图库分页">
          <button type="button" onClick={() => requestPage(1)} disabled={(pageInfo?.page || 1) <= 1}>首页</button><button type="button" aria-label="上一页" onClick={() => requestPage((pageInfo?.page || 1) - 1)} disabled={(pageInfo?.page || 1) <= 1}><ChevronLeft size={17} /></button>
          {paginationItems(pageInfo?.page, pageInfo?.totalPages).map((page, index, pages) => <span key={page} className="pagination-fragment">{index > 0 && page - pages[index - 1] > 1 ? <i>…</i> : null}<button type="button" aria-current={page === pageInfo?.page ? 'page' : undefined} onClick={() => requestPage(page)}>{page}</button></span>)}
          <button type="button" aria-label="下一页" onClick={() => requestPage((pageInfo?.page || 1) + 1)} disabled={(pageInfo?.page || 1) >= (pageInfo?.totalPages || 1)}><ChevronRight size={17} /></button><button type="button" onClick={() => requestPage(pageInfo?.totalPages || 1)} disabled={(pageInfo?.page || 1) >= (pageInfo?.totalPages || 1)}>末页</button>
        </nav>
        <div className="reference-selection-tray"><div><strong>已选 {selectedItems.length}/10</strong><span>跨页选择会保留</span></div><div className="reference-selection-list">{selectedItems.map((item) => <button type="button" key={item.id} title={`移除 ${item.titleZh}`} onClick={() => onToggle(item.id)}>{item.titleZh}<X size={13} /></button>)}</div><div className="reference-selection-actions"><button type="button" onClick={onClear} disabled={!selectedItems.length}><Trash2 size={15} /> 清空</button><button type="button" className="primary-button" onClick={() => setShowGallery(false)}><Check size={16} /> 确认选择</button></div></div>
      </AccessibleDialog>

      <ImagePreviewDialog item={currentPreview} imageUrl={currentPreview ? imageUrlFor(currentPreview) : ''} isSelected={Boolean(currentPreview && selected.has(currentPreview.id))} selectionDisabled={Boolean(currentPreview && !selected.has(currentPreview.id) && selected.size >= 10)} hasPrevious={previewIndex > 0} hasNext={previewIndex >= 0 && previewIndex < localizedReferences.length - 1} onPrevious={() => setPreviewIndex((index) => Math.max(0, index - 1))} onNext={() => setPreviewIndex((index) => Math.min(localizedReferences.length - 1, index + 1))} onToggle={() => currentPreview && toggleItem(currentPreview)} onClose={() => setPreviewIndex(-1)} />
    </div>
  )
}
