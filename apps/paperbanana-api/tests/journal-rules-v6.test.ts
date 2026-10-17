import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {defaultJournalSelection,journalSnapshot,activeJournalRules,journalPolicyIssues,journalPrompt,admitJournal} from '../../../packages/api/src/journal-rules.js';
import {inspectJournalFile} from '../src/journal-export.js';
const JOURNAL_VERSION='2026-10-14.v6';
const profile=(id:string,extra:any={})=>journalSnapshot({...defaultJournalSelection(id),version:JOURNAL_VERSION,...extra})!;
test('v6 preserves v5 bytes and verification dates while adding two journals with direct sources',()=>{
 assert.equal(profile('hssc').version,'2026-10-14.v6');
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../../packages/api/src/journal-catalog-v5.js',import.meta.url))).digest('hex'),'4421230aba3699a7e56c34cbc6123c0ec5cf6fc951f2b1645605b934a567a7fb');
 for(const id of ['sage-open','hssc']){
  const p=profile(id);assert.equal(p.status,'partial');assert.equal(p.verifiedOn,'2026-10-14');
  assert.throws(()=>profile(id,{version:'2026-10-13.v5'}),/规则版本不可用/);
  for(const r of p.rules)for(const sid of r.sourceIds)assert.ok(p.sources.find(s=>s.id===sid),`${id}: ${sid}`);
 }
 const old=profile('cell-reports',{version:'2026-10-13.v5'}),now=profile('cell-reports');
 assert.ok(!old.sources.some(s=>s.id==='cellSupport'));assert.ok(now.sources.some(s=>s.id==='cellSupport'&&s.updatedOn==='2026-03-02'));
 assert.ok(now.rules.filter(r=>r.id.startsWith('cell-ga-reference-')).every(r=>r.requirement==='pending'&&r.value===null));
 assert.equal(profile('caijing-luncong').sources.find(s=>s.id==='cjlcFormat')!.verifiedOn,'2026-10-13');
 for(const id of ['plos-one','frontiers-ai','advanced-materials-interfaces','acs-omega','ieee-access','cell-reports','scientific-reports','jingjixuejia','caijing-luncong','shanxi-finance-economics','social-sciences-in-china','sage-open','hssc']){const p=profile(id);assert.ok(p.sources.every(Boolean));for(const item of p.inheritance)assert.ok(p.sources.some(s=>s.id===item.sourceId));}
});
test('Sage evidence distinguishes permitted representative generation from undisclosed or unconfirmed operations',()=>{
 const p=profile('sage-open');
 const policy=journalPolicyIssues(p);assert.equal(policy.find(i=>i.operation==='generate')!.policyStatus,'conditional');
 assert.equal(policy.find(i=>i.operation==='generative-refine')!.policyStatus,'unspecified');
 assert.ok(policy.every(i=>!i.blocking));
 assert.ok(p.inheritance.every(i=>i.status==='verified'));
 assert.ok(journalPrompt({journalProfile:p}).rules.some((r:any)=>r.id==='sage-generate'&&r.text.includes('禁止虚构数据')));
 for(const purpose of ['toc','cover','graphical_abstract'])assert.ok(journalPolicyIssues(profile('sage-open',{purpose})).every(i=>i.policyStatus==='unspecified'&&!i.blocking));
 assert.throws(()=>admitJournal({...p.selection,contentType:'primary'}),/不能作为原始科研图像/);
 assert.ok(!activeJournalRules(profile('sage-open',{purpose:'supplementary'})).some(r=>r.field==='dpi'),'Do not extend main-figure thresholds to supplementary packages');
});
test('HSSC uses its specific exceptions, preserves the general-policy conflict and does not certify an exception',async()=>{
 const p=profile('hssc',{stage:'production'});
 assert.ok(p.inheritance.some(i=>i.status==='conflict'&&i.sourceId==='snVisualAi'));
 const reviewFormats=activeJournalRules(profile('hssc'),'pdf');
 assert.ok(reviewFormats.some(r=>r.id==='hssc-pdf-review'&&r.requirement==='conflict'));
 assert.ok(reviewFormats.find(r=>r.id==='hssc-format')!.pendingFormats?.includes('pdf'));
 assert.ok(!activeJournalRules(p,'pdf').some(r=>r.id==='hssc-pdf-review'));
 assert.ok(activeJournalRules(p,'pdf').some(r=>r.id==='hssc-pdf-vector'&&r.requirement==='manual'));
 const policy=journalPolicyIssues(p);assert.ok(policy.filter(i=>i.operation).every(i=>i.policyStatus==='conditional'));
 assert.match(policy.find(i=>i.operation==='generate')!.text,/普通通用模型加提示词不自动满足例外/);
 assert.match(policy.find(i=>i.operation==='generative-refine')!.text,/不认证例外成立/);
 assert.ok(journalPrompt({action:'refineImage',generationContext:{journalProfile:p}}).rules.some((r:any)=>r.id==='hssc-refine'));
 assert.throws(()=>admitJournal({...p.selection,contentType:'primary'}),/不能作为原始科研图像/);
 const png=await sharp({create:{width:2200,height:1100,channels:3,background:'white'}}).png().toBuffer();
 for(const options of [{},{format:'tiff',flattenWhite:true}]){
  const out=await inspectJournalFile(png,p,options);
  for(const id of ['hssc-generate','hssc-refine','hssc-vector','hssc-font'])assert.equal(out.report.checks.find(c=>c.id===id)!.status,'uncheckable');
  assert.equal(out.report.checks.find(c=>c.id==='hssc-width')!.status,'pending');
 }
});
test('Sage line art and HSSC stage rules check actual pixels without format or width overclaims',async()=>{
 const png=await sharp({create:{width:1200,height:600,channels:3,background:'white'}}).png().toBuffer();
 const sage=profile('sage-open',{widthMm:85,rasterKind:'lineart'});
 const color=profile('sage-open',{widthMm:85,rasterKind:'color'});
 for(const options of [{},{format:'tiff',flattenWhite:true}]){
  const out=await inspectJournalFile(png,sage,options);
  assert.equal(out.report.checks.find(c=>c.id==='sage-dpi')!.status,'unmet');
  assert.equal(out.report.facts.width,1200);assert.equal(out.report.facts.height,600);
  assert.equal((await inspectJournalFile(png,color,options)).report.checks.find(c=>c.id==='sage-dpi')!.status,'checked');
 }
 assert.equal((await inspectJournalFile(png,sage)).report.checks.find(c=>c.id==='sage-format')!.status,'pending','An open preference list must not reject or certify PNG');
 const initial=(await inspectJournalFile(png,profile('hssc'))).report;
 assert.equal(initial.checks.find(c=>c.id==='hssc-initial-dpi')!.status,'unmet');
 assert.equal(initial.checks.find(c=>c.id==='hssc-initial-size')!.requirement,'recommendation');
 assert.ok(!initial.checks.some(c=>c.id==='hssc-width'));
 for(const widthMm of [87,88,180])assert.equal((await inspectJournalFile(png,profile('hssc',{stage:'production',widthMm}))).report.checks.find(c=>c.id==='hssc-width')!.status,'pending');
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><image href="data:image/png;base64,AA==" width="1200" height="600"/></svg>');
 const report=(await inspectJournalFile(svg,profile('hssc',{stage:'production'}))).report;
 assert.equal(report.checks.find(c=>c.id==='hssc-production-format')!.status,'checked');
 assert.equal(report.checks.find(c=>c.id==='hssc-vector')!.status,'uncheckable');
 assert.equal(report.facts.embeddedRaster,true);
 assert.match(report.checks.find(c=>c.id==='svg-editability')!.text,/不能宣称纯矢量/);
 const supp=(await inspectJournalFile(png,profile('hssc',{purpose:'supplementary'}))).report;
 assert.ok(!supp.checks.some(c=>c.id==='hssc-initial-dpi'));assert.equal(supp.checks.find(c=>c.id==='hssc-supplement')!.status,'uncheckable');
});
