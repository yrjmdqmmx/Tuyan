// UI state only. The execution adapter must enforce admission and idempotency on
// the server; this reducer cannot be used as an account-wide concurrency lock.
export const PATHS = { png: '图像创作', svg: '矢量绘图' };
export const uid = () => globalThis.crypto.randomUUID();
const copy = value => structuredClone(value);
export { newDraft, newTask, newWorkspace } from '../../../../packages/api/src/workspace-defaults.mjs';
import { newDraft, newTask } from '../../../../packages/api/src/workspace-defaults.mjs';
const draftFields = ['text', 'caption', 'avoid', 'attachments', 'mode', 'settings'];
const draftContent = d => JSON.stringify(draftFields.map(field => d[field]));
const draftHasContent = d => draftContent({ ...d, mode: 'simple' }) !== draftContent(newDraft());
export const hasRequirements = d => !!(d.text || d.caption || d.avoid || d.attachments.length);
// Admission, not an attempted submission, makes a task permanent. Keep legacy
// history/results and manually saved SVGs visible without migrating their data.
export const isFormalTask = t => t.runs.some(r => r.accepted || r.execution?.jobId || r.history)
  || Object.values(t.branches).some(b => b.groups.some(g => g.candidates.some(c => c.versions.length)));
export const taskHasContent = t => isFormalTask(t) || !t.automaticTitle || t.runs.length > 0 || Object.values(t.branches).some(b => draftHasContent(b.draft) || Object.values(b.refinements).some(draftHasContent));
export const taskUpdatedAt = t => Math.max(t.updatedAt || 0, ...t.runs.map(r => r.createdAt || 0));
export const savedTaskDrafts = tasks => tasks.filter(t => !t.deleted && !t.archived && !isFormalTask(t) && taskHasContent(t))
  .sort((a, b) => taskUpdatedAt(b) - taskUpdatedAt(a));
