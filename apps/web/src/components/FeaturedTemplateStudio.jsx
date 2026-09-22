import { useAppLocale } from './BenchmarkLocale.jsx'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, LayoutTemplate, X } from 'lucide-react'
import AccessibleDialog from './AccessibleDialog'
import useCompactLayout from '../hooks/useCompactLayout'

function TemplateArtwork({ template, className = '' }) {
  const { t } = useAppLocale()
  if (template.imageUrl) {
    return <img className={className} src={template.imageUrl} alt={t("{v0}参考图", {v0: t(template.title)})} />
  }
  return (
    <div className={`featured-template-placeholder ${className}`.trim()} role="img" aria-label={t("{v0}结构预览", {v0: t(template.title)})}>
      <span>{t("结构预览")}</span>
      <div aria-hidden="true">
        <i />
        <b />
        <i />
      </div>
      <strong>{t(template.title)}</strong>
    </div>
  )
}

function MobileTemplateCarousel({ templates, onPreview, reducedMotion, documentHidden }) {
  const { t } = useAppLocale()
  const viewportRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [manualPaused, setManualPaused] = useState(false)

  function nearestIndex() {
    const viewport = viewportRef.current
    const cards = [...(viewport?.firstElementChild?.children || [])]
    if (!cards.length) return 0
    const origin = cards[0].offsetLeft
    return cards.reduce((best, card, index) => Math.abs(card.offsetLeft - origin - viewport.scrollLeft) < Math.abs(cards[best].offsetLeft - origin - viewport.scrollLeft) ? index : best, 0)
  }

  function scrollToIndex(index, behavior) {
    const viewport = viewportRef.current
    const cards = viewport?.firstElementChild?.children
    if (!cards?.[index]) return
    viewport.scrollTo({ left: cards[index].offsetLeft - cards[0].offsetLeft, behavior })
  }

  useEffect(() => {
    if (manualPaused || reducedMotion || documentHidden || templates.length < 2) return undefined
    const timer = window.setInterval(() => scrollToIndex((nearestIndex() + 1) % templates.length, 'smooth'), 5000)
    return () => window.clearInterval(timer)
  }, [documentHidden, manualPaused, reducedMotion, templates.length])

  function move(direction) {
    setManualPaused(true)
    scrollToIndex(Math.max(0, Math.min(templates.length - 1, nearestIndex() + direction)), reducedMotion ? 'instant' : 'smooth')
  }

  return <div className="mobile-template-carousel" aria-label={t("滑动浏览精选模板")}>
    <div ref={viewportRef} className="mobile-template-viewport" onScroll={() => setActiveIndex(nearestIndex())}
      onPointerDown={() => setManualPaused(true)} onWheel={() => setManualPaused(true)} onFocusCapture={() => setManualPaused(true)}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
        event.preventDefault()
        move(event.key === 'ArrowLeft' ? -1 : 1)
      }}>
      <div className="mobile-template-track">
        {templates.map(template => <button type="button" className="mobile-template-card" key={template.id} aria-label={t("预览模板 {v0}", {v0: t(template.title)})} onClick={() => onPreview(template.id)}>
          <TemplateArtwork template={template} />
          <span className="mobile-template-caption"><strong>{t(template.title)}</strong><small>{t(template.summary)}</small></span>
        </button>)}
      </div>
    </div>
    <div className="mobile-template-controls">
      <button type="button" aria-label={t("上一张模板")} disabled={activeIndex === 0} onClick={() => move(-1)}><ArrowLeft size={18} /></button>
      <span className="mobile-template-position"><span>{templates.length ? activeIndex + 1 : 0} / {templates.length}</span></span>
      <button type="button" aria-label={t("下一张模板")} disabled={activeIndex >= templates.length - 1} onClick={() => move(1)}><ArrowRight size={18} /></button>
    </div>
  </div>
}

