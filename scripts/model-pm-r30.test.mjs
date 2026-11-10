import test from 'node:test'
import assert from 'node:assert/strict'
import {imageInputPresentations} from '../test-support/image-input-r27.mjs'
import {assertPMDecisions} from '../test-support/pm-decisions-r30.mjs'
import {ownModelPage} from '../packages/api/src/model-card-sources.mjs'
import {humanSourceUrl} from '../packages/api/src/card-presentation.mjs'
import decision from '../docs/model-modality-image-input-decision.json' with {type:'json'}
test('R30 all 1064 cards: numeric absence, source priority, conditional identity and exact display-only changes',async()=>{
 const rows=await imageInputPresentations();assertPMDecisions(rows)
 // I13 narrows primary promotion to same-channel siblings; the R31 suite checks all 82 decisions.
 for(const {identity,url}of decision.rows){const row=rows[identity],own=identity.startsWith('fal/')?'https://fal.ai/models/'+identity.slice(4)+'/api':'https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-4';assert.equal(row.web.sources[0].url,own,identity);assert.equal(row.mini.card.specSources[0].url,own,identity);for(const sources of [row.web.sources,row.mini.card.specSources])assert.ok(sources.some(source=>source.url===humanSourceUrl(url)),identity+' retained image-input source')}
 const changed=structuredClone(rows);changed['fal/fal-ai/flux-2-pro'].web.data.maxOutput='∞';assert.throws(()=>assertPMDecisions(changed))
})
test('R30 source matching rejects sibling, prefix and operation-only identities',()=>{
 const urls=['https://fal.ai/models/fal-ai/flux-2-pro/edit/api','https://fal.ai/models/fal-ai/flux-2-pro-ultra/api','https://fal.ai/models/fal-ai/flux-2-pro/api'];assert.equal(ownModelPage('fal',{id:'fal-ai/flux-2-pro'},urls),urls[2]);assert.equal(ownModelPage('fal',{id:'different/text-to-image'},['https://fal.ai/models/other/text-to-image/api']),null)
})
