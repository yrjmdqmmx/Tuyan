import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {defaultJournalSelection,journalSnapshot,activeJournalRules,journalPolicyIssues,journalPreflight,journalPrompt,admitJournal} from '../../../packages/api/src/journal-rules.js';
import {JOURNALS,JOURNAL_VERSION} from '../../../packages/api/src/journal-catalog-v10.js';
import {inspectJournalFile} from '../src/journal-export.js';
const profile=(id:string,extra:any={})=>journalSnapshot({...defaultJournalSelection(id),version:JOURNAL_VERSION,...extra})!;
const domestic=['population-research','acta-psychologica-sinica','advances-psychological-science','library-information-service'];

test('v10 sources and scopes are complete while versioned evidence retains its old meaning',()=>{
 assert.equal(JOURNAL_VERSION,'2026-10-14.v10');assert.equal(JOURNALS.length,17);
 for(const j of JOURNALS){const p=profile(j.id);assert.equal(new Set(p.sourceIds).size,p.sourceIds.length);assert.equal(new Set(p.rules.map(r=>r.id)).size,p.rules.length);assert.ok(p.sources.every(Boolean));for(const r of p.rules){assert.equal(r.version,JOURNAL_VERSION);assert.ok(r.sourceIds.every(id=>p.sourceIds.includes(id)));}}
 const now=profile('cell-reports'),old=profile('cell-reports',{version:'2026-10-14.v9'});
 assert.equal(now.rules.find(r=>r.id==='cell-refine')!.aiPolicy!.status,'conditional');
 assert.equal(old.rules.find(r=>r.id==='cell-refine')!.aiPolicy!.status,'unspecified');
 assert.ok(!old.sources.some(s=>s.id==='elsevierAiFaq'));
 assert.ok(!profile('hssc',{version:'2026-10-14.v9'}).rules.find(r=>r.id==='hssc-width')!.value.rasterOneOf);
 for(const id of domestic){const p=profile(id);assert.equal(p.status,'partial');assert.ok(!p.rules.some(r=>r.field==='format'&&Array.isArray(r.value)));assert.ok(!p.rules.some(r=>['dpi','width'].includes(r.field)&&r.value));}
});

test('HSSC actual raster scope resolves 88 mm without resizing or certifying image quality',async()=>{
 const png=await sharp({create:{width:1024,height:512,channels:3,background:'white'}}).withMetadata({density:1200}).png().toBuffer();
 for(const widthMm of [87,88,180,120])for(const options of [{},{format:'tiff',flattenWhite:true}]){
  const report=(await inspectJournalFile(png,profile('hssc',{stage:'production',widthMm}),options)).report;
  assert.equal(report.checks.find(c=>c.id==='hssc-width')!.status,[88,180].includes(widthMm)?'checked':'unmet');
  assert.equal(report.checks.find(c=>c.id==='hssc-width')!.requirement,'recommendation');
  assert.equal(report.facts.width,1024);assert.equal(report.facts.height,512);
  assert.ok(Math.abs(report.facts.effectiveDpi-1024/widthMm*25.4)<0.0001);
  assert.equal(report.checks.find(c=>c.id==='native-detail')!.status,'uncheckable');
  const old=(await inspectJournalFile(png,profile('hssc',{stage:'production',widthMm,version:'2026-10-14.v9'}),options)).report;
  assert.equal(old.checks.find(c=>c.id==='hssc-width')!.status,[87,88].includes(widthMm)?'pending':widthMm===180?'checked':'unmet');
 }
 const initial=(await inspectJournalFile(png,profile('hssc',{stage:'initial',widthMm:87}))).report;
 assert.ok(!initial.checks.some(c=>c.id==='hssc-width'),'Production recommendation must not become an initial submission threshold');
});

test('HSSC vector and unknown content use separate scopes; an extension never certifies content',async()=>{
 const simple='<rect width="600" height="300" fill="white"/><text x="10" y="40">Diagram</text>';
 for(const [body,isSimple] of [[simple,true],[simple+'<image href="data:image/png;base64,AA=="/>',false],[simple+'<style>@import url(https://example.invalid/style.css);</style>',false]] as const){
  const file=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300">${body}</svg>`);
  for(const widthMm of [87,88,180]){
   const p=profile('hssc',{stage:'production',widthMm});
   for(const format of ['png','svg'])assert.equal(journalPreflight(p,format).some(i=>i.code==='width-unconfirmed'),widthMm!==180);
   const report=(await inspectJournalFile(file,p)).report;
   assert.equal(report.facts.simpleVector,isSimple);
   assert.equal(report.checks.find(c=>c.id==='hssc-width')!.status,widthMm===180?'checked':isSimple?(widthMm===87?'checked':'unmet'):'pending');
   assert.equal(report.checks.find(c=>c.id==='svg-editability')!.status,'uncheckable');
  }
 }
});

