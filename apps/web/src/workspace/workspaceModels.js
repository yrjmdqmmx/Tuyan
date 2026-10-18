import { universalModelEntry, normalizeUniversalConnection } from '../lib/universalContract.js';
import { partitionRegistryModels, modelMissingFromCatalog } from '../lib/modelRegistry.js';
export const ROLE_NAMES = { main: '主模型', image: '绘图模型', vision: '视觉理解' };
export const emptyLibrary = () => ({ revision: 0, connections: [], models: [] });
export const customBindingChanged=(entry,connection)=>entry.custom&&['connectionId','baseUrl','protocol','auth'].some(key=>normalizeUniversalConnection(entry.custom)[key]!==connection?.custom?.[key]);
export function libraryModelMissingFromCatalog(entry, library, registry) {
  const provider = library.connections.find(c => c.id === entry.connectionId)?.provider;
  return !entry.custom && modelMissingFromCatalog(registry, provider, entry.modelId);
}
export function modelOption(entry, library, registry, role, path, editing, tokenDance) {
  const connection = library.connections.find(c => c.id === entry.connectionId);
  const model = entry.custom ? universalModelEntry({ accessProvider: 'custom', modelId: entry.modelId, custom: entry.custom }) : registry?.providers?.[connection?.provider]?.models.find(m => m.id === entry.modelId);
  const partition = partitionRegistryModels(model ? [model] : [], { role, outputFormat: path, operation: editing ? 'editing' : 'generation' });
  const reason = entry.disabled || connection?.disabled ? '已停用'
    : entry.custom && customBindingChanged(entry,connection) ? '连接已改变，请重新确认此型号的能力' : !model || libraryModelMissingFromCatalog(entry, library, registry) ? '当前目录未收录此精确型号'
    : !partition.compatible.length ? partition.incompatible[0]?.selectionDisabledReason || '不支持当前角色'
    : connection.provider === 'tokendance' ? (tokenDance?.connected ? '' : '尚未确认 TokenDance 授权')
    : !connection.hasCredential ? (connection.scope === 'browser' ? '当前浏览器缺少此连接的密钥' : '连接尚未保存密钥') : '';
  return { ...entry, connection, model, reason, label: `${model?.label || entry.modelId} · ${connection?.label || '缺少连接'}` };
}
export function selectedModelReference(option) {
  return { libraryModelId: option.id, connectionId: option.connectionId, accessProvider: option.connection.provider, modelId: option.modelId };
}
// A browser secret is separate from both the synced library metadata and tasks.
export const browserCredentialKey = (base, user, connection) => `tuyan.workspace-connection.v1:${base}:${user || 'guest'}:${connection.id}:${connection.provider}:${connection.region || 'global'}${connection.custom ? ':' + JSON.stringify(connection.custom) : ''}`;
