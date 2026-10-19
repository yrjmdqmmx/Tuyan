// Versioned, credential-free persistence contract; not a model execution API.
export const WORKSPACE_SYNC_VERSION = 1;
export const MAX_WORKSPACE_BYTES = 2_000_000;
export const MAX_RESULT_BYTES = 10_000_000;
const fail = () => { throw Object.assign(new Error('工作区数据格式不受支持，原草稿已保留。'), { status: 400 }); };
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : fail();
const str = (v, max = 160) => typeof v === 'string' && v.length <= max ? v : fail();
const id = v => /^[\w-]{1,160}$/.test(str(v)) ? v : fail();
const optionalId = v => v == null ? null : id(v);
const num = (v, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= 0 && v <= max ? v : fail();
const bool = v => typeof v === 'boolean' ? v : fail();
const choice = (v, values) => values.includes(v) ? v : fail();
const list = (v, max, f) => Array.isArray(v) && v.length <= max ? v.map(f) : fail();
const unique = values => new Set(values).size === values.length || fail();
function journal(j) {
  if (j == null) return null;
  obj(j);
  if (!Number.isFinite(j.widthMm) || j.widthMm < 10 || j.widthMm > 1000) fail();
  return { journalId: id(j.journalId), version: str(j.version, 100), stage: choice(j.stage, ['initial','revision','production']), purpose: choice(j.purpose, ['main','supplementary','graphical_abstract','toc','cover']), contentType: choice(j.contentType, ['schematic','data','primary','illustration']), widthMm: j.widthMm, rasterKind: choice(j.rasterKind, ['color','grayscale','lineart']), ...(j.contentSource ? { contentSource: choice(j.contentSource, ['figure-type']), figureTypeId: id(j.figureTypeId) } : {}) };
}
function aspectRatio(value) {
  if(value==='auto')return value;
  if(typeof value!=='string'||!/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(value)||value.length>20||value.split(':').some(n=>Number(n)<=0||Number(n)>100))fail();
  return value;
}
function thinking(value) {
  obj(value);
  return Object.fromEntries(['main','image','vision'].filter(role=>value[role]).map(role=>{
    const selected=obj(value[role]),options=obj(selected.options);
    return [role,{libraryModelId:id(selected.libraryModelId),options:Object.fromEntries(['mode','effort','budget'].filter(k=>Object.hasOwn(options,k)).map(k=>{
      const v=options[k];if(!(typeof v==='boolean'||typeof v==='string'&&v.length<=60||Number.isSafeInteger(v)&&v>=-1&&v<=10000000))fail();return [k,v];
    }))}];
  }));
}
function settings(s) {
  obj(s);
  return { ...(s.thinking?{thinking:thinking(s.thinking)}:{}), ratio: aspectRatio(s.ratio), candidates: num(s.candidates, 6) || fail(), reviews: num(s.reviews, 5),
    ...(s.models ? { models: Object.fromEntries(['main','image','vision'].filter(role => Object.hasOwn(s.models, role)).map(role => [role, s.models[role] == null ? null : {
      libraryModelId: id(s.models[role].libraryModelId), connectionId: id(s.models[role].connectionId), accessProvider: id(s.models[role].accessProvider), modelId: str(s.models[role].modelId, 500),
    }])) } : {}), ...(s.presetConnectionId ? { presetConnectionId: id(s.presetConnectionId) } : {}),
    ...(s.refineMask ? {refineMask:{...materialReference(s.refineMask),sourceId:id(s.refineMask.sourceId)}}:{}),
    ...(s.refineStructured ? {refineStructured:Object.fromEntries(['object','attributes','relationship','preserve'].map(key=>[key,str(s.refineStructured[key]||'',500)]))}:{}),
    ...(s.referencePreferences ? {referencePreferences:{discipline:str(s.referencePreferences.discipline||'',200),layout:choice(s.referencePreferences.layout||'',['','grid','horizontal','vertical','radial']),density:choice(s.referencePreferences.density||'',['','low','medium','high'])}} : {}),
    ...(s.manualReferenceIds ? {manualReferenceIds:list(s.manualReferenceIds,10,v=>str(v,120))} : {}),
    ...(s.figureTypeId ? { figureTypeId: id(s.figureTypeId) } : {}), ...(Object.hasOwn(s, 'journalSelection') ? { journalSelection: journal(s.journalSelection) } : {}),
    ...(s.pipelineMode ? { pipelineMode: choice(s.pipelineMode, ['planner_critic','full']) } : {}), ...(s.retrievalSetting ? { retrievalSetting: choice(s.retrievalSetting, ['auto','none','random','manual']) } : {}), ...(s.imageSize ? { imageSize: str(s.imageSize, 40) } : {}) };
}
export function materialReference(a) {
  obj(a);
  return { id: id(a.id), clientFileId: id(a.clientFileId || a.id), filename: str(a.filename, 255), format: str(a.format, 30), size: num(a.size, 100_000_000),
    sha256: /^[a-f0-9]{64}$/.test(a.sha256) ? a.sha256 : fail(), purpose: choice(a.purpose, ['', 'research', 'reference', 'source']), ...(a.referencePurpose ? {referencePurpose:choice(a.referencePurpose,['content','layout','color','style'])} : {}) };
}
function draft(d) {
  obj(d); obj(d.settings);
  return { text: str(d.text, 100000), caption: str(d.caption, 100000), avoid: str(d.avoid, 100000), mode: choice(d.mode, ['simple', 'advanced']), revision: num(d.revision),
    attachments: list(d.attachments, 10, materialReference), settings: { simple: settings(d.settings.simple), advanced: settings(d.settings.advanced) } };
}
function historyPointer(h) { obj(h);return {source:choice(h.source,['server','production']),jobId:id(h.jobId)}; }
function historyRun(h) { return {...historyPointer(h),sourceTaskId:str(h.sourceTaskId,100),status:str(h.status,40),ratio:str(h.ratio,40),candidates:num(h.candidates,200),reviews:num(h.reviews,100),originalCount:num(h.originalCount,1000),models:Object.fromEntries(['main','image','vision'].filter(role=>h.models?.[role]).map(role=>[role,{modelId:str(h.models[role].modelId,500),accessProvider:str(h.models[role].accessProvider,80)}]))}; }
function version(v) {
  obj(v);
  return { id: id(v.id), format: choice(v.format, ['png', 'svg']), ...(v.history ? {history:{...historyPointer(v.history),index:num(v.history.index,5)}} : {resultId: /^[a-f0-9]{64}$/.test(v.resultId) ? v.resultId : fail()}),
    number: num(v.number, 10000), parentId: optionalId(v.parentId), runId: id(v.runId), origin: str(v.origin, 40), review: str(v.review, 1000), createdAt: num(v.createdAt) };
}
function branch(b) {
  obj(b); obj(b.refinements);
  const refinements = Object.fromEntries(Object.entries(b.refinements).map(([k,v]) => [id(k), draft(v)]));
  if (Object.keys(refinements).length > 500) fail();
  return { draft: draft(b.draft), refinements, targetId: optionalId(b.targetId), lastTargetId: optionalId(b.lastTargetId), groupId: optionalId(b.groupId), candidateId: optionalId(b.candidateId), versionId: optionalId(b.versionId), unreadVersionId: optionalId(b.unreadVersionId), navRevision: num(b.navRevision),
    groups: list(b.groups, 500, g => ({ id: id(g.id), number: num(g.number, 500), runId: id(g.runId), expected: num(g.expected, 6), candidates: list(g.candidates, 6, c => ({ id: id(c.id), label: str(c.label, 40), viewedVersionId: optionalId(c.viewedVersionId), versions: list(c.versions, 500, version) })) })) };
}
function task(t) {
  obj(t); obj(t.branches);
  const out = { id: id(t.id), ...(Object.hasOwn(t,'deleted')?{deleted:bool(t.deleted)}:{}), ...(t.syncConflict?{syncConflict:{taskId:id(t.syncConflict.taskId),fields:list(t.syncConflict.fields,40,v=>str(v,1000))}}:{}), ...(t.updatedAt ? {updatedAt:num(t.updatedAt)} : {}), title: str(t.title, 160), automaticTitle: bool(t.automaticTitle), pinned: bool(t.pinned), archived: bool(t.archived), path: choice(t.path, ['png', 'svg']), activeRunId: optionalId(t.activeRunId),
    branches: { png: branch(t.branches.png), svg: branch(t.branches.svg) },
    runs: list(t.runs, 1000, r => ({ id: id(r.id), path: choice(r.path, ['png', 'svg']), kind: choice(r.kind, ['generate', 'refine', 'edit']), status: choice(r.status, ['submitting','running','succeeded','failed']), accepted: bool(r.accepted), groupId: id(r.groupId), candidateId: optionalId(r.candidateId), parentId: optionalId(r.parentId), input: draft(r.input), draftRevision: num(r.draftRevision), navRevision: num(r.navRevision), stage: str(r.stage, 2000), createdAt: num(r.createdAt), ...(r.history ? {history:historyRun(r.history)} : {}), ...(r.execution ? {execution:{version:1,...(r.execution.taskId?{taskId:id(r.execution.taskId)}:{}),simulation:bool(r.execution.simulation),...(r.execution.jobId?{jobId:id(r.execution.jobId)}:{})}} : {}), ...(r.error !== undefined ? {error: str(r.error, 2000)} : {}) })) };
  unique(out.runs.map(r=>r.id));
  if (out.activeRunId && !out.runs.some(r=>r.id===out.activeRunId)) fail();
  const allVersions = [];
  for (const [path, b] of Object.entries(out.branches)) {
    unique(b.groups.map(g=>g.id));
    const versions = b.groups.flatMap(g=>g.candidates.flatMap(c=>c.versions));
    allVersions.push(...versions.map(v=>v.id));
    for (const key of ['targetId','lastTargetId','versionId','unreadVersionId']) if (b[key] && !versions.some(v=>v.id===b[key])) fail();
    if (b.targetId && !b.refinements[b.targetId]) fail();
    if (b.groupId && !b.groups.some(g=>g.id===b.groupId)) fail();
    for (const g of b.groups) {
      if (!out.runs.some(r=>r.id===g.runId && r.path===path)) fail();
      unique(g.candidates.map(c=>c.id));
      for (const c of g.candidates) {
        if (!c.versions.length || c.viewedVersionId && !c.versions.some(v=>v.id===c.viewedVersionId)) fail();
        for (const v of c.versions) if (v.format!==path || !out.runs.some(r=>r.id===v.runId) || v.parentId && !versions.some(p=>p.id===v.parentId)) fail();
      }
    }
  }
  unique(allVersions);
  return out;
}
export function cleanWorkspace(state) {
  obj(state); if (state.schema !== WORKSPACE_SYNC_VERSION) fail();
  const tasks = list(state.tasks, 1000, task); unique(tasks.map(t=>t.id));
  if (!tasks.length || !tasks.some(t=>t.id===state.selectedTaskId)) fail();
  const clean = { schema: WORKSPACE_SYNC_VERSION, selectedTaskId: id(state.selectedTaskId), tasks };
  if (new TextEncoder().encode(JSON.stringify(clean)).length > MAX_WORKSPACE_BYTES) throw Object.assign(new Error('工作区超过当前同步容量，原草稿仍保留在本机。'), { status: 413 });
  return clean;
}
export const resultReferences = state => [...new Set(state.tasks.flatMap(t=>Object.values(t.branches).flatMap(b=>b.groups.flatMap(g=>g.candidates.flatMap(c=>c.versions.map(v=>v.resultId).filter(Boolean))))))];
