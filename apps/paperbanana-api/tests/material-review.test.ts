import test from 'node:test'
import assert from 'node:assert/strict'
import {materialReviewImages} from '../src/material-review.js'
const files=[{id:'pdf',filename:'paper.pdf',sha256:'pdf-hash'},{id:'pptx',filename:'slides.pptx',sha256:'pptx-hash'}]
const records=files.map(f=>({materialId:f.id,recordId:f.id+'-read',operation:{op:'render',pages:[1,2]},images:[1,2].map(page=>({page,sha256:f.id+'-'+page}))}))
const read=async(id:string)=>({sourceHash:id+'-hash',recordId:id+'-read',images:[1,2].map(page=>({page,sha256:id+'-'+page,mimeType:'image/png',base64:Buffer.from(id+page).toString('base64')}))})
const normalize=async(im:any)=>({url:'data:image/png;base64,'+im.base64,mimeType:im.mimeType})
test('final review sees original page pixels with round-robin provenance and verified hashes',async()=>{
 const r=await materialReviewImages({files,records:[...records,...records],offset:1,capacity:4,read,normalize})
 assert.equal(r.images.length,4);assert.deepEqual(r.evidence.sourcePages.map(p=>[p.filename,p.page,p.inputIndex]),[['paper.pdf',1,2],['slides.pptx',1,3],['paper.pdf',2,4],['slides.pptx',2,5]])
 assert.deepEqual(r.evidence.omittedPages,[]);assert.ok(r.evidence.sourcePages.every(p=>/^[a-f0-9]{64}$/.test(p.submittedImageHash)))
 const narrow=await materialReviewImages({files,records,offset:2,capacity:0,read:async()=>{throw Error('must not read')},normalize});assert.equal(narrow.images.length,0);assert.equal(narrow.evidence.omittedPages.length,4);assert.equal(narrow.evidence.delivery,'separate-material-reading-only')
})
test('rejects changed pages and ignores records outside the current authorized files',async()=>{
 await assert.rejects(materialReviewImages({files,records,capacity:1,offset:1,read:async(id)=>({...await read(id),sourceHash:'changed'}),normalize}),/哈希不一致/)
 const r=await materialReviewImages({files:[],records,capacity:10,offset:1,read:async()=>{throw Error('unauthorized')},normalize});assert.equal(r.images.length,0)
})
