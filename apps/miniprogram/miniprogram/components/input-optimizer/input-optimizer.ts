import { hasTokenDanceConnection, openTokenDance } from '../../utils/tokendance'
import { getCurrentUser, subscribeSession } from '../../utils/session'
import { requestJson, formatError } from '../../utils/api'
import { getApiKeys } from '../../utils/api-keys'
import { getModelRegistryState, subscribeModelRegistry } from '../../utils/model-registry-store'
import { buildOptimizationRequest, supportsOptimization, validateOptimizationResult, OPTIMIZATION_LABELS, type OptimizationInputs, type OptimizationTarget } from '../../utils/input-optimization'
import type { ModelRoute } from '../../utils/model-routing'
import type { ProviderRegions } from '../../utils/provider-regions'

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    target: { type: String, value: 'methodContent' },
    inputs: { type: Object, value: {} as OptimizationInputs },
    mainRoute: { type: Object, value: {} as ModelRoute },
    providerRegions: { type: Object, value: {} as ProviderRegions },
    disabled: { type: Boolean, value: false },
  },
  data: { supported: false, open: false, busy: false, original: '', candidate: '', error: '', hasUndo: false, label: '' },
  lifetimes: {
    attached() {
      let owner = getCurrentUser()?.id || ''
      ;(this as any).unsubscribeSession = subscribeSession(user => {
        if (owner !== (user?.id || '')) { this.cancel(); (this as any).undo = undefined; this.setData({ hasUndo: false }); owner = user?.id || '' }
      })
      ;(this as any).unsubscribe = subscribeModelRegistry(state => this.setData({ supported: supportsOptimization(state.registry, this.properties.target) }))
      this.setData({ supported: supportsOptimization(getModelRegistryState().registry, this.properties.target) })
    },
    detached() { this.cancel(); (this as any).unsubscribe?.(); (this as any).unsubscribeSession?.(); (this as any).undo = undefined },
  },
  pageLifetimes: { hide() { this.cancel() } },
  methods: {
    noop() {},
    async optimize() {
      if (this.properties.disabled || (this as any).requestInFlight) return
      const target = this.properties.target as OptimizationTarget
      let payload
      try {
        payload = buildOptimizationRequest({ target, inputs: this.properties.inputs, mainRoute: this.properties.mainRoute as ModelRoute, providerRegions: this.properties.providerRegions == null ? undefined : this.properties.providerRegions, apiKeys: getApiKeys(), tokenDanceConnected: hasTokenDanceConnection(), registry: getModelRegistryState().registry })
      } catch (error) {
        this.setData({ error: formatError(error) })
        if (/连接观猹 TokenDance/.test(formatError(error))) openTokenDance()
        else if (/主模型|密钥/.test(formatError(error))) this.triggerEvent('settings')
        return
      }
      const sequence = Number((this as any).sequence || 0) + 1
      ;(this as any).sequence = sequence
      ;(this as any).requestInFlight = true
      const original = String(this.properties.inputs[target] || '')
      this.setData({ open: true, busy: true, original, candidate: '', error: '', label: OPTIMIZATION_LABELS[target] })
      this.triggerEvent('visibility', {open:true})
      this.triggerEvent('busy', { busy: true })
      try {
        const result = await requestJson<{ target?: string; optimizedText?: string }>(payload, { timeout: 55000 })
        if (sequence !== (this as any).sequence) return
        this.setData({ candidate: validateOptimizationResult(target, original, result) })
      } catch (error) {
        if (sequence === (this as any).sequence) this.setData({ error: formatError(error) })
      } finally {
        ;(this as any).requestInFlight = false
        if (sequence === (this as any).sequence) { this.setData({ busy: false }); this.triggerEvent('busy', { busy: false }) }
      }
    },
    cancel() {
      ;(this as any).sequence = Number((this as any).sequence || 0) + 1
      this.setData({ open: false, busy: false, candidate: '', original: '', error: '' })
      this.triggerEvent('visibility', {open:false})
      this.triggerEvent('busy', { busy: false })
    },
    apply() {
      if (this.data.busy || !this.data.candidate) return
      const target = this.properties.target as OptimizationTarget
      if (String(this.properties.inputs[target] || '') !== this.data.original) { this.setData({ error: '原文已修改，请取消后重新优化。' }); return }
      ;(this as any).undo = { original: this.data.original, applied: this.data.candidate }
      this.triggerEvent('apply', { target, value: this.data.candidate })
      this.cancel(); this.setData({ hasUndo: true })
    },
    restore() {
      const undo = (this as any).undo as { original: string; applied: string } | undefined
      if (!undo || this.data.busy || this.properties.disabled) return
      const target = this.properties.target as OptimizationTarget
      if (String(this.properties.inputs[target] || '') !== undo.applied) { this.setData({ error: '内容已修改，已保留当前文本。' }); return }
      this.triggerEvent('apply', { target, value: undo.original })
      ;(this as any).undo = undefined
      this.setData({ hasUndo: false, error: '' })
    },
  },
})
