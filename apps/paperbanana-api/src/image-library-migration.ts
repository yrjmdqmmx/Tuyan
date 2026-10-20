import { createHash } from 'node:crypto'
import { IMAGE_LIBRARY_MAX_BYTES, IMAGE_LIBRARY_RETENTION_MS } from '../../../packages/api/src/image-library.mjs'
import { imageContentId } from './image-library.js'

// Read-only inventory. Do not infer first-save time from migration time, task
// renames, job creation/completion or a possibly overwritten object's mtime.
export async function planImageLibraryMigration({ jobs, results, inspect, now = new Date() }: any) {
  const ready: any[] = [], review: any[] = []
  const record = async (source: any) => {
    const savedAt = new Date(source.savedAt), owner = source.userId
    const reject = (reason: string) => review.push({kind:source.kind,jobId:source.jobId,resultId:source.resultId,index:source.index,reason})
    if (!owner || typeof owner !== 'string') return reject('MISSING_IMMUTABLE_ACCOUNT')
    if (!['png','svg'].includes(source.format)) return reject('OUTSIDE_RESULT_SCOPE')
    if (!source.savedAt || !Number.isFinite(+savedAt) || +savedAt > +now) return reject('UNRELIABLE_FIRST_SAVE_TIME')
    try {
      const evidence = await inspect(source)
      if (!Number.isSafeInteger(evidence.size) || evidence.size <= 0 || !/^[a-f0-9]{64}$/.test(evidence.id)) return reject('UNVERIFIED_BYTES')
      if (evidence.size > IMAGE_LIBRARY_MAX_BYTES) return reject('EXCEEDS_SINGLE_IMAGE_LIMIT')
      // Expired historical files need a separately reviewed disposition. The
      // migration command is never permission to delete them.
      if (+savedAt + IMAGE_LIBRARY_RETENTION_MS <= +now) return reject('HISTORICAL_EXPIRED_REQUIRES_REVIEW')
      ready.push({...source,savedAt:savedAt.toISOString(),size:evidence.size,id:evidence.id,sha256:evidence.sha256})
    } catch { reject('FILE_UNAVAILABLE_OR_UNVERIFIED') }
  }
  for (const job of jobs) for (const [index,image] of (job.resultImages || job.result_images || []).entries()) {
    await record({kind:'oss',userId:job.userId||job.user_id,jobId:String(job._id),index,
      objectKey:image.objectKey||image.object_key||image.filename,
      format:/svg/i.test(image.mimeType||image.mime_type||image.filename||'')?'svg':/png/i.test(image.mimeType||image.mime_type||image.filename||'')?'png':'',
      savedAt:image.savedAt||image.firstSavedAt})
  }
  for (const row of results) {
    if(row.library)continue;
    await record({kind:'workspace',userId:row.userId,resultId:row.resultId,format:row.format,savedAt:row.createdAt})
  }
  const groups=new Map<string,any>();
  for(const row of ready){
    const key=`${row.userId}:${row.id}`,prior=groups.get(key);
    if(!prior)groups.set(key,{userId:row.userId,id:row.id,size:row.size,savedAt:row.savedAt,references:[row]});
    else{prior.references.push(row);if(row.savedAt<prior.savedAt)prior.savedAt=row.savedAt;}
  }
  const accounts=new Map<string,number>();
  for(const row of groups.values())accounts.set(row.userId,(accounts.get(row.userId)||0)+row.size);
  const overCapacity=[...accounts].filter(([,size])=>size>IMAGE_LIBRARY_MAX_BYTES).map(([userId,size])=>({userId,size}));
  return {version:1,readOnly:true,generatedAt:now.toISOString(),ready:[...groups.values()],review,overCapacity,
    canApply:review.length===0&&overCapacity.length===0,
    instructions:'先核对待处理记录与超额账号，再在冻结写入的隔离副本演练。首次保存时间取可靠证据中的最早值；本报告不会上传、删除或改写数据。'};
}
export function inspectLegacyWorkspaceImage(row:any) {
  if(typeof row.base64!=='string')throw Error('MISSING_BYTES')
  const bytes=Buffer.from(row.base64,'base64')
  if(row.size!==bytes.length)throw Error('SIZE_MISMATCH')
  const id=imageContentId(row.format,bytes)
  if(id!==row.resultId)throw Error('CONTENT_ID_MISMATCH')
  return {size:bytes.length,id,sha256:createHash('sha256').update(bytes).digest('hex')}
}
