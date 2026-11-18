import assert from 'node:assert/strict'
import batch from '../config/channel-audit/retirements-20261117.json' with {type:'json'}
import prior from '../config/channel-audit/review-r26-20261110.json' with {type:'json'}
import {verifiedRetirement as verifiedCapture} from '../scripts/lib/model-evidence-r26.mjs'
import addendum from '../config/channel-audit/deprecations-addendum-20261109.json' with {type:'json'}
import {modelRows, readExecutionFixture} from './execution-capability.mjs'
const keyOf = row => row.provider+'/'+row.id
export const retiredKeys = new Set(batch.remove.map(keyOf))
export function verifiedRetirement(key, source, stopDate) {
  const notice = batch.upcoming.find(row => keyOf(row) === key)
  assert.ok(notice, key)
  assert.equal(source,notice.source)
  assert.equal(stopDate,notice.time || notice.date)
  if (prior.models[key]) verifiedCapture(key,source,stopDate)
}

// Independent execution oracle: start from the frozen baseline and apply only
// the delistings and exact notice records approved on main.
export function batchExecutionFixture() {
  const fixture = readExecutionFixture()
  const notices = new Map(addendum.scheduledDeprecations.map(({channel,apiModelId,stopDate,replacement,sourceUrl,displayName,replacementDisplayName}) => {
    const time = batch.upcoming.find(row => row.provider === channel && row.id === apiModelId).time
    const deadline = time ? stopDate.slice(0,10)+' 10:00 (UTC+8)' : stopDate
    return [channel+'/'+apiModelId, {stopDate,scope:'full',replacement,sourceUrl,displayName,replacementDisplayName,
      state:'scheduled',label:'将下线',blocked:false,message:'将于'+deadline+'下线'+(replacement ? '；可改选 '+replacementDisplayName : '')}]
  }))
  for (const name of ['core','web','mini','miniNormalizedStatic','miniNormalizedLive']) {
    for (const [provider, entry] of Object.entries(fixture[name])) {
      entry.models = entry.models.filter(model => !retiredKeys.has(provider+'/'+model.id))
      for (const model of entry.models) {
        const notice = notices.get(provider+'/'+model.id)
        if (notice && Object.hasOwn(model,'auditLifecycle')) model.auditLifecycle = notice
      }
    }
  }
  for (const name of ['coreReferenceModes','normalizedCatalog','webStaticDecisions','webLiveDecisions','miniInputPolicy','miniStaticDecisions','miniLiveDecisions'])
    for (const key of retiredKeys) delete fixture[name][key]
  fixture.counts.coreModels = modelRows(fixture.core).length
  fixture.counts.staticModels = modelRows(fixture.web).length
  return fixture
}
