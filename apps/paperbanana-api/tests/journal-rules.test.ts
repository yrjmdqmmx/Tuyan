import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {admitJournal,defaultJournalSelection,journalSnapshot,activeJournalRules,journalPreflight,journalSelectionForFigure,JOURNALS,JOURNAL_VERSION} from '../../../packages/api/src/journal-rules.js';
import {inspectJournalFile} from '../src/journal-export.js';
import {workflowContext} from '../../../packages/api/src/workflow-prompts.js';
const select=(id='plos-one',extra:any={})=>({...defaultJournalSelection(id)!,...extra});
test('figure-bound content follows taxonomy while manual declarations and historical snapshots remain stable',()=>{
 const bound=select('frontiers-ai',{contentSource:'figure-type',figureTypeId:'workflow'});
 const original=journalSnapshot(bound)!;
 const data=admitJournal(bound,'png','model-v1','bar')!;
 assert.equal(data.selection.contentType,'data');assert.equal(data.selection.figureTypeId,'bar');
 assert.ok(journalPreflight(data).some(i=>i.code==='data-human-review'));
 assert.equal(admitJournal(bound,'svg','model-v1','multipanel')!.selection.contentType,'data');
 assert.equal(admitJournal(data.selection,'png','model-v1','workflow')!.selection.contentType,'schematic');
 assert.deepEqual(original.selection,bound,'Derived task selection must not rewrite the prior snapshot');
 const manual=select('frontiers-ai',{contentType:'primary'});
 assert.equal(journalSelectionForFigure(manual,'workflow'),manual);
 assert.throws(()=>admitJournal(manual,'png','model-v1','workflow'),/原始科研图像/);
 assert.throws(()=>admitJournal({...bound,contentType:'primary'},'png','model-v1','workflow'),/原始科研图像/);
 const legacy=select('frontiers-ai');
 assert.deepEqual(admitJournal(legacy,'png','model-v1','bar')!.selection,legacy,'Existing choices are not silently reinterpreted');
 assert.throws(()=>journalSnapshot({...bound,figureTypeId:'missing'}),/不一致/);
 assert.throws(()=>journalSnapshot({...bound,contentSource:'untrusted'}),/不一致/);
});
test('catalog provenance, scope and status do not imply full adaptation',()=>{
 assert.deepEqual(JOURNALS.map(j=>j.id),['plos-one','frontiers-ai','advanced-materials-interfaces','acs-omega','ieee-access','cell-reports','scientific-reports','jingjixuejia','caijing-luncong','shanxi-finance-economics','social-sciences-in-china','sage-open','hssc','population-research','acta-psychologica-sinica','advances-psychological-science','library-information-service']);assert.ok(JOURNALS.every(j=>j.status!=='supported'));
 for(const journal of JOURNALS){
  const archivedRules=['sage-open','hssc','population-research','acta-psychologica-sinica','advances-psychological-science','library-information-service'].includes(journal.id)?[]:journalSnapshot(select(journal.id,{version:'2026-10-13.v5'}))!.rules;
  for(const rule of journal.rules){assert.equal(rule.version,JOURNAL_VERSION);const archived=archivedRules.find(r=>r.id===rule.id);assert.equal(rule.verifiedOn,journal.id==='cell-reports'&&rule.id!=='author-integrity'?'2026-10-14':archived?.verifiedOn??'2026-10-14');assert.ok(rule.applicability.purposes?.length);if(rule.id!=='author-integrity')assert.ok(rule.sourceIds.length);}
 }
 assert.equal(admitJournal(null),null);
 for(const version of ['old-unknown','__proto__','constructor'])assert.throws(()=>journalSnapshot(select('plos-one',{version})),/规则版本不可用/);
 assert.throws(()=>journalSnapshot(select('plos-one',{widthMm:0})),/排版宽度/);
 const snap=journalSnapshot({...select(),rules:[],name:'forged'})!;assert.equal(snap.name,'PLOS ONE');assert.ok(snap.rules.length>5);
 snap.rules.length=0;assert.ok(journalSnapshot(select())!.rules.length>5);
 const sources=journalSnapshot(select())!;sources.sources[0].verifiedOn='tampered';assert.equal(journalSnapshot(select())!.sources[0].verifiedOn,'2026-10-13');
 assert.equal(JOURNALS.find(j=>j.id==='plos-one')!.rules.find(r=>r.id==='plos-line')!.requirement,'unspecified');
 assert.equal(JOURNALS.find(j=>j.id==='scientific-reports')!.rules.find(r=>r.id==='srep-width')!.requirement,'unspecified');
});
test('stages, purposes, inheritance and conflicts are not flattened',()=>{
 assert.equal(activeJournalRules(journalSnapshot(select())).filter(r=>r.field==='format').length,0);
 assert.deepEqual(activeJournalRules(journalSnapshot(select('plos-one',{stage:'production'}))).find(r=>r.field==='format')?.value,['tiff','eps']);
 assert.equal(activeJournalRules(journalSnapshot(select('plos-one',{stage:'production',purpose:'supplementary'}))).find(r=>r.field==='format')?.value[0],'*');
 assert.equal(activeJournalRules(journalSnapshot(select('advanced-materials-interfaces'))).find(r=>r.field==='dpi')?.requirement,'conflict');
 assert.ok(journalSnapshot(select('ieee-access'))!.sources.some(i=>i.id==='accessTemplate'));
 assert.equal(activeJournalRules(journalSnapshot(select('ieee-access'))).find(r=>r.field==='dpi')?.requirement,'hard');
 const formats=activeJournalRules(journalSnapshot(select('frontiers-ai',{stage:'production'}))).filter(r=>r.field==='format');assert.equal(formats.length,1);assert.ok(formats[0].value.includes('eps'));
});
test('AI gates hold for both raster/vector and scientific primary images',()=>{
 for(const fmt of ['png','svg']){
  for(const purpose of ['toc','graphical_abstract'])assert.throws(()=>admitJournal(select('acs-omega',{purpose}),fmt),/TOC/);
  for(const id of ['cell-reports','scientific-reports','ieee-access']){
   assert.ok(admitJournal(select(id),fmt),'Uncertainty must not invent a prohibition');
   const policy=journalPreflight(journalSnapshot(select(id)),fmt).find(i=>i.operation==='generate');
   assert.equal(policy?.policyStatus,id==='ieee-access'?'unspecified':'conditional');
   assert.equal(policy?.blocking,false,'An unresolved or conditional policy is not a submission certificate');
  }
  assert.throws(()=>admitJournal(select('plos-one',{contentType:'primary'}),fmt),/原始科研图像/);
 }
 assert.ok(journalPreflight(journalSnapshot(select('plos-one',{stage:'production'})),'svg').some(i=>i.code==='format-mismatch'));
 assert.ok(admitJournal(select('frontiers-ai')));
});
test('planner and refinement context include the frozen rule version and content boundaries',()=>{
 const journalProfile=journalSnapshot(select('frontiers-ai'));
 for(const body of [{journalProfile},{action:'refineImage',generationContext:{journalProfile},editInstruction:'Make labels larger'}]){
  const context=JSON.parse(workflowContext(body));assert.equal(context.journalRules.version,JOURNAL_VERSION);assert.ok(context.journalRules.rules.some((r:any)=>r.id==='frontiers-stroke'));assert.match(context.journalRules.instruction,/do not change models/);
 }
});
test('actual low-resolution PNG does not pass through 600 DPI metadata or TIFF wrapping',async()=>{
 const src=await sharp({create:{width:300,height:150,channels:4,background:{r:20,g:30,b:40,alpha:0.6}}}).withMetadata({density:600}).png().toBuffer();
 const profile=journalSnapshot(select('plos-one',{stage:'production',widthMm:100}));
 const original=await inspectJournalFile(src,profile);
 assert.ok(Math.abs(original.report.facts.effectiveDpi!-76.2)<1e-9);assert.equal(original.report.checks.find(c=>c.id==='plos-dpi')?.status,'unmet');
 assert.equal(original.report.checks.find(c=>c.id==='plos-format')?.status,'unmet');
 await assert.rejects(()=>inspectJournalFile(src,profile,{format:'tiff'}),/白底转换/);
 const converted=await inspectJournalFile(src,profile,{format:'tiff',flattenWhite:true});
 assert.equal(converted.report.facts.width,300);assert.equal(converted.report.facts.height,150);assert.equal(converted.report.facts.compression,5);assert.equal(converted.report.facts.pages,1);
 assert.equal(converted.report.checks.find(c=>c.id==='plos-color')?.status,'checked');
 assert.equal(converted.report.checks.find(c=>c.id==='plos-dpi')?.status,'unmet');assert.equal(converted.report.checks.find(c=>c.id==='plos-format')?.status,'checked');
 assert.equal(converted.report.sourceSha256,createHash('sha256').update(src).digest('hex'));assert.notEqual(converted.report.exportSha256,converted.report.sourceSha256);
 assert.ok(converted.report.checks.some(c=>c.id==='native-detail'&&c.status==='uncheckable'));
 assert.equal(converted.report.checks.find(c=>c.id==='plos-size')?.status,'checked');
});
test('high pixel density passes only sampling checks and exact dimensions use actual image aspect',async()=>{
 const src=await sharp({create:{width:1200,height:600,channels:3,background:'white'}}).png().toBuffer();
 const result=await inspectJournalFile(src,journalSnapshot(select('frontiers-ai',{widthMm:85})),{format:'tiff',flattenWhite:true});
 assert.equal(result.report.checks.find(c=>c.id==='frontiers-dpi')?.status,'checked');assert.equal(result.report.facts.heightMm,42.5);
 assert.equal(result.report.checks.find(c=>c.id==='frontiers-font')?.status,'uncheckable');
 const wrongWidth=await inspectJournalFile(src,journalSnapshot(select('frontiers-ai',{widthMm:90})));assert.equal(wrongWidth.report.checks.find(c=>c.id==='frontiers-width')?.status,'unmet');
});
test('SVG inspection does not certify embedded rasters, DPI or editability; malformed files fail closed',async()=>{
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><image href="data:image/png;base64,AA==" width="100" height="50"/></svg>');
 const result=await inspectJournalFile(svg,journalSnapshot(select('frontiers-ai')));
 assert.equal(result.report.facts.effectiveDpi,null);assert.equal(result.report.facts.embeddedRaster,true);assert.match(result.report.checks.find(c=>c.id==='svg-editability')!.text,/不能宣称纯矢量/);
 await assert.rejects(()=>inspectJournalFile(svg,journalSnapshot(select()),{format:'tiff',flattenWhite:true}),/不提供 SVG/);
 await assert.rejects(()=>inspectJournalFile(Buffer.from('not a PNG'),journalSnapshot(select())),/实际产生的/);
 await assert.rejects(()=>inspectJournalFile(Buffer.from('<svg><text></svg>'),journalSnapshot(select())),/XML/);
});

test('file-size conflict checks reject unequivocally oversized files but preserve disputed boundaries',async()=>{
 const png=await sharp({create:{width:10,height:10,channels:3,background:'white'}}).png().toBuffer(),profile=journalSnapshot(select('plos-one',{stage:'production'}));
 for(const [size,status] of [[10000000,'pending'],[11*1024*1024,'unmet']] as const){const bytes=Buffer.concat([png,Buffer.alloc(size-png.length)]);const result=await inspectJournalFile(bytes,profile);assert.equal(result.report.checks.find(c=>c.id==='plos-size')?.status,status);}
});

test('SVG physical units use the declared viewport; unverified native format acceptance stays pending',async()=>{
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200mm" height="100mm" viewBox="0 0 100 300"/>');
 const result=await inspectJournalFile(svg,journalSnapshot(select('advanced-materials-interfaces',{widthMm:85})));
 assert.equal(result.report.facts.heightMm,42.5);assert.equal(result.report.checks.find(c=>c.id==='ami-format')?.status,'pending');
});
