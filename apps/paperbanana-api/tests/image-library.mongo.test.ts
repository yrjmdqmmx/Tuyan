import {test} from 'node:test'
import assert from 'node:assert/strict'
import {MongoClient} from 'mongodb'
import {mkdtemp,writeFile,readFile,rm,readdir,stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {planHistoricalImages,applyHistoricalImages} from '../src/image-library-history.js'
import {createImageLibrary} from '../src/image-library.js'
import {createWorkspaceJobDeletion} from '../src/workspace-task-deletion.js'
import {readDrawingActivity} from '../src/drawing-activity.js'
import {planImageLibraryMigration,inspectLegacyWorkspaceImage} from '../src/image-library-migration.js'
import {IMAGE_LIBRARY_MAX_BYTES,IMAGE_LIBRARY_RETENTION_MS} from '../../../packages/api/src/image-library.mjs'

// @ts-expect-error Cross-service JavaScript module has no TypeScript declaration.
import {createLegacyImageCleanup} from '../../auth-gateway/src/image-library.js'
// @ts-expect-error Cross-service JavaScript modules have no TypeScript declarations; exercised against real Mongo below.
import {createWorkspaceStore} from '../../auth-gateway/src/workspace-sync.js'
// @ts-expect-error Cross-service JavaScript modules have no TypeScript declarations; exercised against real Mongo below.
import {accountWorkspaceStore} from '../../auth-gateway/src/workspace-lifecycle.js'
// @ts-expect-error Cross-service JavaScript modules have no TypeScript declarations; exercised against real Mongo below.
import {newWorkspace,workspaceReducer} from '../../web/src/workspace/workspaceState.js'

const uri=process.env.WORKSPACE_COMPAT_TEST_URI
test('image lifecycle on real isolated Mongo transactions and filesystem objects',{skip:!uri},async t=>{
  assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\//)
  const client=new MongoClient(uri!),db=client.db(`image_library_fixture_${Date.now()}`),dir=await mkdtemp(path.join(tmpdir(),'tuyan-image-library-'))
  await client.connect()
  let time=+new Date('2026-10-20T00:00:00Z'),putFailure=false,deleteFailure=false,commitFailure=false,gate:Promise<void>|undefined
  const files=new Map<string,{name:string,size:number,sha256:string}>(),deleted:string[]=[]
  const bucket={
    async writeFile(key:string,bytes:Buffer){if(gate)await gate;if(putFailure)throw Error('PUT_FAILED');const name=path.join(dir,createHash('sha256').update(key).digest('hex'));await writeFile(name,bytes);files.set(key,{name,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})},
    async headFile(key:string){const row=files.get(key)!;return {size:(await stat(row.name)).size,sha256:row.sha256}},
    async readFile(key:string){return readFile(files.get(key)!.name)},
    async deleteFile(key:string){if(deleteFailure)throw Error('DELETE_FAILED');const row=files.get(key);if(row)await rm(row.name,{force:true});files.delete(key);deleted.push(key)},
    async listFiles({Prefix}:{Prefix:string}){return {Contents:[...files].filter(([k])=>k.startsWith(Prefix)).map(([Key])=>({Key}))}},
    async getDownloadUrl(key:string,ttl:number){return `https://synthetic.invalid/${key}?ttl=${ttl}`},
  }
  const library=createImageLibrary({db,sweepIntervalMs:15,bucket:()=>bucket,now:()=>new Date(time),transaction:async(work:any)=>{
    const session=client.startSession();try{return await session.withTransaction(async()=>{const out=await work(session);if(commitFailure)throw Error('COMMIT_FAILED');return out})}finally{await session.endSession()}
  }})
  const bytes=(size:number,seed:number)=>{const b=Buffer.alloc(size,seed);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);return b}
  const save=(user:string,size:number,seed:number,jobId='job')=>library.save(user,{format:'png',bytes:bytes(size,seed),source:{jobId,candidateId:0}})
  try{
    await library.ensureIndexes()
    await t.test('history migration resumes, deduplicates, preserves unknown time and never evicts held images',async()=>{
      const content=bytes(1024,131),userId='historical-owner',job={_id:'historical-job',userId,status:'succeeded',body:'must remain',resultImages:[{candidateId:0,objectKey:'historical-job/candidate-0.png',mimeType:'image/png'}]}
      await db.collection('user').insertOne({_id:userId} as any)
      await db.collection('paperbanana_jobs').insertOne(job as any)
      await bucket.writeFile('historical-job/candidate-0.png',content)
      const plan=planHistoricalImages({core:{jobs:[job],objects:[{key:'historical-job/candidate-0.png',base64:content.toString('base64'),size:content.length,sha256:createHash('sha256').update(content).digest('hex')}]},auth:{users:[{_id:userId}],records:{workspaceResults:[]}},legacy:{images:[]},now:new Date(time)})
      const transaction=async(work:any)=>{const session=client.startSession();try{return await session.withTransaction(()=>work(session))}finally{await session.endSession()}}
      const options={db,authDb:db,bucket,plan,transaction}
      // The synthetic adapter's head must distinguish absent files from an IO failure.
      const originalHead=bucket.headFile
      bucket.headFile=async k=>{if(!files.has(k))throw Object.assign(Error('missing'),{status:404});return originalHead(k)}
      try{
        putFailure=true;await assert.rejects(applyHistoricalImages(options),/PUT_FAILED/);putFailure=false
        assert.equal((await db.collection('paperbanana_jobs').findOne({_id:job._id} as any))!.resultImages[0].libraryId,undefined)
        const count=deleted.length
        await applyHistoricalImages(options);await applyHistoricalImages(options)
        assert.equal(deleted.length,count)
        const list=await library.list(userId);assert.equal(list.usedBytes,1024);assert.equal(list.images[0].savedAt,null);assert.equal(list.images[0].retentionHold,true)
        const oldTime=time;time+=31*86400000;await library.sweep()
        assert.equal((await library.read(userId,list.images[0].id)).base64,content.toString('base64'))
        await assert.rejects(save(userId,100_000_000,132),/历史图片受保护/)
        assert.equal((await library.list(userId)).usedBytes,1024)
        assert.equal((await db.collection('paperbanana_jobs').findOne({_id:job._id} as any))!.body,'must remain')
        const preserved=await library.preserveLegacyResults(userId,job)
        assert.ok(preserved.includes('historical-job/candidate-0.png'))
        await library.deleteOwner(userId);assert.equal(files.has('historical-job/candidate-0.png'),false)
        time=oldTime
      }finally{bucket.headFile=originalHead;putFailure=false}
    })
    await t.test('gateway retires expired legacy bytes automatically, retries outages, and isolates accounts',async()=>{
      const image=await save('legacy-copy',1024,133)
      await db.collection('workspaceResults').insertMany([{userId:'legacy-copy',resultId:image.id,library:true,base64:'synthetic'},{userId:'other-copy',resultId:image.id,library:true,base64:'must-remain'}])
      let offline=true
      const cleanup=createLegacyImageCleanup({db,intervalMs:15,imageLibrary:{status:async(userId:string)=>{if(offline)throw Error('offline');return library.status(userId)}}})
      await library.remove('legacy-copy',image.id)
      await cleanup.sweep();assert.equal((await db.collection('workspaceResults').findOne({userId:'legacy-copy'}))!.base64,'synthetic')
      offline=false;cleanup.start()
      try{for(let n=0;n<30;n++){if(!(await db.collection('workspaceResults').findOne({userId:'legacy-copy'}))!.base64)break;await new Promise(r=>setTimeout(r,15))}}finally{await cleanup.stop()}
      assert.equal((await db.collection('workspaceResults').findOne({userId:'legacy-copy'}))!.base64,undefined)
      assert.equal((await db.collection('workspaceResults').findOne({userId:'other-copy'}))!.base64,'must-remain')
    })
    await t.test('account isolation, verified byte size and duplicate references do not renew first save',async()=>{
      const a=await save('isolation',1024,1),savedAt=+new Date(a.savedAt)
      await assert.rejects(library.read('other',a.id),{status:404})
      await assert.rejects(library.remove('other',a.id),{status:404})
      time+=86400000
      const same=await save('isolation',1024,1,'second-job')
      assert.equal(same.id,a.id);assert.equal(+new Date(same.savedAt),savedAt)
      assert.equal(+new Date(same.expiresAt),savedAt+IMAGE_LIBRARY_RETENTION_MS)
      assert.equal((await library.list('isolation')).usedBytes,1024)
      await db.collection('paperbanana_jobs').insertOne({_id:'second-job',userId:'isolation',resultImages:[{libraryId:a.id,candidateId:4}]} as any)
      assert.equal((await library.status('isolation')).images[0].sources.find((s:any)=>s.jobId==='second-job').resultIndex,0)
      assert.equal((await library.read('isolation',a.id)).base64,bytes(1024,1).toString('base64'))
    })
    await t.test('evicts multiple oldest files and leaves generation statistics unchanged',async()=>{
      const a=await save('quota',40_000_000,1);time++
      const b=await save('quota',40_000_000,2);time++
      await db.collection('paperbanana_jobs').insertOne({_id:'stats',userId:'quota',status:'succeeded',completedAt:new Date(time),resultImages:[{candidateId:0,objectKey:'a.png',mimeType:'image/png'},{candidateId:1,objectKey:'b.png',mimeType:'image/png'}]} as any)
      const before=await readDrawingActivity(db.collection('paperbanana_jobs'),'quota',new Date(time))
      const c=await save('quota',70_000_000,3)
      const list=await library.list('quota');assert.equal(list.usedBytes,70_000_000);assert.deepEqual(list.images.map((i:any)=>i.id),[c.id])
      await assert.rejects(library.read('quota',a.id),/因存储空间不足已清理/);await assert.rejects(library.read('quota',b.id),{status:410})
      assert.deepEqual(await readDrawingActivity(db.collection('paperbanana_jobs'),'quota',new Date(time)),before)
    })
    await t.test('failed PUT and failed metadata commit never evict old files',async()=>{
      const old=await save('failure',60_000_000,4)
      putFailure=true;await assert.rejects(save('failure',50_000_000,5),/PUT_FAILED/);putFailure=false
      assert.equal((await library.list('failure')).images[0].id,old.id)
      // Fail only the final transaction, after the new object has been written.
      const original=bucket.headFile
      bucket.headFile=async k=>{const head=await original(k);commitFailure=true;return head}
      await assert.rejects(save('failure',50_000_000,6),/COMMIT_FAILED/)
      bucket.headFile=original;commitFailure=false
      assert.equal((await library.list('failure')).usedBytes,60_000_000)
      assert.equal((await library.get('failure',old.id)).state,'active')
    })
    await t.test('failed deletion remains charged and retries without losing the newly saved file',async()=>{
      await save('cleanup',60_000_000,7);time++;deleteFailure=true
      const fresh=await save('cleanup',50_000_000,8)
      const pending=await library.list('cleanup');assert.equal(pending.usedBytes,110_000_000);assert.equal(pending.pendingBytes,60_000_000)
      assert.deepEqual(pending.images.map((i:any)=>i.id),[fresh.id])
      const priorFiles=files.size
      await assert.rejects(save('cleanup',1024,99),/清理尚未完成/)
      assert.equal(files.size,priorFiles)
      deleteFailure=false;await library.sweep()
      assert.equal((await library.list('cleanup')).usedBytes,50_000_000)
      assert.equal((await library.list('cleanup')).pendingBytes,0)
    })
    await t.test('concurrent identical saves count one file; different saves serialize quota decisions',async()=>{
      const concurrent=await Promise.all(Array.from({length:8},(_,i)=>save('race',10000,9,'job-'+i)))
      assert.equal(new Set(concurrent.map(r=>r.id)).size,1)
      assert.equal((await library.list('race')).usedBytes,10000)
      const attempts=await Promise.allSettled([save('race-quota',60_000_000,10),save('race-quota',60_000_000,11)])
      for(const [i,result] of attempts.entries())if(result.status==='rejected'){assert.equal(result.reason.status,503);await save('race-quota',60_000_000,10+i)}
      assert.equal((await library.list('race-quota')).usedBytes,60_000_000)
      assert.equal((await library.list('race-quota')).images.length,1)
    })
    await t.test('single oversized file is rejected before writes or eviction',async()=>{
      const before=files.size
      await assert.rejects(save('oversized',IMAGE_LIBRARY_MAX_BYTES+1,1),{status:413})
      assert.equal(files.size,before);assert.equal((await library.list('oversized')).usedBytes,0)
    })
    await t.test('task deletion removes inputs and body but retains independently owned image',async()=>{
      const image=await save('task-owner',4096,12,'remove-job'),row=await library.get('task-owner',image.id)
      await bucket.writeFile('remove-job/material.txt',Buffer.from('synthetic private input'))
      await db.collection('paperbanana_jobs').insertOne({_id:'remove-job',userId:'task-owner',status:'succeeded',prompt:'synthetic input',resultImages:[{objectKey:row.objectKey,libraryId:image.id}]} as any)
      const removeTask=createWorkspaceJobDeletion({db,bucket:()=>bucket,listKeys:async(prefix:string)=>(await bucket.listFiles({Prefix:prefix})).Contents.map(o=>o.Key),objectKeys:(j:any)=>j.resultImages?.map((i:any)=>i.objectKey)||[],deleteMaterials:async()=>{}})
      await removeTask('task-owner',['remove-job'])
      assert.equal(await db.collection('paperbanana_jobs').findOne({_id:'remove-job'} as any),null)
      assert.ok(deleted.includes('remove-job/material.txt'))
      assert.equal((await library.read('task-owner',image.id)).size,4096)
      await library.deleteOwner('task-owner')
      await assert.rejects(library.read('task-owner',image.id),{status:403})
      assert.equal([...files.keys()].includes(row.objectKey),false)
    })
    await t.test('legacy result quarantine retains image only while task and original input are deleted',async()=>{
      await bucket.writeFile('legacy-job/final.png',bytes(128,21))
      await bucket.writeFile('legacy-job/input.txt',Buffer.from('PRIVATE ORIGINAL'))
      await db.collection('paperbanana_jobs').insertOne({_id:'legacy-job',userId:'legacy-owner',status:'succeeded',prompt:'PRIVATE BODY',resultImages:[{objectKey:'legacy-job/final.png',mimeType:'image/png'}]} as any)
      const erase=createWorkspaceJobDeletion({db,bucket:()=>bucket,listKeys:async(prefix:string)=>(await bucket.listFiles({Prefix:prefix})).Contents.map(o=>o.Key),objectKeys:(j:any)=>j.resultImages?.map((i:any)=>i.objectKey)||[],deleteMaterials:async()=>{},preserveResults:library.preserveLegacyResults})
      await erase('legacy-owner',['legacy-job'])
      assert.equal(await db.collection('paperbanana_jobs').findOne({_id:'legacy-job'} as any),null)
      assert.ok(files.has('legacy-job/final.png'));assert.ok(!files.has('legacy-job/input.txt'))
      assert.doesNotMatch(JSON.stringify(await db.collection('paperbanana_image_legacy_review').find({}).toArray()),/PRIVATE/)
      await assert.rejects(library.list('legacy-owner'),/完整容量/)
      await library.deleteOwner('legacy-owner');assert.ok(!files.has('legacy-job/final.png'))
    })
    await t.test('gateway persists Core-only result references and manual SVGs under one account quota',async()=>{
      await db.collection('user').insertMany([{_id:'bridge-owner'},{_id:'foreign-owner'}] as any)
      const bridge={save:(u:string,input:any)=>library.save(u,{...input,bytes:Buffer.from(input.base64,'base64'),source:{taskId:input.taskId}}),read:library.read,status:library.status}
      const store:any=accountWorkspaceStore({db,mongoClient:client,factory:(options:any)=>createWorkspaceStore({...options,imageLibrary:bridge}),mutations:['put','saveResult','beginDelete','finishDelete']})
      const native=await library.save('bridge-owner',{format:'svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2"/>'),source:{jobId:'bridge-job',candidateId:2}})
      let state=newWorkspace('bridge-task')
      state=workspaceReducer(state,{type:'SET_PATH',path:'svg'})
      state=workspaceReducer(state,{type:'SAVE_SVG',runId:'manual',versionId:'manual-version',url:'data:image/svg+xml,<svg/>'})
      const version=state.tasks[0].branches.svg.groups[0].candidates[0].versions[0]
      const manual=await store.saveResult('bridge-owner',{format:'svg',base64:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'),taskId:'bridge-task'})
      version.resultId=manual.resultId
      // The native image has no Gateway workspaceResults row.
      const extra=structuredClone(version);extra.id='native-version';extra.resultId=native.id;extra.format='svg';extra.number=2
      state.tasks[0].branches.svg.groups[0].candidates[0].versions.push(extra)
      await store.put('bridge-owner',0,state)
      assert.equal((await store.result('bridge-owner',native.id)).format,'svg')
      await assert.rejects(store.result('foreign-owner',native.id),{status:404})
      await store.beginDelete('bridge-owner','bridge-task',1);await store.finishDelete('bridge-owner','bridge-task')
      assert.equal((await library.list('bridge-owner')).images.length,2)
      assert.equal((await store.result('bridge-owner',manual.resultId)).format,'svg')
      assert.equal(await db.collection('workspaceQuotas').countDocuments({userId:'bridge-owner'}),0)
      await library.remove('bridge-owner',native.id)
      await assert.rejects(store.result('bridge-owner',native.id),{status:410})
    })
    await t.test('account closure races a paused upload safely and settles all orphaned bytes',async()=>{
      let release!:()=>void;gate=new Promise<void>(r=>release=r)
      const pending=save('closing',1024,13)
      while(!await db.collection('paperbanana_image_uploads').findOne({userId:'closing'}))await new Promise(r=>setTimeout(r,5))
      await assert.rejects(library.deleteOwner('closing'),/SETTLEMENT_PENDING/)
      gate=undefined;release();await assert.rejects(pending,{status:403})
      time+=10*60_000+1;await library.deleteOwner('closing')
      assert.equal(await db.collection('paperbanana_image_assets').countDocuments({userId:'closing'}),0)
    })
    await t.test('30-day expiry runs without login and never resurrects a repeated reference',async()=>{
      const image=await save('expiry',1024,14),savedAt=+new Date(image.savedAt)
      time=savedAt+IMAGE_LIBRARY_RETENTION_MS-1;assert.equal((await library.list('expiry')).images.length,1)
      time++;library.start()
      for(let i=0;i<100;i++){if((await db.collection('paperbanana_image_assets').findOne({userId:'expiry'}))?.deletedAt)break;await new Promise(r=>setTimeout(r,10))}
      await library.stop()
      assert.ok((await db.collection('paperbanana_image_assets').findOne({userId:'expiry'}))?.deletedAt)
      await assert.rejects(library.read('expiry',image.id),/图片已过期/)
      const duplicate=await save('expiry',1024,14,'new-reference')
      assert.equal(duplicate.status,'removed');assert.equal(+new Date(duplicate.savedAt),savedAt);assert.equal((await library.list('expiry')).usedBytes,0)
    })
    await t.test('historical inventory quarantines unknown timestamps and does not mutate source rows',async()=>{
      const data=bytes(100,15),id=createHash('sha256').update('png').update(data).digest('hex')
      const row={userId:'legacy',resultId:id,format:'png',size:100,base64:data.toString('base64'),createdAt:new Date(time-1000)}
      const jobs=[{_id:'missing-time',userId:'legacy',createdAt:new Date(time),resultImages:[{filename:'missing-time/candidate-0.png'}]}]
      const before=JSON.stringify(jobs)
      const plan=await planImageLibraryMigration({jobs,results:[row],now:new Date(time),inspect:async()=>inspectLegacyWorkspaceImage(row)})
      assert.equal(plan.ready.length,1);assert.equal(plan.ready[0].savedAt,row.createdAt.toISOString());assert.equal(plan.review[0].reason,'UNRELIABLE_FIRST_SAVE_TIME');assert.equal(plan.canApply,false)
      assert.equal(JSON.stringify(jobs),before)
    })
  }finally{await library.stop();await db.dropDatabase();await client.close();await rm(dir,{recursive:true,force:true})}
})
