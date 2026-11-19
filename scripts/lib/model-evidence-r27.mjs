import review from '../../config/channel-audit/review-r27-20261110.json' with {type:'json'}
import {applyPhase2} from './model-modality-phase2.mjs'
import {humanSourceUrl} from '../../packages/api/src/card-presentation.mjs'

// Dated display-only override. Decision notes and captures never enter client facts.
export function applyEvidenceR27(data, evidence = review) {
  for (const [key, fields] of Object.entries(evidence.reviews)) {
    const fact = fields.inputModalities
    const capture = evidence.captures.find(row => row.identity === key)
    if (Object.keys(fields).join() !== 'inputModalities' || !data.rows[key]
      || !capture?.verified || capture.httpStatus !== 200 || capture.curlExitCode !== 0
      || capture.method !== 'GET' || capture.authenticated !== false
      || !capture.quoteMatched || !capture.sourceFieldMatched || capture.url !== fact.sourceUrl
      || capture.quote !== fact.quote || capture.sha256 !== evidence.pages[fact.sourceUrl]?.sha256
      || capture.fetchedAtAsiaShanghai.slice(0, 10) !== fact.verifiedAt
      || fact.provenance !== 'channel' || fact.decisions.image !== 'supported') {
      throw Error('Invalid R27 image-input evidence: ' + key)
    }
  }
  applyPhase2(data, evidence)
  for (const [key, fields] of Object.entries(evidence.reviews)) {
    const url = fields.inputModalities.sourceUrl
    if (humanSourceUrl(url) !== url) (data.details[key].fieldSources ||= {}).inputModalities = url
  }
  // Mini normally retains only the primary field URL. Preserve unchanged output
  // citations when the new edit-interface source becomes the primary card link.
  for (const [key, fields] of Object.entries(evidence.preservedFieldSources)) {
    if (!evidence.reviews[key] || Object.keys(fields).join() !== 'outputModalities') throw Error('Invalid R27 preserved source: ' + key)
    Object.assign(data.details[key].fieldSources ||= {}, fields)
  }
  return data
}
