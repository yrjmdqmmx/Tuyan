import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, Search, Sparkles, X } from 'lucide-react'
import { groupRegistryModels, partitionRegistryModels } from '../lib/modelRegistry'

const COMPATIBLE_PAGE_SIZE = 24
const INCOMPATIBLE_PAGE_SIZE = 24
const COMPACT_MEDIA_QUERY = '(max-width: 1076px)'
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
const MOBILE_FOCUS_SELECTORS = Object.freeze({
  'providers-back': '[data-mobile-focus="providers-back"]',
  'models-back': '[data-mobile-focus="models-back"]',
  'selected-provider': '.model-provider-rail button[aria-pressed="true"]',
  'selected-vendor': '.model-vendor-rail button[aria-pressed="true"]',
})

function providerDisplayName(provider, providerConfigs) {
  if (provider === 'gemini') return 'Google Gemini API'
  return providerConfigs?.[provider]?.label || provider
}

function lifecycleLabel(value) {
  if (value === 'stable') return '稳定版'
  if (value === 'preview') return '预览版'
  if (value === 'invite-only') return '邀测'
  if (value === 'legacy') return '旧版维护'
  if (value === 'deprecated') return '即将下线'
  return '状态未知'
}

function verificationLabel(model) {
  if (model.verificationState === 'catalog') return '目录兼容（未实测）'
  if (model.verificationState === 'account-visible') return '账号可见（未实测）'
  if (model.verificationState === 'inference-verified') return '真实调用已验证'
  if (model.verificationState === 'registry') return '静态注册信息'
  return model.verified === true ? '注册表已确认' : '尚未实测'
}

function capabilityLabel(model) {
  const capabilities = []
  if (model.roles?.includes('main')) capabilities.push('主模型')
  if (model.roles?.includes('image')) capabilities.push('图像生成')
  if (model.roles?.includes('vision')) capabilities.push('图像理解')
  if (model.capabilities?.imageEditMode === 'direct-edit') capabilities.push('直接编辑')
  return capabilities.join(' · ') || '能力以服务端目录为准'
}

