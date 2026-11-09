import { sourceTitle } from '../../../../packages/api/src/card-presentation.mjs'
import { modelLifecycleMessage } from '../lib/modelUnavailablePresentation.js'
import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ScanText, TextCursorInput, ExternalLink, Type, Image, AudioLines, Video, FileText } from 'lucide-react'
import { modelCardSpecifications } from '../lib/modelCardSpecifications'
import { modelSourceRows, modelSourceName } from '../lib/modelCardSources.js'
import { modalityIconStates } from '../lib/modelModalityIcons'
import { useAppLocale } from './BenchmarkLocale.jsx'
import WorkspaceDialog from '../workspace/WorkspaceDialog.jsx'

const icons = { text: Type, image: Image, audio: AudioLines, video: Video, file: FileText }

function ModalityIcons({ states, direction }) {
  const { t } = useAppLocale()
  return <span className="model-modality-icons" role="group" aria-label={t(direction)}>
    {states.map(({ id, state, accessibleLabel, tooltip }) => {
      const Icon = icons[id]
      const description = accessibleLabel.split(/(：| · )/).map(part => t(part)).join('')
      return <span key={id} className={`model-modality-icon is-${state}`} data-state={state} role="img" aria-label={description} title={t(tooltip)}>
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        {state === 'unsupported' && <span className="model-modality-strike" aria-hidden="true" />}
        {['unknown', 'unlisted'].includes(state) && <sup className="model-modality-question" aria-hidden="true">?</sup>}
        {state === 'conditional' ? <sup aria-hidden="true">*</sup> : null}
      </span>
    })}
  </span>
}

export function ModelSpecifications({ provider, model, compactSources = false, footerActions }) {
  const { t } = useAppLocale()
  const [showSources, setShowSources] = useState(false)
  const data = modelCardSpecifications(provider, model)
  const sourceRows = modelSourceRows(data)
  const inputs = modalityIconStates(data.input, data.inputFact, provider, model.id), outputs = modalityIconStates(data.output, data.outputFact, provider, model.id)
  const modalityDetails = [[t('输入'), inputs], [t('输出'), outputs]].map(([direction, states]) => `${direction}：${states.map(item => t(item.accessibleLabel)).join('；')}\n${[...new Set(states.map(item => t(item.tooltip)))].join('\n')}`)
  const vendorOrigin = scope => scope === '原厂' ? <small className="model-spec-origin">{t('源自原厂')}</small> : null
  const provenance = [['输入', data.inputScope], ['输出', data.outputScope], ['上下文窗口', data.contextScope], ['最大输出', data.maxOutputScope]]
    .filter(([, scope]) => scope).map(([label, scope]) => `${t(label)}：${t(scope === '原厂' ? '源自原厂' : ['图研既有核实', '图研输入要求'].includes(scope) ? scope : '渠道公布')}`)
  const catalogDates = Object.entries(data.fields).filter(([, fact]) => fact.provenance === 'catalog' && fact.verifiedAt)
    .map(([field, fact]) => `${t({inputModalities:'输入',outputModalities:'输出',totalContextTokens:'上下文窗口',maxOutputTokens:'最大输出'}[field])}：${t('图研既有核实')} ${fact.verifiedAt}`)
  const details = [data.checkedAt && `${t('核实日期')} ${data.checkedAt}`, ...provenance, ...catalogDates, ...modalityDetails,
    data.contextExact && `${t('上下文窗口')}：${data.contextExact}`, data.maxOutputExact && `${t('最大输出')}：${data.maxOutputExact}`,
    (data.unverified || model.catalogReview?.status === 'pending') && t('未核实'), model.catalogReview?.reason, model.savedChoice?.disabledReason, modelLifecycleMessage(provider, data.lifecycle), data.note].filter(Boolean).join('\n')
  const modalityButton = (states, direction) => <button type="button" className="model-modality-trigger" aria-label={`${t(direction)} · ${t('官方文档规格')}；${states.map(item => item.accessibleLabel.split(/(：| · )/).map(part => t(part)).join('')).join('；')}`} onClick={event => { event.stopPropagation(); setShowSources(true) }}><ModalityIcons states={states} direction={direction} /></button>
  const url = data.sources[0]
  const sources = <div className={`model-spec-sources${compactSources ? ' is-compact' : ''}`} aria-label={t('官方文档')}>
    {url ? <a href={url} title={`${details}\n${sourceRows.map(row => row.label).join('\n')}\n${data.sources.join('\n')}`} aria-label={`${sourceRows[0].label}\n${details}`} target="_blank" rel="noopener noreferrer" onClick={event => {
      // Touch devices expose the same evidence through the existing dialog.
      if (window.matchMedia?.('(hover: none)').matches) { event.preventDefault(); setShowSources(true) }
    }}><ExternalLink size={13} aria-hidden="true" /><span className="model-spec-source-text"><span className="model-spec-source-label">{t(modelSourceName(data, url))} · </span><span className="model-spec-source-domain" title={url}>{sourceRows[0].label.slice(modelSourceName(data, url).length + 3)}</span></span></a>
      : <span title={`${details}\n${data.sources.join('\n')}`} aria-label={details}>{t('官方文档待确认')}</span>}
  </div>
  return <div className="model-card-specifications">
    <dl className="model-specs" aria-label={t('官方文档规格')}>
      <div><dt><ArrowDownToLine size={14} aria-hidden="true" />{t('输入')}</dt><dd>{modalityButton(inputs, '输入模态')}{vendorOrigin(data.inputScope)}</dd></div>
      <div><dt><ArrowUpFromLine size={14} aria-hidden="true" />{t('输出')}</dt><dd>{modalityButton(outputs, '输出模态')}{vendorOrigin(data.outputScope)}</dd></div>
      <div><dt><ScanText size={14} aria-hidden="true" />{t('上下文窗口')}</dt><dd title={data.contextExact || undefined} className={data.context === '未知' ? 'model-spec-unknown' : undefined}>{t(data.context)}{vendorOrigin(data.contextScope)}</dd></div>
      <div><dt><TextCursorInput size={14} aria-hidden="true" />{t('最大输出')}</dt><dd title={data.maxOutputExact || undefined} className={data.maxOutput === '未知' ? 'model-spec-unknown' : undefined}>{t(data.maxOutput)}{vendorOrigin(data.maxOutputScope)}</dd></div>
    </dl>
    {footerActions ? <div className="model-spec-footer">{sources}{footerActions}</div> : sources}
    {showSources && <WorkspaceDialog className="model-evidence-dialog" title={t('官方文档规格')} onClose={() => setShowSources(false)}>
      <p className="tw-preserve-text">{details}</p>
      {sourceRows.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></p>)}
    </WorkspaceDialog>}
  </div>
}

export function ModelLifecycleBadge({ lifecycle, provider }) {
  const [open, setOpen] = useState(false)
  if (lifecycle?.state !== 'scheduled') return null
  const message = modelLifecycleMessage(provider, lifecycle)
  return <>
    <span className="tw-catalog-tags"><span className="is-unavailable" role="button" tabIndex={0} title={message} aria-label={`将下线：${message}`} onClick={() => setOpen(true)} onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpen(true) }
    }}>将下线</span></span>
    {open && <div onClick={event => event.stopPropagation()}><WorkspaceDialog className="model-evidence-dialog" title="下线公告" onClose={() => setOpen(false)}><p>{message}</p><a href={lifecycle.sourceUrl} target="_blank" rel="noopener noreferrer">下线公告 · {sourceTitle(lifecycle.sourceUrl)}</a></WorkspaceDialog></div>}
  </>
}
