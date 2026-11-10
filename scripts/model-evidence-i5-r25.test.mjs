import test from'node:test'
import assert from'node:assert/strict'
import review from'../config/channel-audit/review-r25-20261110.json'with{type:'json'}
import titles from'../config/channel-audit/source-titles-r25-i5.json'with{type:'json'}
import data from'../config/model-audit.generated.json'with{type:'json'}
import{applyEvidenceR25}from'./lib/model-evidence-r25.mjs'
import{titleIssues,dialogIssues}from'../test-support/source-titles-r24.mjs'
import{sourceTitle,cardLifecycle}from'../packages/api/src/card-presentation.mjs'
test('R25 I5 each exact Bailian identity has a captured notice and literal date; execution notices are unchanged',()=>{
 const result=applyEvidenceR25(structuredClone(data));assert.deepEqual(result.notices,data.notices)
 assert.equal(Object.keys(review.models).length,3)
 for(const[key,fact]of Object.entries(review.models)){
  assert.equal(result.details[key].lifecycleSourceUrl,'https://www.aliyun.com/notice/118728')
  for(const mutation of [r=>r.models[key].identityQuote='qwen3.5-unlisted',r=>r.models[key].stopDate='2027-01-20',r=>r.captures.find(c=>c.url===fact.captureUrl).excerpts=[],r=>r.captures.find(c=>c.url===fact.sourceUrl).httpStatus=404]){
   const broken=structuredClone(review);mutation(broken);assert.throws(()=>applyEvidenceR25(structuredClone(data),broken),/Invalid retirement evidence/)
  }
 }
 assert.equal(cardLifecycle({sourceUrl:null}),null)
 assert.equal(cardLifecycle({sourceUrl:'https://example.test/notice'},{excludedSources:['https://example.test/notice']}),null)
})
test('R25 I5 captured readable titles and the exact unfetchable allow-list are auditable',()=>{
 assert.equal(titles.captures.length,7);assert.equal(titles.unfetchable.length,14)
 for(const r of [...titles.captures,...titles.unfetchable]){assert.equal(r.checkedAt,'2026-11-10');assert.equal(r.httpStatus,200);assert.match(r.sha256,/^[a-f0-9]{64}$/);assert.match(r.fetchStartUTC,/\+00:00$/);assert.match(r.fetchTimeAsiaShanghai,/\+08:00$/)}
 for(const r of titles.captures)assert.ok(!/ · 文档 \d+$/.test(sourceTitle(r.url)),r.url)
 for(const r of titles.unfetchable){assert.ok(r.reason);assert.deepEqual(titleIssues({url:r.url,label:'官方文档 · 站点 · 文档 123456'}),[])}
 for(const label of ['官方文档 · 腾讯云 · 文档 130051','官方文档 · 腾讯云 · 模型文档 130051','官方文档 · Example · 123456','官方文档 · Example · A1b2c3d4','官方文档 · 百炼 · Kimi K3 (Bailian hosted)','官方文档 · Example · Page（overview）'])assert.ok(titleIssues({url:'https://example.test/unlisted',label}).length,label)
 for(const label of ['核实日期','上下文窗口核实日期','最大输出核实日期']){assert.ok(dialogIssues(label+' 2026-11-10').includes('date label missing colon'));assert.deepEqual(dialogIssues(label+'：2026-11-10'),label==='核实日期'?[]:['separate or repeated verification date'])}
 assert.equal(sourceTitle('https://help.aliyun.com/zh/model-studio/kimi-k3',{id:'kimi-k3',label:'Kimi K3 (Bailian hosted)'}),'百炼 · Kimi K3（百炼托管）')
})
