import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {defaultJournalSelection,journalSnapshot,activeJournalRules,journalPolicyIssues,journalPreflight,JOURNALS,JOURNAL_VERSION} from '../../../packages/api/src/journal-rules.js';
import {inspectJournalFile} from '../src/journal-export.js';
const profile=(id:string,extra:any={})=>journalSnapshot({...defaultJournalSelection(id),version:'2026-10-13.v2',...extra})!;
const png=(width=1200,height=600)=>sharp({create:{width,height,channels:3,background:'white'}}).png().toBuffer();
const check=(result:any,id:string)=>result.report.checks.find((c:any)=>c.id===id);
test('archived v2 and exact v1 evidence retain their original task meaning',()=>{
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../../packages/api/src/journal-catalog-v1.js',import.meta.url))).digest('hex'),'543814eaa2dd03a9aa841d55ad4b7f3199f3cadfa92489a933f60e303e0d65c0');
 const old=profile('scientific-reports',{version:'2026-10-13.v1'}),current=profile('scientific-reports');
 assert.equal(old.status,'pending');assert.equal(current.status,'partial');assert.ok(!old.sources.some(s=>s.id==='srepAi'));assert.ok(current.sources.some(s=>s.id==='srepAi'));
 assert.ok(JOURNALS.every(j=>j.status!=='supported'));
 for(const j of JOURNALS){const ids=new Set(j.sourceIds);assert.equal(new Set(j.rules.map(r=>r.id)).size,j.rules.length);for(const r of j.rules)for(const id of r.sourceIds)assert.ok(ids.has(id),`${j.id}/${r.id}: ${id} must be in its frozen sources`);}
});
test('PLOS initial exemption and supplementary format do not inherit production main-figure limits',async()=>{
 const bytes=await png();
 const initial=profile('plos-one');assert.ok(!journalPreflight(initial).some(i=>i.code==='scope-unverified'));
 assert.equal(check(await inspectJournalFile(bytes,initial),'scope-format').status,'uncheckable');
 const sup=await inspectJournalFile(bytes,profile('plos-one',{stage:'production',purpose:'supplementary',widthMm:200}));
 assert.equal(check(sup,'plos-supp-format').status,'checked');assert.equal(check(sup,'plos-width'),undefined);
 const main=await inspectJournalFile(bytes,profile('plos-one',{stage:'production'}));assert.equal(check(main,'plos-format').status,'unmet');
});
test('Frontiers supplementary PNG is accepted without the main two-column constraint',async()=>{
 const bytes=await png();
 const main=await inspectJournalFile(bytes,profile('frontiers-ai',{stage:'production',widthMm:90}));
 assert.equal(check(main,'frontiers-format-final').status,'unmet');assert.equal(check(main,'frontiers-width').status,'unmet');
 const sup=await inspectJournalFile(bytes,profile('frontiers-ai',{stage:'production',purpose:'supplementary',widthMm:90}));
 assert.equal(check(sup,'frontiers-supp-format').status,'checked');assert.equal(check(sup,'frontiers-supp-dpi').status,'checked');assert.equal(check(sup,'frontiers-width'),undefined);
 assert.match(profile('frontiers-ai').rules.find(r=>r.id==='frontiers-stroke')!.text,/化学结构.*0.6 pt/);
});
test('ACS format conflicts and format-specific TOC thresholds cannot become invented passes',async()=>{
 assert.ok(journalPreflight(profile('acs-omega'),'eps').some(i=>i.code==='format-unconfirmed'));
 assert.ok(!journalPreflight(profile('acs-omega'),'eps').some(i=>i.code==='format-mismatch'));
 const bytes=await png(),p=profile('acs-omega',{purpose:'toc',rasterKind:'grayscale'});
 assert.equal(check(await inspectJournalFile(bytes,p),'acs-toc-dpi'),undefined,'TIFF-specific threshold must not apply to PNG');
 const converted=await inspectJournalFile(bytes,p,{format:'tiff',flattenWhite:true});
 assert.equal(check(converted,'acs-toc-format').status,'checked');assert.equal(check(converted,'acs-toc-dpi').status,'pending');
});
test('verified AI prohibitions are distinct from unresolved permissions and conditional cover permission',()=>{
 const blocking=(id:string,purpose='main')=>journalPolicyIssues(profile(id,{purpose})).filter(i=>i.blocking);
 assert.equal(blocking('acs-omega','cover').length,0);assert.equal(blocking('acs-omega','toc')[0].kind,'policy');
 assert.equal(blocking('advanced-materials-interfaces','cover')[0].kind,'policy');assert.equal(blocking('advanced-materials-interfaces','toc').length,0);
 for(const id of ['ieee-access','scientific-reports','cell-reports'])assert.equal(blocking(id)[0].kind,'pending');
 const ga=blocking('scientific-reports','graphical_abstract');assert.equal(ga.length,1);assert.equal(ga[0].kind,'policy');assert.match(ga[0].text,/不接受图形摘要/);
});
test('IEEE exact 300 dpi follows the Access template; raster classification, open width and PNG conflict stay separate',async()=>{
 const bytes=await png(900,450),p=profile('ieee-access',{stage:'production',widthMm:76.2});
 assert.equal(check(await inspectJournalFile(bytes,profile('ieee-access')),'ieee-format-review').status,'checked');
 const color=await inspectJournalFile(bytes,p);assert.equal(color.report.facts.effectiveDpi,300);
 assert.equal(check(color,'ieee-dpi').status,'checked');assert.equal(check(color,'ieee-color').status,'checked');assert.equal(check(color,'ieee-format').status,'pending');
 assert.equal(check(color,'ieee-width').status,'uncheckable','Intermediate widths cannot fail a fixed two-width rule');
 const lines=await inspectJournalFile(bytes,profile('ieee-access',{stage:'production',widthMm:76.2,rasterKind:'lineart'}));
 assert.equal(check(lines,'ieee-dpi').status,'unmet');assert.equal(check(lines,'ieee-color').status,'unmet','RGB file is not a grayscale line-art file');
 const converted=await inspectJournalFile(bytes,p,{format:'tiff',flattenWhite:true});assert.equal(check(converted,'ieee-format').status,'checked');
});
test('Scientific Reports non-exhaustive format examples are pending for PNG and GA is explicitly unavailable',async()=>{
 const bytes=await png(300,150);
 assert.equal(activeJournalRules(profile('scientific-reports')).some(r=>['format','font','stroke','panels','background'].includes(r.field)),false,'Final-artwork requirements must not be imposed on initial review');
 const p=profile('scientific-reports',{stage:'revision',widthMm:100});
 const result=await inspectJournalFile(bytes,p);assert.equal(check(result,'srep-format').status,'pending');
 assert.equal(check(result,'srep-dpi').requirement,'recommendation');assert.equal(check(result,'srep-dpi').status,'unmet');
 assert.equal(check(await inspectJournalFile(bytes,p,{format:'tiff',flattenWhite:true}),'srep-format').status,'checked');
 assert.equal(check(await inspectJournalFile(bytes,profile('scientific-reports',{purpose:'graphical_abstract'})),'srep-no-ga').status,'unmet');
});
test('IEEE graphical abstract pixel and byte checks inspect the actual PNG without resizing',async()=>{
 const bytes=await png(660,295),p=profile('ieee-access',{stage:'production',purpose:'graphical_abstract'});
 const exact=await inspectJournalFile(bytes,p);assert.equal(check(exact,'ieee-ga-pixels').status,'checked');assert.equal(check(exact,'ieee-ga-size').status,'checked');assert.equal(check(exact,'ieee-ga-format').status,'unmet');
 for(const [size,status] of [[45000,'pending'],[45400,'pending'],[47000,'unmet']] as const){const padded=Buffer.concat([bytes,Buffer.alloc(size-bytes.length)]);assert.equal(check(await inspectJournalFile(padded,p),'ieee-ga-size').status,status);}
 const other=await inspectJournalFile(await png(1320,590),p);assert.equal(check(other,'ieee-ga-pixels').status,'unmet');assert.equal(other.report.facts.width,1320);
});
