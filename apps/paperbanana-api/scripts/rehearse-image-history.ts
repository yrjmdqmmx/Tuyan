import {MongoClient} from 'mongodb'
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {planHistoricalImages,applyHistoricalImages} from '../src/image-library-history.js'
import {readDrawingActivity} from '../src/drawing-activity.js'
import {createImageLibrary} from '../src/image-library.js'
const [directory,reportPath]=process.argv.slice(2),uri=process.env.WORKSPACE_COMPAT_TEST_URI||''
assert.match(uri,/^mongodb:\/\/127\.0\.0\.1:\d+\//)
if(!directory||!reportPath)throw Error('Usage: isolated Mongo URI + snapshot-directory new-report.json')
const input=async(name:string)=>JSON.parse(await readFile(path.join(directory,name),'utf8'))
const core=await input('core-snapshot.json'),auth=await input('auth-snapshot-complete.json'),legacy=await input('legacy-documents.json')
const plan=planHistoricalImages({core,auth,legacy}),client=new MongoClient(uri)
await client.connect()
const database=`image_history_rehearsal_${Date.now()}`,db=client.db(database),authDb=client.db(database+'_auth')
const directoryCopy=await mkdtemp(path.join(tmpdir(),'tuyan-history-rehearsal-'))
const files=new Map<string,any>(),deleted:string[]=[]
const hash=(b:any)=>createHash('sha256').update(b).digest('hex')
let failWrite=true,time=Date.now()
const bucket={
 async writeFile(key:string,bytes:Buffer){if(failWrite)throw Error('SYNTHETIC_PUT_FAILURE');const target=path.join(directoryCopy,hash(key));await writeFile(target,bytes);files.set(key,{path:target,size:bytes.length,sha256:hash(bytes)})},
 async headFile(key:string){if(!files.has(key))throw Object.assign(Error('NOT_FOUND'),{status:404});return files.get(key)},
 async readFile(key:string){return readFile(files.get(key).path)},
 async deleteFile(key:string){const f=files.get(key);if(f)await rm(f.path,{force:true});files.delete(key);deleted.push(key)},
 async listFiles({Prefix}:any){return {Contents:[...files.keys()].filter(k=>k.startsWith(Prefix)).map(Key=>({Key}))}},
 async getDownloadUrl(key:string){return 'https://synthetic.invalid/'+key},
}
const transaction=async(work:any)=>{const s=client.startSession();try{return await s.withTransaction(()=>work(s))}finally{await s.endSession()}}
const options={db,authDb,bucket,plan,transaction}
const stableJob=(job:any)=>JSON.stringify({...job,resultImages:job.resultImages.map(({libraryId,objectKey,storage,...r}:any)=>r)})
const evidence:any={isolated:true,productionWrites:0,modelCalls:0,plan:plan.summary,checks:[]}
try{
 await db.collection('paperbanana_jobs').insertMany(core.jobs)
 if(legacy.images.length)await db.collection('paperbanana_images').insertMany(legacy.images)
 await authDb.collection('user').insertMany(auth.users)
 for(const [name,rows]of Object.entries(auth.records) as [string,any[]][])if(rows.length)await authDb.collection(name).insertMany(rows)
 const checkTime=new Date(),activity=async()=>Promise.all([...new Set<string>(plan.files.map((f:any)=>f.userId))].map(userId=>readDrawingActivity(db.collection('paperbanana_jobs'),userId,checkTime)))
 const activityBefore=await activity()
 const jobsBefore=(await db.collection('paperbanana_jobs').find({}).sort({_id:1}).toArray()).map(stableJob)
 const tasksBefore=JSON.stringify(await authDb.collection('workspaceDocuments').find({}).toArray())
 await assert.rejects(applyHistoricalImages(options),/SYNTHETIC_PUT_FAILURE/)
 assert.equal(await db.collection('paperbanana_image_assets').countDocuments(),0)
 assert.deepEqual((await db.collection('paperbanana_jobs').find({}).sort({_id:1}).toArray()).map(stableJob),jobsBefore)
 evidence.checks.push('failed first upload changes no original reference')
 failWrite=false
 // Fail a commit after files have been durably written. Resume must adopt
 // that exact object, verify it again, and preserve all first-save evidence.
 let commits=0
 await assert.rejects(applyHistoricalImages({...options,transaction:async(work:any)=>transaction(async(s:any)=>{const r=await work(s);if(++commits===3)throw Error('SYNTHETIC_COMMIT_FAILURE');return r})}),/SYNTHETIC_COMMIT_FAILURE/)
 const receipt=await applyHistoricalImages(options)
 const first=JSON.stringify(await db.collection('paperbanana_image_assets').find({}).sort({_id:1}).toArray())
 await applyHistoricalImages(options)
 assert.equal(JSON.stringify(await db.collection('paperbanana_image_assets').find({}).sort({_id:1}).toArray()),first)
 assert.equal(deleted.length,0)
 assert.deepEqual(await activity(),activityBefore)
 evidence.checks.push('existing usage statistics unchanged')
 assert.deepEqual((await db.collection('paperbanana_jobs').find({}).sort({_id:1}).toArray()).map(stableJob),jobsBefore)
 assert.equal(JSON.stringify(await authDb.collection('workspaceDocuments').find({}).toArray()),tasksBefore)
 assert.equal(await db.collection('paperbanana_jobs').countDocuments(),core.jobs.length)
 evidence.checks.push('partial commit resumes without duplicate storage','repeat migration is metadata-idempotent','no original object or task deletion','workspace documents and task content unchanged')
 const library=createImageLibrary({db,transaction,bucket:()=>bucket,now:()=>new Date(time)})
 for(const userId of new Set(plan.files.map((f:any)=>f.userId))){
  const expected=plan.files.filter((f:any)=>f.userId===userId)
  const list=await library.list(userId)
  assert.equal(list.usedBytes,expected.reduce((n:number,f:any)=>n+f.size,0))
  assert.equal(list.images.length,expected.length)
  for(const file of expected){
   const image=await library.read(userId,file.id)
   assert.equal(hash(Buffer.from(image.base64,'base64')),file.sha256)
   assert.equal(image.savedAt?new Date(image.savedAt).toISOString():null,file.savedAt)
   await assert.rejects(library.read('isolated-other-account',file.id),{status:404})
  }
 }
 evidence.checks.push('every migrated byte read back and hashed','owner isolation','first-save dates preserved; unknown remains null','all duplicate references count once')
 time+=31*86400000;await library.sweep()
 for(const file of plan.files){
  if(file.retentionHold)assert.equal((await library.read(file.userId,file.id)).size,file.size)
  else await assert.rejects(library.read(file.userId,file.id),{status:410})
 }
 evidence.checks.push('unknown and pre-expired history survive automatic sweep','reliable unexpired records retain original expiry')
 const held=plan.files.find((f:any)=>f.retentionHold)
 if(held){
  const before=(await library.list(held.userId)).usedBytes
  await assert.rejects(library.save(held.userId,{format:'png',bytes:Buffer.alloc(100_000_000,1),source:{jobId:'synthetic-quota-probe'}}),/历史图片受保护/)
  assert.equal((await library.list(held.userId)).usedBytes,before)
  evidence.checks.push('quota pressure cannot evict protected historical files')
 }
 evidence.receipt=receipt;evidence.passed=true
 await writeFile(reportPath,JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600})
 console.log(JSON.stringify(evidence))
}finally{
 await db.dropDatabase();await authDb.dropDatabase();await client.close()
 await rm(directoryCopy,{recursive:true,force:true})
}
