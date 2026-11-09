import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {defaultJournalSelection,journalSnapshot,journalPolicyIssues,journalPreflight,journalPrompt,admitJournal,activeJournalRules} from '../../../packages/api/src/journal-rules.js';
import {inspectJournalFile} from '../src/journal-export.js';
const JOURNAL_VERSION='2026-10-14.v9';
const V9_IDS=['plos-one','frontiers-ai','advanced-materials-interfaces','acs-omega','ieee-access','cell-reports','scientific-reports','jingjixuejia','caijing-luncong','shanxi-finance-economics','social-sciences-in-china','sage-open','hssc','population-research','acta-psychologica-sinica','advances-psychological-science','library-information-service'];
const profile=(id:string,extra:any={})=>journalSnapshot({...defaultJournalSelection(id),version:JOURNAL_VERSION,...extra})!;
const domestic=['population-research','acta-psychologica-sinica','advances-psychological-science','library-information-service'];

test('v9 sources preserve dates, authority, and per-journal requirements without invented thresholds',()=>{
 assert.equal(JOURNAL_VERSION,'2026-10-14.v9');assert.equal(V9_IDS.length,17);
 for(const id of V9_IDS){const p=profile(id);assert.equal(new Set(p.sourceIds).size,p.sourceIds.length);assert.ok(p.sources.every(Boolean));for(const rule of p.rules){assert.equal(rule.version,JOURNAL_VERSION);assert.ok(rule.sourceIds.every(id=>p.sourceIds.includes(id)));}}
 for(const id of domestic){
  const p=profile(id);assert.equal(p.status,'partial');assert.ok(p.subjects!.includes('人文社科'));
  assert.equal(p.defaults.widthMm,85);
  assert.ok(!p.rules.some(r=>r.field==='format'&&Array.isArray(r.value)),'A Word manuscript is not a figure format list');
  assert.ok(!p.rules.some(r=>r.field==='dpi'&&r.value),'No inferred 300 dpi from a missing/ambiguous unit');
  assert.ok(!p.rules.some(r=>r.field==='width'&&r.value),'Default placement is not an official column width');
  assert.ok(p.sources.every(s=>s.updatedOn===undefined),'Publication date is not an unobserved policy update date');
 }
 assert.equal(profile(domestic[0]).sources[0].publishedOn,'2025-12-24');
 const acta=profile(domestic[1]),advances=profile(domestic[2]);
 assert.match(acta.rules.find(r=>r.id==='acta-figure-font')!.text,/六号宋体/);
 assert.match(advances.rules.find(r=>r.id==='advances-figure-font')!.text,/没有规定宋体/);
 for(const id of domestic.slice(1,3)){
  assert.ok(!activeJournalRules(profile(id)).some(r=>r.id.endsWith('-final-font')));
  assert.ok(activeJournalRules(profile(id,{stage:'production'})).some(r=>r.id.endsWith('-final-font')));
  assert.ok(!activeJournalRules(profile(id,{stage:'production',purpose:'graphical_abstract'})).some(r=>r.field==='font'));
 }
 assert.match(profile(domestic[0]).rules.find(r=>r.id==='population-labels')!.text,/均置于上方/);
 assert.match(profile(domestic[3]).rules.find(r=>r.id==='lis-dpi')!.text,/不能自行补成 300 dpi/);
});

test('new domestic rules enter generation and refine context, without promoting disclosure or silence to permission',()=>{
 for(const id of domestic)for(const operation of ['generate','generative-refine'] as const){
  const p=profile(id,{stage:'production'}),issues=journalPolicyIssues(p,operation);
  assert.ok(issues.every(i=>!i.blocking));
  assert.equal(issues.find(i=>i.code===`policy-${id}-${operation}`)!.policyStatus,'unspecified');
  assert.ok(admitJournal(p.selection,'svg','model-v1','workflow',operation));
  const context=journalPrompt(operation==='generate'?{journalProfile:p,outputFormat:'svg'}:{action:'refineImage',generationContext:{journalProfile:p},outputFormat:'svg'});
  assert.equal(context.version,JOURNAL_VERSION);assert.ok(context.rules.some((r:any)=>r.id===`${id}-${operation}`));
 }
 const p=profile('library-information-service');
 assert.match(p.rules.find(r=>r.id==='lis-ai-disclosure')!.text,/主要内容由 AI 生成/);
 assert.match(p.rules.find(r=>r.id==='lis-ai-disclosure')!.text,/不是所有生成或精修的许可/);
});

