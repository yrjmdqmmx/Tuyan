import { MODEL_PROVIDER_IDS, groupRegistryModels, partitionRegistryModels, type ModelRegistry, type ModelRole, type RegistryModel } from '../../utils/model-registry'

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Google Gemini API', openai: 'OpenAI', bailian: '阿里百炼', ark: '火山方舟', openrouter: 'OpenRouter',
}

interface VendorGroup { vendor: string; models: RegistryModel[] }
interface ChannelGroup {
  id: string
  label: string
  compatible: VendorGroup[]
  incompatible: VendorGroup[]
}

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    show: { type: Boolean, value: false, observer(this: any) { this.refresh() } },
    registry: { type: Object, value: {}, observer(this: any) { this.refresh() } },
    role: { type: String, value: 'main', observer(this: any) { this.refresh() } },
    outputFormat: { type: String, value: 'png', observer(this: any) { this.refresh() } },
    selectedProvider: { type: String, value: '' },
    selectedModel: { type: String, value: '' },
  },
  data: {
    query: '',
    channels: [] as ChannelGroup[],
    roleLabel: '主模型',
  },
  methods: {
    noop() {},
    refresh() {
      const registry = this.properties.registry as ModelRegistry | null
      const role = normalizeRole(this.properties.role)
      const query = this.data.query
      if (!registry || !registry.providers) {
        this.setData({ channels: [], roleLabel: roleLabel(role) })
        return
      }
      const channels = MODEL_PROVIDER_IDS.map((providerId) => {
        const partition = partitionRegistryModels(registry.providers[providerId].models, {
          role, query, outputFormat: String(this.properties.outputFormat || ''),
        })
        return {
          id: providerId,
          label: PROVIDER_LABELS[providerId],
          compatible: groupRegistryModels(partition.compatible),
          incompatible: groupRegistryModels(partition.incompatible),
        }
      }).filter((channel) => channel.compatible.length || channel.incompatible.length)
      this.setData({ channels, roleLabel: roleLabel(role) })
    },
    onSearch(event: WechatMiniprogram.Input) {
      this.setData({ query: event.detail.value })
      this.refresh()
    },
    choose(event: WechatMiniprogram.TouchEvent) {
      if (event.currentTarget.dataset.disabled) return
      this.triggerEvent('select', {
        provider: String(event.currentTarget.dataset.provider || ''),
        modelId: String(event.currentTarget.dataset.model || ''),
      })
    },
    close() { this.triggerEvent('close') },
  },
})

function normalizeRole(value: unknown): ModelRole {
  return value === 'image' || value === 'vision' ? value : 'main'
}

function roleLabel(role: ModelRole): string {
  return role === 'image' ? '图像生成模型' : role === 'vision' ? '参考图识别模型' : '主模型'
}
