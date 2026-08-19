import {
  REFERENCE_METADATA_ZH_CN_V2,
  REFERENCE_METADATA_ZH_CN_V2_VERSION,
} from '../../../apps/web/src/data/reference-metadata.zh-CN.v2.js'

if (REFERENCE_METADATA_ZH_CN_V2.length !== 306) {
  throw new Error(`Expected 306 localized references, received ${REFERENCE_METADATA_ZH_CN_V2.length}`)
}

const requiredFields = [
  'id', 'taskName', 'titleZh', 'shortIntroZh', 'detailZh',
  'visualCategory', 'researchDomain', 'keywords',
]
for (const item of REFERENCE_METADATA_ZH_CN_V2) {
  for (const field of requiredFields) {
    if (field === 'keywords' ? !Array.isArray(item[field]) || !item[field].length : !String(item[field] || '').trim()) {
      throw new Error(`${item.id || 'unknown'} is missing required v2 field ${field}`)
    }
  }
}

const metadata = REFERENCE_METADATA_ZH_CN_V2.map(({
  id,
  taskName,
  titleZh,
  shortIntroZh,
  detailZh,
  visualCategory,
  researchDomain,
  keywords,
}) => ({
  id,
  taskName,
  titleZh,
  shortIntroZh,
  detailZh,
  visualCategory,
  researchDomain,
  keywords,
}))
const version = REFERENCE_METADATA_ZH_CN_V2_VERSION

process.stdout.write(`
const target = db.getSiblingDB("paperbanana_business")
const references = target.getCollection("paperbanana_references")
const version = ${JSON.stringify(version)}
const metadata = ${JSON.stringify(metadata)}
if (metadata.length !== 306) throw new Error("reference v2 payload must contain 306 records")
const ids = metadata.map((item) => item.id)
if (new Set(ids).size !== 306) throw new Error("reference v2 payload contains duplicate business ids")
const imageFilter = {$or: [
  {imageObjectKey: {$type: "string", $regex: /\\S/}},
  {imageUrl: {$type: "string", $regex: /\\S/}},
]}
const sourceFilter = {
  id: {$in: ids},
  source: "paperbanana-bench",
  title: {$type: "string", $regex: /\\S/},
  summary: {$type: "string", $regex: /\\S/},
  ...imageFilter,
}
const existing = references.countDocuments(sourceFilter)
if (existing !== 306) throw new Error("reference v2 source mismatch: expected 306 image-backed records with complete English title/summary, found " + existing)
const existingIds = references.distinct("id", sourceFilter)
if (existingIds.length !== 306) throw new Error("reference v2 source mismatch: expected 306 distinct business ids, found " + existingIds.length)
const result = references.bulkWrite(metadata.map((item) => ({
  updateOne: {
    filter: {
      id: item.id,
      source: "paperbanana-bench",
      $or: [
        {corpusVersion: {$ne: version}},
        {taskName: {$ne: item.taskName}},
        {titleZh: {$ne: item.titleZh}},
        {introZh: {$ne: item.shortIntroZh}},
        {shortIntroZh: {$ne: item.shortIntroZh}},
        {detailZh: {$ne: item.detailZh}},
        {visualCategory: {$ne: item.visualCategory}},
        {researchDomain: {$ne: item.researchDomain}},
        {keywords: {$ne: item.keywords}},
      ],
    },
    update: {$set: {
      taskName: item.taskName,
      titleZh: item.titleZh,
      introZh: item.shortIntroZh,
      shortIntroZh: item.shortIntroZh,
      detailZh: item.detailZh,
      visualCategory: item.visualCategory,
      researchDomain: item.researchDomain,
      keywords: item.keywords,
      corpusVersion: version,
      localizationVersion: version,
      localizationUpdatedAt: new Date(),
    }},
    upsert: false,
  },
})), {ordered: false})
const localizedFilter = {
  id: {$in: ids},
  source: "paperbanana-bench",
  corpusVersion: version,
  taskName: {$in: ["diagram", "plot"]},
  titleZh: {$type: "string", $ne: ""},
  shortIntroZh: {$type: "string", $ne: ""},
  detailZh: {$type: "string", $ne: ""},
  visualCategory: {$type: "string", $ne: ""},
  researchDomain: {$type: "string", $ne: ""},
  keywords: {$type: "array", $ne: []},
  title: {$type: "string", $regex: /\\S/},
  summary: {$type: "string", $regex: /\\S/},
  ...imageFilter,
}
const localizedDocuments = references.countDocuments(localizedFilter)
const localizedIds = references.distinct("id", localizedFilter)
const localized = localizedIds.length
if (localizedDocuments !== 306 || localized !== 306) throw new Error("reference v2 postcondition failed: " + localizedDocuments + " documents / " + localized + " distinct ids")
const versionedDocuments = references.countDocuments({source: "paperbanana-bench", corpusVersion: version})
const versionedIds = references.distinct("id", {source: "paperbanana-bench", corpusVersion: version})
if (versionedDocuments !== 306) throw new Error("current corpus version contains " + versionedDocuments + " documents instead of 306")
if (versionedIds.length !== 306) throw new Error("current corpus version contains " + versionedIds.length + " distinct business ids instead of 306")
print(JSON.stringify({version, matched: result.matchedCount, modified: result.modifiedCount, localized}))
`)