export default function FeaturedTemplateStudio({ templates, isDirty, onApply }) {
  const { t } = useAppLocale()
  const compact = useCompactLayout()
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(3)
  const [paused, setPaused] = useState(false)
  const [documentHidden, setDocumentHidden] = useState(Boolean(globalThis.document?.hidden))
  const [reducedMotion, setReducedMotion] = useState(
    () => Boolean(globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches),
  )
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(templates[0]?.id || '')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const libraryTitleId = useId()
  const libraryDescriptionId = useId()
  const confirmTitleId = useId()
  const confirmDescriptionId = useId()
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) || templates[0],
    [selectedId, templates],
  )
  const maxIndex = Math.max(0, templates.length - visibleCount)
  const carouselPositions = Array.from({ length: maxIndex + 1 }, (_, index) => index)

  useEffect(() => {
    const compact = globalThis.window?.matchMedia?.('(max-width: 760px)')
    const update = () => setVisibleCount(compact?.matches ? 1 : 3)
    update()
    compact?.addEventListener?.('change', update)
    return () => compact?.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    const preference = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(Boolean(preference?.matches))
    update()
    preference?.addEventListener?.('change', update)
    return () => preference?.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    const update = () => setDocumentHidden(Boolean(document.hidden))
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  useEffect(() => {
    setCarouselIndex((current) => Math.min(current, maxIndex))
  }, [maxIndex])

  useEffect(() => {
    if (compact || paused || documentHidden || reducedMotion || templates.length <= visibleCount) return undefined
    const timer = window.setInterval(() => {
      setCarouselIndex((current) => current >= maxIndex ? 0 : current + 1)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [compact, documentHidden, maxIndex, paused, reducedMotion, templates.length, visibleCount])

  function openLibrary(templateId) {
    setSelectedId(templateId || selectedTemplate?.id || templates[0]?.id || '')
    setLibraryOpen(true)
  }

  function requestApply() {
    if (!selectedTemplate) return
    if (isDirty) {
      setLibraryOpen(false)
      setConfirmOpen(true)
      return
    }
    onApply(selectedTemplate)
    setLibraryOpen(false)
  }

  function confirmApply() {
    if (!selectedTemplate) return
    onApply(selectedTemplate)
    setConfirmOpen(false)
    setLibraryOpen(false)
  }

  function cancelConfirmation() {
    setConfirmOpen(false)
    setLibraryOpen(true)
  }

  return (
    <>
      <section
        className="featured-template-hero"
        aria-label={t("精选学术图示模板")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
        }}
      >
        <div className="featured-template-copy">
          <h2>{t(compact ? '从模板开始' : '从真实研究图示开始')}</h2>
          <p>{t(compact ? '选用参考结构，或直接填写下方内容。' : '图研Tuyan 是开源的学术图示工作台。精选模板直接来自 306 条研究参考图库，套用后仍可完整改写你的方法、图注与排除项。')}</p>
          <button type="button" className="featured-template-cta" onClick={() => openLibrary()}>
            <LayoutTemplate size={17} />{t("浏览模板")}</button>
        </div>
        {compact ? <MobileTemplateCarousel templates={templates} onPreview={openLibrary} reducedMotion={reducedMotion} documentHidden={documentHidden || libraryOpen || confirmOpen} /> : <div className="featured-carousel">
          <div className="featured-carousel-viewport">
            <div
              className="featured-carousel-track"
              style={{ '--featured-visible-count': visibleCount, transform: `translateX(calc(${carouselIndex} * (-100% / var(--featured-visible-count))))` }}
            >
              {templates.map((template) => (
                <article className="featured-carousel-card" key={template.id}>
                  <TemplateArtwork template={template} />
                  <div><span>{t(template.title)}</span><small>{t(template.summary)}</small></div>
                </article>
              ))}
            </div>
          </div>
          <div className="featured-carousel-controls">
            <button type="button" aria-label={t("上一张模板")} onClick={() => setCarouselIndex((current) => current <= 0 ? maxIndex : current - 1)}><ArrowLeft size={17} /></button>
            <div className="featured-carousel-dots" aria-label={t("模板轮播页")}>
              {carouselPositions.map((index) => (
                <button
                  type="button"
                  key={index}
                  aria-label={t("查看第 {v0} 张模板", {v0: index + 1})}
                  aria-current={carouselIndex === index ? 'true' : undefined}
                  onClick={() => setCarouselIndex(index)}
                />
              ))}
            </div>
            <button type="button" aria-label={t("下一张模板")} onClick={() => setCarouselIndex((current) => current >= maxIndex ? 0 : current + 1)}><ArrowRight size={17} /></button>
          </div>
        </div>}
      </section>

      <AccessibleDialog open={libraryOpen} onClose={() => setLibraryOpen(false)} labelledBy={libraryTitleId} describedBy={libraryDescriptionId} className="featured-template-dialog">
        <header className="featured-template-dialog-head">
          <div><h2 id={libraryTitleId}>{t("精选模板库")}</h2><p id={libraryDescriptionId}>{t("先预览模板，再明确套用到输入区。")}</p></div>
          <button type="button" aria-label={t("关闭精选模板库")} onClick={() => setLibraryOpen(false)}><X size={18} /></button>
        </header>
        <div className="featured-template-grid">
          {templates.map((template) => (
            <button
              type="button"
              className={`featured-template-card${selectedTemplate?.id === template.id ? ' active' : ''}`}
              key={template.id}
              aria-label={t("预览模板 {v0}", {v0: t(template.title)})}
              aria-pressed={selectedTemplate?.id === template.id}
              onClick={() => setSelectedId(template.id)}
            >
              <TemplateArtwork template={template} />
              <span>{t(template.title)}</span>
              <small>{t(template.summary)}</small>
              {selectedTemplate?.id === template.id ? <Check size={17} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
        {selectedTemplate ? (
          <aside className="featured-template-preview" aria-live="polite">
            <div><span>{t(selectedTemplate.title)}</span><p>{t(selectedTemplate.summary)}</p></div>
            <button type="button" className="primary-button" data-autofocus onClick={requestApply}>{t("套用到输入区")}</button>
          </aside>
        ) : null}
      </AccessibleDialog>

      <AccessibleDialog open={confirmOpen} onClose={cancelConfirmation} labelledBy={confirmTitleId} describedBy={confirmDescriptionId} className="featured-template-confirm">
        <h2 id={confirmTitleId}>{t("替换输入内容？")}</h2>
        <p id={confirmDescriptionId}>{t("你已修改方法内容、目标图注或负向提示词。继续会同时替换这三项内容。")}</p>
        <div>
          <button type="button" onClick={cancelConfirmation}>{t("取消")}</button>
          <button type="button" className="primary-button" onClick={confirmApply}>{t("确认替换")}</button>
        </div>
      </AccessibleDialog>
    </>
  )
}
