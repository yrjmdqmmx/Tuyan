import { useAppLocale } from './BenchmarkLocale.jsx'
import { useId } from 'react'
import { CircleHelp } from 'lucide-react'
import { roleThinkingProfile } from '../lib/thinkingSettings'
import { validateThinkingOptions } from '../lib/thinking'

const labels = {main:'主模型 / 规划', vision:'视觉识别', image:'图像生成 / 编辑'}
const values = {
  'zh-CN': {true:'开启',false:'关闭',enabled:'开启',disabled:'关闭',adaptive:'自适应',none:'不思考',off:'关闭',minimal:'极低',low:'低',medium:'中',high:'高',xhigh:'更高',max:'最高',ultra:'极高','very low':'极低','very high':'极高'},
  en: {true:'On',false:'Off',enabled:'On',disabled:'Off',adaptive:'Adaptive',none:'None',off:'Off',minimal:'Minimal',low:'Low',medium:'Medium',high:'High',xhigh:'Extra high',max:'Maximum',ultra:'Very high','very low':'Very low','very high':'Very high'},
}

function ThinkingHelp({ control, profile, label }) {
  const { t, locale } = useAppLocale()
  return <details className="thinking-help" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false }}
    onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary').focus(); event.stopPropagation() } }}>
    <summary aria-label={t('{label}说明', {label})}><CircleHelp size={15} /></summary>
    <div className="thinking-help-content" role="note">
      <p>{t('默认不发送此参数。更多思考可能增加耗时和费用。')}</p>
      {control.type === 'integer' && <p>{t('范围：{min}–{max} tokens。', {min:control.min,max:control.max})}{control.allowedSpecialValues?.length ? t('特殊值：{values}。', {values:control.allowedSpecialValues.join(', ')}) : ''}</p>}
      {control.default != null && <p>{t('接口默认：{value}。', {value:values[locale]?.[String(control.default)] || String(control.default)})}</p>}
      {profile.requiresBudgetWhenEnabled && <p>{t('开启思考时须同时填写预算；自适应模式不能同时指定固定预算。')}</p>}
      {profile.exclusiveEffortBudget && <p>{t('思考强度与预算不能同时设置。')}</p>}
      {profile.requiresNoInputImages && <p>{t('此接口的思考设置仅适用于不带参考图的生成请求。')}</p>}
    </div>
  </details>
}

/** Inline controls for one exact model identity; hiding UI never changes saved options. */
export default function ThinkingSettings({ role, settings, registry, operation, onChange }) {
  const { t, locale } = useAppLocale()
  const id = useId()
  const selection = settings?.roles?.[role]
  const profile = selection && roleThinkingProfile(role, selection)
  const supported = Number(registry?.thinkingContractVersion) >= 1 && profile?.status === 'supported' && profile.controls?.length
    && !(role === 'image' && operation === 'editing' && !profile.operations?.includes('editing'))
  if (!supported) return null
  let error = ''
  try { validateThinkingOptions(profile, selection.options) } catch (failure) { error = failure.message.replaceAll('服务商默认', '默认') }
  const update = (key, value) => {
    const options = {...selection.options}
    if (value === undefined) delete options[key]; else options[key] = value
    onChange(role, {...selection, options})
  }
  const valueLabel = value => values[locale]?.[String(value)] || String(value)
  return <section className="model-thinking-controls" data-thinking-role={role} aria-label={t('{v0}思考设置', {v0:t(labels[role])})}>
    {profile.controls.map(control => {
      const controlId = `${id}-${control.key}`
      const accessibleLabel = `${t(labels[role])}${locale === 'en' ? ' ' : ''}${t(control.label)}`
      return <div className="thinking-control" key={control.key}>
        <div className="thinking-control-label"><label htmlFor={controlId}>{t(control.label)}</label><ThinkingHelp control={control} profile={profile} label={accessibleLabel} /></div>
        {control.type === 'integer' ? <input id={controlId} type="number" step="1" min={control.allowedSpecialValues?.length ? Math.min(control.min,...control.allowedSpecialValues) : control.min} max={control.max}
          aria-label={accessibleLabel} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} value={selection.options[control.key] ?? ''} placeholder={t('默认')}
          onChange={event=>update(control.key,event.target.value === '' ? undefined : Number(event.target.value))} />
          : <select id={controlId} aria-label={accessibleLabel} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
            value={selection.options[control.key] === undefined ? '' : JSON.stringify(selection.options[control.key])}
            onChange={event=>update(control.key,event.target.value === '' ? undefined : JSON.parse(event.target.value))}>
            <option value="">{t('默认')}</option>
            {control.values.map(entry=>{const value=entry && typeof entry === 'object' ? entry.value : entry;return <option key={String(value)} value={JSON.stringify(value)}>{t(entry?.label) || (control.providerAliases?.[value] ? t('{value}（映射为 {alias}）', {value:valueLabel(value),alias:control.providerAliases[value]}) : valueLabel(value))}</option>})}
          </select>}
      </div>
    })}
    {error && <p className="thinking-error" role="alert" id={`${id}-error`}>{t(error)}</p>}
  </section>
}
