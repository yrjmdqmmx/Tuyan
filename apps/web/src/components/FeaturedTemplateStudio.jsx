import { useEffect, useId, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, LayoutTemplate, X } from 'lucide-react'
import AccessibleDialog from './AccessibleDialog'

function TemplateArtwork({ template, className = '' }) {
  if (template.imageUrl) {
    return <img className={className} src={template.imageUrl} alt={`${template.title}参考图`} />
  }
  return (
    <div className={`featured-template-placeholder ${className}`.trim()} role="img" aria-label={`${template.title}结构预览`}>
      <span>结构预览</span>
      <div aria-hidden="true">
        <i />
        <b />
        <i />
      </div>
      <strong>{template.title}</strong>
    </div>
  )
}

export default function FeaturedTemplateStudio({ templates, isDirty, onApply }) {
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
    if (paused || documentHidden || reducedMotion || templates.length <= visibleCount) return undefined
    const timer = window.setInterval(() => {
      setCarouselIndex((current) => current >= maxIndex ? 0 : current + 1)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [documentHidden, maxIndex, paused, reducedMotion, templates.length, visibleCount])

  function openLibrary() {
    setSelectedId(selectedTemplate?.id || templates[0]?.id || '')
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
        aria-label="精选学术图示模板"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
        }}
      >
        <div className="featured-template-copy">
          <h2>从真实研究图示开始</h2>
          <p>图研Tuyan 是开源的学术图示工作台。精选模板直接来自 306 条研究参考图库，套用后仍可完整改写你的方法、图注与排除项。</p>
          <button type="button" className="featured-template-cta" onClick={openLibrary}>
            <LayoutTemplate size={17} />浏览模板
          </button>
        </div>
        <div className="featured-carousel">
          <div className="featured-carousel-viewport">
            <div
              className="featured-carousel-track"
              style={{ '--featured-visible-count': visibleCount, transform: `translateX(calc(${carouselIndex} * (-100% / var(--featured-visible-count))))` }}
            >
              {templates.map((template) => (
                <article className="featured-carousel-card" key={template.id}>
                  <TemplateArtwork template={template} />
                  <div><span>{template.title}</span><small>{template.summary}</small></div>
                </article>
              ))}
            </div>
          </div>
          <div className="featured-carousel-controls">
            <button type="button" aria-label="上一张模板" onClick={() => setCarouselIndex((current) => current <= 0 ? maxIndex : current - 1)}><ArrowLeft size={17} /></button>
            <div className="featured-carousel-dots" aria-label="模板轮播页">
              {carouselPositions.map((index) => (
                <button
                  type="button"
                  key={index}
                  aria-label={`查看第 ${index + 1} 张模板`}
                  aria-current={carouselIndex === index ? 'true' : undefined}
                  onClick={() => setCarouselIndex(index)}
                />
              ))}
            </div>
            <button type="button" aria-label="下一张模板" onClick={() => setCarouselIndex((current) => current >= maxIndex ? 0 : current + 1)}><ArrowRight size={17} /></button>
          </div>
        </div>
      </section>

      <AccessibleDialog open={libraryOpen} onClose={() => setLibraryOpen(false)} labelledBy={libraryTitleId} describedBy={libraryDescriptionId} className="featured-template-dialog">
        <header className="featured-template-dialog-head">
          <div><h2 id={libraryTitleId}>精选模板库</h2><p id={libraryDescriptionId}>先预览模板，再明确套用到输入区。</p></div>
          <button type="button" aria-label="关闭精选模板库" onClick={() => setLibraryOpen(false)}><X size={18} /></button>
        </header>
        <div className="featured-template-grid">
          {templates.map((template) => (
            <button
              type="button"
              className={`featured-template-card${selectedTemplate?.id === template.id ? ' active' : ''}`}
              key={template.id}
              aria-label={`预览模板 ${template.title}`}
              aria-pressed={selectedTemplate?.id === template.id}
              onClick={() => setSelectedId(template.id)}
            >
              <TemplateArtwork template={template} />
              <span>{template.title}</span>
              <small>{template.summary}</small>
              {selectedTemplate?.id === template.id ? <Check size={17} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
        {selectedTemplate ? (
          <aside className="featured-template-preview" aria-live="polite">
            <div><span>{selectedTemplate.title}</span><p>{selectedTemplate.summary}</p></div>
            <button type="button" className="primary-button" data-autofocus onClick={requestApply}>套用到输入区</button>
          </aside>
        ) : null}
      </AccessibleDialog>

      <AccessibleDialog open={confirmOpen} onClose={cancelConfirmation} labelledBy={confirmTitleId} describedBy={confirmDescriptionId} className="featured-template-confirm">
        <h2 id={confirmTitleId}>替换输入内容？</h2>
        <p id={confirmDescriptionId}>你已修改方法内容、目标图注或负向提示词。继续会同时替换这三项内容。</p>
        <div>
          <button type="button" onClick={cancelConfirmation}>取消</button>
          <button type="button" className="primary-button" onClick={confirmApply}>确认替换</button>
        </div>
      </AccessibleDialog>
    </>
  )
}
