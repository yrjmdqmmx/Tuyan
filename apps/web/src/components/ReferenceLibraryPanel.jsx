import { useId, useMemo, useState } from 'react';
import { BookOpen, Check, Eye, Loader2, RefreshCcw, Search, X } from 'lucide-react';
import { localizeReferences } from '../referenceLocalization';
import AccessibleDialog from './AccessibleDialog';
import ImagePreviewDialog from './ImagePreviewDialog';

const imageUrlFor = (item) => item.image_url || item.imageUrl || '';

export default function ReferenceLibraryPanel({ references, selectedIds, isLoading, error, onToggle, onRefresh }) {
  const [showGallery, setShowGallery] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [query, setQuery] = useState('');
  const galleryTitleId = useId();
  const galleryDescriptionId = useId();
  const selected = new Set(selectedIds);
  const localizedReferences = useMemo(() => localizeReferences(references), [references]);
  const visibleReferences = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('zh-CN');
    if (!needle) return localizedReferences;
    return localizedReferences.filter((item) => [item.id, item.title, item.summary, item.titleZh, item.introZh]
      .some((value) => String(value || '').toLocaleLowerCase('zh-CN').includes(needle)));
  }, [localizedReferences, query]);

  return (
    <div className="reference-library-panel">
      <div className="reference-library-head">
        <div>
          <strong><BookOpen size={15} /> 手动参考案例</strong>
          <span>在独立图库中搜索、预览并选择最多 10 个案例。</span>
        </div>
        <span className="reference-library-count">已选 {selected.size}/10</span>
      </div>

      <button type="button" className="reference-gallery-launcher" onClick={() => setShowGallery(true)}>
        <span><BookOpen size={17} /> 打开参考图库</span>
        <small>{references.length ? `${references.length} 个案例` : '浏览案例'}</small>
      </button>
      {error ? <p className="reference-upload-error">{error}</p> : null}

      <AccessibleDialog
        open={showGallery}
        onClose={() => setShowGallery(false)}
        labelledBy={galleryTitleId}
        describedBy={galleryDescriptionId}
        className="reference-gallery-dialog"
      >
        <header className="reference-gallery-dialog-head">
          <div>
            <span className="reference-gallery-eyebrow">PaperBanana Reference Library</span>
            <h2 id={galleryTitleId}>参考案例图库</h2>
            <p id={galleryDescriptionId}>先点击图片查看大图，确认后再单独选用；中英文内容均可搜索。</p>
          </div>
          <button type="button" className="reference-gallery-close" aria-label="关闭参考图库" onClick={() => setShowGallery(false)}><X size={20} /></button>
        </header>

        <div className="reference-gallery-toolbar">
          <label className="reference-gallery-search">
            <Search size={17} />
            <span className="sr-only">搜索参考案例</span>
            <input
              data-autofocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索中文标题、英文标题或方法关键词"
            />
          </label>
          <div className="reference-gallery-actions">
            <span>已选 <strong>{selected.size}</strong>/10</span>
            <button type="button" onClick={onRefresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="spin" size={15} /> : <RefreshCcw size={15} />}
              刷新
            </button>
          </div>
        </div>

        {error ? <p className="reference-upload-error">{error}</p> : null}
        <div className="reference-gallery-results" aria-live="polite">
          <span>显示 {visibleReferences.length} 个案例</span>
          {query ? <button type="button" onClick={() => setQuery('')}>清除搜索</button> : null}
        </div>

        <div className="reference-library-grid">
          {visibleReferences.map((item) => {
            const imageUrl = imageUrlFor(item);
            const isSelected = selected.has(item.id);
            const selectionDisabled = !isSelected && selected.size >= 10;
            return (
              <article key={item.id} className={isSelected ? 'reference-library-card active' : 'reference-library-card'}>
                {imageUrl ? (
                  <button type="button" className="reference-card-image-button" aria-label={`预览 ${item.titleZh} 大图`} onClick={() => setPreviewItem(item)}>
                    <img src={imageUrl} alt={item.titleZh} loading="lazy" />
                    <span><Eye size={16} /> 预览大图</span>
                  </button>
                ) : <div className="reference-card-placeholder">PB</div>}
                <div className="reference-card-copy">
                  <strong>{item.titleZh}</strong>
                  <p>{item.introZh}</p>
                  <small lang="en">{item.title || item.id}</small>
                </div>
                <div className="reference-card-actions">
                  <button type="button" className="reference-card-select" aria-pressed={isSelected} disabled={selectionDisabled} onClick={() => onToggle(item.id)}>
                    {isSelected ? <><Check size={15} /> 取消选用</> : <>选用</>}
                  </button>
                  <button type="button" disabled={!imageUrl} onClick={() => setPreviewItem(item)}><Eye size={15} /> 预览大图</button>
                </div>
              </article>
            );
          })}
        </div>

        {!isLoading && !visibleReferences.length ? (
          <p className="reference-empty">{query ? '没有匹配的参考案例，请尝试其他关键词。' : '参考库暂无数据，可先使用自动检索或上传参考图。'}</p>
        ) : null}
      </AccessibleDialog>

      <ImagePreviewDialog item={previewItem} imageUrl={previewItem ? imageUrlFor(previewItem) : ''} onClose={() => setPreviewItem(null)} />
    </div>
  );
}
