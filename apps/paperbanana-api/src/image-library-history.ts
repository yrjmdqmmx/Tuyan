import {ObjectId} from 'mongodb'
import {createHash} from 'node:crypto'
import {accountImagePrefix,imageContentId} from './image-library.js'
import {IMAGE_LIBRARY_RETENTION_MS} from '../../../packages/api/src/image-library.mjs'

const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex')
const date=(value:any)=>value && Number.isFinite(+new Date(value)) ? new Date(value).toISOString() : null

// This planner reads only final result references and exported server bytes.
// Neither OSS LastModified nor task created/updated dates prove first save.
export function planHistoricalImages({core,auth,legacy,now=new Date()}:any) {
  const users=new Set(auth.users.map((u:any)=>String(u.id||u._id)))
  const closed=new Set((legacy.lifecycle||[]).filter((r:any)=>r.status!=='active').map((r:any)=>r.userId||String(r._id).replace(/^user:/,'')))
  const jobs=new Map(core.jobs.map((j:any)=>[String(j._id),j]))
  const objects=new Map(core.objects.map((o:any)=>[o.key,o]))
  const docs=new Map((legacy.images||[]).map((r:any)=>[String(r._id),r]))
  const groups=new Map<string,any>(),review:any[]=[]
  const add=(userId:string,format:string,bytes:Buffer,savedAt:any,source:any,original:any)=>{
    if(!users.has(userId)||closed.has(userId)){review.push({source,reason:userId?'UNRESOLVED_OR_CLOSED_ACCOUNT':'ANONYMOUS_RESULT'});return}
    if(!['png','svg'].includes(format)||!bytes.length){review.push({source,reason:'UNVERIFIED_FORMAT_OR_BYTES'});return}
    if(format==='png'&&!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('INVALID_HISTORICAL_PNG')
    if(format==='svg'&&!/<svg[\s>]/i.test(bytes.toString('utf8')))throw Error('INVALID_HISTORICAL_SVG')
    const id=imageContentId(format,bytes),identity=`${userId}:${id}`,timestamp=date(savedAt)
    const reliable=timestamp&&+new Date(timestamp)<=+now?timestamp:null
    const row=groups.get(identity)||{userId,id,format,size:bytes.length,sha256:sha(bytes),base64:bytes.toString('base64'),savedAt:reliable,unknownTime:!reliable,sources:[],originals:[]}
    row.unknownTime ||= !reliable
    if(reliable&&(!row.savedAt||reliable<row.savedAt))row.savedAt=reliable
    row.sources.push(source);row.originals.push(original);groups.set(identity,row)
  }
  for(const job of core.jobs)for(const [index,image]of(job.resultImages||[]).entries()){
    const userId=job.userId||job.user_id||'',source={jobId:String(job._id),candidateId:image.candidateId,index}
    const objectKey=image.objectKey||image.object_key||image.filename
    const object:any=objects.get(objectKey),doc:any=docs.get(String(image.imageId||''))
    const format=/svg/i.test(image.mimeType||image.mime_type||objectKey||'')?'svg':'png'
    let bytes:Buffer|undefined,savedAt=image.savedAt||image.firstSavedAt
    let original:any={kind:'job',jobId:source.jobId,index,imageFingerprint:sha(JSON.stringify(image))}
    if(object?.base64){
      const owner:any=jobs.get(String(objectKey).split('/')[0])
      if(!owner||(owner.userId||owner.user_id||'')!==userId){review.push({source,reason:'UNVERIFIED_OBJECT_OWNER'});continue}
      bytes=Buffer.from(object.base64,'base64')
      if(bytes.length!==object.size||sha(bytes)!==object.sha256)throw Error('SNAPSHOT_OBJECT_MISMATCH')
      original.objectKey=objectKey
    } else if(doc?.base64&&String(doc.jobId)===source.jobId){
      bytes=Buffer.from(doc.base64,'base64');if(bytes.length!==doc.bytes)throw Error('SNAPSHOT_DOCUMENT_MISMATCH')
      savedAt ||= doc.createdAt;original.imageDocId=String(doc._id)
    } else if(/^data:image\/(?:png|svg\+xml);base64,/.test(image.url||'')){
      bytes=Buffer.from(image.url.split(',')[1],'base64')
    }
    if(!bytes){review.push({userId,source,objectKey,reason:'SOURCE_BYTES_MISSING'});continue}
    add(userId,format,bytes,savedAt,source,original)
  }
  for(const row of auth.records.workspaceResults||[]){
    if(row.library)continue
    const bytes=Buffer.from(row.base64||'','base64')
    if(bytes.length!==row.size||imageContentId(row.format,bytes)!==row.resultId)throw Error('WORKSPACE_CONTENT_MISMATCH')
    add(row.userId,row.format,bytes,row.createdAt,{resultId:row.resultId},{kind:'workspace',resultId:row.resultId})
  }
  const files=[...groups.values()].map(row=>{
    const savedAt=row.unknownTime?null:row.savedAt
    const expiresAt=savedAt?new Date(+new Date(savedAt)+IMAGE_LIBRARY_RETENTION_MS).toISOString():null
    const holdReason=!savedAt?'unknown-save-time':+new Date(expiresAt!)<=+now?'historical-expired':''
    return {...row,savedAt,expiresAt,holdReason,retentionHold:!!holdReason}
  })
  return {version:1,at:now.toISOString(),files,review,
    summary:{files:files.length,bytes:files.reduce((n,r)=>n+r.size,0),accounts:new Set(files.map(r=>r.userId)).size,
      unknownTime:files.filter(r=>r.holdReason==='unknown-save-time').length,
      historicalExpired:files.filter(r=>r.holdReason==='historical-expired').length,
      reviewRecords:review.length},
    // Stable receipt excludes generatedAt and raw bytes; content hashes bind them.
    fingerprint:sha(JSON.stringify(files.map(({base64,...r})=>r)))}
}

// Run only under deployment maintenance after a fresh inventory. Idempotent,
// additive object writes; no object DELETE, task delete or timestamp reset.
// Auth stubs are switched last, so an interrupted pass can safely resume.
export async function applyHistoricalImages({db,authDb,bucket,plan,transaction}:any){
  if(plan.version!==1)throw Error('UNSUPPORTED_HISTORY_PLAN')
  const receipt={files:0,references:0,workspaceResults:0,deletedObjects:0}
  for(const file of plan.files){
    const bytes=Buffer.from(file.base64,'base64'),ownerId=sha(file.userId),identity=`${ownerId}:${file.id}`
    if(bytes.length!==file.size||sha(bytes)!==file.sha256||imageContentId(file.format,bytes)!==file.id)throw Error('HISTORY_PLAN_CONTENT_MISMATCH')
    if(!await authDb.collection('user').findOne({$or:[{id:file.userId},{_id:file.userId},...(ObjectId.isValid(file.userId)?[{_id:new ObjectId(file.userId)}]:[])]}))throw Error('HISTORY_ACCOUNT_NOT_FOUND')
    const lifecycle=await db.collection('paperbanana_account_deletions').findOne({_id:`user:${file.userId}`})
    if(lifecycle&&lifecycle.status!=='active')throw Error('HISTORY_ACCOUNT_CLOSED')
    // Verify each original reference before creating a new object.
    for(const original of file.originals.filter((r:any)=>r.kind==='job')){
      const job=await db.collection('paperbanana_jobs').findOne({_id:original.jobId})
      if(!job||(job.userId||job.user_id)!==file.userId)throw Error('HISTORY_JOB_OWNER_CHANGED')
      const image=(job.resultImages||[])[original.index]
      if(image?.libraryId!==file.id&&sha(JSON.stringify(image))!==original.imageFingerprint)throw Error('HISTORY_REFERENCE_CHANGED')
    }
    const objectKey=`${accountImagePrefix(file.userId)}history-${file.id}.${file.format}`
    let head:any
    try{head=await bucket.headFile(objectKey)}catch(e:any){if(!['NoSuchKey','NoSuchObject'].includes(e.code)&&e.status!==404)throw e}
    if(!head){
      await bucket.writeFile(objectKey,bytes,{ContentType:file.format==='png'?'image/png':'image/svg+xml','x-oss-meta-sha256':file.sha256,CacheControl:'private, no-store'},{timeoutMs:120000})
      head=await bucket.headFile(objectKey)
    }
    if(head.size!==file.size||head.sha256!==file.sha256)throw Error('HISTORY_WRITE_VERIFICATION_FAILED')
    // Read back every file, not merely an upload acknowledgement.
    if(sha(await bucket.readFile(objectKey,file.size))!==file.sha256)throw Error('HISTORY_READBACK_FAILED')
    await transaction(async(session:any)=>{
      const owner=await db.collection('paperbanana_image_owners').findOne({_id:ownerId},{session})
      if(owner?.closed)throw Error('HISTORY_ACCOUNT_CLOSED')
      await db.collection('paperbanana_image_owners').updateOne({_id:ownerId},{$setOnInsert:{userId:file.userId},$inc:{version:1}},{upsert:true,session})
      const existing=await db.collection('paperbanana_image_assets').findOne({_id:identity},{session})
      if(existing&&(existing.objectKey!==objectKey||existing.historyReceipt!==plan.fingerprint))throw Error('HISTORY_ASSET_CONFLICT')
      await db.collection('paperbanana_image_assets').updateOne({_id:identity},{$setOnInsert:{
        userId:file.userId,id:file.id,format:file.format,size:file.size,objectKey,state:'active',
        savedAt:file.savedAt?new Date(file.savedAt):null,expiresAt:file.expiresAt?new Date(file.expiresAt):null,
        retentionHold:file.retentionHold,holdReason:file.holdReason,historyReceipt:plan.fingerprint,
        sources:file.sources.map(({index,...s}:any)=>s),
        legacyObjectKeys:[...new Set(file.originals.map((r:any)=>r.objectKey).filter(Boolean))],
        legacyImageDocIds:file.originals.map((r:any)=>r.imageDocId).filter(Boolean),
      }},{upsert:true,session})
      for(const original of file.originals.filter((r:any)=>r.kind==='job')){
        const prefix=`resultImages.${original.index}`
        await db.collection('paperbanana_jobs').updateOne({_id:original.jobId},{$set:{
          [`${prefix}.libraryId`]:file.id,[`${prefix}.storage`]:'library',[`${prefix}.objectKey`]:objectKey,
        }},{session})
      }
    })
    for(const original of file.originals.filter((r:any)=>r.kind==='workspace')){
      const row=await authDb.collection('workspaceResults').findOne({userId:file.userId,resultId:original.resultId})
      if(!row||row.size!==file.size||row.base64&&sha(Buffer.from(row.base64,'base64'))!==file.sha256)throw Error('HISTORY_WORKSPACE_CHANGED')
      // Original bytes remain in the migration backup and are not exposed by
      // the library-aware result route. No original bytes are deleted here.
      await authDb.collection('workspaceResults').updateOne({_id:row._id,userId:file.userId},{$set:{library:true,historyReceipt:plan.fingerprint}})
      receipt.workspaceResults++
    }
    receipt.files++;receipt.references+=file.sources.length
  }
  for(const issue of plan.review.filter((r:any)=>r.reason==='SOURCE_BYTES_MISSING'&&r.userId)){
    await db.collection('paperbanana_image_history_issues').updateOne({_id:sha(issue.userId+':'+issue.source.jobId+':'+issue.source.index)},{$setOnInsert:{userId:issue.userId,objectKey:issue.objectKey,jobId:issue.source.jobId,resultIndex:issue.source.index,reason:'historical-missing'}},{upsert:true})
  }
  return receipt
}
