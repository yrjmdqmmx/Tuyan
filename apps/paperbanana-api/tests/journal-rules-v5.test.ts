import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {JOURNALS,defaultJournalSelection,journalSnapshot,activeJournalRules,journalPolicyIssues,journalPrompt,admitJournal} from '../../../packages/api/src/journal-rules.js';
import {inspectJournalFile} from '../src/journal-export.js';
const JOURNAL_VERSION='2026-10-13.v5';
const profile=(id='shanxi-finance-economics',extra:any={})=>journalSnapshot({...defaultJournalSelection(id),version:JOURNAL_VERSION,...extra})!;
test('v5 adds the correctly identified Chinese journals, with scoped evidence and immutable v4 history',()=>{
 assert.equal(profile().version,'2026-10-13.v5');
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../../packages/api/src/journal-catalog-v4.js',import.meta.url))).digest('hex'),'b95df5469c148f7e367dadfe831085d74d69c00ef9d5ba69ab560bcee3bdf5c6');
 for(const id of ['jingjixuejia','caijing-luncong','shanxi-finance-economics','social-sciences-in-china']){
  const p=profile(id);assert.ok(p.subjects?.includes('人文社科'));assert.notEqual(p.status,'supported');
  for(const r of p.rules){assert.equal(r.version,JOURNAL_VERSION);for(const sid of r.sourceIds)assert.ok(p.sources.find(s=>s.id===sid),sid);}
  assert.throws(()=>profile(id,{version:'2026-10-13.v4'}),/规则版本不可用/);
 }
 assert.equal(profile('caijing-luncong').name,'财经论丛');assert.equal(profile('jingjixuejia').publisher,'经济学家杂志社');
 const old=profile('cell-reports',{version:'2026-10-13.v4'}),current=profile('cell-reports');
 assert.ok(!old.sources.some(s=>s.id==='cellSymposia'));assert.ok(current.sources.some(s=>s.id==='cellSymposia'));
 assert.equal(current.sources.find(s=>s.id==='elsevier')!.updatedOn,'2026-06');
 assert.equal(old.sources.find(s=>s.id==='elsevier')!.updatedOn,undefined);
 assert.ok(current.inheritance.some(i=>i.sourceId==='cellSymposia'&&i.status==='pending'));
 assert.ok(journalPolicyIssues(current).filter(i=>i.operation).every(i=>i.policyStatus==='unverified'&&!i.blocking));
 for(const j of JOURNALS)assert.ok(new Set(j.sourceIds).size===j.sourceIds.length,`Duplicate sources for ${j.id}`);
});
test('Chinese manuscript instructions are not image format gates, and disclosure never supplies AI permission',()=>{
 for(const id of ['jingjixuejia','caijing-luncong','shanxi-finance-economics','social-sciences-in-china']){
  const p=profile(id);assert.ok(!p.rules.some(r=>r.value?.allowAI));
  assert.ok(!p.rules.some(r=>r.field==='format'&&r.value?.some((v:string)=>['doc','docx','pdf'].includes(v))));
  for(const format of ['png','svg'])assert.ok(admitJournal(p.selection,format));
  const ai=journalPolicyIssues(p).filter(i=>i.operation);assert.equal(ai.length,2);assert.ok(ai.every(i=>i.policyStatus==='unspecified'&&!i.blocking));
  for(const purpose of ['supplementary','graphical_abstract','toc','cover']){
   assert.ok(!activeJournalRules(profile(id,{purpose})).some(r=>['color','font','labels'].includes(r.field)),'Main-figure rules must not leak to special purposes');
  }
 }
 const cj=profile('caijing-luncong');
 for(const body of [{journalProfile:cj},{action:'refineImage',generationContext:{journalProfile:cj}}])assert.ok(journalPrompt(body).rules.some((r:any)=>r.id==='cjlc-axis'&&r.requirement==='hard'));
 assert.ok(profile('social-sciences-in-china').rules.some(r=>r.id==='css-ai-boundary'&&r.requirement==='manual'));
 assert.ok(profile('social-sciences-in-china').inheritance.some(i=>i.status==='verified'&&i.sourceId==='cssAi'));
});
test('black-and-white checks use actual RGB pixels and never silently convert colour or alter dimensions',async()=>{
 const p=profile();
 for(const [background,status] of [['#888888','checked'],['#408080','unmet']] as const){
  const png=await sharp({create:{width:160,height:80,channels:3,background}}).png().toBuffer();
  for(const options of [{},{format:'tiff',flattenWhite:true}]){
   const out=await inspectJournalFile(png,p,options);
   assert.equal(out.report.checks.find(c=>c.id==='sxufe-color')!.status,status);
   assert.equal(out.report.facts.space,'srgb');assert.equal(out.report.facts.width,160);assert.equal(out.report.facts.height,80);
   if(!options.format)assert.deepEqual(out.bytes,png);
   const pixels=await sharp(out.bytes).toColourspace('srgb').raw().toBuffer();
   if(status==='unmet')assert.notEqual(pixels[0],pixels[1],'Do not remove colours to pass the requirement');
   assert.equal(out.report.checks.find(c=>c.id==='sxufe-labels')!.status,'uncheckable');
   assert.ok(out.report.checks.some(c=>c.id==='scope-dpi'&&c.status==='pending'));
  }
 }
 const equalHistograms=await sharp(Buffer.from([255,0,0,0,255,0,0,0,255]),{raw:{width:3,height:1,channels:3}}).png().toBuffer();
 assert.equal((await inspectJournalFile(equalHistograms,p)).report.checks.find(c=>c.id==='sxufe-color')!.status,'unmet','Equal channel histograms do not imply achromatic pixels');
});
test('transparency, grayscale, SVG and unverified formats do not create false colour or compliance claims',async()=>{
 const p=profile();
 const transparent=await sharp(Buffer.from([255,0,0,0,20,20,20,255]),{raw:{width:2,height:1,channels:4}}).png().toBuffer();
 assert.equal((await inspectJournalFile(transparent,p)).report.checks.find(c=>c.id==='sxufe-color')!.status,'checked');
 const gray=await sharp({create:{width:3,height:2,channels:3,background:'#777777'}}).toColourspace('b-w').png().toBuffer();
 assert.equal((await inspectJournalFile(gray,p)).report.checks.find(c=>c.id==='sxufe-color')!.status,'checked');
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20"><rect width="30" height="20" fill="red"/></svg>');
 assert.equal((await inspectJournalFile(svg,p)).report.checks.find(c=>c.id==='sxufe-color')!.status,'uncheckable');
 for(const id of ['jingjixuejia','caijing-luncong','social-sciences-in-china']){
  const report=(await inspectJournalFile(gray,profile(id),{format:'tiff',flattenWhite:true})).report;
  assert.equal(report.checks.find(c=>c.id==='scope-format')!.status,'pending');
  assert.ok(report.checks.filter(c=>c.field==='ai').every(c=>['pending','uncheckable'].includes(c.status)));
 }
 const ga=profile('cell-reports',{stage:'production',purpose:'graphical_abstract'});
 assert.ok(activeJournalRules(ga).filter(r=>r.id.startsWith('cell-ga-reference-')).every(r=>r.requirement==='pending'&&r.value===null));
});
