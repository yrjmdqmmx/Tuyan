import {currentTask,currentBranch,currentDraft,locateVersion,submitIssue} from './workspaceState.js';

// Finish manual edits before freezing the AI input. A navigation or input change
// during this wait cancels submission, rather than sending a different source.
export async function prepareWorkspaceInput({getState,flushSvg,readFile,isCurrent=()=>true}) {
  const before=getState(),task=currentTask(before),branch=currentBranch(before),draft=currentDraft(before);
  const unchanged=()=>{
    if(!isCurrent())return false;
    const state=getState(),current=currentTask(state);
    return current?.id===task.id && current.path===task.path && currentBranch(state).navRevision===branch.navRevision && currentDraft(state).revision===draft.revision;
  };
  await flushSvg?.();
  if(!unchanged())throw Error('修改对象或输入已变化，请确认后再次提交。');
  const state=getState(),target=currentBranch(state).versionId;
  // Only automatic manual-save descendants can advance the source while waiting.
  let version=locateVersion(currentTask(state),target);
  while(version && version.id!==branch.versionId && version.origin==='手工编辑')version=locateVersion(currentTask(state),version.parentId);
  if((version?.id||null)!==(branch.versionId||null))throw Error('修改版本已变化，请确认后再次提交。');
  const issue=submitIssue(state);if(issue)throw Error(issue);
  const input=currentDraft(state);
  for(const material of [...input.attachments,...(input.settings[input.mode].refineMask?[input.settings[input.mode].refineMask]:[])])await readFile(material);
  if(!unchanged() || currentBranch(getState()).versionId!==target)throw Error('修改对象或输入已变化，请确认后再次提交。');
}
