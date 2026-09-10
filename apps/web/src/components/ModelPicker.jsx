import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, Copy, Search, Sparkles, X } from 'lucide-react'
import { groupRegistryModels, partitionRegistryModels } from '../lib/modelRegistry'
import { MODEL_CHANNEL_LABELS, presentRegistryModel, orderModelChannels, modelLifecycleLabel } from '../lib/modelPresentation'

const COMPATIBLE_PAGE_SIZE = 24
const COMPACT_MEDIA_QUERY = '(max-width: 1076px)'
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])'
const MOBILE_FOCUS_SELECTORS = Object.freeze({
  'providers-back': '[data-mobile-focus="providers-back"]',
  'models-back': '[data-mobile-focus="models-back"]',
  'selected-provider': '.model-provider-rail button[aria-pressed="true"]',
  'selected-vendor': '.model-vendor-rail button[aria-pressed="true"]',
})

function providerDisplayName(provider, providerConfigs) {
  return MODEL_CHANNEL_LABELS[provider] || providerConfigs?.[provider]?.label || provider
}

function verificationLabel(model) {
  if (model.verificationState === 'catalog') return '官方目录'
  if (model.verificationState === 'account-visible') return '账号目录可见'
  if (model.verificationState === 'inference-verified') return '真实调用已验证'
  if (model.verificationState === 'registry') return '静态注册信息'
  return model.verified === true ? '注册表已确认' : '模型目录'
}

