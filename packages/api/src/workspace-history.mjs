// Strict projection for account history. No keys, original bytes, logs or arbitrary URLs.
const text = (value, max = 100000) => typeof value === 'string' ? value.slice(0, max) : '';
export const historyId = value => typeof value === 'string' && /^[\w-]{1,100}$/.test(value) ? value : '';
export function historyJob(job, source, owner, details = false) {
  if (String(job.userId || job.user_id || '') !== String(owner)) throw Object.assign(Error('HISTORY_OWNER_MISMATCH'), { status: 403 });
  const id = historyId(job.id || job._id);
  if (!id) throw Object.assign(Error('INVALID_HISTORY_JOB'), { status: 400 });
  const pick = (a, b) => job[a] ?? job[b];
  const models = Object.fromEntries(['main','image','vision'].flatMap(role => {
    const route = (job.modelRoutes || job.model_routes)?.[role];
    const modelId = route?.modelId || ({main:job.mainModelName || job.main_model_name,image:job.imageModelName || job.image_gen_model_name,vision:job.referenceVisionModelName || job.reference_vision_model_name})[role];
    return modelId ? [[role, { modelId:text(modelId,500), accessProvider:text(route?.accessProvider || job.provider,80) }]] : [];
  }));
  return { ...(details?{recovery:job.recovery?{canResume:job.recovery.canResume===true,channel:text(job.recovery.channel,80),action:text(job.recovery.action,80),message:text(job.recovery.message,2000),requestState:text(job.recovery.requestState,40),billingStatus:text(job.recovery.billingStatus,40),retryAt:text(job.recovery.retryAt,100)}:null,stages:(job.stages||[]).slice(0,100).map(s=>({id:text(s.id,100),type:text(s.type,60),title:text(s.title,200),text:text(s.text,20000),candidate_id:Number(s.candidateId??s.candidate_id)||0,round:Number(s.round)||0,...(typeof s.image?.url==='string'&&/^https?:\/\//.test(s.image.url)?{image:{url:s.image.url}}:{})})), journalName:text(job.journalProfile?.name,200),journalVersion:text(job.journalProfile?.version,100),...(job.journalProfile?{journalProfile:{name:text(job.journalProfile.name,200),version:text(job.journalProfile.version,100),selection:{stage:text(job.journalProfile.selection?.stage,30),purpose:text(job.journalProfile.selection?.purpose,30)}}}:{})}:{}), ownerId:String(owner), id, source, sourceTaskId:historyId(job.sourceTaskId), status:text(job.status,40), kind:pick('jobType','job_type') === 'refine' ? 'refine' : 'generate',
    title:text(job.title || job.caption || job.methodContent || job.method_content || '历史任务',120),
    text:text(job.requirements || job.methodContent || job.method_content), caption:text(job.caption), avoid:text(pick('negativePrompt','negative_prompt')),
    createdAt:Math.max(0,Date.parse(pick('createdAt','created_at')) || 0), updatedAt:Math.max(0,Date.parse(pick('updatedAt','updated_at')) || 0),
    format:pick('outputFormat','output_format') === 'svg' ? 'svg' : 'png', mode:pick('configurationMode','configuration_mode') === 'advanced' ? 'advanced' : 'simple',
    ratio:text(pick('aspectRatio','aspect_ratio'),40) || 'auto', candidates:Number(pick('numCandidates','num_candidates')) || 1, reviews:Number(pick('maxCriticRounds','max_critic_rounds')) || 0,
    imageSize:text(pick('imageSize','image_size'),40), pipelineMode:text(pick('pipelineMode','pipeline_mode'),40), retrievalSetting:text(pick('retrievalSetting','retrieval_setting'),40), figureTypeId:historyId(job.figureTypeId),
    manualReferenceIds:(job.manualReferenceIds||[]).filter(v=>typeof v==='string').slice(0,10).map(v=>v.slice(0,120)),
    journalSelection:job.journalSelection ? Object.fromEntries(['journalId','version','stage','purpose','contentType','widthMm','rasterKind','contentSource','figureTypeId'].filter(k=>['string','number'].includes(typeof job.journalSelection[k])).map(k=>[k,job.journalSelection[k]])) : null, models, error:text(job.error,2000),
    originalCount:Math.max(Number(job.referenceImageCount || job.reference_image_count) || 0,(job.materialFiles || []).length),
    results:(job.resultImages || job.result_images || []).slice(0,6).map((image,index) => ({ index, format:/svg/i.test(image.mimeType || image.mime_type || image.filename || '') ? 'svg' : 'png',
      // Only URLs returned by the authenticated job API may reach the preview. Never persist them.
      url:typeof image.url === 'string' && image.url.length <= 14_000_000 && (/^https?:\/\//.test(image.url) || /^data:image\/(?:png|svg\+xml)(?:;charset=utf-8)?(?:;base64)?,/i.test(image.url)) ? image.url : '',
      ...((image.storageError||image.storage_error)?{storageError:text(image.storageError||image.storage_error,200)}:{}),
      review:text(image.review?.note || image.review?.status,1000), candidate:String(image.candidateId ?? image.candidate_id ?? index) })) };
}
