import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {defaultJournalSelection,journalSnapshot,activeJournalRules,journalPreflight,journalPolicyIssues,journalPrompt,admitJournal} from '../../../packages/api/src/journal-rules.js';
const JOURNAL_VERSION='2026-10-14.v7';
import {inspectJournalFile} from '../src/journal-export.js';
const profile=(id='hssc',extra:any={})=>journalSnapshot({...defaultJournalSelection(id),version:JOURNAL_VERSION,...extra})!;
test('v7 preserves original v6 evidence and records unresolved Cell downloads as unread',()=>{
 assert.equal(JOURNAL_VERSION,'2026-10-14.v7');
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../../packages/api/src/journal-catalog-v6.js',import.meta.url))).digest('hex'),'ff4296ffa96bc5e0b876ee6dd89d25057deacdfba5f2269ba5e1bbb8d8e255ea');
 const old=profile('hssc',{version:'2026-10-14.v6',stage:'production'}),now=profile('hssc',{stage:'production'});
 assert.equal(old.rules.find(r=>r.id==='hssc-width')!.requirement,'conflict');
 assert.equal(now.rules.find(r=>r.id==='hssc-width')!.requirement,'recommendation');
 assert.ok(!old.sources.some(s=>s.id==='hsscInformation'));
 for(const sid of ['hsscInformation','snPolicyScope','snAiUpdate','snAiGuidance','natureAiFramework'])assert.ok(now.sources.some(s=>s.id===sid));
 assert.equal(now.sources.find(s=>s.id==='snAiUpdate')!.publishedOn,'2026-09-10');
 assert.equal(now.sources.find(s=>s.id==='hsscGuide')!.updatedOn,undefined,'Crawl/HTTP dates do not become policy revision dates');
 const cell=profile('cell-reports');assert.equal(cell.status,'pending');
 for(const sid of ['cellChecklistDownload','cellGaVersioned','cellTemplates'])assert.equal(cell.sources.find(s=>s.id===sid)!.verification,'unverified-access');
 assert.ok(cell.rules.filter(r=>r.id.startsWith('cell-ga-reference-')).every(r=>r.value===null&&r.requirement==='pending'));
 assert.ok(admitJournal(cell.selection));assert.ok(journalPolicyIssues(cell).filter(i=>i.operation).every(i=>!i.blocking));
});
test('HSSC specific review checklists take precedence over its general vector-PDF format list',async()=>{
 for(const stage of ['initial','revision']){
  const p=profile('hssc',{stage});
  assert.ok(journalPreflight(p,'pdf').some(i=>i.code==='format-mismatch'));
  assert.ok(!journalPreflight(p,'pdf').some(i=>i.code==='format-unconfirmed'));
  assert.ok(!activeJournalRules(p,'pdf').some(r=>r.requirement==='conflict'));
  assert.ok(!journalPreflight(p,'png').some(i=>i.code.startsWith('format-')));
 }
 const final=profile('hssc',{stage:'production'});
 assert.ok(!journalPreflight(final,'pdf').some(i=>i.code.startsWith('format-')));
 assert.ok(activeJournalRules(final,'pdf').some(r=>r.id==='hssc-pdf-vector'&&r.requirement==='manual'));
 const png=await sharp({create:{width:100,height:50,channels:3,background:'white'}}).png().toBuffer();
 await assert.rejects(()=>inspectJournalFile(png,final,{format:'pdf'}),/仅支持原始文件检查/);
 await assert.rejects(()=>inspectJournalFile(Buffer.from('%PDF-1.7'),final),/实际产生的 PNG\/SVG/);
 const old=profile('hssc',{version:'2026-10-14.v6'});
 assert.ok(journalPreflight(old,'pdf').some(i=>i.code==='format-unconfirmed'),'History retains its unresolved PDF meaning');
});
test('HSSC common double-column width passes while only disputed single-column values remain pending',async()=>{
 const png=await sharp({create:{width:1200,height:600,channels:3,background:'white'}}).withMetadata({density:1200}).png().toBuffer();
 for(const [widthMm,status] of [[180,'checked'],[87,'pending'],[88,'pending'],[150,'unmet']] as const){
  const p=profile('hssc',{stage:'production',widthMm});
  const preflight=journalPreflight(p);
  assert.equal(preflight.some(i=>i.code==='width-unconfirmed'),status==='pending');
  assert.equal(preflight.some(i=>i.code==='width-mismatch'),status==='unmet');
  for(const options of [{},{format:'tiff',flattenWhite:true}]){
   const {report}=await inspectJournalFile(png,p,options);
   assert.equal(report.checks.find(c=>c.id==='hssc-width')!.status,status);
   assert.equal(report.facts.width,1200);assert.equal(report.facts.height,600);
   assert.ok(Math.abs(report.facts.effectiveDpi!-1200/widthMm*25.4)<0.001);
   if(widthMm===180)assert.equal(report.checks.find(c=>c.id==='hssc-final-dpi')!.status,'unmet','High density metadata cannot fix insufficient pixels');
   assert.equal(report.checks.find(c=>c.id==='hssc-refine')!.status,'uncheckable');
  }
 }
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><image href="data:image/png;base64,AA=="/></svg>');
 const report=(await inspectJournalFile(svg,profile('hssc',{stage:'production'}))).report;
 assert.equal(report.checks.find(c=>c.id==='hssc-width')!.status,'checked');
 assert.equal(report.checks.find(c=>c.id==='svg-editability')!.status,'uncheckable');
 assert.match(report.checks.find(c=>c.id==='svg-editability')!.text,/不能宣称纯矢量/);
});
test('HSSC verified policy relationship does not certify a broader permission or silently block development',()=>{
 const p=profile();
 assert.ok(p.inheritance.some(i=>i.sourceId==='hsscInformation'&&i.status==='verified'));
 assert.ok(p.inheritance.some(i=>i.sourceId==='snVisualAi'&&i.status==='conflict'));
 for(const operation of ['generate','generative-refine']){
  const issue=journalPolicyIssues(p).find(i=>i.operation===operation)!;
  assert.equal(issue.policyStatus,'conditional');assert.equal(issue.blocking,false);
  assert.ok(issue.sourceIds!.includes('snVisualAi'));
 }
 for(const body of [{journalProfile:p},{action:'refineImage',generationContext:{journalProfile:p}}]){
  const prompt=journalPrompt(body);assert.ok(prompt.rules.some((r:any)=>r.id==='hssc-ai-applicability'));
  assert.match(prompt.rules.find((r:any)=>r.id==='hssc-refine').text,/模型重绘不能按非生成式调整申报/);
 }
 for(const format of ['png','svg'])assert.throws(()=>admitJournal({...p.selection,contentType:'primary'},format),/原始科研图像/);
 const supp=activeJournalRules(profile('hssc',{stage:'production',purpose:'supplementary'}));
 assert.ok(!supp.some(r=>r.id==='hssc-width'||r.id==='hssc-format'));
});