test('Cell explanatory refinement is conditional and does not authorize data redrawing or special purposes',()=>{
 for(const purpose of ['main','supplementary']){
  const p=profile('cell-reports',{purpose});
  const policy=journalPolicyIssues(p,'generative-refine').find(i=>i.code==='policy-cell-refine')!;
  assert.equal(policy.policyStatus,'conditional');assert.equal(policy.kind,'manual');assert.equal(policy.blocking,false);
  assert.ok(policy.sourceIds!.includes('cellPolicy'));assert.ok(policy.sourceIds!.includes('elsevierAiFaq'));
  assert.match(policy.text,/适用解释/);assert.match(policy.text,/忠实改绘/);
  assert.ok(admitJournal(p.selection,'png','model-v1','workflow','generative-refine'));
 }
 for(const extra of [{contentType:'data'},{contentType:'primary'},{purpose:'graphical_abstract'},{purpose:'cover'}])assert.ok(journalPolicyIssues(profile('cell-reports',extra),'generative-refine').some(i=>i.blocking));
 for(const extra of [{contentType:'illustration'},{purpose:'toc'}]){
  const issues=journalPolicyIssues(profile('cell-reports',extra),'generative-refine');
  assert.ok(!issues.some(i=>i.code==='policy-cell-refine'));assert.ok(issues.some(i=>i.kind==='pending'&&!i.blocking));
 }
});

test('HSSC policy order is explicitly an applicability interpretation and retains the unresolved supersession',()=>{
 const p=profile('hssc');
 assert.match(p.rules.find(r=>r.id==='hssc-ai-author-guide')!.text,/范围的解释/);
 assert.match(p.rules.find(r=>r.id==='hssc-ai-author-guide')!.text,/未找到官方声明/);
 assert.ok(p.inheritance.some(i=>i.sourceId==='snVisualAi'&&i.status==='conflict'));
 for(const operation of ['generate','generative-refine'] as const){
  const issues=journalPolicyIssues(p,operation);assert.ok(issues.every(i=>!i.blocking));
  assert.ok(issues.some(i=>i.operation===operation&&i.policyStatus==='conditional'&&i.text.includes('不能单独证明本刊许可')));
 }
});

test('domestic AI self-check and data provenance reach prompts without inventing image permission or technical thresholds',async()=>{
 for(const [id,prefix] of [['acta-psychologica-sinica','acta'],['advances-psychological-science','advances'],['library-information-service','lis']] as const){
  const p=profile(id,{contentType:'data'}),schematic=profile(id);
  const dataRule=activeJournalRules(p).find(r=>r.id===`${prefix}-data-provenance`)!;
  assert.equal(dataRule.requirement,'manual');assert.ok(!activeJournalRules(schematic).some(r=>r.id===dataRule.id));
  assert.ok(p.sources.some(s=>s.id===`${prefix}Data`&&s.publishedOn));
  for(const operation of ['generate','generative-refine'] as const){
   const context=journalPrompt(operation==='generate'?{journalProfile:p,outputFormat:'png'}:{action:'refineImage',generationContext:{journalProfile:p},outputFormat:'png'});
   assert.equal(context.version,JOURNAL_VERSION);assert.ok(context.rules.some((r:any)=>r.id===dataRule.id));
   const issues=journalPolicyIssues(p,operation);assert.ok(issues.every(i=>!i.blocking));assert.ok(issues.some(i=>i.operation===operation&&i.policyStatus==='unspecified'));
  }
  const png=await sharp({create:{width:800,height:400,channels:3,background:'white'}}).png().toBuffer();
  const report=(await inspectJournalFile(png,p)).report;
  assert.equal(report.checks.find(c=>c.id===dataRule.id)!.status,'uncheckable');
  for(const field of ['format','dpi'])assert.ok(report.checks.some(c=>c.field===field&&c.status==='pending'));
  assert.equal(report.checks.find(c=>c.field==='width')!.status,prefix==='lis'?'uncheckable':'pending');
  if(prefix!=='lis'){
   assert.ok(activeJournalRules(p).some(r=>r.id===`${prefix}-ai-checklist`&&r.text.includes('不等于')));
   assert.ok(activeJournalRules(p).some(r=>r.id===`${prefix}-data-format-scope`));
   assert.ok(p.sources.filter(s=>/Check$/.test(s.id)).every(s=>s.verification==='official-document'&&s.updatedOn===undefined));
  }
 }
 assert.ok(activeJournalRules(profile('acta-psychologica-sinica',{contentType:'data'})).some(r=>r.id==='acta-statistical-intervals'));
 assert.ok(!activeJournalRules(profile('advances-psychological-science',{contentType:'data'})).some(r=>r.id==='acta-statistical-intervals'));
 assert.match(profile('library-information-service').rules.find(r=>r.id==='lis-labels')!.text,/允许画全表格线/);
 assert.equal(profile('population-research').rules.find(r=>r.id==='population-series')!.value,null);
});
