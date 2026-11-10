import { isApiSource } from '../../../../packages/api/src/model-card-sources.mjs'
import { auditedModelSpecs } from '../lib/modelAudit.js'
import { cardLifecycle, visibleSourceTitle, fieldSourceLines } from '../../../../packages/api/src/card-presentation.mjs'
import { modelLifecycleMessage } from '../lib/modelUnavailablePresentation.js'
import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ScanText, TextCursorInput, ExternalLink, Type, Image, AudioLines, Video } from 'lucide-react'
import { modelCardSpecifications } from '../lib/modelCardSpecifications'
import { modelSourceRows } from '../lib/modelCardSources.js'
import { modalityIconStates } from '../lib/modelModalityIcons'
import { useAppLocale } from './BenchmarkLocale.jsx'
import WorkspaceDialog from '../workspace/WorkspaceDialog.jsx'

const icons = { text: Type, image: Image, audio: AudioLines, video: Video }

function ModalityIcons({ states, direction }) {
  const { t } = useAppLocale()
  return <span className="model-modality-icons" role="group" aria-label={t(direction)}>
    {states.map(({ id, state, accessibleLabel, tooltip }) => {
      const Icon = icons[id]
      const description = t(accessibleLabel)
      return <span key={id} className={`model-modality-icon is-${state}`} data-state={state} role="img" aria-label={description} title={t(tooltip)}>
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
      </span>
    })}
  </span>
}

export function ModelSpecifications({ provider, model, compactSources = false, footerActions }) {
  const { t } = useAppLocale()
  const [showSources, setShowSources] = useState(false)
  const data = modelCardSpecifications(provider, model)
  const sourceRows = modelSourceRows(data)
  const inputs = modalityIconStates(data.input, data.inputFact, provider, model.id), outputs = modalityIconStates(data.output, data.outputFact, provider, model.id, 'output')
  const modalityDetails = [...inputs, ...outputs].map(item => t(item.tooltip))
  const vendorOrigin = scope => scope === '原厂' ? <small className="model-spec-origin">{t('源自原厂')}</small> : null
  const provenance = fieldSourceLines(data.fields, data.checkedAt, t)
  const details = [...new Set([data.checkedAt && `${t('核实日期')}：${data.checkedAt}`, ...provenance, ...modalityDetails,
    data.contextExact && `${t('上下文窗口')}：${data.contextExact}`, data.maxOutputExact && `${t('最大输出')}：${data.maxOutputExact}`,
    (data.unverified || model.catalogReview?.status === 'pending') && t('未核实'), model.catalogReview?.reason, model.savedChoice?.disabledReason, modelLifecycleMessage(provider, data.lifecycle), data.note].filter(Boolean).flatMap(value => value.split('\n')))].join('\n')
  const modalityButton = (states, direction) => <button type="button" className="model-modality-trigger" aria-label={`${t(direction)} · ${t('官方文档规格')}；${states.map(item => t(item.accessibleLabel)).join('；')}`} onClick={event => { event.stopPropagation(); setShowSources(true) }}><ModalityIcons states={states} direction={direction} /></button>
  const url = data.sources[0]
  const sources = <div className={`model-spec-sources${compactSources ? ' is-compact' : ''}`} aria-label={t('官方文档')}>
    {url ? <a href={url} title={`${details}\n${sourceRows.map(row => row.label).join('\n')}\n${data.sources.join('\n')}`} aria-label={`${sourceRows[0].label}\n${details}`} target="_blank" rel="noopener noreferrer" onClick={event => {
      // Touch devices expose the same evidence through the existing dialog.
      if (window.matchMedia?.('(hover: none)').matches) { event.preventDefault(); setShowSources(true) }
    }}><ExternalLink size={13} aria-hidden="true" /><span className="model-spec-source-text"><span className="model-spec-source-label">{sourceRows[0].label.split(' · ')[0]} · </span><span className="model-spec-source-domain" title={url}>{sourceRows[0].label.split(' · ').slice(1).join(' · ')}</span></span></a>
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
      <p>{t('资料来源')}</p>
      {!sourceRows.length && !Object.values(data.fields).some(f => f.sourceUrl) && <p>{t('暂无官方资料')}</p>}
      {[...new Set(Object.values(data.fields).filter(f => f.sourceUrl && isApiSource(f.sourceUrl)).map(f => visibleSourceTitle(f.sourceUrl)))].map(title => <p key={title}>{title}</p>)}
      {sourceRows.map(source => <p key={source.url}><a className="model-evidence-source" title={`${source.label}${data.checkedAt ? `（核实日期：${data.checkedAt}）` : ''}`} href={source.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} aria-hidden="true" /><span>{source.label}</span></a></p>)}
    </WorkspaceDialog>}
  </div>
}

export function ModelLifecycleBadge({ lifecycle, provider, modelId }) {
  const [open, setOpen] = useState(false)
  lifecycle = cardLifecycle(lifecycle, modelId ? auditedModelSpecs(provider, modelId) : {})
  if (lifecycle?.state !== 'scheduled') return null
  const message = modelLifecycleMessage(provider, lifecycle)
  const sourceUrl = lifecycle.sourceUrl
  return <>
    <span className="tw-catalog-tags"><span className="is-unavailable" role="button" tabIndex={0} title={message} aria-label={`将下线：${message}`} onClick={() => setOpen(true)} onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpen(true) }
    }}>将下线</span></span>
    {open && <div onClick={event => event.stopPropagation()}><WorkspaceDialog className="model-evidence-dialog" title="下线公告" onClose={() => setOpen(false)}><p>{message}</p>{sourceUrl && <a className="model-evidence-source" href={sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} aria-hidden="true" /><span>{visibleSourceTitle(sourceUrl)}</span></a>}</WorkspaceDialog></div>}
  </>
}
