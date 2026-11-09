import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {collectSourceReview} from '../test-support/source-review-r24.mjs'
import {reviewBaseline,scanTitles,scanDialogs,titleRule} from '../test-support/source-titles-r24.mjs'
const current=await collectSourceReview(),counts={},changes=[],dialogChanges=[]
const summary=findings=>({findings:findings.length,affectedCards:new Set(findings.map(r=>r.card)).size,byRule:Object.fromEntries([...new Set(findings.map(r=>r.issue))].sort().map(issue=>[issue,findings.filter(r=>r.issue===issue).length]))})
for(const client of ['web','mini','notices']) {
  const before=reviewBaseline[client],after=current[client]
  assert.equal(after.length,client==='notices'?7:1064)
  const titlesBefore=scanTitles(before),titlesAfter=scanTitles(after)
  const dialogsBefore=client==='notices'?[]:scanDialogs(before),dialogsAfter=client==='notices'?[]:scanDialogs(after)
  assert.deepEqual(titlesAfter,[]);assert.deepEqual(dialogsAfter,[])
  for(const [i,card] of after.entries()) {
    const old=before[i];assert.equal(card.card,old.card);assert.equal(card.name,old.name)
    assert.deepEqual(card.rows.map(r=>r.url),old.rows.map(r=>r.url));assert.equal(new Set(card.rows.map(r=>r.label)).size,card.rows.length)
    for(const [j,row] of card.rows.entries()) {
      assert.equal(row.label.split(' · ')[0],old.rows[j].label.split(' · ')[0])
      if(row.label!==old.rows[j].label) changes.push({client,card:card.card,url:row.url,before:old.rows[j].label,after:row.label})
    }
    if(client!=='notices' && (card.text!==old.text || JSON.stringify(card.tooltips)!==JSON.stringify(old.tooltips))) dialogChanges.push({client,card:card.card,before:{text:old.text,tooltips:old.tooltips},after:{text:card.text,tooltips:card.tooltips}})
  }
  counts[client]={cards:after.length,sourceRows:after.reduce((n,c)=>n+c.rows.length,0),changedTitles:changes.filter(r=>r.client===client).length,titles:{before:summary(titlesBefore),after:summary(titlesAfter)},dialogs:{before:summary(dialogsBefore),after:summary(dialogsAfter)}}
}
const report={phase:'R24 Phase I2',baseline:reviewBaseline.head,baselineSha256:createHash('sha256').update(fs.readFileSync(new URL('../test-support/fixtures/source-review-cd72eace.json.gz',import.meta.url))).digest('hex'),rule:titleRule,counts,changes,dialogChanges}
const cell=s=>String(s).replaceAll('|','&#124;').replaceAll('\n','<br>')
const markdown=[
 '# R24 Phase I2 — complete source-title and dialog review','',
 `Baseline: **${report.baseline}**, the clean HEAD at the start of I2. The lossless gzip fixture freezes every name, ordered URL, title, dialog detail and modality tooltip. No historical reconstruction, network access or Git writes are needed to rerun this report.`, '',
 '## Strict acceptance rule','',titleRule,'',
 'The scanner checks all source rows used by card footers and evidence dialogs, every Mini copy dialog, every modality tooltip, and seven Web lifecycle notice dialogs. Web tests additionally open all 1,064 actual DOM dialogs and check their anchors; Mini tests invoke all compiled copy callbacks and icon dialogs. No URL, role, picker name or execution field changes.', '',
 '## Why the previous zero claim was wrong','',
 'R23 returned captured titles before applying a site/page format. Its heuristic did not require three segments, detect site suffixes, recognize News identifiers, or reject opaque mixed-letter/digit tokens. It explicitly listed opaque identifiers as acceptable retained spellings and exempted exact picker names even when those names were source slugs. Those exemptions hid the Qianfan IDs and raw captured titles. The previous “0 bad titles” claim is withdrawn; the corrected before counts below apply the same strict rule to the frozen I1 output.', '',
 '## Counts','',
 '| Client | Cards | Source rows | Changed titles | Title findings before → after | Dialog findings before → after |',
 '| --- | ---: | ---: | ---: | ---: | ---: |',
 ...Object.entries(counts).map(([client,c])=>`| ${client} | ${c.cards} | ${c.sourceRows} | ${c.changedTitles} | ${c.titles.before.findings} → ${c.titles.after.findings} | ${c.dialogs.before.findings} → ${c.dialogs.after.findings} |`),'',
 'Findings count rule violations, so one row may have more than one. JSON includes affected-card counts and per-rule totals. Dialog violations count each independently rendered tooltip/detail/copy dialog. Missing-source contradictions are checked within the same input/output field section, not across unrelated fields. Duplicate lines are exact nonempty trimmed lines. Internal-copy checks reject 审计, 回退, 未核实值 and provenance/field keys including catalog/channel/vendor.', '',
 '## Display choices','',
 'Captured page names are stripped of site tails at build time, with their original evidence retained. Qianfan opaque pages without a usable captured title use 模型列表. DeepSeek news IDs use 更新日志 YYYY-MM-DD unless a captured release title exists. Source-only slug cleanup preserves known version dots, genuine model/date hyphens and model names in the pickers. Human format/language qualifiers disambiguate label collisions without adding URL text.', '',
 'Known field sources remain visible for unknown modalities; this does not change the unknown state or claim that the source confirms that modality. Fields with no attribution continue to say 暂无官方资料. Identical dialog lines are emitted once, and dated catalog attribution replaces its undated duplicate. Conflict copy now says 渠道资料与此前记录不一致，已保留确认过的模态；未确认的项显示为未知。 Explicit channel exclusions use 渠道资料与此前记录不一致，以渠道明确说明的模态范围为准。', '',
 '## Every changed source title','',
 '| Client | Card | URL | Before | After |','| --- | --- | --- | --- | --- |',
 ...changes.map(r=>`| ${[r.client,r.card,r.url,r.before,r.after].map(cell).join(' | ')} |`),'',
 'The companion [JSON](model-card-source-titles-r24.json) also includes the complete changed dialog text/tooltip inventory. Reproduce with `node scripts/report-source-titles-r24.mjs --check`.',''
].join('\n')
for(const [name,body] of [['json',JSON.stringify(report,null,2)+'\n'],['md',markdown]]) {
 const file=new URL('../docs/model-card-source-titles-r24.'+name,import.meta.url)
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),body,'R24 source report drift')
 else fs.writeFileSync(file,body)
}
console.log(JSON.stringify(counts))