test('HSSC preflight cannot identify actual vector content from an extension; old v8 retains its meaning',async()=>{
 const vector=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="white"/><text x="10" y="40">Diagram</text></svg>');
 const p=profile('hssc',{stage:'production',widthMm:87});
 for(const format of ['png','svg'])assert.ok(journalPreflight(p,format).some(i=>i.code==='width-unconfirmed'));
 const inspect=async(widthMm:number,body:Buffer,extra:any={})=>(await inspectJournalFile(body,profile('hssc',{stage:'production',widthMm,...extra}))).report;
 for(const [w,status] of [[87,'checked'],[88,'unmet'],[180,'checked'],[120,'unmet']] as const){
  const report=await inspect(w,vector);assert.equal(report.checks.find(c=>c.id==='hssc-width')!.status,status);
  assert.equal(report.facts.simpleVector,true);assert.equal(report.checks.find(c=>c.id==='svg-editability')!.status,'uncheckable');
 }
 assert.equal((await inspect(87,vector,{version:'2026-10-14.v8'})).checks.find(c=>c.id==='hssc-width')!.status,'pending');
 const png=await sharp({create:{width:1100,height:500,channels:3,background:'white'}}).png().toBuffer();
 for(const widthMm of [87,88,180])for(const options of [{},{format:'tiff',flattenWhite:true}]){
  const report=(await inspectJournalFile(png,profile('hssc',{stage:'production',widthMm}),options)).report;
  assert.equal(report.checks.find(c=>c.id==='hssc-width')!.status,widthMm===180?'checked':'pending');
  assert.equal(report.facts.width,1100);assert.equal(report.facts.height,500);
 }
});

test('embedded, linked, styled or otherwise unclassified SVGs retain the HSSC bitmap overlap',async()=>{
 const cases=[
  '<image href="data:image/png;base64,AA=="/>','<svg:image xmlns:svg="http://www.w3.org/2000/svg" href="data:image/png;base64,AA=="/>',
  '<use href="https://example.invalid/art.svg#shape"/>','<use href="data:image/svg+xml;base64,AA=="/>',
  '<foreignObject><img src="image.png"/></foreignObject>','<filter><feImage href="image.png"/></filter>',
  '<style>@import url(https://example.invalid/style.css);</style>','<rect style="fill:url(image.png)"/>',
  '<rect fill="url(https://example.invalid/image.png)"/>','<g onload="changeImage()"/>','<g xml:base="https://example.invalid/"><use href="#shape"/></g>',
 ];
 for(const body of cases){
  const file=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">${body}</svg>`);
  const report=(await inspectJournalFile(file,profile('hssc',{stage:'production',widthMm:87}))).report;
  assert.equal(report.facts.simpleVector,false,body);assert.equal(report.checks.find(c=>c.id==='hssc-width')!.status,'pending',body);
 }
});

test('actual domestic files show unsupported measurements and human typography review instead of fake compliance',async()=>{
 const png=await sharp({create:{width:800,height:400,channels:3,background:'white'}}).withMetadata({density:1200}).png().toBuffer();
 for(const id of domestic)for(const options of [{},{format:'tiff',flattenWhite:true}]){
  const report=(await inspectJournalFile(png,profile(id,{stage:'production'}),options)).report;
  assert.equal(report.ruleVersion,JOURNAL_VERSION);assert.equal(report.facts.width,800);
  for(const field of ['format','dpi'])assert.ok(report.checks.some(c=>c.field===field&&c.status==='pending'));
  assert.ok(report.checks.filter(c=>c.field==='font').every(c=>['pending','uncheckable'].includes(c.status)));
  assert.ok(report.policy.every(i=>!i.blocking));
 }
});

test('new alternate official evidence does not fabricate Cell refinement permission or HSSC supersession',()=>{
 const cell=profile('cell-reports'),hssc=profile('hssc');
 assert.ok(cell.sources.some(s=>s.id==='elsevierAiFactsheet'&&s.verification==='official-pdf'));
 assert.equal(cell.sources.find(s=>s.id==='elsevierAiExplainer')!.publishedOn,'2026-08-18');
 assert.equal(cell.sources.find(s=>s.id==='elsevierAiFactsheet')!.updatedOn,undefined);
 const refine=journalPolicyIssues(cell,'generative-refine').find(i=>i.code==='policy-cell-refine')!;
 assert.equal(refine.policyStatus,'unspecified');assert.equal(refine.blocking,false);
 assert.ok(refine.sourceIds!.includes('elsevierAiFactsheet'));
 assert.match(hssc.rules.find(r=>r.id==='hssc-ai-author-guide')!.text,/本刊现行投稿指南/);
 assert.ok(hssc.inheritance.some(i=>i.sourceId==='snVisualAi'&&i.status==='conflict'));
 assert.ok(journalPolicyIssues(hssc).every(i=>!i.blocking));
});
