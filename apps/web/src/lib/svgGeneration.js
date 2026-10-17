import { getFigureType } from '../../../../packages/figure-taxonomy/src/index.js';
export const svgTaskRunning = job => !!job && !['succeeded','completed','failed','cancelled','canceled'].includes(job.status);
export function useSvgWorkspace(job,outputFormat) {
  // Older plotting jobs requested SVG but actually returned PNG.
  const images=job?.result_images||[];
  if(images.length && images.every(i=>!isSvgImage(i)) && !job?.stages?.some(s=>s.type==='svg_source'))return false;
  return (job?.output_format || outputFormat)==='svg';
}
export const isSvgImage = image => /svg/i.test(image?.mime_type||image?.mimeType||'') || /\.svg(?:$|[?#])/i.test(image?.filename||image?.url||'');
export function svgCandidates(job) {
  const byId=new Map();
  for(let id=0;id<Math.min(32,Number(job?.num_candidates)||1);id++)byId.set(id,{id,versions:[]});
  const add=(id,version)=>{if(!byId.has(id))byId.set(id,{id,versions:[]});byId.get(id).versions.push(version);};
  for(const stage of job?.stages||[]) {
    if(stage.type!=='svg_source' || !stage.image?.url)continue;
    const id=Number(stage.candidate_id??stage.candidateId??0);
    let evidence={};try{evidence=JSON.parse(stage.text);}catch{/* stage text can be human-readable */}
    add(id,{key:stage.id||`${id}:${stage.round}:${stage.image.filename}`,image:stage.image,title:stage.title||`SVG v${Number(stage.round)+1}`,hash:evidence.svgHash||'',review:null});
  }
  for(const image of job?.result_images||[]) {
    if(!isSvgImage(image))continue;
    const id=Number(image.candidate_id??image.candidateId??0);
    add(id,{key:image.object_key||image.filename||`final-${id}`,image,title:'原始生成结果',review:image.review||null,final:true});
  }
  return [...byId.values()].sort((a,b)=>a.id-b.id);
}
export function svgPhase(job,submitting) {
  if(!job)return submitting?'正在提交任务与材料；等待服务器返回真实阶段。':'空白画布 · 生成 SVG 后在此直接编辑';
  if(job.status==='failed')return '任务未完成；保留已产生的可用版本，可直接编辑和导出。';
  if(['cancelled','canceled'].includes(job.status))return '任务已停止；保留可用版本。';
  if(!svgTaskRunning(job))return '生成已结束 · 单击选中，拖动移动，双击文字改字';
  const reads=job.materialReads||[];
  const last=job.stages?.at(-1);
  if(last)return `最近实际阶段：${last.title||last.type} · 等待后续结果`;
  if(reads.length){const state=reads.at(-1).status||reads.at(-1).state;return `材料读取：${({reading:'读取中',pending:'等待读取',ok:'已返回读取结果',partial:'已返回部分读取结果',succeeded:'读取完成',completed:'读取完成',failed:'读取失败'})[state]||state||'已返回读取记录'}`;}
  return job.status==='queued'?'任务排队中 · 等待执行':'任务执行中 · 尚未收到可显示的 SVG 或阶段记录';
}
export function hasEncodedData(job) {
  const source=job?.generationContext||job||{};
  return !!job?.hasDataEncoding || getFigureType(source.figureTypeId)?.kind==='data' || source.task_name==='plot' || source.taskName==='plot' || !!source.figureData || !!source.figurePanels?.some(hasEncodedData);
}