export default function ModelPicker({
  label,
  models,
  role,
  value,
  outputFormat = '',
  provider = '',
  onChange,
  focusSetting = '',
  registry,
  route,
  onRouteChange,
  providerConfigs,
}) {
  const effectiveRoute = route || { accessProvider: provider, modelId: value }
  const effectiveRegistry = registry?.providers
    ? registry
    : {
        providers: {
          [provider]: {
            accessKind: ['openrouter', 'bailian', 'ark'].includes(provider) ? 'aggregator' : 'direct',
            models: models || [],
          },
        },
      }
  const providerIds = Object.keys(effectiveRegistry.providers || {})
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [catalogMode, setCatalogMode] = useState('recommended')
  const [selectedProvider, setSelectedProvider] = useState(effectiveRoute.accessProvider || providerIds[0] || '')
  const [selectedVendor, setSelectedVendor] = useState('')
  const [mobileStep, setMobileStep] = useState('providers')
  const [compact, setCompact] = useState(false)
  const [compatibleLimit, setCompatibleLimit] = useState(COMPATIBLE_PAGE_SIZE)
  const [showIncompatible, setShowIncompatible] = useState(false)
  const [incompatibleLimit, setIncompatibleLimit] = useState(INCOMPATIBLE_PAGE_SIZE)
  const windowRef = useRef(null)
  const listRef = useRef(null)
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)
  const pendingMobileFocusRef = useRef('')
  const labelId = useId()
  const dialogTitleId = useId()

  const activeProviderRegistry = effectiveRegistry.providers?.[selectedProvider] || { accessKind: 'direct', models: [] }
  const isAggregator = activeProviderRegistry.accessKind === 'aggregator'
  const isOpenRouter = selectedProvider === 'openrouter'
  const allPartition = useMemo(
    () => partitionRegistryModels(activeProviderRegistry.models, { role, query, outputFormat }),
    [activeProviderRegistry.models, role, query, outputFormat],
  )
  const recommendedCompatible = useMemo(
    () => allPartition.compatible.filter((model) => model.recommended === true && model.lifecycle === 'stable'),
    [allPartition.compatible],
  )
  const allCompatibleGrouped = useMemo(() => groupRegistryModels(allPartition.compatible), [allPartition.compatible])
  const recommendedGrouped = useMemo(() => groupRegistryModels(recommendedCompatible), [recommendedCompatible])
  const availableVendors = isAggregator ? allCompatibleGrouped.map((group) => group.vendor) : []
  const activeVendor = isAggregator
    ? (availableVendors.includes(selectedVendor)
        ? selectedVendor
        : allCompatibleGrouped.find((group) => group.models.some((model) => model.id === effectiveRoute.modelId))?.vendor || availableVendors[0] || '')
    : ''
  const hasRecommendedInScope = isAggregator
    ? recommendedGrouped.some((group) => group.vendor === activeVendor && group.models.length)
    : recommendedCompatible.length > 0
  const effectiveCatalogMode = isOpenRouter && catalogMode === 'recommended' && allPartition.compatible.length && !hasRecommendedInScope
    ? 'all'
    : catalogMode
  const compatible = isOpenRouter && effectiveCatalogMode === 'recommended' ? recommendedCompatible : allPartition.compatible
  const grouped = useMemo(() => groupRegistryModels(compatible), [compatible])
  const rows = useMemo(
    () => (isAggregator ? grouped.find((group) => group.vendor === activeVendor)?.models || [] : compatible),
    [activeVendor, compatible, grouped, isAggregator],
  )
  const selectedModel = activeProviderRegistry.models?.find((model) => model.id === effectiveRoute.modelId)
    || models?.find((model) => model.id === value)

  function resetModelList() {
    setCompatibleLimit(COMPATIBLE_PAGE_SIZE)
    if (windowRef.current) windowRef.current.scrollTop = 0
  }

  function resetIncompatible() {
    setShowIncompatible(false)
    setIncompatibleLimit(INCOMPATIBLE_PAGE_SIZE)
  }

  function changeCatalogMode(mode) { setCatalogMode(mode); resetModelList(); resetIncompatible() }

  function moveMobileStep(step, focusTarget) {
    pendingMobileFocusRef.current = focusTarget
    setMobileStep(step)
  }

  useEffect(() => {
    resetModelList()
  }, [models, role, outputFormat, provider])

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(COMPACT_MEDIA_QUERY)
    if (!mediaQuery) return undefined
    const updateCompactMode = (event) => setCompact(event.matches)
    setCompact(mediaQuery.matches)
    mediaQuery.addEventListener?.('change', updateCompactMode)
    return () => mediaQuery.removeEventListener?.('change', updateCompactMode)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector(FOCUSABLE)?.focus())
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open || !compact || !pendingMobileFocusRef.current) return undefined
    const selector = MOBILE_FOCUS_SELECTORS[pendingMobileFocusRef.current]
    pendingMobileFocusRef.current = ''
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector(selector)?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [activeVendor, compact, mobileStep, open, selectedProvider])

  function openPicker() {
    const nextProvider = effectiveRoute.accessProvider || providerIds[0] || ''
    const nextRegistry = effectiveRegistry.providers?.[nextProvider]
    const nextGroups = groupRegistryModels(partitionRegistryModels(nextRegistry?.models || [], { role, outputFormat }).compatible)
    setSelectedProvider(nextProvider)
    setSelectedVendor(nextGroups.find((group) => group.models.some((model) => model.id === effectiveRoute.modelId))?.vendor || nextGroups[0]?.vendor || '')
    setMobileStep('providers')
    setQuery('')
    setCatalogMode('recommended')
    resetIncompatible()
    resetModelList()
    setOpen(true)
  }

  function chooseProvider(nextProvider) {
    const nextRegistry = effectiveRegistry.providers?.[nextProvider] || { models: [] }
    const nextGroups = groupRegistryModels(partitionRegistryModels(nextRegistry.models, { role, outputFormat }).compatible)
    setSelectedProvider(nextProvider)
    setSelectedVendor(nextGroups[0]?.vendor || '')
    setQuery('')
    resetIncompatible()
    resetModelList()
    if (compact) moveMobileStep(nextRegistry.accessKind === 'aggregator' ? 'vendors' : 'models', nextRegistry.accessKind === 'aggregator' ? 'providers-back' : 'models-back')
  }

  function chooseVendor(vendor) {
    setSelectedVendor(vendor)
    resetModelList()
    if (compact) moveMobileStep('models', 'models-back')
  }

  function chooseModel(model) {
    const nextRoute = { accessProvider: selectedProvider, modelId: model.id }
    if (onRouteChange) onRouteChange(nextRoute)
    else onChange?.(model.id)
    setOpen(false)
  }

  function backFromModels() {
    moveMobileStep(isAggregator ? 'vendors' : 'providers', isAggregator ? 'selected-vendor' : 'selected-provider')
  }

  function revealMoreModels() {
    setCompatibleLimit((current) => Math.min(rows.length, current + COMPATIBLE_PAGE_SIZE))
  }

  function scheduleFocusFirstRevealedModel(event) {
    if (!['Enter', ' '].includes(event.key)) return
    const rowIndex = Number(event.currentTarget.dataset.nextModelIndex)
    window.setTimeout(() => {
      listRef.current?.querySelector(`[data-model-index="${rowIndex}"]`)?.focus()
    }, 50)
  }

  const providerRail = (
    <div className="model-provider-rail" role="group" aria-label="API 接入渠道">
      <h3>API 接入渠道</h3>
      {providerIds.map((id) => (
        <button type="button" key={id} aria-label={providerDisplayName(id, providerConfigs)} aria-pressed={selectedProvider === id} className={selectedProvider === id ? 'active' : ''} onClick={() => chooseProvider(id)}>
          <strong>{providerDisplayName(id, providerConfigs)}</strong>
          <small>{effectiveRegistry.providers[id].accessKind === 'aggregator' ? '聚合渠道' : '官方直连'}</small>
        </button>
      ))}
    </div>
  )

  const vendorRail = isAggregator ? (
    <div className="model-vendor-rail" role="group" aria-label="模型开发厂商">
      <h3>模型开发厂商</h3>
      {availableVendors.map((vendor) => (
        <button type="button" key={vendor} aria-label={`厂商 ${vendor}`} aria-pressed={activeVendor === vendor} className={activeVendor === vendor ? 'active' : ''} onClick={() => chooseVendor(vendor)}>
          {vendor}
        </button>
      ))}
    </div>
  ) : null

  const modelBrowser = (
    <section className="model-browser" aria-label="具体模型列表">
      <div className="model-browser-tools">
        {isOpenRouter ? (
          <div className="model-catalog-tabs" role="group" aria-label="OpenRouter 模型范围">
            <button type="button" aria-pressed={effectiveCatalogMode === 'recommended'} className={effectiveCatalogMode === 'recommended' ? 'active' : ''} onClick={() => changeCatalogMode('recommended')}>推荐模型</button>
            <button type="button" aria-pressed={effectiveCatalogMode === 'all'} className={effectiveCatalogMode === 'all' ? 'active' : ''} onClick={() => changeCatalogMode('all')}>全部兼容模型</button>
          </div>
        ) : <div className="model-catalog-title"><Sparkles size={15} /> 服务端模型目录</div>}
        <label className="model-picker-search">
          <Search size={16} />
          <span className="sr-only">搜索{label}</span>
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); resetModelList(); resetIncompatible() }} placeholder="搜索模型、厂商或能力" />
        </label>
      </div>
      <div ref={windowRef} className="model-picker-window">
        <div ref={listRef} className="model-picker-list">
          {rows.slice(0, compatibleLimit).map((model, rowIndex) => (
              <button
                key={model.id}
                type="button"
                className={`model-option ${effectiveRoute.modelId === model.id && effectiveRoute.accessProvider === selectedProvider ? 'active' : ''}`}
                data-model-index={rowIndex}
                aria-disabled="false"
                onClick={() => chooseModel(model)}
              >
                <span className="model-option-main"><strong>{model.label || model.id}</strong><small>{model.id}</small></span>
                <span className="model-option-badges">
                  {model.recommended && model.lifecycle === 'stable' ? <em>推荐</em> : null}
                  <em>{lifecycleLabel(model.lifecycle)}</em>
                  <em>{verificationLabel(model)}</em>
                  {model.requiresEntitlement ? <em>需权益</em> : <em>标准权限</em>}
                  {effectiveRoute.modelId === model.id && effectiveRoute.accessProvider === selectedProvider ? <Check size={16} /> : null}
                </span>
                <span className="model-option-meta">{providerDisplayName(selectedProvider, providerConfigs)} · {capabilityLabel(model)}{model.releasedAt ? ` · ${model.releasedAt}` : ' · 发布时间未知'}</span>
                <span className="model-option-note">{model.entitlement ? `权益要求：${model.entitlement}` : '无需额外模型权益'}{model.availabilityNotes ? ` · ${model.availabilityNotes}` : ''}</span>
              </button>
          ))}
        </div>
        {compatibleLimit < rows.length ? (
          <button
            type="button"
            className="model-picker-more"
            data-next-model-index={compatibleLimit}
            onClick={revealMoreModels}
            onKeyDown={scheduleFocusFirstRevealedModel}
          >显示更多模型</button>
        ) : null}
      </div>
      {!rows.length ? <p className="model-picker-empty">没有匹配当前角色与输出格式的可用模型。</p> : null}
      {isOpenRouter && allPartition.incompatible.length ? (
        <details className="model-incompatible" open={showIncompatible} onToggle={(event) => setShowIncompatible(event.currentTarget.open)}>
          <summary>暂不兼容（{allPartition.incompatible.length}）</summary>
          {showIncompatible ? <div>
            {allPartition.incompatible.slice(0, incompatibleLimit).map((model) => (
              <button key={model.id} type="button" className="model-option incompatible" disabled aria-disabled="true" title={model.selectionDisabledReason}>
                <span className="model-option-main"><strong>{model.label || model.id}</strong><small>{model.id}</small></span>
                <span className="model-disabled-reason">{model.selectionDisabledReason}</span>
              </button>
            ))}
            {incompatibleLimit < allPartition.incompatible.length ? (
              <button type="button" className="model-incompatible-more" onClick={() => setIncompatibleLimit((current) => current + INCOMPATIBLE_PAGE_SIZE)}>
                显示更多不兼容模型
              </button>
            ) : null}
          </div> : null}
        </details>
      ) : null}
    </section>
  )

  return (
    <div className="model-picker" data-focus-setting={focusSetting || undefined} tabIndex={focusSetting ? -1 : undefined}>
      <span id={labelId} className="model-picker-label">{label}</span>
      <button type="button" className="model-picker-trigger" aria-expanded={open} aria-labelledby={labelId} onClick={openPicker}>
        <span>
          <strong>{selectedModel?.label || effectiveRoute.modelId || '请选择模型'}</strong>
          <small>{providerDisplayName(effectiveRoute.accessProvider, providerConfigs)} · {selectedModel?.vendor || '服务端目录'}</small>
        </span>
        <ChevronDown size={17} />
      </button>
      {open ? (
        <div className="model-route-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <aside ref={panelRef} className="model-route-drawer" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId}>
            <header className="model-route-head">
              <div><span>Model routing</span><h2 id={dialogTitleId}>{label} · API 渠道与模型</h2></div>
              <button type="button" aria-label="关闭模型选择" onClick={() => setOpen(false)}><X size={20} /></button>
            </header>
            {compact ? (
              <div className={`model-route-mobile-step step-${mobileStep}`}>
                {mobileStep === 'providers' ? (
                  <><h3>选择 API 接入渠道</h3>{providerRail}</>
                ) : null}
                {mobileStep === 'vendors' ? (
                  <>
                    <button type="button" className="model-route-back" data-mobile-focus="providers-back" onClick={() => moveMobileStep('providers', 'selected-provider')}><ArrowLeft size={16} /> 返回 API 接入渠道</button>
                    <h3>选择模型开发厂商</h3>{vendorRail}
                  </>
                ) : null}
                {mobileStep === 'models' ? (
                  <>
                    <button type="button" className="model-route-back" data-mobile-focus="models-back" onClick={backFromModels}><ArrowLeft size={16} /> 返回 {isAggregator ? '模型开发厂商' : 'API 接入渠道'}</button>
                    <h3>选择具体模型</h3>{modelBrowser}
                  </>
                ) : null}
              </div>
            ) : (
              <div className={`model-route-desktop-layout ${isAggregator ? 'has-vendor' : 'direct'}`}>{providerRail}{vendorRail}{modelBrowser}</div>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
