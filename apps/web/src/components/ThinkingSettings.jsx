import { useAppLocale } from './BenchmarkLocale.jsx'
import { useId } from 'react'
import { CircleHelp } from 'lucide-react'
import { roleThinkingProfile, thinkingModeSwitch, thinkingUiSelection, thinkingRequestSelection, requiresThinkingBudget } from '../lib/thinkingSettings'
import { validateThinkingOptions } from '../lib/thinking'

const labels = {main:'主模型 / 规划', vision:'视觉识别', image:'图像生成 / 编辑'}
const values = {
  'zh-CN': {true:'开启',false:'关闭',enabled:'开启',disabled:'关闭',adaptive:'自适应',standard:'标准',pro:'Pro（更多推理）',none:'不思考',off:'关闭',minimal:'极低',low:'低',medium:'中',high:'高',xhigh:'更高',max:'最高',ultra:'极高','very low':'极低','very high':'极高'},
  en: {true:'On',false:'Off',enabled:'On',disabled:'Off',adaptive:'Adaptive',standard:'Standard',pro:'Pro (more reasoning)',none:'None',off:'Off',minimal:'Minimal',low:'Low',medium:'Medium',high:'High',xhigh:'Extra high',max:'Maximum',ultra:'Very high','very low':'Very low','very high':'Very high'},
}

function ThinkingHelp({ control, profile, label, toggle }) {
  const { t, locale } = useAppLocale()
  return <details className="thinking-help" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false }}
    onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary').focus(); event.stopPropagation() } }}>
    <summary aria-label={t('{label}说明', {label})}><CircleHelp size={15} /></summary>
    <div className="thinking-help-content" role="note">
      <p>{t(control.key === 'budget' ? '此接口开启手动思考必须填写预算，图研不会自动补值。' : toggle ? '按所选开关发送思考设置。更多思考可能增加耗时和费用。' : '默认不发送此参数。更多思考可能增加耗时和费用。')}</p>
      {control.key === 'budget' && <p>{t('范围：{min}–{max} tokens。', {min:control.min,max:control.max})}</p>}
      {toggle && toggle.off !== undefined && control.default == null && <p>{t('接口默认状态尚未确认；未保存选择时使用关闭。')}</p>}
      {toggle && toggle.off === undefined && <p>{t('此型号仅支持开启思考。')}</p>}
      {toggle && toggle.on === 'adaptive' && <p>{t('开启时由模型自适应分配思考。')}</p>}
      {control.default != null && <p>{t('接口默认：{value}。', {value:values[locale]?.[String(control.default)] || String(control.default)})}</p>}
      {toggle && profile.requiresBudgetWhenEnabled && toggle.on === 'enabled' && <p>{t('开启后需填写思考预算；关闭时不发送预算。')}</p>}
      {profile.requiresNoInputImages && <p>{t('此接口的思考设置仅适用于不带参考图的生成请求。')}</p>}
    </div>
  </details>
}

