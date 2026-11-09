export function newDraft() {
  return { text: '', caption: '', avoid: '', attachments: [], mode: 'simple', revision: 0,
    settings: { simple: { ratio: 'auto', candidates: 1, reviews: 1 }, advanced: { ratio: 'auto', candidates: 1, reviews: 1 } } };
}
function newBranch() {
  return { draft: newDraft(), refinements: {}, targetId: null, lastTargetId: null, groups: [], groupId: null, candidateId: null, versionId: null, navRevision: 0, unreadVersionId: null };
}
export function newTask(id = globalThis.crypto.randomUUID(), path = 'png') {
  return { id, title: '新任务', automaticTitle: true, pinned: false, archived: false, path, branches: { png: newBranch(), svg: newBranch() }, runs: [], activeRunId: null };
}
export function newWorkspace(id = globalThis.crypto.randomUUID()) { return { schema: 1, selectedTaskId: id, tasks: [newTask(id)] }; }
