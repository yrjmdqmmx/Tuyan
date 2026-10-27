import { BAILIAN_WORKSPACE_CONTRACT } from './bailian-workspace-data.js'

export interface BailianWorkspace { workspaceId: string; region: string }
export const BAILIAN_WORKSPACE_REGIONS = BAILIAN_WORKSPACE_CONTRACT.regions
export function bailianWorkspaceModel(modelId: string): boolean {
  return Object.hasOwn(BAILIAN_WORKSPACE_CONTRACT.models, modelId)
}
function bailianConfigurationError(message: string) {
  return Object.assign(new Error(message), {status:400, statusCode:400, businessCode:'BAILIAN_WORKSPACE_INVALID', publicMessage:true})
}
export function normalizeBailianWorkspace(value: unknown): BailianWorkspace | undefined {
  if (value == null) return undefined
  const v = value as Record<string, unknown>
  if (typeof value !== 'object' || Array.isArray(value) || typeof v.workspaceId !== 'string'
      || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(v.workspaceId.trim())) {
    throw bailianConfigurationError('请填写有效的百炼业务空间 ID（1～63 位字母、数字或内部连字符，不填写网址）。')
  }
  if (typeof v.region !== 'string' || !Object.hasOwn(BAILIAN_WORKSPACE_REGIONS, v.region)) {
    throw bailianConfigurationError('请选择已支持的百炼服务地区。')
  }
  return {workspaceId:v.workspaceId.trim(), region:v.region}
}
// Only audited new identities opt in. Existing IDs keep their original route,
// even when the same connection also supplies a workspace for new models.
export function bailianRouteFields(provider: string, modelId: string, value?: unknown): {bailian?: BailianWorkspace} {
  if (provider !== 'bailian' || !bailianWorkspaceModel(modelId)) return {}
  const workspace = normalizeBailianWorkspace(value)
  if (!workspace) throw bailianConfigurationError('此型号需要百炼业务空间 ID 和服务地区，请在模型管理中配置连接。')
  const allowed = BAILIAN_WORKSPACE_CONTRACT.models[modelId].regions
  if (!allowed.includes(workspace.region)) throw bailianConfigurationError('此百炼型号仅支持：' + allowed.map(region=>BAILIAN_WORKSPACE_REGIONS[region]).join('、'))
  return {bailian:workspace}
}
export function bailianWorkspaceIssue(provider: string, modelId: string, value?: unknown): string {
  try { bailianRouteFields(provider, modelId, value); return '' }
  catch (error) { return (error as Error).message }
}
export function bailianTextBaseUrl(modelId: string, value?: unknown): string {
  const {bailian} = bailianRouteFields('bailian', modelId, value)
  return bailian ? `https://${bailian.workspaceId}.${bailian.region}.maas.aliyuncs.com/compatible-mode/v1`
    : 'https://dashscope.aliyuncs.com/compatible-mode/v1'
}
