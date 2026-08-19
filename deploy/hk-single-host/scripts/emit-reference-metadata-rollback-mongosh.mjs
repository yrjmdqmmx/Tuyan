import {
  REFERENCE_METADATA_ZH_CN,
  REFERENCE_METADATA_ZH_CN_VERSION,
} from '../../../apps/web/src/data/reference-metadata.zh-CN.v1.js'
import {
  REFERENCE_METADATA_ZH_CN_V2,
  REFERENCE_METADATA_ZH_CN_V2_VERSION,
} from '../../../apps/web/src/data/reference-metadata.zh-CN.v2.js'

const previousById = new Map(REFERENCE_METADATA_ZH_CN.map((item) => [item.id, item]))
const metadata = REFERENCE_METADATA_ZH_CN_V2.map(({ id }) => ({
  id,
  previous: previousById.get(id) || null,
}))

process.stdout.write(`
const target = db.getSiblingDB("paperbanana_business")
const references = target.getCollection("paperbanana_references")
const version = ${JSON.stringify(REFERENCE_METADATA_ZH_CN_V2_VERSION)}
const previousVersion = ${JSON.stringify(REFERENCE_METADATA_ZH_CN_VERSION)}
const metadata = ${JSON.stringify(metadata)}
if (metadata.length !== 306) throw new Error("reference v2 rollback payload must contain 306 records")
const result = references.bulkWrite(metadata.map((item) => ({
  updateOne: item.previous ? {
    filter: {id: item.id, source: "paperbanana-bench", corpusVersion: version},
    update: {
      $set: {
        titleZh: item.previous.titleZh,
        introZh: item.previous.introZh,
        localizationVersion: previousVersion,
        localizationUpdatedAt: new Date(),
      },
      $unset: {
        shortIntroZh: "",
        detailZh: "",
        visualCategory: "",
        researchDomain: "",
        keywords: "",
        corpusVersion: "",
      },
    },
    upsert: false,
  } : {
    filter: {id: item.id, source: "paperbanana-bench", corpusVersion: version},
    update: {$unset: {
      titleZh: "",
      introZh: "",
      shortIntroZh: "",
      detailZh: "",
      visualCategory: "",
      researchDomain: "",
      keywords: "",
      corpusVersion: "",
      localizationVersion: "",
      localizationUpdatedAt: "",
    }},
    upsert: false,
  },
})), {ordered: false})
const remaining = references.countDocuments({
  id: {$in: metadata.map((item) => item.id)},
  source: "paperbanana-bench",
  corpusVersion: version,
})
if (remaining !== 0) throw new Error("reference v2 rollback postcondition failed: " + remaining + " records remain")
print(JSON.stringify({version, previousVersion, matched: result.matchedCount, modified: result.modifiedCount, remaining}))
`)
