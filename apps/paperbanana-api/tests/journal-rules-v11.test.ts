import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {JOURNALS,JOURNAL_VERSION,defaultJournalSelection,journalSnapshot,activeJournalRules,journalPolicyIssues,journalPreflight,admitJournal} from '../../../packages/api/src/journal-rules.js';
import {JOURNALS as V10} from '../../../packages/api/src/journal-catalog-v10.js';
import {inspectJournalFile} from '../src/journal-export.js';
const profile=(extra:any={})=>journalSnapshot({...defaultJournalSelection('nature'),...extra})!;

test('Nature v11 is traceable and does not rewrite v10 journals or verification dates',()=>{
 assert.equal(JOURNAL_VERSION,'2026-10-19.v11');assert.equal(JOURNALS.length,18);
 const p=profile();assert.equal(p.name,'Nature');assert.equal(p.verifiedOn,'2026-10-19');
 assert.equal(new Set(p.rules.map(r=>r.id)).size,p.rules.length);
 for(const r of p.rules){assert.equal(r.version,JOURNAL_VERSION);assert.equal(r.verifiedOn,'2026-10-19');assert.ok(r.sourceIds.length);assert.ok(r.sourceIds.every(id=>p.sources.some(s=>s.id===id)));}
 for(const s of p.sources){assert.equal(s.verifiedOn,'2026-10-19');assert.match(new URL(s.url).hostname,/(^|\.)(nature\.com|springernature\.com)$/);assert.equal(s.updatedOn,undefined);}
 for(const old of V10){
  const current=JOURNALS.find(j=>j.id===old.id)!;
  assert.deepEqual({...current,version:old.version,rules:current.rules.map(r=>({...r,version:old.version}))},old);
  assert.equal(journalSnapshot({...defaultJournalSelection(old.id),version:old.version})!.verifiedOn,old.verifiedOn);
 }
 assert.throws(()=>profile({version:'2026-10-14.v10'}),/规则版本不可用/);
});

test('initial and revision requirements do not inherit production constraints or other purposes',()=>{
 for(const stage of ['initial','revision']){
  const p=profile({stage});const ids=activeJournalRules(p).map(r=>r.id);
  for(const id of ['nature-width','nature-height','nature-format','nature-font','nature-extended-width','nature-cover-dpi'])assert.ok(!ids.includes(id),`${stage}: ${id}`);
  assert.ok(!journalPreflight(p,'png').some(i=>i.code==='format-mismatch'));
 }
 assert.ok(!journalPreflight(profile(),'png').some(i=>i.code==='scope-unverified'));
 for(const purpose of ['graphical_abstract','toc']){
  const p=profile({purpose,stage:'production'});
  assert.ok(activeJournalRules(p).some(r=>r.id==='nature-special-purpose'&&r.requirement==='pending'));
  assert.ok(journalPolicyIssues(p).some(i=>i.code==='purpose-unverified'&&!i.blocking));
  assert.ok(!activeJournalRules(p).some(r=>r.field==='format'));
 }
});

test('Nature cover prohibition applies to generation and refinement, while conditional main AI is not permission',()=>{
 for(const operation of ['generate','generative-refine'] as const)for(const stage of ['initial','revision','production']){
  assert.throws(()=>admitJournal(profile({purpose:'cover',stage}).selection,'png','model-v1',undefined,operation),/封面.*不允许/);
  const main=profile({stage});assert.ok(journalPolicyIssues(main,operation).some(i=>i.operation===operation&&i.policyStatus==='conditional'&&!i.blocking));
  assert.doesNotThrow(()=>admitJournal(main.selection,'png','model-v1',undefined,operation));
 }
 assert.throws(()=>admitJournal(profile({contentType:'primary'}).selection),/原始科研图像/);
});

test('main figure file checks preserve source conflicts and do not certify SVG editability',async()=>{
 const png=await sharp({create:{width:1024,height:512,channels:3,background:'white'}}).png().toBuffer();
 for(const options of [{},{format:'tiff',flattenWhite:true}]){
  const report=(await inspectJournalFile(png,profile({stage:'production'}),options)).report;
  for(const id of ['nature-width','nature-format'])assert.equal(report.checks.find(c=>c.id===id)!.status,'pending');
  assert.equal(report.checks.find(c=>c.id==='nature-height')!.status,'checked');
  assert.equal(report.checks.find(c=>c.id==='nature-font')!.status,'uncheckable');
  assert.ok(!report.checks.some(c=>c.id==='nature-dpi'),'Photo rules do not become invented schematic thresholds');
 }
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><text x="10" y="30">Data</text></svg>');
 const report=(await inspectJournalFile(svg,profile({stage:'production'}))).report;
 assert.equal(report.checks.find(c=>c.id==='nature-format')!.status,'checked');
 assert.equal(report.checks.find(c=>c.id==='svg-editability')!.status,'uncheckable');
 assert.ok(journalPreflight(profile({stage:'production'}),'png').some(i=>i.code==='format-unconfirmed'));
});

test('Extended Data has its own maximum DPI and width; main and cover specifications do not leak',async()=>{
 const png=await sharp({create:{width:1600,height:800,channels:3,background:'white'}}).png().toBuffer();
 for(const widthMm of [89,180,181]){
  const p=profile({stage:'production',purpose:'supplementary',widthMm});
  const report=(await inspectJournalFile(png,p,{format:'tiff',flattenWhite:true})).report;
  const check=(id:string)=>report.checks.find(c=>c.id===id)!;
  assert.equal(check('nature-extended-width').status,widthMm<=180?'checked':'unmet');
  assert.equal(check('nature-extended-height').status,'pending');
  assert.equal(check('nature-extended-dpi').status,widthMm===89?'unmet':'checked');
  assert.equal(check('nature-extended-format').status,'checked');
  assert.ok(!report.checks.some(c=>c.id==='nature-width'||c.id==='nature-cover-dpi'));
 }
 const report=(await inspectJournalFile(png,profile({stage:'production',purpose:'supplementary'}))).report;
 assert.equal(report.checks.find(c=>c.id==='nature-extended-format')!.status,'unmet');
});
