import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, Sparkles } from 'lucide-react'
import { filterRegistryModels, groupRegistryModels } from '../lib/modelRegistry'

const ROW_HEIGHT = 70
const WINDOW_HEIGHT = 350
const WINDOW_OVERSCAN = 4

export default function ModelPicker({ label, models, role, value, outputFormat = '', provider = '', onChange, focusSetting = '' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [catalogMode, setCatalogMode] = useState('recommended')
  const [scrollTop, setScrollTop] = useState(0)
  const windowRef = useRef(null)
  const labelId = useId()
  const isOpenRouter = provider === 'openrouter'
  const recommendedOnly = isOpenRouter && catalogMode === 'recommended'
  const visible = useMemo(() => filterRegistryModels(models, { role, query, outputFormat, recommendedOnly }), [models, role, query, outputFormat, recommendedOnly])
  const grouped = useMemo(() => groupRegistryModels(visible), [visible])
  const rows = useMemo(() => grouped.flatMap((group) => [
    { type: 'vendor', key: `vendor-${group.vendor}`, vendor: group.vendor },
    ...group.models.map((model) => ({ type: 'model', key: model.id, model })),
  ]), [grouped])
  const visibleStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - WINDOW_OVERSCAN)
  const visibleEnd = Math.min(rows.length, Math.ceil((scrollTop + WINDOW_HEIGHT) / ROW_HEIGHT) + WINDOW_OVERSCAN)
  const selectedModel = models?.find((model) => model.id === value)
  function resetVirtualWindow() {
    setScrollTop(0)
    if (windowRef.current) windowRef.current.scrollTop = 0
  }
  function changeCatalogMode(mode) { setCatalogMode(mode); resetVirtualWindow() }
  useEffect(resetVirtualWindow, [models, role, outputFormat, provider])

  return (
    <div className="model-picker" data-focus-setting={focusSetting || undefined} tabIndex={focusSetting ? -1 : undefined}>
      <span id={labelId} className="model-picker-label">{label}</span>
      <button type="button" className="model-picker-trigger" aria-expanded={open} aria-labelledby={labelId} onClick={() => setOpen((current) => !current)}>
        <span>
          <strong>{selectedModel?.label || value || '请选择模型'}</strong>
          <small>{selectedModel?.vendor || '等待服务端目录'}</small>
        </span>
        <ChevronDown size={17} />
      </button>
      {open ? (
        <div className="model-picker-popover">
          {isOpenRouter ? (
            <div className="model-catalog-tabs" role="tablist" aria-label="OpenRouter 模型范围">
              <button type="button" className={catalogMode === 'recommended' ? 'active' : ''} onClick={() => changeCatalogMode('recommended')}>推荐模型</button>
              <button type="button" className={catalogMode === 'all' ? 'active' : ''} onClick={() => changeCatalogMode('all')}>全部兼容模型</button>
            </div>
          ) : <div className="model-catalog-title"><Sparkles size={15} /> 推荐模型优先</div>}
          <label className="model-picker-search">
            <Search size={16} />
            <span className="sr-only">搜索{label}</span>
            <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); resetVirtualWindow() }} placeholder="搜索模型、厂商或能力" />
          </label>
          <div ref={windowRef} className="model-picker-window" style={{ height: WINDOW_HEIGHT }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
            <div style={{ height: rows.length * ROW_HEIGHT, position: 'relative' }}>
              {rows.slice(visibleStart, visibleEnd).map((row, offset) => {
                const rowIndex = visibleStart + offset
                if (row.type === 'vendor') {
                  return <div key={row.key} className="model-vendor-row" style={{ transform: `translateY(${rowIndex * ROW_HEIGHT}px)` }}>{row.vendor}</div>
                }
                const { model } = row
                const disabled = model.selectionDisabled
                return (
                  <button
                    key={row.key}
                    type="button"
                    className={`model-option ${value === model.id ? 'active' : ''}`}
                    style={{ transform: `translateY(${rowIndex * ROW_HEIGHT}px)` }}
                    disabled={disabled}
                    aria-disabled={disabled}
                    title={model.selectionDisabledReason || model.availabilityNotes || ''}
                    onClick={() => { onChange(model.id); setOpen(false) }}
                  >
                    <span className="model-option-main"><strong>{model.label || model.id}</strong><small>{model.id}</small></span>
                    <span className="model-option-badges">
                      {model.recommended ? <em>推荐</em> : null}
                      {model.lifecycle && model.lifecycle !== 'stable' ? <em>{model.lifecycle}</em> : null}
                      {model.requiresEntitlement ? <em>需权益</em> : null}
                      {value === model.id ? <Check size={16} /> : null}
                    </span>
                    {disabled ? <span className="model-disabled-reason">{model.selectionDisabledReason}</span> : null}
                  </button>
                )
              })}
            </div>
          </div>
          {!rows.length ? <p className="model-picker-empty">没有匹配当前角色与输出格式的模型。</p> : null}
        </div>
      ) : null}
    </div>
  )
}
