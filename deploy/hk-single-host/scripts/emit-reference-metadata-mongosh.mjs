import {
  REFERENCE_METADATA_ZH_CN,
  REFERENCE_METADATA_ZH_CN_VERSION,
} from '../../../apps/web/src/data/reference-metadata.zh-CN.v1.js'

if (REFERENCE_METADATA_ZH_CN.length !== 295) {
  throw new Error(`Expected 295 localized references, received ${REFERENCE_METADATA_ZH_CN.length}`)
}

const metadata = REFERENCE_METADATA_ZH_CN.map(({ id, titleZh, introZh }) => ({ id, titleZh, introZh }))
const version = REFERENCE_METADATA_ZH_CN_VERSION

process.stdout.write(`
const target = db.getSiblingDB("paperbanana_business")
const references = target.getCollection("paperbanana_references")
const version = ${JSON.stringify(version)}
const metadata = ${JSON.stringify(metadata)}
if (metadata.length !== 295) throw new Error("reference localization payload must contain 295 records")
const ids = metadata.map((item) => item.id)
const existing = references.countDocuments({id: {$in: ids}})
if (existing !== 295) throw new Error("reference localization source mismatch: expected 295 existing records, found " + existing)
const result = references.bulkWrite(metadata.map((item) => ({
  updateOne: {
    filter: {
      id: item.id,
      $or: [
        {localizationVersion: {$ne: version}},
        {titleZh: {$ne: item.titleZh}},
        {introZh: {$ne: item.introZh}},
      ],
    },
    update: {$set: {
      titleZh: item.titleZh,
      introZh: item.introZh,
      localizationVersion: version,
      localizationUpdatedAt: new Date(),
    }},
    upsert: false,
  },
})), {ordered: false})
const localized = references.countDocuments({
  id: {$in: ids},
  localizationVersion: version,
  titleZh: {$type: "string", $ne: ""},
  introZh: {$type: "string", $ne: ""},
})
if (localized !== 295) throw new Error("reference localization postcondition failed: " + localized + "/295")
print(JSON.stringify({version, matched: result.matchedCount, modified: result.modifiedCount, localized}))
`)
