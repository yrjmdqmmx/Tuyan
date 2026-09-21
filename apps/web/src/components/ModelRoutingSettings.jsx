import { TokenDanceStatus } from './TokenDancePanel'
import { MODEL_CHANNEL_LABELS, orderModelChannels } from '../lib/modelPresentation'
import { KeyRound, Loader2, Settings2, ShieldCheck, Sparkles } from 'lucide-react'
import NativeCredentialFields from './NativeCredentialFields'
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
  accessMode = 'preset', onAccessModeChange, universalSettings,
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
  tokenDance,
  onOpenAccount,
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
          <button type="button" aria-pressed={accessMode !== 'custom' && !isAdvancedMode} className={accessMode !== 'custom' && !isAdvancedMode ? 'active' : ''} onClick={() => onModeChange('simple')}>
            <Sparkles size={16} /><span>普通模式</span><small>预设渠道 · 单 Key</small>
          </button>
          <button type="button" aria-pressed={accessMode !== 'custom' && isAdvancedMode} className={accessMode !== 'custom' && isAdvancedMode ? 'active' : ''} onClick={() => onModeChange('advanced')}>
            <Settings2 size={16} /><span>专业模式</span><small>预设渠道 · 分角色配置</small>
          </button>
          <button type="button" aria-pressed={accessMode === 'custom'} className={accessMode === 'custom' ? 'active' : ''} onClick={()=>onAccessModeChange?.('custom')}><KeyRound size={16}/><span>通用 API</span><small>自有服务 · 按角色接入</small></button>
        </div>
        {isAdvancedMode && !routeContractSupported ? <p className="route-contract-warning">当前后端不支持专业模式的多渠道路由，提交会失败关闭。</p> : null}
      </div>

      {accessMode === 'custom' ? universalSettings : <>
      {!isAdvancedMode ? (
        <div className="field" data-focus-setting="provider" tabIndex={-1}>
          <span>API 接入渠道</span>
          <small>更多渠道可在专业模式中分别选择主模型、图像模型和识别模型。</small>
          <div data-focus-setting="main-model" tabIndex={-1}>
            <div className="segmented provider-segmented" role="group" aria-label="API 接入渠道">
              {orderModelChannels(Object.keys(providerConfigs)).filter(id => providerDefaultRoutes(id, modelRegistry, providerConfigs)).map(id => (
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
        <p>填写当前任务所需的渠道密钥，或连接观猹 TokenDance 授权账户。{credentialProviders.includes('tokendance') ? '可恢复任务所需的其他渠道密钥会在服务端加密保存，任务完成即删除，最长保留 7 天。' : '手动填写的密钥只保留在本页内存中。'}</p>
        {credentialProviders.map((provider) => {
          const config = providerConfigs[provider]
          if (!config) return null
          if (provider === 'tokendance') return tokenDance ? <TokenDanceStatus key={provider} controller={tokenDance} onOpenAccount={onOpenAccount} /> : <p key={provider}>请连接观猹 TokenDance 账户。</p>
          return (
            <NativeCredentialFields key={provider} provider={provider} providerConfig={config}
              value={apiKeys[provider]} onChange={(value) => onApiKeyChange(provider, value)}
              providerRegions={providerRegions} onMiniMaxRegionChange={onMiniMaxRegionChange}
              regionContractSupported={Boolean(modelRegistry?.providerRegionContractVersion)}
              recoverable={credentialProviders.includes('tokendance')} />
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
      </>}
    </>
  )
}
