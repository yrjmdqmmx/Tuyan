import { applyTaskDeletions, taskMaterialIds } from '../../../../packages/api/src/workspace-deletion.mjs';
import { deleteBrowserRecord } from '../lib/browserMaterials.js';
import { purgeTaskSvgDrafts } from '../lib/svgDrafts.js';
import { LEGACY_WORKSPACE_KEY, ORIGINAL_SCOPE } from './workspaceSync.js';

export async function purgeLocalTaskAssets({state,key,cache,baseUrl,userId,storage=localStorage}) {
  const markers=state.purgedTasks||[];if(!markers.length)return;
  // Preserve files referenced by another account/task in this browser.
  const retained=await cache.materialIds(key,markers);
  for(const t of state.tasks)for(const id of taskMaterialIds(t))retained.add(id);
  const legacyRaw=storage.getItem(LEGACY_WORKSPACE_KEY);
  if(legacyRaw){const legacy=JSON.parse(legacyRaw);if(!userId){legacy.state=applyTaskDeletions(legacy.state,markers);storage.setItem(LEGACY_WORKSPACE_KEY,JSON.stringify(legacy));}for(const t of legacy.state?.tasks||[])for(const id of taskMaterialIds(t))retained.add(id);}
  for(const id of new Set(markers.flatMap(p=>p.materialIds||[])))if(!retained.has(id))await deleteBrowserRecord(ORIGINAL_SCOPE,id);
  for(const id of new Set(markers.flatMap(p=>p.jobIds)))await deleteBrowserRecord(ORIGINAL_SCOPE,'job:'+id);
  await purgeTaskSvgDrafts(baseUrl,userId,markers.map(p=>p.id));
}
