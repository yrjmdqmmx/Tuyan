import { useAppLocale } from './BenchmarkLocale.jsx'
import { registryReadinessMessage } from '../lib/modelRouting.js'

export default function ModelRegistryNotice({ status, supported, onRetry, unsupportedMessage }) {
  const { t } = useAppLocale()
  const message = registryReadinessMessage(status)
  if (status === 'ready' && supported) return null
  const loading = status === 'loading'
  return <div className={loading ? 'route-contract-status' : 'route-contract-warning'} role={loading ? 'status' : 'alert'}>
    <span>{t(message || unsupportedMessage)}</span>
    {status === 'error' && onRetry && <button type="button" className="universal-button" onClick={onRetry}>{t('重新读取模型与渠道能力')}</button>}
  </div>
}
