import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {MongoClient} from 'mongodb'
import {loadConfig} from '../src/config.js'
import {createOssAdapter} from '../src/oss-adapter.js'
import {applyHistoricalImages} from '../src/image-library-history.js'
import {readDrawingActivity} from '../src/drawing-activity.js'
import {createImageLibrary} from '../src/image-library.js'

// Operator-only executable. Credentials enter on stdin, never CLI arguments or
// receipts. The host wrapper owns maintenance + the production release lock.
async function main(){
const input=JSON.parse(await readFile('/dev/stdin','utf8'))
if(input.operation!=='apply-image-history'||input.maintenanceVerified!==true)throw Error('MAINTENANCE_REQUIRED')
const plan=JSON.parse(await readFile(input.planPath,'utf8'))
if(plan.fingerprint!==input.expectedFingerprint)throw Error('PLAN_RECEIPT_MISMATCH')
const config=loadConfig(process.env)
const client=new MongoClient(config.mongodb.uri),authClient=new MongoClient(input.authMongoUri)
await client.connect();await authClient.connect()
const db=client.db(config.mongodb.database),authDb=authClient.db(input.authDbName)
const hash=(v:any)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const transaction=async(work:any)=>{const session=client.startSession();try{return await session.withTransaction(()=>work(session),{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}})}finally{await session.endSession()}}
const unchanged=(rows:any[])=>rows.map(j=>({...j,resultImages:(j.resultImages||[]).map(({libraryId,objectKey,storage,...image}:any)=>image)}))
try{
 const jobs=await db.collection('paperbanana_jobs').find({}).sort({_id:1}).toArray()
 const expected=new Map(input.expectedJobs.map((r:any)=>[r.id,r.sha256]))
 if(jobs.length!==expected.size||jobs.some(j=>hash(j)!==expected.get(String(j._id))))throw Error('PRODUCTION_JOBS_CHANGED_REFRESH_INVENTORY')
 if(jobs.some(j=>['running','queued'].includes(j.status)))throw Error('ACTIVE_JOB_BLOCKS_MIGRATION')
 const tasks=await authDb.collection('workspaceDocuments').find({}).sort({_id:1}).toArray()
 const results=await authDb.collection('workspaceResults').find({}).sort({_id:1}).toArray()
 const originals=await db.collection('paperbanana_images').find({}).sort({_id:1}).toArray()
 const checkTime=new Date(),owners=[...new Set<string>(plan.files.map((f:any)=>f.userId))]
 const activity=async()=>Promise.all(owners.map(userId=>readDrawingActivity(db.collection('paperbanana_jobs'),userId,checkTime)))
 const activityBefore=await activity()
 const before={activityHash:hash(activityBefore),jobs:jobs.length,taskDocuments:tasks.length,taskCount:tasks.reduce((n,r)=>n+(r.state?.tasks?.length||0),0),
  jobContentHash:hash(unchanged(jobs)),workspaceHash:hash(tasks),resultBytesHash:hash(results.map(({library,historyReceipt,...r})=>r)),imageDocumentsHash:hash(originals)}
 // Save before mutation; immutable root-only path supplied by operator.
 await writeFile(input.backupPath,JSON.stringify({jobs,tasks,results,originals,before}),{flag:'wx',mode:0o600})
 const bucket=createOssAdapter(config.oss).bucket(config.oss.bucket)
 const receipt=await applyHistoricalImages({db,authDb,bucket,plan,transaction})
 const after={...before,activityHash:hash(await activity()),
  jobContentHash:hash(unchanged(await db.collection('paperbanana_jobs').find({}).sort({_id:1}).toArray())),
  workspaceHash:hash(await authDb.collection('workspaceDocuments').find({}).sort({_id:1}).toArray()),
  resultBytesHash:hash((await authDb.collection('workspaceResults').find({}).sort({_id:1}).toArray()).map(({library,historyReceipt,...r})=>r)),
  imageDocumentsHash:hash(await db.collection('paperbanana_images').find({}).sort({_id:1}).toArray())}
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('POST_MIGRATION_SOURCE_CHANGED_KEEP_MAINTENANCE')
 const library=createImageLibrary({db,transaction,bucket:()=>bucket})
 const accounts=[]
 for(const userId of new Set<string>(plan.files.map((f:any)=>f.userId))){
  const actual=await library.list(userId),expected=plan.files.filter((f:any)=>f.userId===userId)
  if(actual.images.length!==expected.length||actual.usedBytes!==expected.reduce((n:number,r:any)=>n+r.size,0))throw Error('MIGRATION_CAPACITY_MISMATCH')
  accounts.push({accountHash:hash(userId).slice(0,12),files:actual.images.length,bytes:actual.usedBytes,protectedBytes:actual.protectedBytes})
 }
 const output={passed:true,modelCalls:0,deletedOriginalImages:0,deletedTasks:0,receipt,accounts,before,after,planFingerprint:plan.fingerprint}
 await writeFile(input.receiptPath,JSON.stringify(output,null,2),{flag:'wx',mode:0o600})
 console.log(JSON.stringify(output))
}finally{await client.close();await authClient.close()}

}
void main().catch((error:any)=>{console.error(JSON.stringify({failed:true,error:/^[A-Z_]+$/.test(error.message)?error.message:error.code||error.name}));process.exitCode=1})
