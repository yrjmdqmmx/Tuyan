// Build gate runs real text and whole-page conversion with packaged runtime assets.
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
async function read(filename,operation){const bytes=await readFile(new URL('fixtures/'+filename,import.meta.url));const child=spawnSync(process.execPath,[fileURLToPath(new URL('worker.mjs',import.meta.url))],{input:JSON.stringify({bytes:bytes.toString('base64'),filename,format:filename.split('.').pop(),operation}),encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});const result=JSON.parse(child.stdout.slice(child.stdout.indexOf('{"ok":')));assert.equal(result.ok,true,result.error);return result.result;}
const native=await read('research-slides.pptx',{op:'read',pages:[1,2]});assert.match(native.chunks[0].text,/研究材料/);assert.deepEqual(native.chunks[1].charts[0].series[0].savedValues.map(p=>p.value),['35','12']);
const converted=await read('research-slides.pptx',{op:'render',pages:[1,2]});assert.match(converted.chunks[0].text,/研究材料/);assert.equal(converted.images.length,2);assert.ok(!converted.warnings.some(w=>w.includes('文字覆盖不完整')),JSON.stringify(converted.warnings));
const pdf=await read('mixed-research.pdf',{op:'render',pages:[3,5]});assert.equal(pdf.images.length,2);for(const p of [...pdf.images,...converted.images])assert.ok(Buffer.from(p.base64,'base64').subarray(1,4).equals(Buffer.from('PNG')));
console.log('Material runtime smoke passed: original chart values, Chinese PPTX coverage, whole PDF/PPTX pages. Visual quality requires separate review.');
