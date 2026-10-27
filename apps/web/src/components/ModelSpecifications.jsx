import { ArrowDownToLine, ArrowUpFromLine, ScanText, ExternalLink, Type, Image, AudioLines, Video, FileText } from 'lucide-react'
import { modelCardSpecifications } from '../lib/modelCardSpecifications'
import { modalityIconStates } from '../lib/modelModalityIcons'
import { useAppLocale } from './BenchmarkLocale.jsx'

const icons = { text: Type, image: Image, audio: AudioLines, video: Video, file: FileText }
const stateLabels = { supported: '支持', unlisted: '官方未列支持', unknown: '待确认', conditional: '有条件支持' }

function ModalityIcons({ value, scope, direction }) {
  const { t } = useAppLocale()
  return <span className="model-modality-icons" role="group" aria-label={t(direction)} title={`${t(value)}${scope ? ` · ${t(scope)}` : ''}`}>
    {modalityIconStates(value).map(({ id, label, state, detail }) => {
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
  const data = modelCardSpecifications(provider, model)
  const sources = <div className={`model-spec-sources${compactSources ? ' is-compact' : ''}`} aria-label={t('官方文档')}>
      {data.sources.length ? data.sources.map((url, index) => <a key={url} href={url} title={url} aria-label={`${t('官方文档')} ${index + 1} · ${new URL(url).hostname}`} target="_blank" rel="noopener noreferrer">
        {compactSources && index > 0 ? index + 1 : <><ExternalLink size={13} aria-hidden="true" /><span>{t('官方文档')}{!compactSources && data.sources.length > 1 ? ` ${index + 1}` : ''} · {new URL(url).hostname}</span></>}
      </a>) : <span>{t('官方文档待确认')}</span>}
    </div>
  return <div className="model-card-specifications">
    <dl className="model-specs" aria-label={t('官方文档规格')}>
      <div><dt><ArrowDownToLine size={14} aria-hidden="true" />{t('输入')}</dt><dd><ModalityIcons value={data.input} scope={data.inputScope} direction="输入模态" /></dd></div>
      <div><dt><ArrowUpFromLine size={14} aria-hidden="true" />{t('输出')}</dt><dd><ModalityIcons value={data.output} scope={data.outputScope} direction="输出模态" /></dd></div>
      <div><dt><ScanText size={14} aria-hidden="true" />{t('上下文窗口')}</dt><dd title={`${t(data.context)}${data.contextScope ? ` · ${t(data.contextScope)}` : ''}`}>{t(data.context)}</dd></div>
    </dl>
    {footerActions ? <div className="model-spec-footer">{sources}{footerActions}</div> : sources}
  </div>
}
