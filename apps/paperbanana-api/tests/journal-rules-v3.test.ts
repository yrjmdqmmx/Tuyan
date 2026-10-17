import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {defaultJournalSelection,journalSnapshot,journalPolicyIssues,journalPrompt,admitJournal} from '../../../packages/api/src/journal-rules.js';
import {inspectJournalFile} from '../src/journal-export.js';
const profile=(id:string,extra:any={})=>journalSnapshot({...defaultJournalSelection(id),version:'2026-10-13.v3',...extra})!;
test('v3 records operations independently while archived v2 bytes and admission meaning stay frozen',()=>{
 assert.equal(profile('scientific-reports').version,'2026-10-13.v3');
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../../packages/api/src/journal-catalog-v2.js',import.meta.url))).digest('hex'),'aed74a57de5bbf7f6cd85fbc300dc0bab3cf69b311d8967ae5b9e967194d515c');
 for(const id of ['ieee-access','scientific-reports','cell-reports']){
  const current=profile(id);assert.equal(current.rules.filter(r=>r.aiPolicy).length,3);
  assert.deepEqual(current.rules.filter(r=>r.aiPolicy).map(r=>r.aiPolicy!.operation),['generate','generative-refine','non-generative-edit']);
  assert.ok(journalPolicyIssues(profile(id,{version:'2026-10-13.v2'})).some(i=>i.blocking&&i.kind==='pending'));
  assert.ok(!journalPolicyIssues(current).some(i=>i.blocking));
  for(const format of ['png','svg'])assert.equal(admitJournal(current.selection,format)?.id,id);
 }
});
test('disclosure is not permission, unknown is not prohibition, and conflicts retain both official sources',()=>{
 const ieee=profile('ieee-access'),cell=profile('cell-reports'),sr=profile('scientific-reports');
 for(const p of [ieee,cell,sr])assert.ok(!p.rules.some(r=>r.field==='ai'&&r.value?.allowAI),'No invented permission flag');
 assert.ok(ieee.sources.some(s=>s.id==='ieeePspb'&&s.url.endsWith('opsmanual.pdf')));
 assert.ok(journalPolicyIssues(ieee).filter(i=>i.operation).every(i=>i.policyStatus==='unspecified'&&i.kind==='pending'));
 assert.ok(journalPolicyIssues(cell).filter(i=>i.operation).every(i=>i.policyStatus==='unverified'));
 assert.equal(cell.status,'pending');assert.equal(cell.inheritance[0].status,'pending');
 for(const issue of journalPolicyIssues(sr).filter(i=>i.operation)){
  assert.equal(issue.kind,'conflict');assert.equal(issue.blocking,false);
  assert.deepEqual(issue.sourceIds,['snVisualAi','snAiGuidance']);
 }
 assert.equal(sr.rules.find(r=>r.id==='srep-non-generative')!.aiPolicy!.status,'conditional');
 assert.ok(sr.inheritance.some(i=>i.status==='conflict'));
});
test('explicit bans and primary-image capability limits remain effective for generation and refinement',()=>{
 for(const format of ['png','svg']){
  for(const selection of [profile('acs-omega',{purpose:'toc'}).selection,profile('advanced-materials-interfaces',{purpose:'cover'}).selection,profile('scientific-reports',{purpose:'graphical_abstract'}).selection])assert.throws(()=>admitJournal(selection,format),/TOC|封面|图形摘要/);
  for(const id of ['ieee-access','scientific-reports','cell-reports'])assert.throws(()=>admitJournal(profile(id,{contentType:'primary'}).selection,format),/原始科研图像/);
 }
 assert.ok(journalPolicyIssues(profile('ieee-access',{purpose:'cover'})).every(i=>!i.blocking));
});
test('generation and refinement prompts and actual-file reports retain unresolved operation assessments',async()=>{
 const png=await sharp({create:{width:600,height:300,channels:3,background:'white'}}).png().toBuffer();
 for(const id of ['ieee-access','scientific-reports','cell-reports']){
  const p=profile(id,{stage:'production'});
  for(const body of [{journalProfile:p,outputFormat:'png'},{action:'refineImage',generationContext:{journalProfile:p},outputFormat:'png'}]){
   const context=journalPrompt(body);assert.equal(context.rules.filter((r:any)=>r.aiPolicy).length,3);
   assert.match(context.instruction,/Disclosure is an obligation, not authorization/);
  }
  for(const options of [{},{format:'tiff',flattenWhite:true}]){
   const out=await inspectJournalFile(png,p,options);
   assert.equal(out.report.facts.width,600);assert.equal(out.report.facts.height,300);
   assert.ok(out.report.policy.some(i=>i.operation==='generate'&&!i.blocking));
   assert.ok(out.report.policy.some(i=>i.operation==='generative-refine'&&!i.blocking));
   assert.ok(out.report.checks.filter(c=>c.id.endsWith('-generate')||c.id.endsWith('-refine')).every(c=>c.status==='pending'));
  }
 }
});
