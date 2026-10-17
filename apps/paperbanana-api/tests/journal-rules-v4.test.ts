import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {defaultJournalSelection,journalSnapshot,activeJournalRules,journalPolicyIssues,journalPrompt,admitJournal} from '../../../packages/api/src/journal-rules.js';
import {inspectJournalFile} from '../src/journal-export.js';
const JOURNAL_VERSION='2026-10-13.v4';
const profile=(id='scientific-reports',extra:any={})=>journalSnapshot({...defaultJournalSelection(id),version:JOURNAL_VERSION,...extra})!;
test('v4 resolves the scoped interpretation without rewriting archived evidence or inventing revision dates',()=>{
 assert.equal(profile().version,'2026-10-13.v4');
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../../packages/api/src/journal-catalog-v3.js',import.meta.url))).digest('hex'),'3bb20c3005f91c1c817e285cf83802f78dd5a40e89f20d21cc1778714b2be4cf');
 const old=profile('scientific-reports',{version:'2026-10-13.v3'}),current=profile();
 assert.ok(journalPolicyIssues(old).filter(i=>i.operation).every(i=>i.policyStatus==='conflict'));
 assert.ok(old.inheritance.some(i=>i.status==='conflict'));
 for(const source of current.sources.filter(s=>['snVisualAi','snAiGuidance'].includes(s.id))){assert.equal(source.updatedOn,undefined);assert.match(source.note!,/未标页面修订日期/);}
 assert.equal(current.sources.find(s=>s.id==='snAiUpdate')!.publishedOn,'2026-09-10');
 assert.ok(current.inheritance.some(i=>/不是官方发布的取代声明/.test(i.scope)));
 for(const p of [old,current])for(const r of p.rules)for(const id of r.sourceIds)assert.ok(p.sources.some(s=>s.id===id),id);
 assert.ok(!current.rules.some(r=>r.value?.allowAI),'Conditional obligations do not certify this task');
});
test('Scientific Reports generation/refinement conditions are limited to verified purposes and preserve hard limits',()=>{
 for(const purpose of ['main','supplementary'])for(const contentType of ['schematic','data','illustration']){
  const p=profile('scientific-reports',{purpose,contentType});
  const ai=journalPolicyIssues(p).filter(i=>i.operation);
  assert.deepEqual(ai.map(i=>i.operation),['generate','generative-refine']);
  assert.ok(ai.every(i=>i.policyStatus==='conditional'&&i.kind==='manual'&&!i.blocking));
  assert.ok(ai.every(i=>i.sourceIds?.includes('snVisualAi')&&i.sourceIds.includes('snAiGuidance')));
  for(const outputFormat of ['png','svg'])assert.ok(admitJournal(p.selection,outputFormat));
  for(const body of [{journalProfile:p},{action:'refineImage',generationContext:{journalProfile:p}}]){
   const prompt=journalPrompt(body);assert.ok(prompt.rules.some((r:any)=>r.id==='srep-generate'&&/不能自动证明/.test(r.text)));
   assert.ok(prompt.rules.some((r:any)=>r.id==='srep-refine'&&/已有原图不等于来源已核验/.test(r.text)));
  }
 }
 for(const purpose of ['toc','cover']){
  const p=profile('scientific-reports',{purpose});
  assert.ok(!journalPolicyIssues(p).some(i=>i.policyStatus==='conditional'));
  assert.ok(journalPolicyIssues(p).some(i=>i.code==='purpose-unverified'&&!i.blocking));
 }
 for(const format of ['png','svg']){
  assert.throws(()=>admitJournal(profile('scientific-reports',{purpose:'graphical_abstract'}).selection,format),/不接受图形摘要/);
  assert.throws(()=>admitJournal(profile('scientific-reports',{contentType:'primary'}).selection,format),/原始科研图像/);
 }
});
test('Cell Reports historical GA evidence is dated and never becomes a present-day pass or main-figure threshold',async()=>{
 const p=profile('cell-reports',{purpose:'graphical_abstract',stage:'production'});
 const source=p.sources.find(s=>s.id==='cellGaGuide')!;
 assert.equal(source.publishedOn,'2018-04-04');assert.equal(source.updatedOn,'2018-09-10');assert.equal(source.verifiedOn,'2026-10-13');
 assert.equal(p.status,'pending');assert.ok(p.sources.some(s=>s.id==='cellPatterns'&&/不能推定/.test(s.note!)));
 for(const extra of [{purpose:'main',stage:'production'},{purpose:'supplementary',stage:'production'},{purpose:'graphical_abstract',stage:'initial'}])assert.ok(!activeJournalRules(profile('cell-reports',extra)).some(r=>r.id.startsWith('cell-ga-reference-')));
 const png=await sharp({create:{width:1200,height:1200,channels:3,background:'white'}}).withMetadata({density:300}).png().toBuffer();
 for(const options of [{},{format:'tiff',flattenWhite:true}]){
  const out=await inspectJournalFile(png,p,options);
  const reference=out.report.checks.filter(c=>c.id.startsWith('cell-ga-reference-'));
  assert.equal(reference.length,3);assert.ok(reference.every(c=>c.status==='pending'));
  assert.ok(out.report.policy.filter(i=>i.operation).every(i=>i.policyStatus==='unverified'&&!i.blocking));
  assert.equal(out.report.facts.width,1200);
 }
 assert.ok(activeJournalRules(profile('cell-reports',{contentType:'data'})).some(r=>r.id==='cell-image-integrity'&&r.requirement==='manual'));
});
test('actual PNG/SVG/TIFF reports keep conditional policy as uncheckable and retain both official sources',async()=>{
 const p=profile('scientific-reports',{stage:'production'});
 const png=await sharp({create:{width:600,height:300,channels:3,background:'white'}}).png().toBuffer();
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="white"/></svg>');
 for(const [bytes,options] of [[png,{}],[png,{format:'tiff',flattenWhite:true}],[svg,{}]] as const){
  const out=await inspectJournalFile(bytes,p,options);
  for(const id of ['srep-generate','srep-refine']){
   const check=out.report.checks.find(c=>c.id===id)!;
   assert.equal(check.status,'uncheckable');assert.equal(check.requirement,'manual');
   assert.deepEqual(check.sourceIds,['snVisualAi','snAiGuidance']);
  }
  assert.ok(out.report.policy.filter(i=>i.operation).every(i=>i.policyStatus==='conditional'));
  assert.equal(out.report.facts.width,600);assert.equal(out.report.ruleVersion,JOURNAL_VERSION);
 }
});