export const currentTask = s => s.tasks.find(t => t.id === s.selectedTaskId);
export const currentBranch = s => currentTask(s).branches[currentTask(s).path];
// The visible version is the next operation's source. Existing per-version
// drafts remain intact when switching candidates or reopening older tasks.
export const draftOf = b => b.versionId ? b.refinements[b.versionId] || b.refinements[b.targetId] || b.draft : b.draft;
export const currentDraft = s => draftOf(currentBranch(s));
export const activeRun = s => currentTask(s).runs.find(r => r.id === currentTask(s).activeRunId) || null;
export function groupLabel(task, group) {
  const initialRun = task.runs.find(run => run.id === group.runId);
  return initialRun?.kind === 'edit' && !initialRun.parentId ? '手工绘图' : `第 ${group.number} 次生成`;
}
export function locateVersion(task, id) {
  if (!id) return null;
  for (const [path, branch] of Object.entries(task.branches)) for (const group of branch.groups) for (const candidate of group.candidates) {
    const version = candidate.versions.find(v => v.id === id);
    if (version) return { ...version, path, groupId: group.id, groupNumber: group.number, groupLabel: groupLabel(task, group), candidateId: candidate.id, candidateLabel: candidate.label };
  }
  return null;
}
export const selectedVersion = s => locateVersion(currentTask(s), currentBranch(s).versionId);
export const refinementTarget = selectedVersion;
export function canRestoreRun(task, run) {
  if (!run) return false;
  const branch = task.branches[run.path];
  const draft = run.parentId ? branch.refinements[run.parentId] : draftOf(branch);
  if (!draft) return false;
  const cleared = { ...run.input, text: '', ...(!run.parentId && { caption: '', avoid: '', attachments: [] }) };
  return draftContent(draft) === draftContent(run.input) || draftContent(draft) === draftContent(cleared);
}
export function versionLabel(v, full = false) {
  return v ? `${full ? `${v.format.toUpperCase()} · ${v.groupLabel || `第 ${v.groupNumber} 次生成`} · ` : ''}候选 ${v.candidateLabel} · v${v.number}` : '';
}
export function taskMatches(t, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = [t.title, ...t.runs.map(r => r.input.text), ...Object.values(t.branches).flatMap(b => [b.draft.text, ...Object.values(b.refinements).map(d => d.text)])].join('\n').toLocaleLowerCase();
  return terms.every(term => text.includes(term));
}
export function submitIssue(s) {
  const t = currentTask(s), b = currentBranch(s), d = currentDraft(s);
  if(t.deleted)return '任务已删除，可恢复后继续编辑';
  if (t.activeRunId) return '任务正在进行';
  if (b.versionId && !refinementTarget(s)) return '修改目标已不可用，请重新选择版本';
  if (refinementTarget(s)?.loadError) return refinementTarget(s).loadError;
  if (!d.text.trim()) return b.versionId ? '请填写修改要求' : '请描述绘图目标';
  if (d.attachments.some(a => a.status !== 'local')) return '请先完成原件的浏览器保存';
  if (d.attachments.some(a => !a.purpose)) return '请确认每份附件的用途';
  if (d.attachments.filter(a=>a.purpose==='source').length>1 || b.versionId && d.attachments.some(a=>a.purpose==='source')) return '请明确选择一个修改对象';
  return '';
}
function bindComposer(branch, versionId, previous = draftOf(branch)) {
  if (versionId && !branch.refinements[versionId]) {
    const next = copy(previous);
    // Masks are tied to the exact source image. Keep the old draft's mask but
    // never carry its geometry onto a different version.
    for (const settings of Object.values(next.settings)) {
      if (settings.refineMask?.sourceId !== versionId) delete settings.refineMask;
    }
    branch.refinements[versionId] = next;
  }
  branch.targetId = versionId || null;
  if (versionId) branch.lastTargetId = versionId;
}
function view(task, branch, versionId, explicit = true) {
  const v = locateVersion(task, versionId);
  if (!v) return;
  bindComposer(branch, v.id);
  branch.groupId = v.groupId; branch.candidateId = v.candidateId; branch.versionId = v.id;
  const c = branch.groups.find(g => g.id === v.groupId)?.candidates.find(c => c.id === v.candidateId);
  if (c) c.viewedVersionId = v.id;
  if (explicit) branch.navRevision++;
  if (branch.unreadVersionId === v.id) branch.unreadVersionId = null;
}
// Each action is addressed to a task; late responses never use whichever task
// happens to be selected now. Snapshots have no credential or routing-key field.
export function workspaceReducer(state, action) {
  if (action.type === 'SELECT_TASK') {
    if (!state.tasks.some(t => t.id === action.id)) return state;
    const next = copy(state), task = next.tasks.find(t => t.id === action.id), branch = task.branches[task.path];
    next.selectedTaskId = task.id;
    const latestEdit=branch.groups.find(g=>g.id===branch.groupId)?.candidates.find(c=>c.id===branch.candidateId)?.versions.at(-1);
    if(state.selectedTaskId!==action.id && latestEdit?.origin==='手工编辑')view(task,branch,latestEdit.id,false);
    if (!branch.versionId) {
      const group = branch.groups.find(g => g.id === branch.groupId) || branch.groups.at(-1);
      const version = group?.candidates[0]?.versions[0];
      if (version) view(task, branch, version.id, false);
    }
    bindComposer(branch, branch.versionId);
    return next;
  }
  const s = copy(state);
  if (action.type === 'APPLY_TEMPLATE') {
    const task=newTask(action.id || uid(),currentTask(s)?.path || 'png');
    task.title=action.template.title;task.automaticTitle=false;
    Object.assign(task.branches[task.path].draft,{text:action.template.methodContent,caption:action.template.caption,avoid:action.template.negativePrompt,revision:1});
    task.updatedAt=action.at || Date.now();
    s.tasks.unshift(task);s.selectedTaskId=task.id;return s;
  }
  if (action.type === 'CREATE_TASK') {
    const drafts = savedTaskDrafts(s.tasks);
    const draft = drafts.find(t => t.id === s.selectedTaskId) || drafts[0];
    if (draft) { s.selectedTaskId = draft.id; return s; }
    const empty = s.tasks.find(t => !t.deleted && !t.archived && !taskHasContent(t));
    if (empty) { empty.path = currentTask(s)?.path || empty.path; s.selectedTaskId = empty.id; return s; }
    const task = newTask(action.id || uid(), currentTask(s)?.path || 'png');
    s.tasks.unshift(task); s.selectedTaskId = task.id; return s;
  }
  const t = s.tasks.find(t => t.id === (action.taskId || s.selectedTaskId));
  if (!t) return state;
  let b = t.branches[action.path || t.path];
  bindComposer(b, b.versionId);
  const d = Object.hasOwn(action, 'draftTargetId') ? (action.draftTargetId ? b.refinements[action.draftTargetId] : b.draft) : draftOf(b);
  switch (action.type) {
    case 'DELETE': if(t.activeRunId)return state;t.deleted=true;break;
    case 'RESTORE_TASK': delete t.deleted;break;
    case 'KEEP_CONFLICT': delete t.syncConflict;break;
    case 'RENAME':
      if(action.baseTitle!==undefined&&t.title!==action.baseTitle&&t.title!==action.title.trim()){s.tasks.push({...copy(t),id:uid(),title:action.title.trim().slice(0,105)+' · 冲突副本',automaticTitle:false,deleted:false,activeRunId:null,syncConflict:{taskId:t.id,fields:['title']}});return s;}
      t.title = action.title.trim().slice(0, 120) || '新任务'; t.automaticTitle = false; break;
    case 'PIN': t.pinned = !t.pinned; break;
    case 'ARCHIVE': t.archived = !t.archived; break;
    case 'SET_PATH':
      if (!PATHS[action.path] || action.path === t.path) return state;
      t.branches[t.path].navRevision++;
      t.path = action.path; b.navRevision++;
      if(!b.versionId) {
        const group=b.groups.find(g=>g.id===b.groupId&&g.candidates.some(c=>c.versions.length)) || b.groups.findLast(g=>g.candidates.some(c=>c.versions.length));
        const candidate=group?.candidates.find(c=>c.versions.length);
        if(candidate)view(t,b,candidate.viewedVersionId || candidate.versions.at(-1).id,false);
      }
      break;
    case 'EDIT_DRAFT': {
      if (!d) return state;
      // A mode switch selects an existing settings panel; it does not edit either configuration.
      const changed = draftFields.filter(field => field in action.patch && JSON.stringify(d[field]) !== JSON.stringify(action.patch[field]));
      if (!changed.length) return state;
      for (const field of changed) d[field] = copy(action.patch[field]);
      if (changed.every(field => field === 'mode')) return s;
      d.revision++;
      if (t.automaticTitle && !isFormalTask(t)) t.title = d.text.trim().split('\n')[0].slice(0, 32) || '新任务';
      break;
    }
    case 'ADD_ATTACHMENTS':
      if (!d) return state;
      d.attachments.push(...copy(action.attachments)); d.revision++; break;
    case 'VIEW': view(t, b, action.versionId); break;
    case 'VIEW_GROUP': {
      const group = b.groups.find(g => g.id === action.id);
      if (!group) return state;
      b.groupId = group.id; b.navRevision++;
      const c = group.candidates.find(c => c.versions.length);
      b.candidateId = c?.id || null; b.versionId = null;
      if (c) view(t, b, c.viewedVersionId || c.versions.at(-1).id, false);
      break;
    }
    // Legacy callers still select a source; there is no separate edit mode.
    case 'REFINE': {
      const v = locateVersion(t, action.versionId);
      if (!v) return state;
      t.path = v.path; b = t.branches[v.path]; view(t, b, v.id); break;
    }
    case 'EXIT_REFINE': break;
    case 'INTERACT': b.navRevision++; break;
    case 'BEGIN': {
      if (submitIssue({ ...s, selectedTaskId: t.id }) || t.runs.some(r => r.id === action.runId)) return state;
      const target = locateVersion(t, b.targetId);
      const groupId = target?.groupId || `group-${action.runId}`;
      const run = { id: action.runId, path: t.path, kind: target ? 'refine' : 'generate', status: 'submitting', accepted: false,
        groupId, candidateId: target?.candidateId || null, parentId: target?.id || null,
        ...(action.execution ? {execution: {...copy(action.execution), taskId:t.id}} : {}),
        input: copy(d), draftRevision: d.revision, navRevision: b.navRevision, stage: '正在确认提交', createdAt: action.at || Date.now() };
      t.runs.push(run); t.activeRunId = run.id; break;
    }
    case 'EXECUTION': {
      const r=t.runs.find(r=>r.id===action.runId);if(!r || ['succeeded','failed'].includes(r.status))return state;
      if(t.activeRunId!==r.id){if(!action.execution?.jobId)return state;t.activeRunId=r.id;}
      if((!action.stage||action.stage===r.stage)&&(!action.execution||Object.entries(action.execution).every(([k,v])=>r.execution?.[k]===v)))return state;
      if(action.execution)r.execution={...r.execution,...action.execution};
      if(action.stage)r.stage=action.stage;break;
    }
    case 'FOLLOW_SVG_SAVE': {
      const branch=t.branches.svg;
      // Remember the latest edit even after leaving this task/path. Never move
      // another task or an explicitly selected historical version.
      if((branch.versionId||null)!==(action.parentId||null))return state;
      view(t,branch,action.versionId,false);break;
    }
    case 'SAVE_SVG': {
      const parent=locateVersion(t,action.parentId), rb=t.branches.svg;
      if(t.activeRunId || locateVersion(t,action.versionId) || (action.parentId && parent?.format!=='svg'))return state;
      // Blank canvases create an ordinary manual group; existing results always append a child.
      if(!parent && rb.groups.some(g=>g.candidates.length))return state;
      const original=parent && t.runs.find(r=>r.id===parent.runId);
      const groupId=parent?.groupId || `group-${action.runId}`, candidateId=parent?.candidateId || `candidate-${action.runId}`;
      const input=original?.input || rb.draft;
      const run={id:action.runId,kind:'edit',path:'svg',status:'succeeded',accepted:true,groupId,candidateId,parentId:parent?.id || null,input:{...copy(input),text:'SVG 手工编辑',attachments:[]},draftRevision:input.revision,navRevision:rb.navRevision,stage:'手工编辑已保存为新版本',createdAt:Date.now()};
      if(!parent)rb.groups.push({id:groupId,number:rb.groups.length+1,runId:run.id,expected:1,candidates:[{id:candidateId,label:'A',versions:[],viewedVersionId:null}]});
      const c=rb.groups.find(g=>g.id===groupId).candidates.find(c=>c.id===candidateId);
      t.runs.push(run);c.versions.push({id:action.versionId,format:'svg',url:action.url,number:c.versions.length+1,parentId:parent?.id || null,runId:run.id,origin:'手工编辑',review:'修改后未复审',createdAt:Date.now()});
      // The editor waits for durable local storage before selecting the child.
      if(action.select!==false){t.path='svg';view(t,rb,action.versionId);}break;
    }
    case 'ACCEPT': {
      const r = t.runs.find(r => r.id === action.runId);
      if (!r || r.accepted || t.activeRunId !== r.id) return state;
      r.accepted = true; r.status = 'running'; r.stage = r.kind === 'refine' ? `正在修改${versionLabel(locateVersion(t, r.parentId))}` : '正在生成候选'; b = t.branches[r.path];
      if (r.kind === 'generate') b.groups.push({ id: r.groupId, number: b.groups.length + 1, runId: r.id, expected: r.input.attachments.some(a=>a.purpose==='source') ? 1 : r.input.settings[r.input.mode].candidates, candidates: [] });
      const submitted = r.parentId ? b.refinements[r.parentId] : b.draft;
      if (submitted?.revision === r.draftRevision) {
        if (r.parentId) b.refinements[r.parentId] = { ...copy(submitted), text: '', revision: submitted.revision + 1 };
        else b.draft = { ...copy(submitted), text: '', caption: '', avoid: '', attachments: [], revision: submitted.revision + 1 };
        // Keep the selected source visible while the next version is running.
      }
      if (!b.groupId) b.groupId = r.groupId;
      break;
    }
    case 'RESULT': {
      const r = t.runs.find(r => r.id === action.runId);
      if (!r?.accepted || t.activeRunId !== r.id || (!action.version?.url && !(action.version?.resultId && action.version?.loadError)) || !['png', 'svg'].includes(action.version.format)) return state;
      if (locateVersion(t, action.version.id)) return state;
      b = t.branches[r.path];
      const group = b.groups.find(g => g.id === r.groupId);
      if (!group) return state;
      const id = r.candidateId || action.candidateId;
      if (!id) return state;
      let c = group.candidates.find(c => c.id === id);
      if (!c) { c = { id, label: action.label || String.fromCharCode(65 + group.candidates.length), versions: [], viewedVersionId: null }; group.candidates.push(c); }
      const v = { ...copy(action.version), number: c.versions.length + 1, parentId: r.parentId, runId: r.id, origin: r.kind === 'refine' || r.input.attachments.some(a=>a.purpose==='source') ? 'AI 修改' : '生成', review: action.version.review || '未复审', createdAt: action.at || Date.now() };
      c.versions.push(v);
      if (!c.viewedVersionId) c.viewedVersionId = v.id;
      const canFollow = b.navRevision === r.navRevision && (b.versionId || null) === r.parentId;
      if (canFollow && (!b.versionId || r.kind === 'refine')) view(t, b, v.id, false);
      else b.unreadVersionId = v.id;
      r.stage = r.kind === 'refine' ? '修改结果已返回' : `${group.candidates.length} 个候选已返回`;
      break;
    }
    case 'FINISH': {
      const r = t.runs.find(r => r.id === action.runId);
      if (!r || ['succeeded','failed'].includes(r.status)) return state;
      if(t.activeRunId!==r.id){if(!action.error)return state;r.status='failed';r.error=action.error;r.stage=action.error;break;}
      r.status = action.error ? 'failed' : 'succeeded'; r.error = action.error || ''; r.stage = action.error || '本次执行完成'; t.activeRunId = null;
      if (action.error && r.accepted) {
        const rb = t.branches[r.path], draft = r.parentId ? rb.refinements[r.parentId] : rb.draft;
        if (draft && !draft.text && draft.revision === r.draftRevision + 1) Object.assign(draft, copy(r.input), { revision: draft.revision + 1 });
      }
      break;
    }
    case 'RESTORE_RUN': {
      const r = t.runs.find(r => r.id === action.runId);
      if (!r) return state;
      const rb = t.branches[r.path];
      bindComposer(rb,rb.versionId);
      const dest = r.parentId ? rb.refinements[r.parentId] : draftOf(rb);
      if (!canRestoreRun(t, r)) return state;
      Object.assign(dest, copy(r.input), { revision: dest.revision + 1 });
      t.path = r.path; rb.navRevision++;
      if (r.parentId) view(t, rb, r.parentId);
      break;
    }
    default: return state;
  }
  if(['EDIT_DRAFT','ADD_ATTACHMENTS','BEGIN','SAVE_SVG','RESULT','FINISH','RESTORE_RUN','RENAME'].includes(action.type))t.updatedAt=action.at || Date.now();
  return s;
}
