import { useAppLocale } from './BenchmarkLocale.jsx';
import { KeyRound } from 'lucide-react';
import { MODEL_CHANNEL_LABELS } from '../lib/modelPresentation.js';
import { MINIMAX_REGIONS, minimaxRegion } from '../lib/providerRegions.js';
import ApiKeyGuide from './ApiKeyGuide';

/** Shared native-provider fields. The caller owns credentials in memory only. */
export default function NativeCredentialFields({
  provider, providerConfig, value, onChange,
  providerRegions, onMiniMaxRegionChange, regionContractSupported = false,
  recoverable = false,
}) {
  const { t } = useAppLocale();
  if (!providerConfig || ['tokendance', 'custom'].includes(provider)) return null;
  const label = MODEL_CHANNEL_LABELS[provider] || providerConfig.label || provider;
  const region = MINIMAX_REGIONS[minimaxRegion(providerRegions)];
  return <div className="credential-provider">
    {provider === 'minimax' ? <label className="field">
      <span>{t("稀宇科技区域")}</span>
      <select aria-label={t("稀宇科技区域")} value={minimaxRegion(providerRegions)} onChange={(event) => onMiniMaxRegionChange(event.target.value)}>
        {Object.entries(MINIMAX_REGIONS).map(([id, entry]) => <option key={id} value={id} disabled={id === 'cn' && !regionContractSupported}>{t(entry.label)}</option>)}
      </select>
      <small>{region.apiBase}{t(" · 请填写该区域平台的 Key")}</small>
    </label> : null}
    <label className="field">
      <span>{t(label)}{t(" 接入密钥")}</span>
      <div className="key-input">
        <KeyRound size={18} />
        <input type="password" aria-label={t("{v0} 接入密钥", {v0: label})} value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={providerConfig.keyPlaceholder} autoComplete="off" />
      </div>
    </label>
    <ApiKeyGuide recoverable={recoverable} providerConfig={provider === 'minimax'
      ? { ...providerConfig, guideUrl: region.keyUrl, guideSteps: ['登录所选区域的 稀宇科技（MiniMax）开放平台并创建 API Key。', '不同区域的 Key 分别保存在当前页面内存，切换时不会互用。'] }
      : providerConfig} />
  </div>;
}
