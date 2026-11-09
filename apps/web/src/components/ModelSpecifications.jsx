import { ArrowDownToLine, ArrowUpFromLine, ScanText, ExternalLink, Info, Type, Image, AudioLines, Video, FileText } from 'lucide-react'
import { modelCardSpecifications } from '../lib/modelCardSpecifications'
import { modalityIconStates } from '../lib/modelModalityIcons'
import { useAppLocale } from './BenchmarkLocale.jsx'

const icons = { text: Type, image: Image, audio: AudioLines, video: Video, file: FileText }
const stateLabels = { supported: '支持', unsupported: '不支持', unlisted: '官方未列支持', unknown: '未知', conditional: '有条件支持' }

function ModalityIcons({ value, fact, scope, direction }) {
  const { t } = useAppLocale()
  return <span className="model-modality-icons" role="group" aria-label={t(direction)} title={`${t(value)}${scope ? ` · ${t(scope)}` : ''}`}>
    {modalityIconStates(value, fact).map(({ id, label, state, detail }) => {
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
  const provenance = scope => scope === '原厂' ? <small className="model-spec-origin" title={t('经精确映射继承原厂规格，渠道额度可能不同')}>{t('源自原厂')}</small> : null
  const sources = <div className={`model-spec-sources${compactSources ? ' is-compact' : ''}`} aria-label={t('官方文档')}>
      {data.sources.length ? data.sources.map((url, index) => <a key={url} href={url} title={url} aria-label={`${t('官方文档')} ${index + 1} · ${new URL(url).hostname}`} target="_blank" rel="noopener noreferrer">
        {compactSources && index > 0 ? index + 1 : <><ExternalLink size={13} aria-hidden="true" /><span>{t('官方文档')}{!compactSources && data.sources.length > 1 ? ` ${index + 1}` : ''} · {new URL(url).hostname}</span></>}
      </a>) : <span>{t('官方文档待确认')}</span>}
    </div>
  return <div className="model-card-specifications">
    <dl className="model-specs" aria-label={t('官方文档规格')}>
      <div><dt><ArrowDownToLine size={14} aria-hidden="true" />{t('输入')}{provenance(data.inputScope)}</dt><dd><ModalityIcons value={data.input} fact={data.inputFact} scope={data.inputScope} direction="输入模态" /></dd></div>
      <div><dt><ArrowUpFromLine size={14} aria-hidden="true" />{t('输出')}{provenance(data.outputScope)}</dt><dd><ModalityIcons value={data.output} fact={data.outputFact} scope={data.outputScope} direction="输出模态" /></dd></div>
      <div><dt><ScanText size={14} aria-hidden="true" />{t('上下文窗口')}{provenance(data.contextScope)}</dt><dd>{t(data.context)}</dd></div>
      <div><dt><ScanText size={14} aria-hidden="true" />{t('最大输出')}{provenance(data.maxOutputScope)}</dt><dd>{t(data.maxOutput)}</dd></div>
    </dl>
    {model?.catalogReview?.status === 'pending' && <span className="model-spec-review" role="note" title={model.catalogReview.reason} aria-label={`${t('未核实')}：${model.catalogReview.reason}`}>{t('未核实')}</span>}
    <div className="model-spec-review">{data.unverified && <span title={t('目录或精确型号尚未完整核实')}><Info size={13} aria-hidden="true" />{t('未核实')}</span>}{data.checkedAt && <span>{t('核实日期')} {data.checkedAt}</span>}</div>
    {data.lifecycle && <p className="model-spec-lifecycle" role="status"><span>{t(data.lifecycle.label)}</span>{data.lifecycle.state === 'scheduled' && <span>{t('将于{date}下线', {date: data.lifecycle.stopDate.slice(0,10)})}</span>}{data.lifecycle.replacement && <span>{t('建议替换为')} {data.lifecycle.replacement}</span>}</p>}
    {footerActions ? <div className="model-spec-footer">{sources}{footerActions}</div> : sources}
  </div>
}
