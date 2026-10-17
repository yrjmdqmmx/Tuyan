import {journalFigureContent,JOURNAL_CONTENT} from '../../../../packages/api/src/journal-rules.js';

export function refineTaskContext(job = {}) {
  const context={...job,...job.generationContext};
  const journalSelection=Object.hasOwn(job,'journalSelection')?job.journalSelection:context.journalSelection??null;
  const figureTypeId=context.figureTypeId||journalSelection?.figureTypeId;
  const contentType=job.sourceContentType||context.sourceContentType||journalSelection?.contentType||journalFigureContent(figureTypeId);
  return {jobId:job.id||job._id,figureTypeId,contentType:Object.hasOwn(JOURNAL_CONTENT,contentType)?contentType:null,journalSelection};
}

export function refineSourceIssue(source = {}) {
  if(!source.url)return '';
  if(!source.contentType)return source.taskContext?'原任务缺少图型与图像性质记录，请确认原图性质。':'请先确认这张新图的原图性质。';
  if(source.contentType==='primary')return '当前生成式精修不能处理原始科研图像，请保留原始证据并使用适合的科研图像工作流。';
  return '';
}

export function normalizeRefineSource(url, image = {}) {
  return {
    url: String(url || ''),
    objectKey: String(image.objectKey || image.object_key || ''),
  }
}

export function refineRequestSource(source = {}) {
  if(source.materialId)return {sourceImageUpload:{materialId:source.materialId}};
  if (source.uploaded && source.objectKey) return { sourceImageUpload: { objectKey: source.objectKey } }
  if (source.objectKey) return { sourceImageObjectKey: source.objectKey }
  if (source.url?.startsWith('blob:')) return {}
  return source.url ? { sourceImageUrl: source.url } : {}
}
