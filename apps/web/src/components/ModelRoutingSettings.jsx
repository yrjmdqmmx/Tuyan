import { MODEL_CHANNEL_LABELS } from '../lib/modelPresentation'
import { MINIMAX_REGIONS, minimaxRegion } from '../lib/providerRegions'
import { KeyRound, Loader2, Settings2, ShieldCheck, Sparkles } from 'lucide-react'
import ApiKeyGuide from './ApiKeyGuide'
import ModelPicker from './ModelPicker'
import { arkVerificationKey, providerDefaultRoutes } from '../lib/modelRouting'

function providerLabel(provider, providerConfigs) {
  if (MODEL_CHANNEL_LABELS[provider]) return MODEL_CHANNEL_LABELS[provider]
  return providerConfigs[provider]?.label || provider
}

function probeRoleLabel(role) {
  if (role === 'image') return '图像生成'
  if (role === 'vision') return '参考图识别'
  return '主模型'
}

export default function ModelRoutingSettings({
  configurationMode,
  onModeChange,
  simpleProvider,
  onSimpleProviderChange,
  modelRoutes,
  onRouteChange,
  modelRegistry,
  providerConfigs,
  outputFormat,
  executionRouteRoles = [],
  credentialProviders,
  apiKeys,
  onApiKeyChange,
  providerRegions,
  onMiniMaxRegionChange,
  arkProbes,
  arkVerification,
  arkProbePaidConfirmed,
  onArkProbePaidConfirmedChange,
  isVerifyingArk,
  arkVerificationError,
  onVerifyArk,
}) {
  const isAdvancedMode = configurationMode === 'advanced'
  const routeContractSupported = Number(modelRegistry?.routeContractVersion || 0) >= 1
  const arkImageProbeRequired = arkProbes.some((probe) => probe.role === 'image')
  const arkKeyMissing = arkProbes.length > 0 && !apiKeys.ark?.trim()
  const verifiableArkProbes = arkProbes.filter((probe) => arkVerification[arkVerificationKey(probe)] !== 'verified'
    && (probe.role !== 'image' || arkProbePaidConfirmed))

  return (
    <>
      <div className="field" data-focus-setting="configuration-mode" tabIndex={-1}>
        <span>使用模式</span>
        <div className="mode-switch" role="group" aria-label="使用模式">
          <button type="button" aria-pressed={!isAdvancedMode} className={!isAdvancedMode ? 'active' : ''} onClick={() => onModeChange('simple')}>
            <Sparkles size={16} /><span>普通模式</span><small>单渠道 + 单 Key</small>
          </button>
          <button type="button" aria-pressed={isAdvancedMode} className={isAdvancedMode ? 'active' : ''} onClick={() => onModeChange('advanced')}>
            <Settings2 size={16} /><span>专业模式</span><small>按角色独立路由</small>
          </button>
        </div>
        {isAdvancedMode && !routeContractSupported ? <p className="route-contract-warning">当前后端不支持专业模式的多渠道路由，提交会失败关闭。</p> : null}
      </div>

      {!isAdvancedMode ? (
        <div className="field" data-focus-setting="provider" tabIndex={-1}>
          <span>API 接入渠道</span>
          <small>更多渠道可在专业模式中分别选择主模型、图像模型和识别模型。</small>
          <div data-focus-setting="main-model" tabIndex={-1}>
            <div className="segmented provider-segmented" role="group" aria-label="API 接入渠道">
              {Object.entries(providerConfigs).filter(([id]) => providerDefaultRoutes(id, modelRegistry, providerConfigs)).map(([id]) => (
                <button
                  type="button"
                  key={id}
                  className={simpleProvider === id ? 'active' : ''}
                  aria-pressed={simpleProvider === id}
                  disabled={Boolean(modelRegistry && !modelRegistry.providers?.[id])}
                  title={modelRegistry?.unavailableProviders?.[id] || ''}
                  onClick={() => onSimpleProviderChange(id)}
                >
                  {providerLabel(id, providerConfigs)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="model-grid model-route-grid">
          <ModelPicker
            label="主模型" role="main" route={modelRoutes.main} outputFormat={outputFormat}
            registry={modelRegistry} providerConfigs={providerConfigs}
            onRouteChange={(route) => onRouteChange('main', route)} focusSetting="main-model"
          />
          <ModelPicker
            label="图像生成模型" role="image" route={modelRoutes.image} outputFormat={executionRouteRoles.includes('image') ? outputFormat : ''}
            registry={modelRegistry} providerConfigs={providerConfigs}
            onRouteChange={(route) => onRouteChange('image', route)} focusSetting="image-model"
          />
          <ModelPicker
            label="参考图识别模型" role="vision" route={modelRoutes.vision} outputFormat={outputFormat}
            registry={modelRegistry} providerConfigs={providerConfigs}
            onRouteChange={(route) => onRouteChange('vision', route)} focusSetting="vision-model"
          />
        </div>
      )}

      <details className="api-keys-panel access-credentials" data-focus-setting="api-key" open>
        <summary><KeyRound size={17} /> 接入凭据</summary>
        <p>仅填写当前任务执行阶段会实际使用的渠道；密钥只保留在本页内存中。</p>
        {credentialProviders.map((provider) => {
          const config = providerConfigs[provider]
          if (!config) return null
          const label = providerLabel(provider, providerConfigs)
          return (
            <div className="credential-provider" key={provider}>
              {provider === 'minimax' ? <label className="field">
                <span>MiniMax 区域</span>
                <select aria-label="MiniMax 区域" value={minimaxRegion(providerRegions)} onChange={event => onMiniMaxRegionChange(event.target.value)}>
                  {Object.entries(MINIMAX_REGIONS).map(([id, region]) => <option key={id} value={id} disabled={id === 'cn' && !modelRegistry?.providerRegionContractVersion}>{region.label}</option>)}
                </select>
                <small>{MINIMAX_REGIONS[minimaxRegion(providerRegions)].apiBase} · 请填写该区域平台的 Key</small>
              </label> : null}
              <label className="field">
                <span>{label} 接入密钥</span>
                <div className="key-input">
                  <KeyRound size={18} />
                  <input
                    type="password"
                    aria-label={`${label} 接入密钥`}
                    value={apiKeys[provider] || ''}
                    onChange={(event) => onApiKeyChange(provider, event.target.value)}
                    placeholder={config.keyPlaceholder}
                    autoComplete="off"
                  />
                </div>
              </label>
              <ApiKeyGuide providerConfig={provider === 'minimax' ? {...config, guideUrl: MINIMAX_REGIONS[minimaxRegion(providerRegions)].keyUrl, guideSteps: ['登录所选区域的 MiniMax 开放平台并创建 API Key。', '不同区域的 Key 分别保存在当前页面内存，切换时不会互用。']} : config} />
            </div>
          )
        })}
        {!credentialProviders.length ? <p className="credential-empty">当前配置没有需要由浏览器提供的模型凭据。</p> : null}

        {arkProbes.length ? (
          <section className="ark-verification" aria-label="Ark 所选模型验证">
            <div className="ark-verification-head"><ShieldCheck size={17} /><strong>Ark 模型验证（可选）</strong></div>
            <p>完整激活目录需 AK/SK；这里的推理探针只用于提前诊断账号可用性，不是提交前置条件。验证结果和 Key 都只保留在页面内存中。</p>
            <ul>
              {arkProbes.map((probe) => (
                <li key={arkVerificationKey(probe)}>
                  <span>{probeRoleLabel(probe.role)} · {probe.modelId}</span>
                  <em className={arkVerification[arkVerificationKey(probe)] || 'pending'}>
                    {arkVerification[arkVerificationKey(probe)] === 'verified' ? '已验证' : arkVerification[arkVerificationKey(probe)] || '待验证'}
                  </em>
                </li>
              ))}
            </ul>
            {arkImageProbeRequired ? (
              <label className="ark-paid-confirmation">
                <input type="checkbox" checked={arkProbePaidConfirmed} onChange={(event) => onArkProbePaidConfirmedChange(event.target.checked)} />
                <span>会按所选图片模型的最低支持分辨率产生一次图片调用费用</span>
              </label>
            ) : null}
            <button
              type="button"
              className="secondary-button ark-verify-button"
              disabled={isVerifyingArk || arkKeyMissing || !verifiableArkProbes.length}
              onClick={onVerifyArk}
            >
              {isVerifyingArk ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
              验证所选模型
            </button>
            {arkVerificationError ? <p className="ark-verification-error">{arkVerificationError}</p> : null}
          </section>
        ) : null}
      </details>
    </>
  )
}
