import { MODEL_PRESENTATION } from './model-presentation-data.js'

type PresentedModel = { id: string; label?: string; vendor?: string; vendorId?: string; releasedAt?: string | null; releaseFamily?: string; releaseOrder?: number; [key: string]: any }
const presentationAliases = new Map<string, string>()
for (const [id, vendor] of Object.entries(MODEL_PRESENTATION.vendors)) {
  for (const alias of [id, vendor.label, ...vendor.aliases]) presentationAliases.set(alias.toLowerCase(), id)
}
const presentationRoutes = MODEL_PRESENTATION.routes.map((rule) => ({ ...rule, regex: new RegExp(rule.pattern, 'i') }))
const presentationFamilies = MODEL_PRESENTATION.families.map((rule) => ({ ...rule, patterns: rule.newestFirst.map((pattern) => new RegExp('(?:' + pattern + ')(?![.p]\\d)', 'i')) }))
const presentationReleases = MODEL_PRESENTATION.releases.map((rule) => ({ ...rule, regex: new RegExp(rule.pattern, 'i') }))

export const MODEL_CHANNEL_LABELS: Record<string, string> = MODEL_PRESENTATION.channels

export function modelDeveloper(provider: string, model: PresentedModel): { id: string; label: string } {
  const route = presentationRoutes.find((rule) => rule.channels.includes(provider) && rule.regex.test(model.id))
  // Only reviewed namespaces are aliases; Pro and deployment paths are never developers.
  const namespace = model.id.replace(/^~/, '').replace(/^Pro\//i, '').split('/')[0].toLowerCase()
  const explicit = presentationAliases.get(String(model.vendorId || model.vendor || '').toLowerCase())
  const id = route?.vendorId || (model.vendorId === 'unconfirmed' ? 'unconfirmed' : presentationAliases.get(String(model.vendorId || '').toLowerCase())) || (model.id.includes('/') ? presentationAliases.get(namespace) : undefined) || explicit || 'unconfirmed'
  return { id, label: MODEL_PRESENTATION.vendors[id]?.label || '开发方待确认' }
}

export function presentRegistryModel<T extends PresentedModel>(provider: string, model: T): T {
  const developer = modelDeveloper(provider, model)
  const family = presentationFamilies.find((rule) => rule.vendorId === developer.id && rule.patterns.some((pattern) => pattern.test(model.id)))
  const order = family ? family.patterns.findIndex((pattern) => pattern.test(model.id)) : -1
  const release = presentationReleases.find((rule) => rule.vendorId === developer.id && (!rule.channels || rule.channels.includes(provider)) && rule.regex.test(model.id))
  return {
    ...model,
    label: modelDisplayLabel(model, developer.id),
    vendor: developer.label,
    vendorId: developer.id,
    serviceTier: /^Pro\//i.test(model.id) ? 'Pro' : model.serviceTier || '',
    releasedAt: release?.releasedAt || validModelReleaseDate(model.releasedAt) || null,
    releaseSourceUrl: release?.source || model.releaseSourceUrl || '',
    releaseFamily: family?.id || '',
    releaseOrder: order >= 0 ? family!.patterns.length - order : 0,
    releaseOrderSourceUrl: family?.source || '',
  }
}

function modelDisplayLabel(model: PresentedModel, developerId: string): string {
  const label = String(model.label || model.id)
  if (label !== model.id && !label.includes('/')) return label.replace(/^[^:]+: /, '')
  // This is display-only. Preserve the original ID, including tier and task suffixes.
  let name = model.id.replace(/^Pro\//i, '').replace(/^accounts\/fireworks\/models\//, '').replace(/^fal-ai\//, '')
  const parts = name.split('/')
  if (parts.length > 1 && (presentationAliases.has(parts[0].toLowerCase())
    || (parts[0].toLowerCase() === 'thudm' && developerId === 'zhipu'))) parts.shift()
  name = parts.filter((part) => !['text-to-image', 'image-to-image'].includes(part)).join(' · ')
  name = name.replace(/^glm/i, 'GLM').replace(/^deepseek/i, 'DeepSeek').replace(/^qwen/i, 'Qwen').replace(/^kimi/i, 'Kimi').replace(/^gpt/i, 'GPT').replace(/^flux/i, 'FLUX').replace(/^minimax/i, 'MiniMax').replace(/^grok/i, 'Grok').replace(/^gemini/i, 'Gemini').replace(/^claude/i, 'Claude').replace(/^seedream/i, 'Seedream')
  return name
}

export function validModelReleaseDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const time = Date.parse(value + 'T00:00:00Z')
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? value : ''
}

// A stable topological order combines known dates with explicit version relations.
// Unlike a pairwise date-or-version comparator, this cannot become non-transitive.
// Official dates win if a version relation conflicts. Ties retain catalog order;
// neither recommendation badges nor lexicographic API IDs influence chronology.
export function sortModelsNewestFirst<T extends PresentedModel>(models: readonly T[]): T[] {
  const nodes = models.map((model, index) => ({ model, index, date: validModelReleaseDate(model.releasedAt), next: new Set<number>(), incoming: 0 }))
  function edge(from: number, to: number) {
    if (from !== to && !nodes[from].next.has(to)) { nodes[from].next.add(to); nodes[to].incoming++ }
  }
  const dated = nodes.filter((node) => node.date).sort((a, b) => b.date.localeCompare(a.date))
  const dates: typeof nodes[] = []
  for (const node of dated) {
    if (dates[dates.length - 1]?.[0].date !== node.date) dates.push([])
    dates[dates.length - 1].push(node)
  }
  for (let i = 1; i < dates.length; i++) for (const newer of dates[i - 1]) for (const older of dates[i]) edge(newer.index, older.index)
  function reaches(from: number, target: number, seen = new Set<number>()): boolean {
    if (from === target) return true
    if (seen.has(from)) return false
    seen.add(from)
    return [...nodes[from].next].some((next) => reaches(next, target, seen))
  }
  const families = new Map<string, typeof nodes>()
  for (const node of nodes) if (node.model.releaseFamily && node.model.releaseOrder) {
    const key = (node.model.vendorId || node.model.vendor || '') + '/' + node.model.releaseFamily
    families.set(key, [...(families.get(key) || []), node])
  }
  for (const family of families.values()) {
    const versions = [...new Set(family.map((node) => node.model.releaseOrder!))].sort((a, b) => b - a)
    for (let i = 1; i < versions.length; i++) {
      for (const newer of family.filter((node) => node.model.releaseOrder === versions[i - 1])) {
        for (const older of family.filter((node) => node.model.releaseOrder === versions[i])) {
          if (!reaches(older.index, newer.index)) edge(newer.index, older.index)
        }
      }
    }
  }
  const result: T[] = []
  const ready = nodes.filter((node) => node.incoming === 0)
  while (ready.length) {
    ready.sort((a, b) => Number(Boolean(b.date)) - Number(Boolean(a.date))
      || b.date.localeCompare(a.date)
      || Number(Boolean(b.model.releaseOrder)) - Number(Boolean(a.model.releaseOrder))
      || a.index - b.index)
    const node = ready.shift()!
    result.push(node.model)
    for (const next of node.next) if (--nodes[next].incoming === 0) ready.push(nodes[next])
  }
  return result
}
