import {thinkingIdentities,reconcileThinkingSettings,buildThinkingSubmission} from '../lib/thinkingSettings.js';
import {modelOption} from './workspaceModels.js';
export function workspaceThinking(settings,models,path,editing){
 const routes={},entries={},regions={};
 for(const role of ['main','image','vision']){
  const ref=settings.models?.[role],entry=models.library.models.find(m=>m.id===ref?.libraryModelId);
  const option=entry&&modelOption(entry,models.library,models.registry,role,path,editing,models.summary?.tokenDance);
  const connection=option?.connection;
  routes[role]=connection?{accessProvider:connection.provider,modelId:entry.modelId,...(connection.provider==='custom'?{custom:{...entry.custom,...connection.custom}}:{})}:{accessProvider:'',modelId:''};
  entries[role]=option?.model;if(connection?.provider==='minimax')regions.minimax=connection.region;
 }
 const identities=thinkingIdentities(routes,entries,regions),value=reconcileThinkingSettings(null,identities);
 for(const role of ['main','image','vision'])if(settings.thinking?.[role] && settings.thinking[role].libraryModelId===settings.models?.[role]?.libraryModelId)value.roles[role].options={...settings.thinking[role].options};
 return value;
}
export function workspaceThinkingSubmission(settings,models,path,editing,roles){
 return buildThinkingSubmission(workspaceThinking(settings,models,path,editing),models.registry,roles,editing?'editing':'generation');
}
