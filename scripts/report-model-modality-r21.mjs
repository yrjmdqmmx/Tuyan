// Offline full-object execution and DOM verification; all transport is denied.
// Historical R21 report stays reproducible at Phase A; current R22B is audited separately.
import { archivedAuditText } from './lib/model-card-audit.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {writeOrCheck} from './lib/model-card-audit.mjs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
const root=fileURLToPath(new URL('..', import.meta.url));
const out=path.resolve(process.argv.slice(2).find(arg=>!arg.startsWith('--')) || '/tmp/tuyan-r21-after');
fs.mkdirSync(out,{recursive:true});
const require=createRequire(path.join(root,'package.json'));
const {build}=require('esbuild');
const webRequire=createRequire(path.join(root,'apps/web/package.json'));
const coreRequire=createRequire(path.join(root,'apps/paperbanana-api/package.json'));
const deny=()=>{throw new Error('R21: network disabled')};
globalThis.fetch=deny; http.request=deny; http.get=deny; https.request=deny; https.get=deny; net.connect=deny; net.createConnection=deny;
Date.now=()=>Date.parse('2026-11-09T12:00:00Z');
const {memoryDb}=await import(pathToFileURL(path.join(root,'test-support/memory-db.mjs')));
globalThis.__r21Db=memoryDb();
globalThis.__r21Sharp=coreRequire('sharp');
const archived={name:'r21-archive-c76e9c2a',setup(b){b.onLoad({filter:/\.(?:[cm]?js|jsx|ts|json)$/},a=>{if(!a.path.startsWith(root)||a.path.includes('/node_modules/'))return;return {contents:archivedAuditText(root,'c76e9c2a',path.relative(root,a.path)),loader:a.path.endsWith('.json')?'json':a.path.endsWith('.jsx')?'jsx':a.path.endsWith('.ts')?'ts':'js'};});}};
const coreBundle=await build({entryPoints:[path.join(root,'apps/paperbanana-api/src/core-entry.mjs')],bundle:true,format:'cjs',platform:'node',write:false,define:{'import.meta.url':JSON.stringify('data:text/javascript,offline-r21')},nodePaths:[path.join(root,'apps/paperbanana-api/node_modules')],logLevel:'silent',plugins:[archived,{name:'offline-infrastructure',setup(b){b.onResolve({filter:/(?:core-services\.(?:js|ts)|^sharp)$/},a=>({path:a.path,namespace:'offline'}));b.onLoad({filter:/.*/,namespace:'offline'},a=>({loader:'js',contents:a.path==='sharp'?'export default globalThis.__r21Sharp':'export const database=globalThis.__r21Db; export const objectStorage={bucket:()=>({})};'}));}}]});
const core={exports:{}};new Function('module','exports','require',coreBundle.outputFiles[0].text)(core,core.exports,coreRequire);
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'config/channel-audit/tokendance-catalog-snapshot-20261109b.json'),'utf8'));
const requests=[];core.exports.configureRuntimeFetch(async url=>{requests.push(String(url));return String(url)==='https://tokendance.space/gateway/v1/models'?Response.json({data:snapshot.data}):Response.json({error:'Offline catalog fixture'},{status:503});});
const registry=await core.exports.modelRegistry({});
const entry=`import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ModelSpecifications} from './apps/web/src/components/ModelSpecifications.jsx';
export const renderCard=model=>renderToStaticMarkup(React.createElement(ModelSpecifications,{provider:'tokendance',model}));
export {modelCardSpecifications} from './apps/web/src/lib/modelCardSpecifications.js';
export {catalogCardFacts,mergeCardFacts,needsImageInput} from './apps/web/src/lib/catalogCardFacts.js';
export {auditedModelSpecs} from './apps/web/src/lib/modelAudit.js';
export {modalityIconStates} from './apps/web/src/lib/modelModalityIcons.js';
export {STATIC_MODEL_REGISTRY} from './apps/web/src/lib/staticModelCatalog.js';
export {catalogRows} from './apps/web/src/workspace/WorkspaceModelCatalog.jsx';`;
const bundle=await build({plugins:[archived],stdin:{contents:entry,resolveDir:root,loader:'js'},bundle:true,format:'cjs',platform:'node',write:false,jsx:'automatic',loader:{'.css':'empty','.svg':'dataurl','.png':'dataurl'},define:{'import.meta.env':'{}'},nodePaths:[path.join(root,'apps/web/node_modules')],logLevel:'silent'});
const ui={exports:{}};new Function('module','exports','require',bundle.outputFiles[0].text)(ui,ui.exports,webRequire);const u=ui.exports;
const reviewed=JSON.parse(fs.readFileSync(path.join(root,'apps/web/src/data/model-card-specifications.json'),'utf8'));
const pages=JSON.parse(fs.readFileSync(path.join(root,'config/channel-audit/specific-model-page-overrides.json'),'utf8'));
const visible=new Set(u.catalogRows(registry).filter(r=>r.provider==='tokendance').map(r=>r.model.id));
const rows=registry.providers.tokendance.models.map(model=>{const card=u.modelCardSpecifications('tokendance',model);return {id:model.id,visible:visible.has(model.id),model,audit:u.auditedModelSpecs('tokendance',model.id),catalog:u.catalogCardFacts('tokendance',model,reviewed,pages),card,needsImageInput:!!u.needsImageInput(model),icons:{input:u.modalityIconStates(card.input,card.inputFact),output:u.modalityIconStates(card.output,card.outputFact)}}});
const result={basis:'Full offline Core modelRegistry + actual Web modelCardSpecifications + actual modalityIconStates',snapshotModels:snapshot.data.length,registryModels:rows.length,visibleModels:visible.size,staticModels:u.STATIC_MODEL_REGISTRY.tokendance.models.length,mockedRequests:[...new Set(requests)],rows,bailian:u.modelCardSpecifications('bailian',registry.providers.bailian.models.find(m=>m.id==='kimi-k3'))};
fs.writeFileSync(path.join(out,'runtime.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,rows:undefined,bailian:undefined},null,2));
const rendered=rows.map(row=>{
  const html=u.renderCard(row.model);
  const groups=[...html.matchAll(/<span class="model-modality-icons"[^>]*>(.*?)<\/dd>/g)].map(x=>x[1]);
  const states=groups.map(g=>[...g.matchAll(/class="model-modality-icon is-([^\"]+)" role="img" aria-label="([^\"]+)"/g)].map(x=>({state:x[1],label:x[2]})));
  for(let d=0;d<2;d++)if(JSON.stringify(states[d].map(x=>x.state))!==JSON.stringify(row.icons[d?'output':'input'].map(x=>x.state)))throw Error('DOM mismatch: '+row.id);
  return {id:row.id,html,states};
});
fs.writeFileSync(path.join(out,'rendered-cards.json'),JSON.stringify(rendered,null,2)+'\n');
console.log(JSON.stringify({renderedCards:rendered.length,iconStatesMatch:true}));

const before=JSON.parse(fs.readFileSync(path.join(root,'config/channel-audit/tokendance-card-before-r21.json')));
const beforeById=new Map(before.rows.map(row=>[row.id,row]));
const fields=['inputModalities','outputModalities'];
const ordered=value=>JSON.stringify(Array.isArray(value)?[...value].sort():value);
const comparison=rows.map(row=>{
  const previous=beforeById.get(row.id),capture=snapshot.portal[row.id];
  assert.ok(previous,row.id);
  for(const [field,wire] of [['inputModalities','input_modalities'],['outputModalities','output_modalities']]){
    const fact=row.card.fields[field];
    assert.deepEqual(fact.value,capture?.status===200?capture.architecture[wire]:null,row.id+'/'+field);
    assert.equal(fact.state,capture?.status===200?'known':'unknown',row.id+'/'+field);
    assert.equal(fact.provenance,capture?.status===200?'channel':null,row.id+'/'+field);
    assert.equal(fact.sourceUrl,capture?.status===200?'https://tokendance.space/models/'+row.id:null,row.id+'/'+field);
    if(capture?.status===200)assert.equal(fact.verifiedAt,'2026-11-09');
    assert.deepEqual(row.model.specificModelSpecifications.modalityFacts[field].value,fact.value);
    assert.deepEqual(row.model.specifications.modalityFacts[field].value,fact.value);
  }
  assert.deepEqual(row.card.sources,['https://tokendance.space/models/'+row.id]);
  return {id:row.id,visible:row.visible,portalStatus:capture?.status??null,
    before:{fields:previous.fields,icons:previous.icons,sources:previous.sources},
    after:{fields:row.card.fields,icons:row.icons,sources:row.card.sources}};
});
assert.equal(comparison.length,74);
const misSourced=comparison.filter(row=>fields.every(field=>{
  const fact=row.before.fields[field];
  return fact.state==='known' && !(fact.sourceUrls || [fact.sourceUrl]).some(url=>url?.includes('tokendance.space'));
}));
assert.equal(misSourced.length,54);
const transitions={};
for(const row of comparison)for(const side of ['input','output'])for(let i=0;i<4;i++){
  const key=row.before.icons[side][i].state+' -> '+row.after.icons[side][i].state;
  transitions[key]=(transitions[key]||0)+1;
}
const summary={cards:comparison.length,visibleCards:visible.size,channelConfirmed:comparison.filter(row=>row.portalStatus===200).length,
  unknownCards:comparison.filter(row=>row.portalStatus!==200).map(row=>row.id),
  semanticChangedFields:comparison.flatMap(row=>fields.filter(field=>ordered(row.before.fields[field].value)!==ordered(row.after.fields[field].value))).length,
  arrayChangedFields:comparison.flatMap(row=>fields.filter(field=>JSON.stringify(row.before.fields[field].value)!==JSON.stringify(row.after.fields[field].value))).length,
  provenanceChangedFields:comparison.flatMap(row=>fields.filter(field=>row.before.fields[field].sourceUrl!==row.after.fields[field].sourceUrl || row.before.fields[field].provenance!==row.after.fields[field].provenance)).length,
  priorMisSourcedCards:misSourced.length,misSourcedNowConfirmed:misSourced.filter(row=>row.portalStatus===200).length,misSourcedNowUnknown:misSourced.filter(row=>row.portalStatus!==200).length,
  transitions,portalMismatches:0,renderedCards:rendered.length};
const check=process.argv.includes('--check');
writeOrCheck(path.join(root,'docs/model-modality-audit-20261109-results.json'),JSON.stringify({basis:result.basis,snapshotCheckedAt:snapshot.checkedAt,summary,rows:comparison},null,2)+'\n',check);
const icons=(row,side)=>row.icons[side].map(icon=>icon.id+': '+icon.state).join(', ');
const table=['| id | field | before | after | provenance |','| --- | --- | --- | --- | --- |',...comparison.flatMap(row=>fields.map((field,index)=>{
  const fact=row.after.fields[field],prior=row.before.fields[field],side=index?'output':'input';
  const origin=f=>f.sourceUrl?`${f.provenance} · ${f.verifiedAt} · ${f.sourceUrl}`:'unknown · no channel evidence';
  return `| \`${row.id}\` | ${field} | ${icons(row.before,side)}${prior.value?.includes('file')?', file: supported':''} | ${icons(row.after,side)} | ${origin(prior)} → ${origin(fact)} |`;
}))].join('\n');
const doc=path.join(root,'docs/model-modality-audit-20261109.md');
if(fs.existsSync(doc)){
  const start='<!-- R21 TABLE START -->',end='<!-- R21 TABLE END -->',source=fs.readFileSync(doc,'utf8');
  assert.ok(source.includes(start)&&source.includes(end));
  writeOrCheck(doc,source.slice(0,source.indexOf(start))+start+'\n'+table+'\n'+source.slice(source.indexOf(end)),check);
}
console.log(JSON.stringify(summary,null,2));
