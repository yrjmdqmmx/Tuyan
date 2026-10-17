import { ArrowDownToLine, ArrowUpFromLine, ScanText, ExternalLink, Type, Image, AudioLines, Video, FileText } from 'lucide-react'
import { modelCardSpecifications } from '../lib/modelCardSpecifications'
import { modalityIconStates } from '../lib/modelModalityIcons'
import { useAppLocale } from './BenchmarkLocale.jsx'

const icons = { text: Type, image: Image, audio: AudioLines, video: Video, file: FileText }
const stateLabels = { supported: '支持', unlisted: '官方未列支持', unknown: '待确认', conditional: '有条件支持' }

function ModalityIcons({ value, scope, direction }) {
  const { t } = useAppLocale()
  return <span className="model-modality-icons" role="group" aria-label={t(direction)} title={t(value)}>
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

export function ModelSpecifications({ provider, model }) {
  const { t } = useAppLocale()
  const data = modelCardSpecifications(provider, model)
  return <div className="model-card-specifications">
    <dl className="model-specs" aria-label={t('官方文档规格')}>
      <div><dt><ArrowDownToLine size={14} aria-hidden="true" />{t('输入')}</dt><dd><ModalityIcons value={data.input} scope={data.inputScope} direction="输入模态" /></dd></div>
      <div><dt><ArrowUpFromLine size={14} aria-hidden="true" />{t('输出')}</dt><dd><ModalityIcons value={data.output} scope={data.outputScope} direction="输出模态" /></dd></div>
      {data.limitRows.map(row => <div key={row.label}><dt><ScanText size={14} aria-hidden="true" />{t(row.label)}</dt><dd>{t(row.value)}</dd></div>)}
    </dl>
    <div className="model-spec-sources" aria-label={t('官方文档')}>
      {data.sources.length ? data.sources.map((url, index) => <a key={url} href={url} title={url} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={13} aria-hidden="true" />{t('官方文档')}{data.sources.length > 1 ? ` ${index + 1}` : ''} · {new URL(url).hostname}
      </a>) : <span>{t('官方文档待确认')}</span>}
    </div>
  </div>
}
