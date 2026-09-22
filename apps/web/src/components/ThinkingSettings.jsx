import { useState } from 'react'
import { Brain } from 'lucide-react'
import { THINKING_ROLES, roleThinkingProfile } from '../lib/thinkingSettings'
import { validateThinkingOptions } from '../lib/thinking'

const labels = {main:'主模型 / 规划', vision:'视觉识别', image:'图像生成 / 编辑'}
const valueLabel = value => typeof value === 'boolean' ? value ? '开启' : '关闭'
  : ({enabled:'开启',disabled:'关闭',adaptive:'自适应',none:'不思考',off:'关闭',minimal:'极低',low:'低',medium:'中',high:'高',xhigh:'更高',max:'最高',ultra:'极高','very low':'极低','very high':'极高'}[value] || String(value))

function RoleThinking({role, selection, available, operation, onChange}) {
  const [draftError, setDraftError] = useState('')
  const profile = roleThinkingProfile(role, selection)
  const editingBlocked = role === 'image' && operation === 'editing' && !profile?.operations?.includes('editing')
  const supported = profile?.status === 'supported' && !editingBlocked
  let error = draftError
  try { validateThinkingOptions(profile, selection.options) } catch (failure) { error = failure.message }
  const update = (key, value) => {
    setDraftError('')
    const options = {...selection.options}
    if (value === undefined) delete options[key]; else options[key] = value
    onChange(role, {...selection, options})
  }
  return <section className="thinking-role" aria-label={`${labels[role]}思考设置`}>
    <div className="thinking-role-title"><strong>{labels[role]}</strong><button type="button" onClick={()=>{setDraftError('');onChange(role,{...selection,options:{}})}} disabled={!Object.keys(selection.options).length}>服务商默认</button></div>
    <small className="thinking-model-id">{selection.modelId || '尚未选择型号'}</small>
    {supported ? profile.controls.map(control => <label className="field" key={control.key}>
      <span>{control.label}</span>
      {control.type === 'integer' ? <input type="number" step="1" min={control.allowedSpecialValues?.length ? Math.min(control.min,...control.allowedSpecialValues) : control.min} max={control.max}
        aria-label={`${labels[role]}${control.label}`} disabled={!available} value={selection.options[control.key] ?? ''} placeholder="服务商默认"
        onChange={event=>{const value=event.target.value;update(control.key,value === '' ? undefined : Number(value))}} />
        : <select aria-label={`${labels[role]}${control.label}`} disabled={!available} value={selection.options[control.key] === undefined ? '' : JSON.stringify(selection.options[control.key])}
          onChange={event=>update(control.key,event.target.value === '' ? undefined : JSON.parse(event.target.value))}>
          <option value="">服务商默认</option>
          {control.values.map(entry=>{const value=entry && typeof entry === 'object' ? entry.value : entry;return <option key={String(value)} value={JSON.stringify(value)}>{entry?.label || (control.providerAliases?.[value] ? `${valueLabel(value)}（映射为 ${control.providerAliases[value]}）` : valueLabel(value))}</option>})}
        </select>}
      <small>{control.type === 'integer' ? `${control.min}–${control.max} token${control.allowedSpecialValues?.length ? `；特殊值：${control.allowedSpecialValues.join('、')}（-1 自适应，0 关闭）` : ''}。` : ''}官方默认：{control.default == null ? '未公开，交由服务商决定' : valueLabel(control.default)}。</small>
    </label>) : <p className="thinking-status">{editingBlocked && profile?.status === 'supported' ? '此型号仅纯文生图支持思考参数；精修不开放调节。'
      : profile?.status === 'fixed' ? '此接口的思考行为固定，不提供可调参数。'
      : profile?.status === 'unsupported' ? '此型号当前接口没有可调思考参数。'
      : '尚未核实此渠道、准确型号与接口的思考参数，暂不开放调节。'}</p>}
    {error ? <p className="thinking-error" role="alert">{error}</p> : null}
    {Object.keys(selection.options).length ? <small>仅用于此角色和准确型号；新型号使用服务商默认。</small> : <small>服务商默认：不发送思考参数。</small>}
  </section>
}

export default function ThinkingSettings({settings, registry, operation, onChange}) {
  const available = Number(registry?.thinkingContractVersion) >= 1
  return <details className="thinking-settings" data-focus-setting="thinking" open>
    <summary><Brain size={17}/> 思考参数</summary>
    <p>按角色及准确型号独立保存。更强思考或更多预算可能增加耗时和费用；它们与最大输出长度、温度、图片质量不同。</p>
    {!available ? <p className="thinking-status">当前后端尚未开放思考设置，继续使用原有请求行为。</p> : null}
    <div className="thinking-role-grid">{THINKING_ROLES.map(role=><RoleThinking key={`${role}:${JSON.stringify({...settings.roles[role],options:undefined})}`} role={role} selection={settings.roles[role]} available={available} operation={operation} onChange={onChange}/>)}</div>
  </details>
}
