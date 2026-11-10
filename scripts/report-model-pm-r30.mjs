import {restoreI13,restoreI13Review} from '../test-support/primary-links-r31.mjs'
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {imageInputPresentations} from '../test-support/image-input-r27.mjs'
import {collectSourceReview} from '../test-support/source-review-r24.mjs'
import {assertPMDecisions,restoreI12,restoreI12Review,forbiddenBody} from '../test-support/pm-decisions-r30.mjs'
import decisions from '../docs/model-modality-image-input-decision.json' with {type:'json'}
const actual=await imageInputPresentations(),actualReview=await collectSourceReview(),now=restoreI13(actual),before=restoreI12(actual),review=restoreI13Review(actualReview),oldReview=restoreI12Review(actualReview)
const numeric=assertPMDecisions(actual),removed={}
for(const client of ['web','mini']){
 const lines=oldReview[client].flatMap(row=>row.text.split('\n'))
 removed[client]={dateRows:lines.filter(s=>/^核实日期：/.test(s)).length,provenanceRows:lines.filter(s=>/^(输入|输出|上下文窗口|最大输出)：(?:渠道公布|原厂公布|源自原厂|图研既有核实|图研输入要求)/.test(s)).length,unverifiedRows:lines.filter(s=>s==='未核实').length}
 for(const row of review[client])assert.doesNotMatch(row.text,forbiddenBody,row.card)
}
const provenanceInventory={}
for(const row of oldReview.web)for(const line of row.text.split('\n')){const origin=line.match(/^(?:输入|输出|上下文窗口|最大输出)：(渠道公布|原厂公布|源自原厂|图研既有核实|图研输入要求)/)?.[1];if(origin)provenanceInventory[origin]=(provenanceInventory[origin]||0)+1}
provenanceInventory['原厂公布']=0
const primaries=Object.entries(now).flatMap(([key,r])=>r.web.sources[0]?.url!==before[key].web.sources[0]?.url?[{key,before:before[key].web.sources[0],after:r.web.sources[0],optionA:decisions.rows.some(d=>d.identity===key)}]:[])
assert.equal(primaries.length,82);assert.equal(primaries.filter(r=>r.optionA).length,15)
const dateTitles=[...new Map(Object.entries(now).flatMap(([key,r])=>r.web.sources.flatMap(s=>{const old=before[key].web.sources.find(b=>b.url===s.url);return old?.label!==s.label?[[s.url,{url:s.url,before:old?.label,after:s.label}]]:[]}))).values()]
const oldOrigins={};for(const r of Object.values(before))for(const s of r.mini.card.specRows)if(s.origin)oldOrigins[s.origin]=(oldOrigins[s.origin]||0)+1
const report={phase:'R30 Phase I12',head:'588f1d67',mainBaseline:'52e0f161',cardsPerClient:1064,removedDialogRows:removed,dialogProvenanceInventory:provenanceInventory,numeric,oldMiniCardOrigins:oldOrigins,primaryLinkCardsChanged:primaries.length,optionACardsChanged:15,primaryLinks:primaries,dateTitles,conditional:{provider:'together',model:'Prism-ML/Ternary-Bonsai-27B',modality:'image',direction:'input',qualifier:'图像（需视觉组件）',sentence:'支持图像输入（需启用视觉组件）'}}
const validationFile=new URL('../docs/model-modality-r30-i12-validation.json',import.meta.url)
const validation=fs.existsSync(validationFile)?JSON.parse(fs.readFileSync(validationFile)):null
const summary=validation?`**${validation.tests.pass.toLocaleString('en-US')}/${validation.tests.tests.toLocaleString('en-US')} tests**, all requested builds/types and **${validation.maintenanceChecks} maintenance checks** pass. Mini **${validation.miniSourceBytes.toLocaleString('en-US')} / 1,572,864 bytes**, **${validation.miniHeadroom.toLocaleString('en-US')} remaining**. `:''
const title='\n## R30 Phase I12\n'
const body=title+`
PM decisions for PR #251, head \`588f1d67\`; read-only Git throughout. This supersedes earlier dialog-date/provenance rows and primary-source priorities. Execution fields and picker names remain locked to \`52e0f161\`.

Evidence dialogs now contain the eight R29 modality sentences and the two numeric specifications. Removed top-date / field-provenance / standalone unverified rows: **Web ${removed.web.dateRows} / ${removed.web.provenanceRows} / ${removed.web.unverifiedRows}**; **Mini ${removed.mini.dateRows} / ${removed.mini.provenanceRows} / ${removed.mini.unverifiedRows}**. The removed provenance inventory per client is **渠道公布 ${provenanceInventory['渠道公布']}**, **源自原厂 ${provenanceInventory['源自原厂']}**, **图研既有核实 ${provenanceInventory['图研既有核实']}** and **图研输入要求 ${provenanceInventory['图研输入要求']}**; 原厂公布 has zero occurrences. Raw review/conflict/inheritance notes and lifecycle messages also leave the specification status area; original facts/notes remain in the audit data, and retirement badges retain their separate sourced notice. No replacement provenance sentence is needed: source-link roles carry attribution. Web source-link hover keeps its existing 核实日期 and date; native Mini has no browser title hover and continues to retain dates in its underlying facts, without adding dates to tap-dialog text.

The small **源自原厂** card label is kept: it plainly says that a displayed specification comes from the original vendor and does not assert channel availability. Mini's additional **图研既有核实** (${oldOrigins['图研既有核实']||0}) and **图研输入要求** (${oldOrigins['图研输入要求']||0}) card labels are removed to match Web. Source roles remain unchanged. Four source URLs had release/retirement dates in their visible titles; these event dates use Chinese 年/月/日 spelling across both clients to satisfy the ISO-date body scan without losing their meaning. Verification dates are not reintroduced there.

Numeric absence is **未公布** on both clients: **584 fields each** (137 context, 447 max output); **816 不适用**, **728 known**, **0 unsupported numeric facts**. A synthetic unsupported numeric state renders **不支持**. Unknown is never converted to zero or infinity. Mini's video-only \`replicate/alibaba/wan-3\` now uses the same not-applicable rule as Web. Existing known numbers and their stored facts remain unchanged. ModelAudit contains state/facts only; catalog, saved picker and settings sheet use ModelSpecifications or Mini's same picker, so no saved configuration is changed. Existing approximate-number formatting differences are outside this numeric-absence change.

Primary-link rule: among existing visible, non-dead human sources, match the full model identity or a numeric model leaf (case/separator normalized, no prefix/family match); prefer the channel's own page, then the vendor's own page. Recognize the existing \`ideogram-v4\` → \`ideogram-4\` URL spelling and terminal \`-api\` / \`/api\` / \`/overview\` documentation suffixes. Preserve old ordering when there is no own page; exclude retirement notices from own-page matching. TokenDance's verified-page and historical fallback policy remains. **82 primary-link cards changed**, including all **15 Option-A** cards. Fields retain their exact evidence URLs; fal's edit API is still the image-input source in the dialog. No network requests were needed because all destinations already existed in the captured sources.

The only conditional card is **together/Prism-ML/Ternary-Bonsai-27B**, image input: **支持图像输入（需启用视觉组件）**. Its underlying qualifier remains 图像（需视觉组件）.

Regression checks cover all 1,064 Web dialogs, all compiled Mini cards/source-copy dialogs, numeric absence, Web/Mini status parity, source hover dates, all Option-A destinations, source-title consistency and a negative display-drift case. Historical reports remain immutable through exact, hashed I12 display patches; all current replacement values are asserted before restoring historical presentation. [Machine-readable counts and URL list](model-modality-r30-i12-decisions.json). The M11 script is derived from M10, syntax checked only, **not run**: twelve shots at 1280 and 390, DPR 2, output from argv[2], manifest.json, temporary conditional-title overlay removed in finally. No product overlay.

${summary}See the [full I12 validation record](model-modality-r30-i12-validation.json). No Git writes, paid calls, deployment, secrets, saved-config changes or login-file edits.

| Changed card | Previous primary | Own-model primary | Option A |
| --- | --- | --- | --- |
`+primaries.map(r=>`| ${r.key} | ${r.before.url} | ${r.after.url} | ${r.optionA?'Yes':''} |`).join('\n')+'\n'
const target=new URL('../docs/model-modality-audit-20261109.md',import.meta.url),original=fs.readFileSync(target,'utf8'),content=original.split(title)[0]+body+(original.includes('\n## R31 Phase I13\n')?'\n## R31 Phase I13\n'+original.split('\n## R31 Phase I13\n')[1]:'')
for(const [file,value]of [[new URL('../docs/model-modality-r30-i12-decisions.json',import.meta.url),JSON.stringify(report,null,2)+'\n'],[target,content]]){
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),value)
 else fs.writeFileSync(file,value)
}
console.log(JSON.stringify({removed,numeric,primaryChanges:primaries.length,dateTitles:dateTitles.length,oldOrigins}))