/** Inline controls and submission use the same exact-identity resolution. */
export default function ThinkingSettings({ role, settings, registry, operation, onChange, saveState, onRetrySave }) {
  const { t, locale } = useAppLocale()
  const id = useId()
  const savedSelection = settings?.roles?.[role]
  const selection = savedSelection && thinkingUiSelection(role, savedSelection)
  const profile = selection && roleThinkingProfile(role, selection)
  const toggle = thinkingModeSwitch(profile)
  const controls = profile?.controls?.filter(control => control.key !== 'budget' || requiresThinkingBudget(profile, selection?.options)).map(control => control.key === 'mode' && !toggle && control.label === '思考模式' ? {...control,label:'推理档位'} : control)
  const supported = Number(registry?.thinkingContractVersion) >= 1 && profile?.status === 'supported' && controls?.length
    && !(role === 'image' && operation === 'editing' && !profile.operations?.includes('editing'))
  if (!supported) return null
  const custom=selection.provider==='custom'
  const unavailable=custom&&!(Number(registry?.universalThinkingVersion)>=1)
  let error = ''
  try { validateThinkingOptions(profile, thinkingRequestSelection(role, selection).options) } catch (failure) { error = failure.message.replaceAll('服务商默认', '默认') }
  const update = (key, value) => {
    const options = {...selection.options}
    if (value === undefined) delete options[key]; else options[key] = value
    onChange(role, thinkingUiSelection(role, {...selection, options}))
  }
  const valueLabel = value => values[locale]?.[String(value)] || String(value)
  const defaultLabel = control => t('默认（{value}）', {value:control.default == null ? t('未确认') : valueLabel(control.default)})
  return <section className="model-thinking-controls" data-thinking-role={role} aria-label={t('{v0}思考设置', {v0:t(labels[role])})}>
    {custom&&<p className="universal-hint">{t('思考偏好按精确连接和型号独立保存，不含密钥。')}{unavailable ? t('当前后端未接入通用思考参数，请升级后端。') : ''}</p>}
    {saveState && saveState !== 'saved' && <div className={`universal-status ${saveState==='error'?'warning':'neutral'}`} role="status"><span>{t(saveState==='error'?'思考偏好保存失败，仅当前页有效；刷新前请重试或导出无密钥配置。':'思考偏好尚未保存。')}</span>{saveState==='error'&&onRetrySave&&<button type="button" className="universal-button" onClick={onRetrySave}>{t('重试保存思考偏好')}</button>}</div>}
    {custom&&profile.sourceUrls?.length>0&&<details className="universal-details"><summary>思考参数官方依据</summary>{profile.sourceUrls.map(url=><p key={url}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></p>)}</details>}
    {controls.map(control => {
      const controlId = `${id}-${control.key}`
      const accessibleLabel = `${t(labels[role])}${locale === 'en' ? ' ' : ''}${t(control.label)}`
      const modeToggle = control.key === 'mode' && toggle
      const disabled = unavailable || control.key === 'effort' && toggle && selection.options.mode === toggle.off && !profile.allowEffortWithoutThinking
      return <div className="thinking-control" key={control.key}>
        <div className="thinking-control-label"><label htmlFor={controlId}>{t(control.label)}</label><ThinkingHelp control={control} profile={profile} label={accessibleLabel} toggle={modeToggle} /></div>
        {control.type === 'integer' ? <input id={controlId} disabled={unavailable} type="number" required={control.key === 'budget'} step="1" min={control.allowedSpecialValues?.length ? Math.min(control.min,...control.allowedSpecialValues) : control.min} max={control.max}
          aria-label={accessibleLabel} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} value={selection.options[control.key] ?? ''} placeholder={t(control.key === 'budget' ? '必填' : '默认')}
          onChange={event=>update(control.key,event.target.value === '' ? undefined : Number(event.target.value))} />
          : <select id={controlId} disabled={disabled} aria-label={accessibleLabel} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
            value={selection.options[control.key] === undefined ? '' : JSON.stringify(selection.options[control.key])}
            onChange={event=>update(control.key,event.target.value === '' ? undefined : JSON.parse(event.target.value))}>
            {!modeToggle && <option value="">{defaultLabel(control)}</option>}
            {modeToggle ? <>
              {toggle.on !== undefined && <option value={JSON.stringify(toggle.on)}>{t('开启')}</option>}
              {toggle.off !== undefined && <option value={JSON.stringify(toggle.off)}>{t('关闭')}</option>}
            </> : control.values.map(entry=>{const value=entry && typeof entry === 'object' ? entry.value : entry;return <option key={String(value)} value={JSON.stringify(value)}>{t(entry?.label) || (control.providerAliases?.[value] ? t('{value}（映射为 {alias}）', {value:valueLabel(value),alias:control.providerAliases[value]}) : valueLabel(value))}</option>})}
          </select>}
      </div>
    })}
    {error && <p className="thinking-error" role="alert" id={`${id}-error`}>{t(error)}</p>}
  </section>
}
