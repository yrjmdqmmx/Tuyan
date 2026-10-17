import { useAppLocale } from './BenchmarkLocale.jsx'
import { ModelSpecifications } from './ModelSpecifications.jsx'
import { ModelBrandLogo } from './ModelBrandLogo.jsx'
import { modelCardName } from '../lib/modelCardSpecifications'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, Search, Sparkles, X } from 'lucide-react'
import { DEFAULT_WEB_PROVIDER } from '../lib/modelRouting'
import { groupRegistryModels, partitionRegistryModels } from '../lib/modelRegistry'
import { MODEL_CHANNEL_LABELS, presentRegistryModel, orderModelChannels } from '../lib/modelPresentation'

const COMPATIBLE_PAGE_SIZE = 24
const COMPACT_MEDIA_QUERY = '(max-width: 1076px)'
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])'
const MOBILE_FOCUS_SELECTORS = Object.freeze({
  'custom-back': '[data-mobile-focus="custom-back"]',
  'providers-back': '[data-mobile-focus="providers-back"]',
  'models-back': '[data-mobile-focus="models-back"]',
  'selected-provider': '.model-provider-rail button[aria-pressed="true"]',
  'selected-vendor': '.model-vendor-rail button[aria-pressed="true"]',
})

function providerDisplayName(provider, providerConfigs) {
  if (provider === 'custom') return '通用 API'
  return MODEL_CHANNEL_LABELS[provider] || providerConfigs?.[provider]?.label || provider
}

