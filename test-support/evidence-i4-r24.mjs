import assert from 'node:assert/strict'
import review from '../config/channel-audit/review-r24-20261110.json' with {type:'json'}
export const specUrl='https://help.aliyun.com/zh/model-studio/qwen3-5-plus'
export const retirementUrl='https://tokendance.space/llms-full.txt'
export const rejectedUrl='https://help.aliyun.com/zh/model-studio/model-depreciation'
export const inheritanceNote='沿用百炼同一 API ID 的原厂记录；TokenDance 模型页未标注最大输出'
export const specLabel='原厂规格 · 百炼 · Qwen3.5 Plus'
export const retirementLabel='下线公告 · TokenDance · Qwen3.5 Plus 下线（2027-01-19）'
export function assertQwenEvidence(card) {
 const f=card.fields.maxOutputTokens
 assert.equal(f.value,65536);assert.equal(f.state,'known');assert.equal(f.provenance,'vendor')
 assert.equal(f.sourceUrl,specUrl);assert.equal(f.verifiedAt,'2026-11-10');assert.ok(card.note.includes(inheritanceNote))
}
export function assertRetirementSpecEvidence(key,field,fact,url,evidence=review.retirementSpecEvidence) {
 const recorded=evidence.find(e=>e.key===key&&e.field===field&&e.sourceUrl===url)
 assert.ok(recorded,key+'/'+field+': retirement source lacks recorded specification evidence')
 assert.deepEqual(fact.value,recorded.value)
 const page=review.captures.find(c=>c.url===url)
 assert.equal(page.httpStatus,200);assert.match(page.sha256,/^[a-f0-9]{64}$/)
 assert.ok(page.excerpts.includes(recorded.quote));assert.ok(recorded.quote.includes(recorded.identityQuote));assert.ok(recorded.quote.includes(recorded.valueQuote))
 const words={text:'文本',image:'图像',video:'视频',audio:'音频'}
 for(const value of Array.isArray(fact.value)?fact.value:[fact.value]) assert.ok(recorded.quote.includes(words[value]||String(value)),key+'/'+field+' missing value')
}
export function scanRetirementSpecs(cards) {
 const urls=new Set([retirementUrl,...cards.flatMap(c=>c.rows.filter(r=>r.label.startsWith('下线公告')).map(r=>r.url))])
 let exceptions=0
 for(const c of cards)for(const [field,fact]of Object.entries(c.fields))for(const url of fact.sourceUrls||[fact.sourceUrl]) {
  if(!url||!urls.has(url)&&!/deprecat|depreciat|retire|sunset|\/notice\//i.test(url))continue
  assertRetirementSpecEvidence(c.key,field,fact,url);exceptions++
 }
 assert.equal(cards.length,1064);assert.equal(exceptions,2)
 return {cards:cards.length,supportedRetirementSpecFields:exceptions,unsupported:0}
}
