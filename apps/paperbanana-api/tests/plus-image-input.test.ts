import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
test('Qwen 3.0 edit sends the exact source bytes inline and rejects bad dimensions before dispatch',async()=>{
 const r:any=await createRefineRuntime();try{
  const source=await sharp({create:{width:512,height:512,channels:4,background:{r:10,g:30,b:80,alpha:0.5}}}).png().toBuffer();let calls=0;
  r.legacy.configureRuntimeFetch(async(url:any,init:any)=>{
   if(String(url).includes('/multimodal-generation/generation')){
    calls++;const body=JSON.parse(String(init.body));const image=body.input.messages[0].content[0].image;
    assert.match(image,/^data:image\/png;base64,/);assert.deepEqual(Buffer.from(image.split(',')[1],'base64'),source);
    return Response.json({output:{choices:[{message:{content:[{image:'https://fixture.invalid/result.png'}]}}]}})
   }
   if(String(url)==='https://fixture.invalid/result.png')return new Response(source,{headers:{'Content-Type':'image/png'}})
   throw Error('Unexpected request')
  });
  await r.legacy.callImageModel('bailian','qwen-image-3.0-pro','fixture','Keep the labels; change the color','1:1','data:image/png;base64,'+source.toString('base64'),'1K');
  assert.equal(calls,1);assert.equal([...r.objects.keys()].some((k:any)=>k.startsWith('bailian-vision/')),false);
  const wide=await sharp({create:{width:8001,height:801,channels:3,background:'white'}}).png().toBuffer();
  await assert.rejects(r.legacy.callImageModel('bailian','qwen-image-3.0-pro','fixture','Keep labels','1:1','data:image/png;base64,'+wide.toString('base64'),'1K'),/8000|尺寸/);assert.equal(calls,1)
 }finally{await r.close()}
})
