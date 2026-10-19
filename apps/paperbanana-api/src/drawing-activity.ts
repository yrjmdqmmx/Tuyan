import type { Collection } from 'mongodb'
import { drawingActivityFromJobs } from '../../../packages/api/src/drawing-activity.mjs'

export async function readDrawingActivity(jobs: Collection, userId: string, now = new Date()) {
  if (!userId) throw Object.assign(Error('SIGN_IN_REQUIRED'),{status:401})
  // Projection excludes prompts, secrets, stages and large image URLs/base64.
  const cursor = jobs.find({$or:[{userId},{userId:{$in:[null,'']},user_id:userId}]},{projection:{
    _id:1,status:1,completedAt:1,completed_at:1,createdAt:1,created_at:1,
    'resultImages.candidateId':1,'resultImages.candidate_id':1,'resultImages.filename':1,'resultImages.objectKey':1,'resultImages.mimeType':1,'resultImages.mime_type':1,'resultImages.deliveredAt':1,
    'result_images.candidate_id':1,'result_images.candidateId':1,'result_images.filename':1,'result_images.objectKey':1,'result_images.mime_type':1,'result_images.mimeType':1,'result_images.deliveredAt':1,
    'candidateProgress.candidateId':1,'candidateProgress.status':1,
  },maxTimeMS:10_000}).batchSize(500)
  try { return await drawingActivityFromJobs(cursor,now) }
  finally { await cursor.close() }
}
