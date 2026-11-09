import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import { ModelSpecifications } from '../src/components/ModelSpecifications.jsx'
import { modelCardSpecifications } from '../src/lib/modelCardSpecifications.js'
import { modelCardSources, isApiSource } from '../src/lib/modelCardSources.js'
import { STATIC_MODEL_REGISTRY } from '../src/lib/staticModelCatalog.js'
import { sourceIdentity } from '../../../packages/api/src/card-presentation.mjs'
import { machineSources, humanSources } from '../../../test-support/card-sources-r23.mjs'
afterEach(cleanup)

test('R23 machine endpoints are filtered while human API documentation remains visible', () => {
  for (const url of machineSources) assert.equal(isApiSource(url), true, url)
  for (const url of humanSources) assert.equal(isApiSource(url), false, url)
  for (const contentType of ['application/json', 'application/vnd.openapi+json', 'application/yaml', 'text/yaml'])
    assert.ok(isApiSource('https://example.test/schema', {'https://example.test/schema':{contentType}}))
  assert.ok(isApiSource('https://example.test/redirect', {'https://example.test/redirect':{finalUrl:machineSources[0]}}))
  assert.deepEqual(modelCardSources({channel:'custom', fields:{}, audit:{sourceUrls:machineSources}}).sources, ['https://replicate.com/owner/model'])
  render(React.createElement(ModelSpecifications, {provider:'custom',model:{id:'machine-only',officialSourceUrl:machineSources[0]}}))
  screen.getByText('官方文档待确认')
  assert.equal(screen.queryByRole('link'), null)
})

test('R23 every vendor field on all 1064 Web cards has its vendor href in the dialog; every visible source is human', t => {
  let cards=0, vendorFields=0
  const offending=[], apiLinks=[]
  for (const [provider, entry] of Object.entries(STATIC_MODEL_REGISTRY)) for (const model of entry.models) {
    const key=provider+'/'+model.id, data=modelCardSpecifications(provider,model)
    const {container}=render(React.createElement(ModelSpecifications,{provider,model}))
    const fields=Object.keys(data.fields), dds=container.querySelectorAll('dd')
    fireEvent.click(screen.getByRole('button',{name:/输入模态/}))
    const dialog=screen.getByRole('dialog'), anchors=within(dialog).queryAllByRole('link')
    const vendorKeys=new Set(data.vendorSources.map(sourceIdentity))
    for (const [i,field] of fields.entries()) if (dds[i].textContent.includes('源自原厂')) {
      vendorFields++
      const fact=data.fields[field], expected=(fact.sourceUrls || [fact.sourceUrl]).filter(Boolean).map(sourceIdentity)
      if (!anchors.some(a=>vendorKeys.has(sourceIdentity(a.href)) && expected.includes(sourceIdentity(a.href)))) offending.push(key+'/'+field)
    }
    for (const anchor of anchors.slice(1)) if (vendorKeys.has(sourceIdentity(anchor.href))) assert.ok(anchor.textContent.startsWith('原厂规格 · '), key)
    for (const url of [...['sources','channelSources','vendorSources','lifecycleSources'].flatMap(k=>data[k]), ...Array.from(document.querySelectorAll('a[href]'),a=>a.href)])
      if (isApiSource(url)) apiLinks.push(key+': '+url)
    if (provider==='tokendance' && data.channelSources.length) assert.equal(anchors[0].href,'https://tokendance.space/models/'+model.id)
    if (key==='stability/sd3.5-flash') {
      assert.equal(anchors[0].href,'https://platform.stability.ai/docs/api-reference#tag/Generate/paths/~1v2beta~1stable-image~1generate~1sd3/post')
      assert.ok(!dialog.textContent.includes('api.stability.ai/v2alpha/openapi'))
    }
    cards++;cleanup()
  }
  assert.equal(cards,1064);assert.ok(vendorFields>20)
  assert.deepEqual(offending,[]);assert.deepEqual(apiLinks,[])
  t.diagnostic(JSON.stringify({cards,vendorFields,offendingCards:new Set(offending).size,visibleApiLinks:apiLinks.length}))
})
