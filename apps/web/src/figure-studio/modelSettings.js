import { minimaxRegion, registryForRegions } from '../lib/providerRegions.js';
import { partitionRegistryModels } from '../lib/modelRegistry.js';

export function studioProviderSupported(provider, capabilities) {
  return capabilities?.modelPlanning === true
    && capabilities.supportedModelModes?.includes('api-key') === true
    && capabilities.supportedProviders?.includes(provider) === true
    && !['tokendance', 'custom', ...(capabilities.unsupportedProviders || [])].includes(provider);
}

/** Restrict the shared picker without changing a user's existing route. */
export function studioModelRegistry(registry, capabilities, regions) {
  const regional = registryForRegions(registry, regions);
  const unsupported = ['tokendance', 'custom', ...(capabilities?.unsupportedProviders || [])];
  return { ...regional, providers: Object.fromEntries(Object.entries(regional?.providers || {})
    // A public catalog can be inspected before the authenticated service answers.
    // Only studioModelSelection grants submission eligibility.
    .filter(([id]) => !unsupported.includes(id) && (!Array.isArray(capabilities?.supportedProviders) || capabilities.supportedProviders.includes(id)))
    .map(([id, entry]) => [id, { ...entry, models: entry.models.filter((model) => model.roles?.includes('main')) }])) };
}

export function studioModelSelection(value, registry, capabilities, { loading = false, error = '' } = {}) {
  if (!value.provider || !value.modelId) return { valid: false, reason: '' };
  if (['tokendance', 'custom'].includes(value.provider)) return { valid: false, reason: '图稿规划与编辑暂不支持观猹 TokenDance 或通用 API。已保留原选择，请明确选择受支持的原生渠道。' };
  if (!studioProviderSupported(value.provider, capabilities)) return { valid: false, reason: '当前图稿后端尚未确认支持所选渠道，已保留原选择。' };
  if (loading) return { valid: false, reason: '正在核对服务端模型目录，已保留原选择。' };
  if (error || !registry) return { valid: false, reason: '模型目录暂不可用，已保留原选择；目录恢复后才可提交。' };
  if (value.provider === 'minimax' && minimaxRegion(value.providerRegions) === 'cn' && !registry.providerRegionContractVersion) {
    return { valid: false, reason: '当前后端不支持 MiniMax 中国大陆区域，已保留该区域与型号。' };
  }
  const regional = registryForRegions(registry, value.providerRegions);
  const model = regional.providers?.[value.provider]?.models?.find((item) => item.id === value.modelId);
  if (!model) return { valid: false, reason: '所选型号在当前渠道或区域目录中不可用，已保留原选择。' };
  const availability = partitionRegistryModels([model], { role: 'main' });
  if (model.selectable !== true || !availability.compatible.length) return { valid: false, reason: availability.incompatible[0]?.selectionDisabledReason || model.disabledReason || '所选型号当前不可用作主模型，已保留原选择。' };
  return { valid: true, reason: '' };
}
