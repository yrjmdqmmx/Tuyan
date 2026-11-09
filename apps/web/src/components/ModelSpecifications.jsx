import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ScanText, ExternalLink, Type, Image, AudioLines, Video, FileText } from 'lucide-react'
import { modelCardSpecifications } from '../lib/modelCardSpecifications'
import { modalityIconStates } from '../lib/modelModalityIcons'
import { useAppLocale } from './BenchmarkLocale.jsx'
import WorkspaceDialog from '../workspace/WorkspaceDialog.jsx'

const icons = { text: Type, image: Image, audio: AudioLines, video: Video, file: FileText }
const stateLabels = { supported: '支持', unsupported: '不支持', unlisted: '官方未列支持', unknown: '未知', conditional: '有条件支持' }

function ModalityIcons({ value, fact, direction }) {
  const { t } = useAppLocale()
  const states = modalityIconStates(value, fact)
  if (states.every(item => item.state === 'unknown')) return <span className="model-spec-unknown" aria-label={`${t(direction)}：${t('模态未知')}`}>{t('模态未知')}</span>
  return <span className="model-modality-icons" role="group" aria-label={t(direction)}>
    {states.map(({ id, label, state, detail }) => {
      const Icon = icons[id]
      const description = `${t(label)}：${t(stateLabels[state])}${detail && detail !== label ? ` · ${t(detail)}` : ''}`
      return <span key={id} className={`model-modality-icon is-${state}`} role="img" aria-label={description} title={description}>
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        {state === 'unknown' ? <sup aria-hidden="true">?</sup> : null}
        {state === 'conditional' ? <sup aria-hidden="true">*</sup> : null}
      </span>
    })}
  </span>
}

export function ModelSpecifications({ provider, model, compactSources = false, footerActions }) {
  const { t } = useAppLocale()
  const [showSources, setShowSources] = useState(false)
  const data = modelCardSpecifications(provider, model)
  const sourceName = url => url === data.lifecycle?.sourceUrl ? '下线公告'
    : data.vendorSources.includes(url) ? '原厂规格' : '官方文档'
  const provenance = [['输入', data.inputScope], ['输出', data.outputScope], ['上下文窗口', data.contextScope], ['最大输出', data.maxOutputScope]]
    .filter(([, scope]) => scope).map(([label, scope]) => `${t(label)}：${t(scope === '原厂' ? '源自原厂' : '渠道公布')}`)
  const details = [data.checkedAt && `${t('核实日期')} ${data.checkedAt}`, ...provenance,
    (data.unverified || model.catalogReview?.status === 'pending') && t('未核实'), model.catalogReview?.reason, model.savedChoice?.disabledReason, data.lifecycle?.message, data.note,
    ...data.sources.map(url => `${t(sourceName(url))} · ${url}`)].filter(Boolean).join('\n')
  const url = data.sources[0]
  const sources = <div className={`model-spec-sources${compactSources ? ' is-compact' : ''}`} aria-label={t('官方文档')}>
    {url ? <a href={url} title={details} aria-label={details} target="_blank" rel="noopener noreferrer" onClick={event => {
      // Touch devices expose the same evidence through the existing dialog.
      if (window.matchMedia?.('(hover: none)').matches) { event.preventDefault(); setShowSources(true) }
    }}><ExternalLink size={13} aria-hidden="true" /><span>{t(sourceName(url))} · {new URL(url).hostname}</span></a>
      : <span title={details} aria-label={details}>{t('官方文档待确认')}</span>}
  </div>
  return <div className="model-card-specifications">
    <dl className="model-specs" aria-label={t('官方文档规格')}>
      <div><dt><ArrowDownToLine size={14} aria-hidden="true" />{t('输入')}</dt><dd><ModalityIcons value={data.input} fact={data.inputFact} direction="输入模态" /></dd></div>
      <div><dt><ArrowUpFromLine size={14} aria-hidden="true" />{t('输出')}</dt><dd><ModalityIcons value={data.output} fact={data.outputFact} direction="输出模态" /></dd></div>
      <div><dt><ScanText size={14} aria-hidden="true" />{t('上下文窗口')}</dt><dd className={data.context === '未知' ? 'model-spec-unknown' : undefined}>{t(data.context)}</dd></div>
      <div><dt><ScanText size={14} aria-hidden="true" />{t('最大输出')}</dt><dd className={data.maxOutput === '未知' ? 'model-spec-unknown' : undefined}>{t(data.maxOutput)}</dd></div>
    </dl>
    {footerActions ? <div className="model-spec-footer">{sources}{footerActions}</div> : sources}
    {showSources && <WorkspaceDialog title={t('官方文档规格')} onClose={() => setShowSources(false)}>
      <p className="tw-preserve-text">{details}</p>
      {data.sources.map(source => <p key={source}><a href={source} target="_blank" rel="noopener noreferrer">{t(sourceName(source))} · {new URL(source).hostname}</a></p>)}
    </WorkspaceDialog>}
  </div>
}
