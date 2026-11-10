import test from 'node:test'
import assert from 'node:assert/strict'
import review from '../config/channel-audit/review-r26-20261110.json' with {type:'json'}
import data from '../config/model-audit.generated.json' with {type:'json'}
import {applyEvidenceR26,verifiedRetirement} from './lib/model-evidence-r26.mjs'
import {titleIssues,dialogIssues} from '../test-support/source-titles-r24.mjs'
import {fieldSourceLines,sourceTitle} from '../packages/api/src/card-presentation.mjs'

test('R26 I6 all seven retirement decisions require exact identity, date, page and capture evidence offline',()=>{
 assert.equal(Object.keys(review.models).length,7);assert.deepEqual(review.allowList,[])
 const updated=applyEvidenceR26(structuredClone(data));assert.deepEqual(updated.notices,data.notices);assert.deepEqual(updated.facts,data.facts);assert.deepEqual(updated.rows,data.rows)
 for(const [key,fact] of Object.entries(review.models)) {
  assert.equal(verifiedRetirement(key,fact.sourceUrl,fact.stopDate).identity,key.split('/').slice(1).join('/'))
  for(const mutate of [r=>delete r.models[key],r=>r.models[key].quote=r.models[key].identity+'-different-snapshot',r=>r.models[key].sourceUrl='https://example.test',r=>r.models[key].dateQuote='2027年01月20日（正式下线）',r=>r.captures.find(c=>c.url===fact.captureUrl).content='',r=>r.captures.find(c=>c.url===fact.captureUrl).sha256='0'.repeat(64),r=>r.captures.find(c=>c.url===fact.sourceUrl).httpStatus=404]){
   const r=structuredClone(review);mutate(r);assert.throws(()=>verifiedRetirement(key,fact.sourceUrl,fact.stopDate,r),/Unverified retirement source/)
  }
 }
 assert.equal(updated.details['bailian/qwen3.5-397b-a17b'].lifecycleSourceUrl,'https://www.aliyun.com/notice/118728')
 assert.ok(!updated.details['qianfan/qwen3.5-397b-a17b']?.lifecycleSourceUrl)
})
test('R26 I6 date rule retains differing known-field provenance inline and never dates unknown fields',()=>{
 const field=(state,date,provenance='vendor')=>({state,verifiedAt:date,provenance})
 assert.deepEqual(fieldSourceLines({inputModalities:field('known','2026-11-09','channel'),outputModalities:field('known','2026-10-16','catalog'),totalContextTokens:field('unknown','2026-11-10'),maxOutputTokens:field('known','2026-11-10')},'2026-11-09'),['输入：渠道公布','输出：图研既有核实（核实日期：2026-10-16）','上下文窗口：源自原厂','最大输出：源自原厂（核实日期：2026-11-10）'])
 assert.deepEqual(fieldSourceLines({maxOutputTokens:field('known','2026-11-10')},'2026-11-09',s=>({'最大输出':'Max output','源自原厂':'Vendor','核实日期':'Verified on'}[s]||s)),['Max output：Vendor（Verified on：2026-11-10）'])
 assert.ok(dialogIssues('核实日期：2026-11-09\n输入核实日期：2026-11-09').length)
 assert.ok(dialogIssues('核实日期：2026-11-09\n核实日期：2026-11-10').length)
})
test('R26 I6 strict title scanner rejects each promotional token; captured override stays neutral',()=>{
 for(const word of ['大促','元到岗','限时','秒杀','优惠','爆款','免费领','抢','狂欢','折','！','!','🔥','🎉','🇨🇳','1️⃣','9.9元','¥9.9','￥99','$9.99'])assert.ok(titleIssues({url:'https://example.test/doc',label:'官方文档 · Example · 发布'+word}).includes('promotional title'),word)
 assert.equal(sourceTitle('https://developer.volcengine.com/articles/7577301460712030258'),'火山方舟 · 豆包编程模型发布公告')
})