export default function ModelPicker({
  label,
  models,
  role,
  value,
  outputFormat = '',
  operation = 'generation',
  provider = '',
  onChange,
  focusSetting = '',
  registry, catalogControls,
  route,
  onRouteChange,
  providerConfigs,
  allowCustom = false,
  renderCustomSettings,
  customSummary,
  visionMode, onVisionModeChange,
}) {
  const { t } = useAppLocale()
  const effectiveRoute = route || { accessProvider: provider, modelId: value }
  const sourceRegistry = registry?.providers
    ? registry
    : {
        providers: {
          [provider]: {
            accessKind: ['openrouter', 'bailian', 'ark', 'tokendance'].includes(provider) ? 'aggregator' : 'direct',
            models: models || [],
          },
        },
      }
  const effectiveRegistry = useMemo(() => ({ ...sourceRegistry, providers: Object.fromEntries(Object.entries(sourceRegistry.providers || {}).map(([id, entry]) => [id, { ...entry, models: entry.models.map((model) => {
    const presented = presentRegistryModel(id, model)
    return { ...presented, label: modelCardName(id, presented) }
  }) }])) }), [registry, models, provider])
  const providerIds = useMemo(() => [
    ...(allowCustom ? ['custom'] : []),
    ...orderModelChannels(Object.keys(effectiveRegistry.providers || {}).filter(id => id !== 'custom')).filter(id => {
      const available = partitionRegistryModels(effectiveRegistry.providers[id]?.models || [], { role, outputFormat, operation })
      return available.compatible.length > 0
    }),
  ], [effectiveRegistry, role, outputFormat, operation, allowCustom])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState(effectiveRoute.accessProvider || DEFAULT_WEB_PROVIDER)
  const showVisionNone = role === 'vision' && visionMode === 'none' && selectedProvider === null
  const [selectedVendor, setSelectedVendor] = useState('')
  const catalogDefinition = effectiveRegistry.catalogProviders?.[selectedProvider]
  const catalogState = catalogControls?.states?.[selectedProvider]
  const catalogStatus = catalogState?.catalog || effectiveRegistry.catalogHealth?.[selectedProvider]
  const [mobileStep, setMobileStep] = useState('providers')
  const [compact, setCompact] = useState(false)
  const [compatibleLimit, setCompatibleLimit] = useState(COMPATIBLE_PAGE_SIZE)
  const windowRef = useRef(null)
  const listRef = useRef(null)
  const panelRef = useRef(null)
  const customEditorRef = useRef(null)
  const mobileScrollerRef = useRef(null)
  const customScrollRef = useRef({desktop:0,mobile:0})
  const customDetailsRef = useRef(new Map())
  const detailKey = element => element.classList.contains('universal-connection') ? 'connection' : element.querySelector(':scope > summary')?.textContent
  const rememberCustomDetails = event => {
    if (event.target.tagName === 'DETAILS') customDetailsRef.current.set(detailKey(event.target), event.target.open)
  }
  const previousFocusRef = useRef(null)
  const pendingMobileFocusRef = useRef('')
  const labelId = useId()
  const dialogTitleId = useId()

  const activeProviderRegistry = effectiveRegistry.providers?.[selectedProvider] || { accessKind: 'direct', models: [] }
  const providerUnavailableReason = effectiveRegistry.unavailableProviders?.[selectedProvider]
  const allPartition = useMemo(
    () => partitionRegistryModels(activeProviderRegistry.models, { role, query, outputFormat, operation }),
    [activeProviderRegistry.models, role, query, outputFormat, operation],
  )
  const grouped = useMemo(() => groupRegistryModels(allPartition.compatible), [allPartition.compatible])
  const availableVendors = grouped.map((group) => group.vendor)
  const activeVendor = availableVendors.includes(selectedVendor) ? selectedVendor
    : grouped.find((group) => group.models.some((model) => model.id === effectiveRoute.modelId))?.vendor || availableVendors[0] || ''
  const vendorModels = grouped.find((group) => group.vendor === activeVendor)?.models || []
  const rows = vendorModels.filter((model) => !model.selectionDisabled)
  const selectedModel = effectiveRegistry.providers?.[effectiveRoute.accessProvider]?.models?.find((model) => model.id === effectiveRoute.modelId)
    || models?.find((model) => model.id === value)

  function resetModelList() {
    setCompatibleLimit(COMPATIBLE_PAGE_SIZE)
    if (windowRef.current) windowRef.current.scrollTop = 0
  }

  function moveMobileStep(step, focusTarget) {
    pendingMobileFocusRef.current = focusTarget
    setMobileStep(step)
  }

  useEffect(() => {
    resetModelList()
  }, [models, role, outputFormat, operation, provider])

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
        closePicker()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])].filter(element => {let ancestor=element.parentElement;while(ancestor&&ancestor!==panelRef.current){if(ancestor.tagName==='DETAILS'&&!ancestor.open&&!(element.tagName==='SUMMARY'&&element.parentElement===ancestor))return false;ancestor=ancestor.parentElement}return true})
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
      previousFocusRef.current?.focus?.({preventScroll:true})
    }
  }, [open])

  useEffect(() => {
    if (!open || !compact || !pendingMobileFocusRef.current) return undefined
    const selector = MOBILE_FOCUS_SELECTORS[pendingMobileFocusRef.current]
    pendingMobileFocusRef.current = ''
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector(selector)?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [activeVendor, compact, mobileStep, open, selectedProvider])

  useEffect(() => {
    if (!open || selectedProvider !== 'custom' || compact && mobileStep !== 'custom') return undefined
    for (const details of customEditorRef.current?.querySelectorAll('details') || []) {
      const saved = customDetailsRef.current.get(detailKey(details))
      if (saved !== undefined) details.open = saved
    }
    const position = customScrollRef.current[compact ? 'mobile' : 'desktop']
    let secondFrame
    const frame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const scroller = compact ? mobileScrollerRef.current : customEditorRef.current
        if (scroller) scroller.scrollTop = position
      })
    })
    return () => { window.cancelAnimationFrame(frame); window.cancelAnimationFrame(secondFrame) }
  }, [open, selectedProvider, compact, mobileStep])

  function rememberCustomPosition() {
    // A focus/keyboard scroll may not have emitted its scroll event yet.
    // Capture the live DOM before unmounting instead of saving the last event.
    const editor = customEditorRef.current
    if (editor) {
      const mobile = mobileScrollerRef.current
      customScrollRef.current[mobile ? 'mobile' : 'desktop'] = (mobile || editor).scrollTop
      for (const details of editor.querySelectorAll('details')) customDetailsRef.current.set(detailKey(details), details.open)
    }
  }

  function closePicker() { rememberCustomPosition(); setOpen(false) }

  function openPicker() {
    const preferredProvider = effectiveRoute.accessProvider || DEFAULT_WEB_PROVIDER
    const nextProvider = providerIds.includes(preferredProvider) ? preferredProvider : providerIds.find(id => id !== 'custom') || providerIds[0] || null
    const nextRegistry = effectiveRegistry.providers?.[nextProvider]
    const nextGroups = groupRegistryModels(partitionRegistryModels(nextRegistry?.models || [], { role, outputFormat, operation }).compatible)
    // Retain the route as a draft, but do not reopen its editor when the role is disabled.
    setSelectedProvider(role === 'vision' && visionMode === 'none' ? null : nextProvider)
    setSelectedVendor(nextGroups.find((group) => group.models.some((model) => model.id === effectiveRoute.modelId))?.vendor || nextGroups[0]?.vendor || '')
    setMobileStep(nextProvider === 'custom' && visionMode !== 'none' ? 'custom' : 'providers')
    setQuery('')
    resetModelList()
    setOpen(true)
  }

  useEffect(() => {
    if (!open || selectedProvider === null || providerIds.includes(selectedProvider)) return
    // Refresh can remove the last compatible model. Move only the browsing view;
    // keep the saved route until the user explicitly chooses another model.
    setSelectedProvider(providerIds.find(id => id !== 'custom') || providerIds[0] || null)
    setSelectedVendor('')
    setQuery('')
    resetModelList()
    if (compact) moveMobileStep('providers', 'selected-provider')
  }, [open, providerIds, selectedProvider, compact])

  useEffect(() => {
    if(open && catalogDefinition?.access === 'key' && catalogControls?.apiKeys?.[selectedProvider] && !catalogState) catalogControls.onLoad?.(selectedProvider)
  },[open,selectedProvider,catalogDefinition?.access,catalogControls?.apiKeys?.[selectedProvider],catalogState])
  useEffect(()=>{
    if(!open || catalogDefinition?.access!=='public' || catalogState?.privateModels || catalogState?.status==='loading' || catalogStatus?.state!=='partial' || !catalogStatus?.continuation || !catalogStatus?.retryAfterSeconds)return
    const delay=Math.max(1000,Date.parse(catalogStatus.fetchedAt || '')+catalogStatus.retryAfterSeconds*1000-Date.now()+1000)
    const timer=setTimeout(()=>catalogControls?.onLoad?.(selectedProvider,{privateModels:false}),Number.isFinite(delay)?delay:60000)
    return ()=>clearTimeout(timer)
  },[open,selectedProvider,catalogDefinition?.access,catalogState?.status,catalogStatus,catalogControls?.onLoad])


  function chooseProvider(nextProvider) {
    rememberCustomPosition()
    if (nextProvider === 'custom') {
      onRouteChange?.({accessProvider: 'custom', modelId: effectiveRoute.accessProvider === 'custom' ? effectiveRoute.modelId : ''});
      setSelectedProvider('custom');
      setQuery('');
      if (compact) moveMobileStep('custom', 'custom-back');
      return;
    }
    const nextRegistry = effectiveRegistry.providers?.[nextProvider] || { models: [] }
    const nextPartition = partitionRegistryModels(nextRegistry.models, { role, outputFormat, operation })
    const nextGroups = groupRegistryModels(nextPartition.compatible)
    setSelectedProvider(nextProvider)
    setSelectedVendor(nextGroups[0]?.vendor || '')
    setQuery('')
    resetModelList()
    if (compact) moveMobileStep(nextGroups.length ? 'vendors' : 'models', nextGroups.length ? 'providers-back' : 'models-back')
  }

  function chooseVendor(vendor) {
    setSelectedVendor(vendor)
    resetModelList()
    if (compact) moveMobileStep('models', 'models-back')
  }

  function chooseModel(model) {
    const nextRoute = { accessProvider: selectedProvider, modelId: model.id }
    if (role === 'vision') onVisionModeChange?.('assist')
    if (onRouteChange) onRouteChange(nextRoute)
    else onChange?.(model.id)
    closePicker()
  }

  function backFromModels() {
    moveMobileStep(availableVendors.length ? 'vendors' : 'providers', availableVendors.length ? 'selected-vendor' : 'selected-provider')
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
    <div className="model-provider-rail" role="group" aria-label={t("API 接入渠道")}>
      <h3>{t("API 接入渠道")}</h3>
      {role === 'vision' && onVisionModeChange ? <button type="button" className={visionMode === 'none' ? 'active' : ''} aria-label={t('无')} aria-pressed={visionMode === 'none'} onClick={() => {onVisionModeChange('none');closePicker()}}>
        <strong>{t('无')}</strong><small>{t('不使用独立视觉模型')}</small>
      </button> : null}
      {providerIds.map((id) => (
        <button type="button" key={id} aria-label={providerDisplayName(id, providerConfigs)} aria-pressed={visionMode !== 'none' && selectedProvider === id} className={visionMode !== 'none' && selectedProvider === id ? 'active' : ''} onClick={() => chooseProvider(id)}>
          <ModelBrandLogo brand={id} channel />
          <span className="model-brand-caption"><strong>{providerDisplayName(id, providerConfigs)}</strong>
          <small>{t(effectiveRegistry.unavailableProviders?.[id] ? '目录暂不可用' : id === 'custom' ? '自定义接入' : effectiveRegistry.providers[id]?.accessKind === 'aggregator' ? '聚合渠道' : '官方直连')}</small></span>
        </button>
      ))}
    </div>
  )

  const vendorRail = (
    <div className="model-vendor-rail" role="group" aria-label={t("模型厂商")}>
      <h3>{t("模型厂商")}</h3>
      {availableVendors.map((vendor) => (
        <button type="button" key={vendor} aria-label={t("厂商 {v0}", {v0: vendor})} aria-pressed={activeVendor === vendor} className={activeVendor === vendor ? 'active' : ''} onClick={() => chooseVendor(vendor)}>
          <ModelBrandLogo brand={grouped.find(group => group.vendor === vendor)?.models[0]?.vendorId} />
          <span>{vendor}</span>
        </button>
      ))}
    </div>
  )

  const customEditor = (
    <section ref={customEditorRef} onToggleCapture={rememberCustomDetails} onScroll={event=>{if(!compact)customScrollRef.current.desktop=event.currentTarget.scrollTop}} className="model-custom-editor" aria-label={t("通用 API 配置")}>
      <div className="model-custom-intro"><h3>{t("通用 API")}</h3><p>{t("修改即时用于当前角色。关闭弹框保留本页草稿；保存到浏览器需使用设置中的保存按钮，不含密钥。")}</p></div>
      {renderCustomSettings?.()}
      <button type="button" className="universal-button model-custom-done" onClick={() => closePicker()}>{t("返回生成设置")}</button>
    </section>
  )

  const visionNonePanel = (
    <section className="model-vision-none" aria-label={t('视觉模型未启用')}>
      <h3>{t('未启用独立视觉模型')}</h3>
      <p>{t('如需使用，请从渠道列表中选择并配置视觉模型。')}</p>
    </section>
  )

  const modelBrowser = (
    <section className="model-browser" aria-label={t("具体模型列表")}>
      <div className="model-browser-tools">
        <div className="model-catalog-title"><Sparkles size={15} />{t(" 服务端模型目录 ")}<small>{rows.length}</small>
          {catalogControls?.onLoad && ['public', 'key'].includes(catalogDefinition?.access) ? <button type="button" className="model-catalog-refresh" disabled={catalogState?.status === 'loading' || catalogDefinition.access === 'key' && !catalogControls.apiKeys?.[selectedProvider]} onClick={() => catalogControls.onLoad(selectedProvider)}>{t(catalogState?.status === 'loading' ? '正在刷新…' : '刷新目录')}</button> : null}
        </div>
        <label className="model-picker-search">
          <Search size={16} />
          <span className="sr-only">{t("搜索")}{t(label)}</span>
          <input type="search" autoComplete="off" name="model-catalog-search" value={query} onChange={(event) => { setQuery(event.target.value); resetModelList() }} placeholder={t("搜索模型、厂商或能力")} />
        </label>
      </div>
      <div ref={windowRef} className="model-picker-window">
        <div ref={listRef} className="model-picker-list">
          {rows.slice(0, compatibleLimit).map((model, rowIndex) => (
            <article key={model.id} data-model-id={model.id} onClick={(event) => {
              // Keep source links and the keyboard-accessible title button independent.
              if (!event.target.closest('a, button, input, select, textarea, summary')) chooseModel(model)
            }} className={`model-option ${visionMode !== 'none' && effectiveRoute.modelId === model.id && effectiveRoute.accessProvider === selectedProvider ? 'active' : ''}`}>
              <button type="button" className="model-option-select" data-model-index={rowIndex} aria-label={t("选择 {v0}", {v0: model.label || model.id})} onClick={() => chooseModel(model)}>
                <span className="model-option-main model-brand-heading"><ModelBrandLogo brand={model.vendorId} /><strong>{model.label || model.id}</strong></span>
                {visionMode !== 'none' && effectiveRoute.modelId === model.id && effectiveRoute.accessProvider === selectedProvider ? <Check size={18} /> : null}
              </button>
              <ModelSpecifications provider={selectedProvider} model={model} />
            </article>
          ))}
        </div>
        {compatibleLimit < rows.length ? (
          <button
            type="button"
            className="model-picker-more"
            data-next-model-index={compatibleLimit}
            onClick={revealMoreModels}
            onKeyDown={scheduleFocusFirstRevealedModel}
          >{t("显示更多模型")}</button>
        ) : null}
      </div>
      {(providerUnavailableReason || !effectiveRegistry.providers?.[selectedProvider]) ? <p className="model-picker-empty" role="status">{t("当前渠道暂无可选模型。")}</p> : null}
      {!rows.length && !providerUnavailableReason && effectiveRegistry.providers?.[selectedProvider] ? <p className="model-picker-empty">{t("没有匹配当前角色与输出格式的可用模型。")}</p> : null}

    </section>
  )

  return (
    <div className="model-picker" data-focus-setting={focusSetting || undefined} tabIndex={focusSetting ? -1 : undefined}>
      <span id={labelId} className="model-picker-label">{t(label)}</span>
      <button type="button" className={`model-picker-trigger${role === 'vision' && visionMode === 'none' ? ' model-picker-trigger-compact' : ''}`} aria-expanded={open} aria-labelledby={labelId} onClick={openPicker}>
        <span>
          <strong className="model-brand-heading">{selectedModel && visionMode !== 'none' ? <ModelBrandLogo brand={selectedModel.vendorId} /> : null}{t(role === 'vision' && visionMode === 'none' ? '无' : selectedModel?.label || effectiveRoute.modelId || '请选择模型')}</strong>
          {role === 'vision' && visionMode === 'none' ? null : <small>{[...new Set([providerDisplayName(effectiveRoute.accessProvider, providerConfigs), selectedModel?.vendor].filter(Boolean))].join(' · ')}</small>}
          {visionMode !== 'none' && effectiveRoute.accessProvider === 'custom' && customSummary ? <small className="model-custom-summary">{customSummary}</small> : null}
        </span>
        <ChevronDown size={17} />
      </button>
      {visionMode !== 'none' && selectedModel?.selectable === false && selectedModel.disabledReason ? (
        <p className="model-picker-empty" role="status">{t("所选模型当前不可用，请重新选择。")}</p>
      ) : null}
      {open ? (
        <div className="model-route-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closePicker() }}>
          <aside ref={panelRef} className="model-route-drawer" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId}>
            <header className="model-route-head">
              <div><span>{t(showVisionNone ? '视觉模型 → 无' : selectedProvider === 'custom' ? "API 接入渠道 → 通用 API 配置" : "API 接入渠道 → 模型厂商 → 服务端模型目录")}</span><h2 id={dialogTitleId}>{t(label)}{t(" · API 渠道与模型")}</h2></div>
              <button type="button" aria-label={t("关闭模型选择")} onClick={() => closePicker()}><X size={20} /></button>
            </header>
            {compact ? (
              <div ref={mobileScrollerRef} onScroll={event=>{if(mobileStep==='custom')customScrollRef.current.mobile=event.currentTarget.scrollTop}} className={`model-route-mobile-step step-${mobileStep}`}>
                {mobileStep === 'providers' ? (
                  <><h3>{t("选择 API 接入渠道")}</h3>{providerRail}</>
                ) : null}
                {mobileStep === 'custom' ? (
                  <>
                    <button type="button" className="model-route-back" data-mobile-focus="custom-back" onClick={() => {rememberCustomPosition();moveMobileStep('providers', 'selected-provider')}}><ArrowLeft size={16} />{t(" 返回 API 接入渠道")}</button>
                    {customEditor}
                  </>
                ) : null}
                {mobileStep === 'vendors' ? (
                  <>
                    <button type="button" className="model-route-back" data-mobile-focus="providers-back" onClick={() => moveMobileStep('providers', 'selected-provider')}><ArrowLeft size={16} />{t(" 返回 API 接入渠道")}</button>
                    <h3>{t("选择模型厂商")}</h3>{vendorRail}
                  </>
                ) : null}
                {mobileStep === 'models' ? (
                  <>
                    <button type="button" className="model-route-back" data-mobile-focus="models-back" onClick={backFromModels}><ArrowLeft size={16} />{t(availableVendors.length ? " 返回 模型厂商" : " 返回 API 接入渠道")}</button>
                    <h3>{t("选择具体模型")}</h3>{modelBrowser}
                  </>
                ) : null}
              </div>
            ) : (
              <div className={`model-route-desktop-layout ${showVisionNone ? 'has-none' : selectedProvider === 'custom' ? 'has-custom' : 'has-vendor'}`}>{providerRail}{showVisionNone ? visionNonePanel : selectedProvider === 'custom' ? customEditor : <>{vendorRail}{modelBrowser}</>}</div>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
