// Read-only acceptance of the original teaching examples, never production drawing logic.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),runName=process.argv[2]||'round-1';
const base=path.join(root,'docs/infographic-v400/svg-repair-20261010/evidence',runName);
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=v=>createHash('sha256').update(v).digest('hex');
const summary=await read(path.join(base,'summary.json')),checks=[];
for(const run of summary.runs){
 const dir=path.join(base,run.scenario),job=await read(path.join(dir,'job.json')),input=await read(path.join(dir,'input.json'));
 const result=job.resultImages?.[0];assert.ok(result,'delivered artifact required');
 assert.equal(job.sourceProtocol?.protocolVersion,2);assert.equal(job.sourceProtocol?.promptRevision,1);
 const svg=await readFile(path.join(dir,path.basename(result.filename||result.objectKey)),'utf8'),review=result.review;
 assert.equal(hash(svg),review.deliveredSvgHash);assert.ok(!/<image\b/i.test(svg));assert.match(svg,/<text\b/);
 const final=await read(path.join(dir,'final-review.json'));assert.equal(final.svgHash,hash(svg));assert.equal(final.version,review.deliveredVersion);
 assert.equal(final.pngHash,hash(await readFile(path.join(dir,'final-review-input.png'))));
 assert.equal(final.sourceProtocolVersion,2);assert.equal(final.sourceResolution?.mode,'source_ref');assert.ok(final.sourceResolution.trace.length);
 assert.ok(job.sourceProtocol.catalogs.some(c=>c.catalogHash===final.sourceCatalogHash));
 const sourceStages=job.stages.filter(s=>['topology_resolved','review_resolved'].includes(s.type)).map(s=>({type:s.type,...JSON.parse(s.text)}));
 assert.ok(sourceStages.some(s=>s.type==='topology_resolved'));assert.ok(sourceStages.some(s=>s.type==='review_resolved'));
 for(const s of sourceStages){
  assert.ok(run.calls.some(c=>hash(c.responseText)===s.rawHash),'resolved evidence must retain identity of an actual raw provider response');
  assert.equal(hash(s.resolvedResponse||s.resolvedAssessment),s.resolvedHash);assert.ok(s.sourceTrace.length);
  assert.ok(job.sourceProtocol.catalogs.some(c=>c.catalogHash===s.sourceCatalog.catalogHash));
 }
 const t=review.topology||review.composition.panels.find(p=>p.review?.topology).review.topology;
 const names=Object.fromEntries(t.topology.nodes.map(n=>[n.id,n.label||'(initial)']));
 const actual=t.topology.edges.map(e=>[names[e.source],names[e.target],e.label].join('|')).sort();
 const expected=run.scenario==='state-diagram-svg'?
  [['(initial)','Idle',''],['Idle','Running','start'],['Running','Paused','pause'],['Paused','Running','resume'],['Running','Completed','finish'],['Paused','Idle','cancel'],['Completed','Idle','reset']]:
  [['Start','Receive sample',''],['Receive sample','Quality check',''],['Quality check','Normalize','yes'],['Normalize','Output',''],['Output','End',''],['Quality check','Reject sample','no'],['Reject sample','End','']];
 assert.deepEqual(actual,expected.map(v=>v.join('|')).sort());
 assert.equal(new Set(Object.values(names)).size,Object.values(names).length);
 let numeric;
 if(review.composition){
  const panel=review.composition.panels.find(p=>p.label==='B');
  assert.equal(panel.dataHash,hash(JSON.stringify(input.figurePanels[1].figureData)));
  assert.deepEqual(input.figurePanels[1].figureData.rows,[{label:'Alpha',value:2},{label:'Beta',value:5},{label:'Gamma',value:3}]);
  assert.equal(review.composition.layout.passed,true);
  numeric={values:[2,5,3],dataHash:panel.dataHash,programValidation:panel.review.dataValidation,layout:review.composition.layout};
 }
 const plans=run.calls.filter(c=>c.kind==='plan'),planImages=plans.flatMap(c=>(c.request.messages||[]).flatMap(m=>Array.isArray(m.content)?m.content:[]).filter(p=>p.type==='image_url').map(p=>({call:c.number,...p.image_url.url})));
 assert.ok(planImages.length,'real reference pixels must be sent to planning');
 assert.ok(run.calls.some(c=>c.kind==='topology'));assert.ok(run.calls.some(c=>c.kind==='review'));
 checks.push({scenario:run.scenario,svgHash:hash(svg),pngHash:final.pngHash,trueVector:true,exactOriginalRelations:actual,uniqueNamedNodes:true,planningReferenceImages:planImages,sourceProtocol:{version:2,promptRevision:1,resolutionStages:sourceStages.length,rawAndResolvedHashChecks:true},numeric,pipelineStatus:review.status,independentFinalStatus:final.status});
}
const report={date:'2026-10-10',scope:'Original synthetic examples; actual Core/provider artifacts, no output editing',checks};
await writeFile(path.join(base,'artifact-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(checks.map(c=>({scenario:c.scenario,relations:c.exactOriginalRelations.length,pipeline:c.pipelineStatus,final:c.independentFinalStatus,trueVector:c.trueVector})),null,2));
