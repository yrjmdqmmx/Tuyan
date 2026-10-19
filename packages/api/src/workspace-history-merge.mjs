import { newTask, newDraft } from './workspace-defaults.mjs';
import { cleanWorkspace } from './workspace-sync.mjs';
const done = new Set(['completed','succeeded','failed','cancelled','canceled']);
const key = job => `history-${job.source}-${job.id}`;
const status = job => !done.has(job.status) ? 'running' : ['failed','cancelled','canceled'].includes(job.status) ? 'failed' : 'succeeded';
export function historyDraft(job) {
  const d=newDraft();d.text=job.text;d.caption=job.caption;d.avoid=job.avoid;d.mode=job.mode;
  const settings={...(job.manualReferenceIds?.length?{manualReferenceIds:job.manualReferenceIds}:{}),ratio:/^(auto|\d+(?:\.\d+)?:\d+(?:\.\d+)?)$/.test(job.ratio)&&(job.ratio==='auto'||job.ratio.length<=20&&job.ratio.split(':').every(n=>Number(n)>0&&Number(n)<=100))?job.ratio:'auto',candidates:Math.min(6,Math.max(1,job.candidates)),reviews:Math.min(5,Math.max(0,job.reviews)),
    ...(job.figureTypeId?{figureTypeId:job.figureTypeId}:{}), ...(job.imageSize?{imageSize:job.imageSize}:{}),
    ...(['planner_critic','full'].includes(job.pipelineMode)?{pipelineMode:job.pipelineMode}:{}), ...(['auto','none','random','manual'].includes(job.retrievalSetting)?{retrievalSetting:job.retrievalSetting}:{})};
  d.settings={simple:structuredClone(settings),advanced:structuredClone(settings)};
  // Unknown historical journal snapshots remain untouched in the source record;
  // only compatible selections become editable defaults.
  if(job.journalSelection){try{const t=newTask('validation');t.branches.png.draft=d;d.settings[d.mode].journalSelection=job.journalSelection;cleanWorkspace({schema:1,selectedTaskId:t.id,tasks:[t]});}catch{delete d.settings[d.mode].journalSelection;}}
  return d;
}
export function mergeAccountHistory(state, jobs) {
  const next=structuredClone(state);let changed=false;
  const sorted=[...jobs].sort((a,b)=>a.createdAt-b.createdAt);
  for(const job of sorted){
    // The account service knows accepted native runs before every tab has
    // received their jobId. Do not turn that propagation gap into a new task.
    const existing=next.tasks.flatMap(t=>t.runs).find(r=>r.history?.jobId===job.id);
    if(!existing && job.workspaceExecution?.taskId && job.workspaceExecution?.runId)continue;
    const runId=existing?.id || key(job);
    // A native workspace execution is already represented; never import it twice.
    if(!existing && next.tasks.some(t=>t.runs.some(r=>!r.history&&r.execution?.jobId===job.id)))continue;
    let task=next.tasks.find(t=>t.runs.some(r=>r.id===runId));
    if(!task && job.sourceTaskId)task=next.tasks.find(t=>t.runs.some(r=>r.history?.jobId===job.sourceTaskId));
    if(!task){task=newTask(runId,job.format);task.title=job.title || '历史任务';task.automaticTitle=false;next.tasks.push(task);}
    let run=task.runs.find(r=>r.id===runId), fresh=!run;
    if(fresh){const input=historyDraft(job);run={id:runId,path:job.format,kind:job.kind,status:status(job),accepted:true,groupId:runId,candidateId:null,parentId:null,input,draftRevision:0,navRevision:0,stage:'',createdAt:job.createdAt,
      history:{source:job.source,jobId:job.id,sourceTaskId:job.sourceTaskId,status:job.status,models:job.models,ratio:job.ratio,candidates:job.candidates,reviews:job.reviews,originalCount:job.originalCount}};
      task.runs.push(run);if(task.runs.length===1)task.branches[job.format].draft=structuredClone(input);changed=true;
    }
    if(fresh || run.status==='running'){
      run.status=status(job);run.history.status=job.status;run.stage=run.status==='running'?(job.status==='awaiting_provider'?'历史任务已暂停，可在执行详情继续原任务':'历史任务仍在服务器执行，正在同步状态'):run.status==='failed'?'历史执行未完成':'已恢复服务器历史结果';
      if(job.error)run.error=job.error;
      if(run.status==='running' && !task.activeRunId)task.activeRunId=run.id;
      if(task.activeRunId===run.id && run.status!=='running')task.activeRunId=task.runs.find(r=>r.history&&r.status==='running')?.id||null;
    }
    for(const image of job.results){
      const b=task.branches[image.format],versionId=`${runId}-${image.index}`;
      // Current service produces one format per job. An inconsistent old entry
      // is retained as execution metadata, without inventing a PNG/SVG conversion.
      if(image.format!==run.path)continue;
      let group=b.groups.find(g=>g.id===runId);
      if(!group){group={id:runId,runId,number:b.groups.length+1,expected:Math.min(6,Math.max(job.results.length,job.candidates)),candidates:[]};b.groups.push(group);changed=true;}
      let candidate=group.candidates.find(c=>c.id===versionId);
      if(!candidate){candidate={id:versionId,label:String.fromCharCode(65+image.index),viewedVersionId:versionId,versions:[{id:versionId,format:image.format,number:1,parentId:null,runId,origin:job.kind==='refine'?'历史精修':'历史生成',review:image.review || '未提供评审结论',createdAt:job.createdAt,history:{source:job.source,jobId:job.id,index:image.index}}]};group.candidates.push(candidate);changed=true;}
      const version=candidate.versions[0];version.url=image.url;version.loadError=image.url?'':'历史结果文件暂不可用，记录已保留。';
      if(!b.versionId){b.groupId=group.id;b.candidateId=candidate.id;b.versionId=version.id;}
    }
  }
  return changed || JSON.stringify(next)!==JSON.stringify(state) ? next : state;
}
