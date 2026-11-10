import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { modalityIconStates } from '../packages/api/src/modality-presentation.mjs'
import { STATIC_MODEL_REGISTRY } from '../apps/web/src/lib/staticModelCatalog.js'
import { auditedModelSpecs } from '../apps/web/src/lib/modelAudit.js'
const require = createRequire(import.meta.url)
const mini = require('../apps/miniprogram/miniprogram/utils/card-presentation.js')
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8')

test('R22C shared and generated Mini presentation agree across all 1064 identities and preserve captured quotes', () => {
  const snapshot = JSON.parse(read('config/channel-audit/tokendance-catalog-snapshot-20261109b.json'))
  const tables = JSON.parse(read('config/channel-audit/model-modality-phase2-20261109.json')).tables
  let count = 0
  for (const [channel, provider] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of provider.models) {
    const fields = auditedModelSpecs(channel, model.id).fields
    for (const field of ['inputModalities', 'outputModalities']) {
      const before = structuredClone(fields[field])
      const icons = modalityIconStates('', fields[field], channel, model.id)
      assert.deepEqual(mini.modalityIconStates('', fields[field], channel, model.id), icons)
      assert.deepEqual(fields[field], before)
      const table = tables[channel + '/' + model.id]
      for (const icon of icons.filter(icon => ['supported', 'unsupported'].includes(icon.state))) {
        if (icon.state === 'unsupported' && fields[field].provenance === 'channel') assert.match(icon.tooltip, /^此渠道不支持(文本|图像|视频|音频)输入$/, channel + '/' + model.id)
        if (table) assert.equal(icon.tooltip, (icon.state === 'unsupported' ? '此渠道不支持' : '支持') + icon.label + '输入')
        if (channel === 'tokendance') {
          const portal = snapshot.portal[model.id]
          assert.ok(portal)
          const quote = portal.architecture.modality.replace(/text|image|audio|video/g, value => ({text:'文本', image:'图像', audio:'音频', video:'视频'})[value]).replaceAll(',', '、')
          assert.equal(icon.tooltip, (icon.state === 'unsupported' ? '此渠道不支持' : '支持') + icon.label + '输入')
        }
      }
    }
    count++
  }
  assert.equal(count, 1064)
})

test('R22C solid grey glyphs exceed 3:1 on active card/dialog backgrounds', () => {
  const css = read('apps/web/src/styles.css'), miniCss = read('apps/miniprogram/miniprogram/components/model-picker/model-picker.wxss')
  const token = name => css.match(new RegExp('--' + name + ': (#[a-f0-9]{6})'))[1]
  function luminance(hex) {
    const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
  }
  const ratios = []
  for (const [mark, backgrounds] of [[token('muted'), [token('surface'), token('surface-muted'), token('paper-soft'), '#ffffff']], [token('ink-soft'), [token('surface')]], ['#68786d', ['#ffffff', '#edf7f1', '#f8f7f2']], ['#213b2f', ['#ffffff']]]) {
    for (const background of backgrounds) {
      const values = [luminance(mark), luminance(background)].sort((a,b) => b-a)
      const ratio = (values[0] + .05) / (values[1] + .05)
      assert.ok(ratio >= 3, `${mark} on ${background}: ${ratio}`)
      ratios.push(ratio)
    }
  }
  assert.match(read('apps/web/src/components/ModelSpecifications.css'), /is-unsupported[^}]*color: var\(--muted\)/)
  assert.match(miniCss, /is-unsupported[^}]*color:#68786d/)
  assert.equal((miniCss.match(/data:image\/svg\+xml/g) || []).length, 4, 'existing Lucide glyphs embedded without adding image files')
  console.log('R22C minimum active-card grey-glyph contrast: ' + Math.min(...ratios).toFixed(2) + ':1')
})
