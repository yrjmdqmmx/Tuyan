import { useAppLocale } from './BenchmarkLocale.jsx'

const states = {
  supported: ['可调', '已核实此渠道、型号和接口的思考参数。'],
  fixed: ['固定模式', '此型号固定开启思考，不能关闭；当前未核实其他可调参数。'],
  unsupported: ['接口无可调参数', '此型号在当前接口未开放可调思考参数，按渠道默认执行。'],
  unconfirmed: ['尚未核实', '尚未核实此渠道、型号和接口的完整参数规则，不代表模型不支持思考。'],
}
const reasons = {
  'channel-contract-missing': '渠道已登记此型号，但未公开完整的思考字段和取值范围。',
  'parameter-contract-incomplete': '渠道介绍提到了思考开关或档位，但没有完整的请求字段与取值说明。',
  'other-protocol-only': '已找到此型号在其他接口的思考说明，当前接口的参数规则仍待确认。',
  'catalog-entry-missing': '当前公开目录未收录此调用 ID，思考参数仍待渠道确认。',
  'catalog-retired': '渠道已公告此型号下线，不再补充其思考设置。',
  'minimal-reasoning-output': '“最少思考”会省略思考块，不代表完全关闭思考。',
  'conflicting-docs': '渠道模型介绍与接口参数表口径不一致，暂不开放未确认的参数。',
  'non-thinking-only': '渠道明确此型号仅使用非思考模式，没有思考开关。',
  'image-parameters': '该图片接口的参数表没有开放思考控制。',
  'prompt-rewrite-thinking': '此型号的“智能思考”通过提示词改写实现，默认关闭；开启会增加费用和耗时，仅适用于纯文生图。',
}

export function hasVisibleThinkingStatus(profile, role, operation) {
  return profile?.status === 'supported' && profile.controls?.some(control => control.key !== 'budget')
    && !(profile.status === 'supported' && role === 'image' && operation === 'editing' && !profile.operations?.includes('editing'))
}

/** Status is about an exact channel contract, never inferred from the model name. */
export default function ThinkingStatus({ profile, role, operation, compact = false, budgetOnly = false, backendUnavailable = false }) {
  const { t } = useAppLocale()
  const editingUnavailable = profile?.status === 'supported' && role === 'image' && operation === 'editing' && !profile.operations?.includes('editing')
  const status = editingUnavailable ? 'unsupported' : states[profile?.status] ? profile.status : 'unconfirmed'
  if (!hasVisibleThinkingStatus(profile, role, operation)) return null
  const [label, explanation] = states[status]
  const description = editingUnavailable ? '此接口仅在纯文生图时提供思考设置，当前编辑使用渠道默认。'
    : reasons[profile?.statusReason] || explanation
  const sources = [...new Set(profile?.sourceUrls || [])].filter(url => /^https:\/\//.test(url))
  return <div className={`thinking-status${compact ? ' is-compact' : ''}`} data-thinking-status={status}>
    <span className={`thinking-status-badge is-${status}`} title={t(description)}>{t('思考')} · {t(label)}</span>
    {!compact && <>
      <p>{t(description)}</p>
      {budgetOnly && <p>{t('此接口仅核实了思考预算。当前简化设置使用渠道默认，不显示可选预算输入。')}</p>}
      {backendUnavailable && <p>{t('当前后端尚未接入此思考设置，暂不能调整。')}</p>}
      {sources.length > 0 && <details className="thinking-evidence"><summary>{t('思考参数官方依据')}{profile.checkedAt && <span> · {t('核验于 {date}', { date: profile.checkedAt })}</span>}</summary>
        <ul>{sources.map((url, index) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{t('依据 {number}', { number: index + 1 })} · {new URL(url).hostname}</a></li>)}</ul>
      </details>}
    </>}
  </div>
}