function capabilityLabel(model) {
  const capabilities = []
  if (model.roles?.includes('main')) capabilities.push('文本')
  if (model.roles?.includes('image') && !model.capabilities?.requiresSourceImage) capabilities.push('图像生成')
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
  const effectiveRegistry = useMemo(() => ({ ...sourceRegistry, providers: Object.fromEntries(Object.entries(sourceRegistry.providers || {}).map(([id, entry]) => [id, { ...entry, models: entry.models.map((model) => presentRegistryModel(id, model)) }])) }), [registry, models, provider])
  const providerIds = useMemo(() => orderModelChannels(Object.keys(effectiveRegistry.providers || {})).filter((id) => {
    const available = partitionRegistryModels(effectiveRegistry.providers[id].models, { role, outputFormat })
    return available.compatible.length > 0
  }), [effectiveRegistry, role, outputFormat])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [selectedProvider, setSelectedProvider] = useState(effectiveRoute.accessProvider || providerIds[0] || '')
  const [selectedVendor, setSelectedVendor] = useState('')
  const [mobileStep, setMobileStep] = useState('providers')
  const [compact, setCompact] = useState(false)
  const [compatibleLimit, setCompatibleLimit] = useState(COMPATIBLE_PAGE_SIZE)
  const windowRef = useRef(null)
  const listRef = useRef(null)
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)
  const pendingMobileFocusRef = useRef('')
  const labelId = useId()
  const dialogTitleId = useId()

  const activeProviderRegistry = effectiveRegistry.providers?.[selectedProvider] || { accessKind: 'direct', models: [] }
  const allPartition = useMemo(
    () => partitionRegistryModels(activeProviderRegistry.models, { role, query, outputFormat }),
    [activeProviderRegistry.models, role, query, outputFormat],
  )
  const grouped = useMemo(() => groupRegistryModels(allPartition.compatible), [allPartition.compatible])
  const availableVendors = grouped.map((group) => group.vendor)
  const activeVendor = availableVendors.includes(selectedVendor) ? selectedVendor
    : grouped.find((group) => group.models.some((model) => model.id === effectiveRoute.modelId))?.vendor || availableVendors[0] || ''
  const rows = grouped.find((group) => group.vendor === activeVendor)?.models || []
  const selectedModel = activeProviderRegistry.models?.find((model) => model.id === effectiveRoute.modelId)
    || models?.find((model) => model.id === value)

  function resetModelList() {
    setCompatibleLimit(COMPATIBLE_PAGE_SIZE)
    if (windowRef.current) windowRef.current.scrollTop = 0
  }

  async function copyModelId(id) {
    try { await navigator.clipboard.writeText(id); setCopyStatus('已复制模型 ID') }
    catch { setCopyStatus('复制失败，请选中下方完整 ID 复制') }
  }

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
      const focusable = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])].filter((element) => !element.closest('details:not([open])') || element.tagName === 'SUMMARY')
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
    setCopyStatus('')
    resetModelList()
    setOpen(true)
  }

  function chooseProvider(nextProvider) {
    const nextRegistry = effectiveRegistry.providers?.[nextProvider] || { models: [] }
    const nextGroups = groupRegistryModels(partitionRegistryModels(nextRegistry.models, { role, outputFormat }).compatible)
    setSelectedProvider(nextProvider)
    setSelectedVendor(nextGroups[0]?.vendor || '')
    setQuery('')
    resetModelList()
    if (compact) moveMobileStep('vendors', 'providers-back')
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
    moveMobileStep('vendors', 'selected-vendor')
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

  const vendorRail = (
    <div className="model-vendor-rail" role="group" aria-label="模型厂商">
      <h3>模型厂商</h3>
      {availableVendors.map((vendor) => (
        <button type="button" key={vendor} aria-label={`厂商 ${vendor}`} aria-pressed={activeVendor === vendor} className={activeVendor === vendor ? 'active' : ''} onClick={() => chooseVendor(vendor)}>
          {vendor}
        </button>
      ))}
    </div>
  )

  const modelBrowser = (
    <section className="model-browser" aria-label="具体模型列表">
      <div className="model-browser-tools">
        <div className="model-catalog-title"><Sparkles size={15} /> 服务端模型目录 <small>{rows.length}</small></div>
        <label className="model-picker-search">
          <Search size={16} />
          <span className="sr-only">搜索{label}</span>
          <input type="search" autoComplete="off" name="model-catalog-search" value={query} onChange={(event) => { setQuery(event.target.value); resetModelList() }} placeholder="搜索模型、厂商或能力" />
        </label>
      </div>
      <div ref={windowRef} className="model-picker-window">
        <div ref={listRef} className="model-picker-list">
          {rows.slice(0, compatibleLimit).map((model, rowIndex) => (
            <article key={model.id} className={`model-option ${effectiveRoute.modelId === model.id && effectiveRoute.accessProvider === selectedProvider ? 'active' : ''}`}>
              <button type="button" className="model-option-select" data-model-index={rowIndex} aria-label={`选择 ${model.label || model.id}`} onClick={() => chooseModel(model)}>
                <span className="model-option-main"><strong>{model.label || model.id}</strong></span>
                {effectiveRoute.modelId === model.id && effectiveRoute.accessProvider === selectedProvider ? <Check size={18} /> : null}
                <span className="model-option-meta">{capabilityLabel(model)}</span>
                <span className="model-option-badges">
                  {model.releasedAt ? <time dateTime={model.releasedAt}>{model.releasedAt}</time> : <span>{model.releaseOrder ? '按官方版本排序' : '发布日期待确认'}</span>}
                  <em>{modelLifecycleLabel(model.lifecycle)}</em>
                  {model.releaseKind === 'snapshot' ? <em>日期快照</em> : null}
                  {model.serviceTier ? <em>{model.serviceTier}</em> : null}
                  {model.recommended && model.lifecycle === 'stable' ? <em>推荐</em> : null}
                  {model.capabilities?.requiresSourceImage ? <em>仅编辑</em> : null}
                  {model.requiresEntitlement ? <em>需权益</em> : null}
                </span>
              </button>
              <div className="model-id-row"><code title={model.id}>{model.id}</code><button type="button" className="model-id-copy" aria-label={`复制模型 ID ${model.id}`} onClick={() => copyModelId(model.id)}><Copy size={14} /><span>复制 ID</span></button></div>
              <details className="model-option-details"><summary>模型详情</summary>
                <p>{modelLifecycleLabel(model.lifecycle)}{model.releaseKind === 'snapshot' ? ' · 日期快照' : ''} · {model.releasedAt || '发布日期待确认'}{!model.releasedAt && model.releaseOrder ? '，按官方版本顺序展示' : ''}</p>
                <p>{verificationLabel(model)}{model.entitlement ? ` · 权益要求：${model.entitlement}` : ''}</p>
                {model.availabilityNotes ? <p>{model.availabilityNotes}</p> : null}
                {model.releaseSourceUrl || model.releaseOrderSourceUrl ? <a href={model.releaseSourceUrl || model.releaseOrderSourceUrl} target="_blank" rel="noreferrer">官方发布与版本依据</a> : null}
                {model.earliestRetirementDate ? <p>最早退役日：{model.earliestRetirementDate}，以正式公告为准</p> : null}
              </details>
              {model.expirationDate && !model.expirationDate.startsWith('2098') ? <p className="model-retirement">官方到期日：{model.expirationDate}{model.replacementModelId ? ` · 请迁移至 ${model.replacementModelId}` : ''}</p> : null}
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
          >显示更多模型</button>
        ) : null}
      </div>
      <p className="model-copy-status" role="status">{copyStatus}</p>
      {!rows.length ? <p className="model-picker-empty">没有匹配当前角色与输出格式的可用模型。</p> : null}

    </section>
  )

  return (
    <div className="model-picker" data-focus-setting={focusSetting || undefined} tabIndex={focusSetting ? -1 : undefined}>
      <span id={labelId} className="model-picker-label">{label}</span>
      <button type="button" className="model-picker-trigger" aria-expanded={open} aria-labelledby={labelId} onClick={openPicker}>
        <span>
          <strong>{selectedModel?.label || effectiveRoute.modelId || '请选择模型'}</strong>
          <small>{[...new Set([providerDisplayName(effectiveRoute.accessProvider, providerConfigs), selectedModel?.vendor].filter(Boolean))].join(' · ')}</small>
        </span>
        <ChevronDown size={17} />
      </button>
      {open ? (
        <div className="model-route-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <aside ref={panelRef} className="model-route-drawer" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId}>
            <header className="model-route-head">
              <div><span>API 接入渠道 → 模型厂商 → 服务端模型目录</span><h2 id={dialogTitleId}>{label} · API 渠道与模型</h2></div>
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
                    <h3>选择模型厂商</h3>{vendorRail}
                  </>
                ) : null}
                {mobileStep === 'models' ? (
                  <>
                    <button type="button" className="model-route-back" data-mobile-focus="models-back" onClick={backFromModels}><ArrowLeft size={16} /> 返回 模型厂商</button>
                    <h3>选择具体模型</h3>{modelBrowser}
                  </>
                ) : null}
              </div>
            ) : (
              <div className="model-route-desktop-layout has-vendor">{providerRail}{vendorRail}{modelBrowser}</div>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
