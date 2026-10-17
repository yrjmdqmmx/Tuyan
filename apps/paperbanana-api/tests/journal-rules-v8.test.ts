import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {defaultJournalSelection,journalSnapshot,activeJournalRules,journalPreflight,journalPolicyIssues,journalPrompt,admitJournal} from '../../../packages/api/src/journal-rules.js';
const JOURNAL_VERSION='2026-10-14.v8';
const V8_IDS=['plos-one','frontiers-ai','advanced-materials-interfaces','acs-omega','ieee-access','cell-reports','scientific-reports','jingjixuejia','caijing-luncong','shanxi-finance-economics','social-sciences-in-china','sage-open','hssc'];
import {inspectJournalFile} from '../src/journal-export.js';
const profile=(extra:any={},id='cell-reports')=>journalSnapshot({...defaultJournalSelection(id),version:JOURNAL_VERSION,...extra})!;
test('Cell v8 uses current journal-linked sources without rewriting v7 uncertainty or old GA typography',()=>{
 assert.equal(JOURNAL_VERSION,'2026-10-14.v8');
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../../packages/api/src/journal-catalog-v7.js',import.meta.url))).digest('hex'),'74e4de1f808c547766b8744aa395fefa24745641c99e3d8735e5072a45507bed');
 const old=profile({version:'2026-10-14.v7'}),now=profile();
 assert.equal(old.status,'pending');assert.equal(now.status,'partial');
 assert.equal(old.sources.find(s=>s.id==='cellGaVersioned')!.verification,'unverified-access');
 assert.match(old.rules.find(r=>r.id==='cell-ga-reference-font')!.text,/12–16/);
 assert.match(now.rules.find(r=>r.id==='cell-ga-font')!.text,/Arial 8–12/);
 assert.ok(!now.rules.some(r=>r.id==='cell-current-access'||r.id.startsWith('cell-ga-reference')));
 assert.ok(now.inheritance.every(i=>i.status==='verified'));
 assert.equal(now.sources.find(s=>s.id==='cellElsevier')!.updatedOn,'2026-06');
 for(const id of ['cell','cellPolicy','cellFinalChecklist','cellGaVersioned']){
  const src=now.sources.find(s=>s.id===id)!;assert.equal(src.verifiedOn,'2026-10-14');assert.equal(src.updatedOn,undefined);
 }
 for(const id of V8_IDS){const p=profile({},id);assert.equal(new Set(p.sourceIds).size,p.sourceIds.length);assert.ok(p.sources.every(Boolean));assert.equal(new Set(p.rules.map(r=>r.id)).size,p.rules.length);for(const r of p.rules)assert.ok(r.sourceIds.every(id=>p.sourceIds.includes(id)));}
 assert.deepEqual(JSON.parse(JSON.stringify(now)),now);
});
test('Cell stages, ordinary figures, supplementary packaging and GA are distinct',()=>{
 assert.ok(!journalPreflight(profile(),'png').some(i=>i.code==='scope-unverified'));
 assert.ok(!activeJournalRules(profile()).some(r=>r.id==='cell-main-format'));
 const main=profile({stage:'production'}),rules=activeJournalRules(main);
 assert.deepEqual(rules.find(r=>r.field==='format')!.value,['tiff','pdf']);
 assert.ok(journalPreflight(main,'png').some(i=>i.code==='format-mismatch'));
 assert.ok(!journalPreflight(main,'tiff').some(i=>i.code==='format-mismatch'));
 for(const widthMm of [55,80,85,114,150,174])assert.ok(!journalPreflight(profile({stage:'production',widthMm})).some(i=>i.code==='width-mismatch'),'Max widths are not discrete exact choices');
 assert.ok(journalPreflight(profile({stage:'production',widthMm:180})).some(i=>i.code==='width-mismatch'));
 const supp=activeJournalRules(profile({stage:'production',purpose:'supplementary'}));
 assert.ok(supp.some(r=>r.id==='cell-supplement'));assert.ok(!supp.some(r=>r.id==='cell-main-format'||r.id==='cell-ga-size'));
});
test('Cell AI evaluates the requested operation and does not turn disclosure into permission',()=>{
 const ordinary=profile();
 assert.equal(journalPolicyIssues(ordinary).find(i=>i.code==='policy-cell-generate')!.policyStatus,'conditional');
 assert.equal(journalPolicyIssues(ordinary).find(i=>i.code==='policy-cell-refine')!.policyStatus,'unspecified');
 for(const format of ['png','svg']){
  assert.ok(admitJournal(ordinary.selection,format));
  assert.ok(admitJournal(ordinary.selection,format,'model-v1',undefined,'generative-refine'));
  const data=profile({contentType:'data'});
  assert.ok(admitJournal(data.selection,format),'Reproducible data visualization has conditions, not a blanket ban');
  assert.throws(()=>admitJournal(data.selection,format,'model-v1',undefined,'generative-refine'),/模型重绘/);
  for(const operation of ['generate','generative-refine'] as const){
   for(const purpose of ['graphical_abstract','cover'])assert.throws(()=>admitJournal(profile({purpose}).selection,format,'model-v1',undefined,operation),/通用生成式|本刊禁止/);
   assert.throws(()=>admitJournal(profile({contentType:'primary'}).selection,format,'model-v1',undefined,operation),/原始科研图像/);
  }
 }
 const old=profile({version:'2026-10-14.v7',purpose:'graphical_abstract'});
 assert.ok(admitJournal(old.selection));assert.ok(admitJournal(old.selection,'png','model-v1',undefined,'generative-refine'));
 for(const body of [{journalProfile:ordinary},{action:'refineImage',generationContext:{journalProfile:ordinary}}]){
  const prompt=journalPrompt(body);assert.equal(prompt.version,JOURNAL_VERSION);assert.ok(prompt.rules.some((r:any)=>r.id==='cell-generate'));assert.match(prompt.instruction,/Disclosure is an obligation, not authorization/);
 }
});
test('actual Cell TIFF conversion keeps pixels and does not pass fake DPI, missing PDF or unverified fonts',async()=>{
 const png=await sharp({create:{width:1200,height:600,channels:3,background:'white'}}).withMetadata({density:1200}).png().toBuffer();
 for(const [rasterKind,widthMm,expected] of [['color',85,'checked'],['grayscale',85,'checked'],['lineart',85,'unmet'],['color',174,'unmet']] as const){
  const p=profile({stage:'production',rasterKind,widthMm});
  for(const options of [{},{format:'tiff',flattenWhite:true}]){
   const {report}=await inspectJournalFile(png,p,options);
   assert.equal(report.facts.width,1200);assert.equal(report.facts.height,600);
   assert.equal(report.checks.find(c=>c.id==='cell-main-dpi')!.status,expected);
   assert.equal(report.checks.find(c=>c.id==='cell-main-format')!.status,options.format?'checked':'unmet');
   assert.equal(report.checks.find(c=>c.id==='cell-main-font')!.status,'uncheckable');
   assert.equal(report.checks.find(c=>c.id==='cell-black-white')!.status,'uncheckable');
   assert.equal(report.checks.find(c=>c.id==='native-detail')!.status,'uncheckable');
  }
 }
 await assert.rejects(()=>inspectJournalFile(png,profile({stage:'production'}),{format:'pdf'}),/仅支持原始文件/);
});
test('GA current size is checked on real files without conferring AI permission',async()=>{
 const p=profile({stage:'production',purpose:'graphical_abstract',widthMm:101.6});
 for(const [width,height,status] of [[1200,1200,'checked'],[1024,1024,'unmet'],[1200,600,'unmet']] as const){
  const png=await sharp({create:{width,height,channels:3,background:'white'}}).withMetadata({density:1200}).png().toBuffer();
  const {report}=await inspectJournalFile(png,p,{format:'tiff',flattenWhite:true});
  assert.equal(report.checks.find(c=>c.id==='cell-ga-size')!.status,status);
  assert.equal(report.checks.find(c=>c.id==='cell-ga-dpi')!.status,width===1200?'checked':'unmet');
  assert.equal(report.checks.find(c=>c.id==='cell-ga-format')!.status,'checked');
  assert.ok(report.policy.some(i=>i.code==='policy-cell-ga-generate'&&i.blocking));
 }
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><image href="data:image/png;base64,AA=="/></svg>');
 const report=(await inspectJournalFile(svg,p)).report;
 assert.equal(report.checks.find(c=>c.id==='cell-ga-size')!.status,'uncheckable');
 assert.match(report.checks.find(c=>c.id==='svg-editability')!.text,/不能宣称纯矢量/);
});
test('HSSC editor rollout evidence does not invent journal supersession or collapse disputed widths',()=>{
 const p=profile({stage:'production'},'hssc');
 assert.ok(p.sources.some(s=>s.id==='snAiEditorGuidance'));
 assert.ok(p.inheritance.some(i=>i.sourceId==='snVisualAi'&&i.status==='conflict'));
 for(const widthMm of [87,88])assert.ok(journalPreflight(profile({stage:'production',widthMm},'hssc')).some(i=>i.code==='width-unconfirmed'));
 assert.ok(!journalPreflight(p).some(i=>i.code==='width-unconfirmed'));
 assert.ok(!journalPolicyIssues(p).some(i=>i.blocking));
});
