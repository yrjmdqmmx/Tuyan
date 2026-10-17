import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),base=path.join(root,'docs/workflow-v400/bailian-followup-20261010');
const sharp=createRequire(path.join(root,'apps/paperbanana-api/package.json'))('sharp');
const hash=v=>createHash('sha256').update(v).digest('hex');
const parse=s=>JSON.parse(s.trim().replace(/^```(?:json)?\s*|\s*```$/g,''));
const ut=w=>(w.messages||[]).filter(m=>m.role==='user').flatMap(m=>typeof m.content==='string'?[m.content]:m.content.filter(p=>p.type==='text').map(p=>p.text)).join('\n');
const imgs=w=>[...(w.messages||[]),...(w.input?.messages||[])].flatMap(m=>Array.isArray(m.content)?m.content:[]).map(p=>p.image_url?.url||p.image).filter(Boolean);
const results=[];const totals={httpRequests:0,textCalls:0,imageCalls:0,textPromptTokens:0,textCompletionTokens:0,textTotalTokens:0,generatedImages:0};
for(const batch of await readdir(base,{withFileTypes:true})){
 if(!batch.isDirectory())continue;
 let summary;try{summary=JSON.parse(await readFile(path.join(base,batch.name,'summary.json'),'utf8'))}catch{continue}
 for(const r of summary.runs){
  const dir=path.join(base,batch.name,r.scenario),checks=[];
  const real=r.calls.filter(c=>c.number);
  totals.httpRequests+=real.length;
  for(const c of real){assert.equal(c.httpStatus,200);if(c.kind==='image'){totals.imageCalls++;totals.generatedImages+=c.usage?.image_count||0}else{totals.textCalls++;totals.textPromptTokens+=c.usage?.prompt_tokens||0;totals.textCompletionTokens+=c.usage?.completion_tokens||0;totals.textTotalTokens+=c.usage?.total_tokens||0}}
  const review=r.review;
  if(review){
   const isSvg=review.mode==='visual_code',ext=isSvg?'svg':'png';
   const finalBytes=await readFile(path.join(dir,'candidate-0.'+ext));assert.equal(hash(finalBytes),isSvg?review.deliveredSvgHash:review.deliveredPngHash);checks.push('delivered file SHA-256 matches review metadata');
   for(const e of review.history||[]){
    const file=await readFile(path.join(dir,`candidate-0-${ext}-v${e.version}.${ext}`));assert.equal(hash(file),isSvg?e.svgHash:e.pngHash);
    const submitted=await readFile(path.join(dir,`candidate-0-${ext}-v${e.version}-review-${e.round}.png`));assert.equal(hash(submitted),e.submittedImageHash);
    const matches=real.filter(c=>c.kind==='review').filter(c=>{try{const ctx=parse(ut(c.request));return ctx.version===e.version && (isSvg?ctx.svgHash===e.svgHash:ctx.pngHash===e.pngHash)}catch{return false}});assert.equal(matches.length,1);
    const c=matches[0],ctx=parse(ut(c.request));
    if(isSvg){assert.equal(hash(ctx.fullSvgCode),e.svgHash);assert.equal(ctx.fullSvgCode,file.toString())}
    const inputs=imgs(c.request);
    if(inputs.length){assert.equal(inputs[0].sha256,e.submittedImageHash)}else{assert.ok(ctx.auxiliaryVisualReport);const obs=real.find(o=>o.kind==='observer'&&imgs(o.request).some(i=>i.sha256===e.submittedImageHash));assert.ok(obs,'actual matching observer input');assert.equal(ctx.auxiliaryVisualReport,obs.responseText)}
    if(e.assessment){assert.deepEqual(parse(c.responseText),JSON.parse(e.assessment))}
    checks.push(`${ext} v${e.version} round ${e.round}: original/render/submitted bytes, complete code when SVG, report and decision correspond`)
   }
   if(review.status==='passed'){assert.equal(review.reviewedVersion,review.deliveredVersion);assert.equal(isSvg?review.reviewedSvgHash:review.reviewedPngHash,isSvg?review.deliveredSvgHash:review.deliveredPngHash)}
   if(review.status==='modified_unreviewed')assert.ok(review.deliveredVersion>review.reviewedVersion)
   const original=JSON.parse(await readFile(path.join(dir,'input.json'),'utf8'));
   for(const c of r.calls.filter(c=>c.kind==='image'||c.kind==='injected-initial-image')){
    const prompt=c.request.input.messages[0].content.find(x=>x.text)?.text;if(!prompt)continue;
    assert.ok([...prompt].length<=5000);
    const jsonPart=prompt.slice(prompt.indexOf('{')).split('\n\ncompletePlan (full original text):\n')[0];const context=JSON.parse(jsonPart);
    assert.equal(context.methodology,original.methodContent);assert.equal(context.visualIntent,original.caption);assert.equal(context.avoid,original.negativePrompt);assert.equal(context.aspectRatio,original.aspectRatio);
    assert.ok(context.completePlan || prompt.split('\n\ncompletePlan (full original text):\n')[1]);
    checks.push(`image ${c.number||'injected'}: full original method/caption/avoid/plan, ${[...prompt].length} characters`);
    if(imgs(c.request).length){
      const m=imgs(c.request)[0];const stage=r.job.stages.find(s=>s.type==='reference'&&s.text?.includes(m.sha256));assert.ok(stage);const info=JSON.parse(stage.text);
      assert.equal(info.submittedSourceImageHash,m.sha256);
      const source=await readFile(path.join(dir,`candidate-0-png-v${info.sourceVersion}.png`));assert.equal(hash(source),info.sourcePngHash);
      const sent=await readFile(path.join(dir,`call-${c.number}-input-0.png`));assert.equal(hash(sent),m.sha256);
      assert.deepEqual(await (info.displayBackground?sharp(source).flatten({background:info.displayBackground}):sharp(source).removeAlpha()).raw().toBuffer(),await sharp(sent).removeAlpha().raw().toBuffer());
      checks.push(`revision input: v${info.sourceVersion} declared display pixels match; transport bytes=${m.sha256}`)
    }
   }
  }
  results.push({batch:batch.name,scenario:r.scenario,status:r.status,review:review?.status,realRequests:real.length,checks})
 }
}
const sourceFiles=['apps/paperbanana-api/runtime/handler.ts','packages/api/src/png-workflow.ts','packages/api/src/svg-workflow.ts','packages/api/src/workflow-prompts.ts','packages/api/src/execution-errors.ts','packages/types/src/workflow.ts','apps/web/src/lib/workflowSettings.js'];const sourceHashes={};for(const f of sourceFiles)sourceHashes[f]=hash(await readFile(path.join(root,f)));
const report={verifiedAt:new Date().toISOString(),scope:'Actual provider HTTP requests; local Core/Gateway/storage. Injected initial image is explicitly labeled, never counted as a real image call. No server-side internal model trace claim.',totals,results,sourceHashes};
await writeFile(path.join(base,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({totals,verifiedCases:results.filter(r=>r.checks.length).length,checks:results.reduce((n,r)=>n+r.checks.length,0),results:results.map(({checks,...r})=>r)},null,2));
