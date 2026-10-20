import { createHash, randomUUID } from 'node:crypto'
import { IMAGE_LIBRARY_MAX_BYTES, IMAGE_LIBRARY_RETENTION_MS, imageRemovalMessage } from '../../../packages/api/src/image-library.mjs'

const fail = (status: number, message: string) => Object.assign(Error(message), { status })
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const mime = (format: string) => format === 'svg' ? 'image/svg+xml' : 'image/png'
const ASSETS = 'paperbanana_image_assets', UPLOADS = 'paperbanana_image_uploads', OWNERS = 'paperbanana_image_owners'
const sourceFields = ['jobId', 'taskId', 'resultId']
export const accountImagePrefix = (userId: string) => `account-images/${digest(userId)}/`
export const imageContentId = (format: string, bytes: Buffer) => createHash('sha256').update(format).update(bytes).digest('hex')

// Metadata and eviction decisions commit together under an owner write fence.
// OSS writes/deletes never run in a retried Mongo transaction. Durable upload
// and deletion records reconcile ambiguous network failures and process exits.
export function createImageLibrary({ db, transaction, bucket, now = () => new Date(), sweepIntervalMs = 60_000 }: any) {
  let timer: ReturnType<typeof setInterval> | undefined
  let sweepPromise: Promise<any> | undefined
  const assets = db.collection(ASSETS), uploads = db.collection(UPLOADS)
  const key = (userId: string, id: string) => `${digest(userId)}:${id}`
  async function locked(userId: string, work: (session: any) => Promise<any>, closing = false) {
    if (!userId) throw fail(401, 'SIGN_IN_REQUIRED')
    try { await db.collection(OWNERS).updateOne({ _id: digest(userId) }, { $setOnInsert: { userId, version: 0 } }, { upsert: true }) }
    catch (error: any) { if (error.code !== 11000) throw error }
    return transaction(async (session: any) => {
      const lifecycle = await db.collection('paperbanana_account_deletions').findOne({ _id: `user:${userId}` }, { session })
      const owner = await db.collection(OWNERS).findOne({ _id: digest(userId) }, { session })
      if (!closing && (owner?.closed || lifecycle && lifecycle.status !== 'active')) throw fail(403, 'ACCOUNT_LIFECYCLE_CLOSED')
      await db.collection(OWNERS).updateOne({ _id: digest(userId) }, {
        $inc: { version: 1 }, ...(closing ? { $set: { closed: true } } : {}),
      }, { session })
      return work(session)
    })
  }
  function publicRow(row: any) {
    return { id: row.id, format: row.format, size: row.size, savedAt: row.savedAt, expiresAt: row.expiresAt,
      status: row.state === 'active' ? 'saved' : 'removed', reason: row.reason || '',
      retentionHold:!!row.retentionHold,holdReason:row.holdReason||'',
      sources: (row.sources || []).map((s: any) => ({...Object.fromEntries(sourceFields.filter(k => s[k]).map(k => [k, s[k]])),
        ...(Number.isSafeInteger(s.candidateId)?{candidateId:s.candidateId}:{})})) }
  }
  function cleanSource(source: any) {
    const value = Object.fromEntries(sourceFields.filter(k => typeof source?.[k] === 'string' && /^[\w-]{1,160}$/.test(source[k])).map(k => [k, source[k]]))
    if (!Object.keys(value).length) throw fail(400, 'IMAGE_SOURCE_REQUIRED')
    if (Number.isSafeInteger(source?.candidateId) && source.candidateId >= 0) value.candidateId = source.candidateId
    return value
  }
  async function expire(userId: string) {
    await locked(userId, async session => {
      await assets.updateMany({ userId, state: 'active', retentionHold:{$ne:true}, expiresAt: { $lte: now() } },
        { $set: { state: 'removed', reason: 'expired', deletePending: true } }, { session })
    })
  }
  async function drain(userId: string) {
    // Keep byte accounting until deletion is confirmed. A timeout can mean the
    // object was removed: retrying the exact immutable key remains safe.
    let failures = 0
    for (const row of await assets.find({ userId, deletePending: true }).toArray()) {
      try {
        for(const legacyKey of row.legacyObjectKeys||[])await bucket().deleteFile(legacyKey)
        if(row.legacyImageDocIds?.length)await db.collection('paperbanana_images').deleteMany({_id:{$in:row.legacyImageDocIds}})
        await bucket().deleteFile(row.objectKey)
        await assets.updateOne({ _id: row._id, state: 'removed', objectKey: row.objectKey },
          { $set: { deletePending: false, deletedAt: now() } })
        await uploads.deleteMany({userId,objectKey:row.objectKey,state:'adopted'})
      } catch { failures++ }
    }
    return failures
  }
  async function retireUpload(row: any) {
    await uploads.updateOne({ _id: row._id, state: { $ne: 'adopted' } }, { $set: { state: 'abandoned' } })
    const current = await uploads.findOne({ _id: row._id })
    if (!current || current.state === 'adopted') return
    try {
      await bucket().deleteFile(row.objectKey)
      // Retain the tiny tombstone: a timed-out PUT may finish after DELETE.
      // The periodic sweeper repeats deletion until the bounded PUT settles.
      if(+now()-+new Date(row.createdAt)>=10*60_000)await uploads.deleteOne({_id:row._id,state:'abandoned'})
      else await uploads.updateOne({ _id: row._id }, { $set: { lastDeletedAt: now() } })
    } catch {}
  }
  async function save(userId: string, { format, bytes, source, historicalSavedAt }: any) {
    if (!['png', 'svg'].includes(format) || !Buffer.isBuffer(bytes) || !bytes.length) throw fail(400, 'INVALID_IMAGE')
    if (bytes.length > IMAGE_LIBRARY_MAX_BYTES) throw fail(413, imageRemovalMessage('oversized'))
    if(await db.collection('paperbanana_image_legacy_review').findOne({userId}))throw fail(503,'历史图片待核对，暂缓保存新图片。')
    const reference = cleanSource(source), id = imageContentId(format, bytes), identity = key(userId, id)
    // Historical timestamps are accepted only by the offline migration API,
    // never from public HTTP. Missing dates are quarantined by the planner.
    const historical = historicalSavedAt ? new Date(historicalSavedAt) : null
    if (historical && (!Number.isFinite(+historical) || +historical > +now())) throw fail(400, 'UNRELIABLE_SAVE_TIME')
    const existing = await locked(userId, async session => {
      const row = await assets.findOne({ _id: identity }, { session })
      if (row) await assets.updateOne({ _id: identity }, { $addToSet: { sources: reference } }, { session })
      return row
    })
    if (existing) {
      await expire(userId); await drain(userId)
      return publicRow(await assets.findOne({ _id: identity }))
    }
    await expire(userId); await drain(userId)
    if (await assets.findOne({ userId, deletePending: true })) throw fail(503, '图片清理尚未完成，请稍后重试保存。')
    const upload = { _id: randomUUID(), userId, id, format, size: bytes.length, state: 'uploading',
      createdAt: now(), objectKey: `${accountImagePrefix(userId)}${randomUUID()}.${format}` }
    await locked(userId, async session => {
      if (await assets.findOne({userId,deletePending:true},{session})) throw fail(503,'图片清理尚未完成，请稍后重试保存。')
      const held=await assets.find({userId,state:'active',retentionHold:true},{session}).toArray()
      if(held.reduce((n:number,r:any)=>n+r.size,0)+bytes.length>IMAGE_LIBRARY_MAX_BYTES)throw fail(413,'历史图片受保护，剩余空间不足；请先下载并确认处理历史图片。')
      // Bound in-flight staging per account as well as committed storage.
      const pending=await uploads.find({userId,state:'uploading'},{session}).toArray()
      if(pending.reduce((n:number,r:any)=>n+r.size,0)+bytes.length>IMAGE_LIBRARY_MAX_BYTES)throw fail(503,'图片正在保存，请稍后重试。')
      await uploads.insertOne(upload,{session})
    })
    try {
      await bucket().writeFile(upload.objectKey, bytes, { ContentType: mime(format), 'x-oss-meta-sha256': digest(bytes), CacheControl:'private, no-store' }, {timeoutMs:120_000})
      const head = await bucket().headFile(upload.objectKey)
      if (head.size !== bytes.length || head.sha256 !== digest(bytes)) throw fail(503, 'IMAGE_WRITE_VERIFICATION_FAILED')
      const savedAt = historical || now()
      await locked(userId, async session => {
        const pending = await uploads.findOne({ _id: upload._id, state: 'uploading' }, { session })
        if (!pending) throw fail(409, 'IMAGE_UPLOAD_EXPIRED')
        if (await assets.findOne({userId,deletePending:true},{session})) throw fail(503,'图片清理尚未完成，请稍后重试保存。')
        const prior = await assets.findOne({ _id: identity }, { session })
        if (prior) {
          await assets.updateOne({ _id: identity }, { $addToSet: { sources: reference } }, { session })
          await uploads.updateOne({ _id: upload._id }, { $set: { state: 'abandoned' } }, { session })
          return
        }
        const expiresAt = new Date(+savedAt + IMAGE_LIBRARY_RETENTION_MS)
        const expired = +expiresAt <= +now()
        // Only now is the new file confirmed. A failed PUT or transaction
        // cannot nominate unexpired old images for capacity eviction.
        await assets.updateMany({ userId, state: 'active', retentionHold:{$ne:true}, expiresAt: { $lte: now() } },
          { $set: { state: 'removed', reason: 'expired', deletePending: true } }, { session })
        const active = await assets.find({ userId, state: 'active' }, { session }).sort({ savedAt: 1, id: 1 }).toArray()
        let total = active.reduce((n: number, r: any) => n + r.size, expired ? 0 : bytes.length)
        for (const old of active) {
          if(old.retentionHold)continue
          if (total <= IMAGE_LIBRARY_MAX_BYTES) break
          await assets.updateOne({ _id: old._id, state: 'active' },
            { $set: { state: 'removed', reason: 'capacity', deletePending: true } }, { session })
          total -= old.size
        }
        if(total>IMAGE_LIBRARY_MAX_BYTES)throw fail(413,'历史图片受保护，剩余空间不足。')
        await assets.insertOne({ _id: identity, userId, id, format, size: head.size, savedAt, expiresAt,
          objectKey: upload.objectKey, sources: [reference], state: expired ? 'removed' : 'active',
          ...(expired ? { reason: 'expired', deletePending: true } : {}) }, { session })
        await uploads.updateOne({ _id: upload._id }, { $set: { state: 'adopted' } }, { session })
      })
    } catch (error) {
      // Reconcile an ambiguous transaction commit before touching its object.
      const committed = await assets.findOne({ _id: identity })
      if (committed?.objectKey !== upload.objectKey) await retireUpload(upload)
      if (!committed) throw error
    }
    const committed = await assets.findOne({ _id: identity })
    if (committed?.objectKey !== upload.objectKey) await retireUpload(upload)
    await drain(userId)
    return publicRow(committed)
  }
  async function list(userId: string) {
    await locked(userId,async()=>{})
    if(await db.collection('paperbanana_image_legacy_review').findOne({userId}))throw fail(503,'历史图片待核对，暂不能提供完整容量。')
    await expire(userId); await drain(userId)
    const rows = await assets.find({ userId, $or: [{ state: 'active' }, { deletePending: true }] }).sort({ savedAt: -1, id: 1 }).toArray()
    const pendingBytes = rows.filter((r: any) => r.deletePending).reduce((n: number, r: any) => n + r.size, 0)
    return { maxBytes: IMAGE_LIBRARY_MAX_BYTES, retentionMs: IMAGE_LIBRARY_RETENTION_MS,
      usedBytes: rows.reduce((n: number, r: any) => n + r.size, 0), pendingBytes,
      unavailableHistoryCount:await db.collection('paperbanana_image_history_issues').countDocuments({userId}),
      protectedBytes:rows.filter((r:any)=>r.retentionHold&&r.state==='active').reduce((n:number,r:any)=>n+r.size,0),
      images: rows.filter((r: any) => r.state === 'active').map(publicRow) }
  }
  async function get(userId: string, id: string) {
    await locked(userId, async () => {})
    if (!/^[a-f0-9]{64}$/.test(id)) throw fail(404, 'IMAGE_NOT_FOUND')
    const row = await assets.findOne({ _id: key(userId, id) })
    if (!row) throw fail(404, 'IMAGE_NOT_FOUND')
    if (row.state !== 'active' || !row.retentionHold && +new Date(row.expiresAt) <= +now()) {
      throw fail(410, imageRemovalMessage(row.reason || 'expired'))
    }
    return row
  }
  async function status(userId: string) {
    await locked(userId, async () => {})
    const rows=await assets.find({userId},{projection:{objectKey:0}}).toArray()
    const jobIds=[...new Set(rows.flatMap((r:any)=>(r.sources||[]).map((s:any)=>s.jobId).filter(Boolean)))]
    const jobs=await db.collection('paperbanana_jobs').find({_id:{$in:jobIds},$or:[{userId},{userId:{$in:[null,'']},user_id:userId}]},{projection:{resultImages:1,result_images:1}}).toArray()
    const byJob=new Map(jobs.map((j:any)=>[String(j._id),j]))
    const issues=await db.collection('paperbanana_image_history_issues').find({userId}).toArray()
    return {images:rows.map((row:any)=>({
      ...publicRow(row),sources:(row.sources||[]).flatMap((source:any)=>{
        const job:any=byJob.get(source.jobId)
        const indices=(job?.resultImages||job?.result_images||[]).flatMap((image:any,index:number)=>image.libraryId===row.id?[index]:[])
        return indices.length?indices.map((resultIndex:number)=>({...source,resultIndex})):[source]
      }),...(!row.retentionHold&&+new Date(row.expiresAt)<=+now()&&row.state==='active'?{status:'removed',reason:'expired'}:{}),
    })).concat(issues.map((r:any)=>({id:r._id,status:'removed',reason:r.reason,sources:[{jobId:r.jobId,resultIndex:r.resultIndex}]})))}
  }
  async function byObjectKey(userId: string, objectKey: string) {
    const row = await assets.findOne({userId,$or:[{objectKey},{legacyObjectKeys:objectKey}]})
    if(!row)throw fail(404,'IMAGE_NOT_FOUND')
    return get(userId,row.id)
  }
  async function read(userId: string, id: string) {
    const row = await get(userId, id)
    const bytes = await bucket().readFile(row.objectKey, row.size, { timeoutMs: 30000 })
    if (bytes.length !== row.size) throw fail(503, 'IMAGE_READ_VERIFICATION_FAILED')
    // Expiry or a concurrent capacity eviction also invalidates in-flight reads.
    await get(userId, id)
    return { ...publicRow(row), base64: Buffer.from(bytes).toString('base64') }
  }
  async function projection(userId: string, image: any) {
    if (!image.libraryId) {
      const issue=await db.collection('paperbanana_image_history_issues').findOne({userId,objectKey:image.objectKey||image.filename})
      return issue?{...image,url:'',storageStatus:'unavailable',storageError:imageRemovalMessage('historical-missing')}:image
    }
    try {
      const row = await get(userId, image.libraryId)
      const seconds = row.retentionHold?60:Math.min(60, Math.floor((+new Date(row.expiresAt) - +now()) / 1000))
      if(seconds<1)throw fail(410,imageRemovalMessage('expired'))
      return { ...image,objectKey:row.objectKey,storageError:'', ...{ storageStatus: 'saved', savedAt: row.savedAt, expiresAt: row.expiresAt, size: row.size },
        url: await bucket().getDownloadUrl(row.objectKey, seconds) }
    } catch (error: any) {
      return { ...image, url: '', storageStatus: error.status === 410 ? 'removed' : 'unavailable',
        storageError: error.status === 410 ? error.message : '图片暂不可用，请稍后重试' }
    }
  }
  async function remove(userId: string, id: string) {
    await locked(userId, async session => {
      const row = await assets.findOne({ _id: key(userId, id) }, { session })
      if (!row) throw fail(404, 'IMAGE_NOT_FOUND')
      if (row.state === 'active') await assets.updateOne({ _id: row._id },
        { $set: { state: 'removed', reason: 'deleted', deletePending: true } }, { session })
    })
    await drain(userId)
    return list(userId)
  }
  async function deleteOwner(userId: string) {
    await locked(userId, async session => {
      await assets.updateMany({ userId }, { $set: { state: 'removed', reason: 'deleted', deletePending: true } }, { session })
      await uploads.updateMany({ userId, state: { $ne: 'adopted' } }, { $set: { state: 'abandoned' } }, { session })
    }, true)
    if (await uploads.findOne({ userId, state: 'abandoned', createdAt: { $gt: new Date(+now() - 10 * 60_000) } })) {
      throw fail(503, 'IMAGE_UPLOAD_SETTLEMENT_PENDING')
    }
    if (await drain(userId)) throw fail(503, 'IMAGE_ACCOUNT_CLEANUP_PENDING')
    for (const upload of await uploads.find({ userId, state: 'abandoned' }).toArray()) await retireUpload(upload)
    // Inventory the account prefix as well, including orphaned upload attempts.
    for (const object of (await bucket().listFiles({ Prefix: accountImagePrefix(userId) })).Contents || []) await bucket().deleteFile(object.Key)
    for(const row of await db.collection('paperbanana_image_legacy_review').find({userId}).toArray())await bucket().deleteFile(row.objectKey)
    await db.collection('paperbanana_image_legacy_review').deleteMany({userId})
    await db.collection('paperbanana_image_history_issues').deleteMany({userId})
    await assets.deleteMany({ userId })
    // Keep pending upload IDs for late PUT settlement, without content or names.
    await uploads.deleteMany({ userId, state: 'adopted' })
  }
  async function preserveLegacyResults(userId:string,job:any) {
    // Preserve only verified final-result keys, never the job body or uploads.
    // Missing dates stay in a review queue, with no guessed retention clock.
    for(const image of job?.resultImages||job?.result_images||[]){
      if(image.libraryId)continue
      const objectKey=image.objectKey||image.object_key||image.filename||''
      const format=/svg/i.test(image.mimeType||image.mime_type||objectKey)?'svg':/png/i.test(image.mimeType||image.mime_type||objectKey)?'png':''
      if(!format||!objectKey.includes('/')||objectKey.startsWith('account-images/'))continue
      if(await db.collection('paperbanana_image_history_issues').findOne({userId,objectKey}))continue
      const sourceId=objectKey.split('/')[0]
      const owner=await db.collection('paperbanana_jobs').findOne({_id:sourceId,$or:[{userId},{userId:{$in:[null,'']},user_id:userId}]})
      if(!owner&&!await db.collection('paperbanana_task_deletions').findOne({userId,jobId:sourceId}))continue
      await locked(userId,session=>db.collection('paperbanana_image_legacy_review').updateOne({_id:key(userId,digest(objectKey))},{$setOnInsert:{userId,objectKey,format,sourceJobId:sourceId,reason:'MIGRATION_EVIDENCE_REQUIRED'}},{upsert:true,session}))
    }
    const managed=await assets.find({userId}).toArray()
    return [...(await db.collection('paperbanana_image_legacy_review').find({userId}).toArray()).map((row:any)=>row.objectKey),...managed.flatMap((row:any)=>[row.objectKey,...(row.legacyObjectKeys||[])])]
  }
  async function sweep() {
    const owners = await db.collection(OWNERS).find({}).toArray()
    for (const owner of owners) {
      try { if (owner.closed) await deleteOwner(owner.userId); else { await expire(owner.userId); await drain(owner.userId) } }
      catch { /* Durable records remain; next timer retries. */ }
    }
    for (const upload of await uploads.find({ $or: [{ state: 'abandoned' }, { state: 'uploading', createdAt: { $lte: new Date(+now() - 10 * 60_000) } }] }).toArray()) await retireUpload(upload)
  }
  return {
    save, list, status, get, byObjectKey, read, projection, remove, deleteOwner, sweep, preserveLegacyResults,
    async ensureIndexes() {
      await assets.createIndex({ userId: 1, state: 1, savedAt: -1 })
      await assets.createIndex({ expiresAt: 1, state: 1 })
      await uploads.createIndex({ state: 1, createdAt: 1 })
    },
    start() {
      if (timer) return
      const tick = () => { if (!sweepPromise) sweepPromise = sweep().catch(() => { /* Persistent records are retried next tick, including database outages. */ }).finally(() => { sweepPromise = undefined }) }
      timer = setInterval(tick, sweepIntervalMs); timer.unref?.(); tick()
    },
    async stop() { if (timer) clearInterval(timer); timer = undefined; await sweepPromise },
  }
}
