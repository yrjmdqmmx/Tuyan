import assert from 'node:assert/strict'
import batch from '../config/channel-audit/retirements-20261117.json' with {type:'json'}
import additions from './fixtures/catalog-additions-20261124.json' with {type:'json'}
import november24 from '../config/channel-audit/retirements-20261124.json' with {type:'json'}
import prior from '../config/channel-audit/review-r26-20261110.json' with {type:'json'}
import {verifiedRetirement as verifiedCapture} from '../scripts/lib/model-evidence-r26.mjs'
import addendum from '../config/channel-audit/deprecations-addendum-20261109.json' with {type:'json'}
import {modelRows, readExecutionFixture} from './execution-capability.mjs'
import {correctedVersions} from './catalog-version-review.mjs'
const keyOf = row => row.provider+'/'+row.id
export const retiredKeys = new Set([...batch.remove.map(keyOf), ...november24.remove.map(keyOf)])
export function verifiedRetirement(key, source, stopDate) {
  const notice = [...batch.upcoming, ...november24.upcoming].find(row => keyOf(row) === key)
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
    const deadline = stopDate.replace('T',' ').replace(':00+08:00',' (UTC+8)')
    return [channel+'/'+apiModelId, {stopDate,scope:'full',replacement,sourceUrl,displayName,replacementDisplayName,
      state:'scheduled',label:'将下线',blocked:false,message:'将于'+deadline+'下线'+(replacement ? '；可改选 '+replacementDisplayName : '')}]
  }))
  for (const name of ['core','web','mini','miniNormalizedStatic','miniNormalizedLive']) {
    for (const [provider, entry] of Object.entries(fixture[name])) {
      if (provider === 'tokenhub' && entry.defaults) entry.defaults.image = ''
      entry.models = entry.models.filter(model => !retiredKeys.has(provider+'/'+model.id))
      for (const model of entry.models) {
        if (provider === 'ark' && model.id === 'doubao-seed-2-0-pro-260215') Object.assign(model, {
          expirationDate: '2027-01-22', expirationAt: '2027-01-22T14:00:00+08:00',
          availabilityNotes: '方舟公告：服务截止 2027-01-22 14:00（UTC+8）。',
        })
        const version = correctedVersions.get(provider+'/'+model.id)
        if (version) model.version = version
        const notice = notices.get(provider+'/'+model.id)
        if (notice && Object.hasOwn(model,'auditLifecycle')) model.auditLifecycle = notice
      }
    }
  }
  for (const name of ['coreReferenceModes','normalizedCatalog','webStaticDecisions','webLiveDecisions','miniInputPolicy','miniStaticDecisions','miniLiveDecisions'])
    for (const key of retiredKeys) delete fixture[name][key]
  for (const [name, rows] of Object.entries(additions)) {
    if (Array.isArray(rows)) {
      for (const {provider,index,model} of rows) fixture[name][provider].models.splice(index,0,structuredClone(model))
    } else Object.assign(fixture[name], structuredClone(rows))
  }
  fixture.counts.coreModels = modelRows(fixture.core).length
  fixture.counts.staticModels = modelRows(fixture.web).length
  return fixture
}
