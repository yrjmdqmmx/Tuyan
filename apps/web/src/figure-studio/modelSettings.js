import { minimaxRegion, registryForRegions } from '../lib/providerRegions.js';
import { partitionRegistryModels } from '../lib/modelRegistry.js';
import { universalDraftEntry, universalDraftRoute, universalKeyEnvelope, missingUniversalKeys, loadUniversalDrafts, saveUniversalDrafts } from '../lib/universalApi.js';

export function studioProviderSupported(provider, capabilities) {
  const mode = ['tokendance', 'custom'].includes(provider) ? provider : 'api-key';
  return capabilities?.modelPlanning === true
    && capabilities.supportedModelModes?.includes(mode) === true
    && capabilities.supportedProviders?.includes(provider) === true
    && !(capabilities.unsupportedProviders || []).includes(provider);
}

/** Restrict the shared picker without changing a user's existing route. */
export function studioModelRegistry(registry, capabilities, regions) {
  const regional = registryForRegions(registry, regions);
  return { ...regional, providers: Object.fromEntries(Object.entries(regional?.providers || {})
    .filter(([id]) => id !== 'custom' && (capabilities ? studioProviderSupported(id, capabilities) : id !== 'tokendance'))
    .map(([id, entry]) => [id, { ...entry, models: entry.models.filter((model) => model.roles?.includes('main')) }])) };
}

export function studioModelSelection(value, registry, capabilities, { loading = false, error = '' } = {}) {
  if (!value.provider || !value.modelId) return { valid: false, reason: '' };
  if (!studioProviderSupported(value.provider, capabilities)) return { valid: false, reason: '当前图稿后端尚未确认支持所选渠道，已保留原选择。' };
  if (value.provider === 'custom') {
    if (!(registry?.universalApiContractVersion >= 1)) return { valid: false, reason: '当前后端尚未确认通用 API 契约，配置已保留。' };
    const entry = value.customDraft && universalDraftEntry(value.customDraft);
    return entry?.selectable && entry.roles.includes('main') ? { valid: true, reason: '' } : { valid: false, reason: entry?.disabledReason || '请完成主模型能力声明与准确型号配置。' };
  }
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

export function studioModelContext(value, capabilities) {
  if (!value.valid || !studioProviderSupported(value.provider, capabilities) || !value.modelId) throw new Error('请展开模型设置，明确选择当前图稿服务支持的主文本模型。');
  if (value.provider === 'custom') {
    const mainRoute = universalDraftRoute(value.customDraft);
    const envelope = universalKeyEnvelope({ main: value.customDraft }, { main: value.customKey });
    if (missingUniversalKeys({ main: mainRoute }, ['main'], envelope).length) throw new Error('请填写与当前通用 API 地址、协议绑定的密钥。');
    return { mainRoute, apiKeys: { custom: envelope } };
  }
  if (value.provider === 'tokendance') {
    if (!value.connected) throw new Error('请在模型设置中连接观猹 TokenDance，再提交规划或编辑。');
    return { mainRoute: { accessProvider: value.provider, modelId: value.modelId }, apiKeys: {} };
  }
  if (!value.key?.trim()) throw new Error('请填写所选渠道的 API Key。密钥只在当前页面使用。');
  return { mainRoute: { accessProvider: value.provider, modelId: value.modelId }, apiKeys: { [value.provider]: value.key.trim() }, ...(value.provider === 'minimax' ? { providerRegions: value.providerRegions } : {}) };
}

/** Updating main must preserve the workbench's separately saved roles. */
export function saveStudioUniversalDraft(main, storage = globalThis.localStorage) {
  return saveUniversalDrafts({ ...loadUniversalDrafts(storage), main }, storage);
}
