import {PLUS_PRESETS,PLUS_IMAGE_MODEL,PLUS_PRESET_VERSION,plusTaskSpec} from './plus.mjs';
const fail=()=>{throw Object.assign(Error('PLUS_INVALID_WORKSPACE_REQUEST'),{code:'PLUS_INVALID_WORKSPACE_REQUEST',status:400});};
const id=v=>typeof v==='string'&&/^[\w-]{1,160}$/.test(v)?v:fail();
const text=(v,max)=>typeof v==='string'&&v.length<=max?v:fail();
const clone=v=>JSON.parse(JSON.stringify(v));
// An explicit allow-list. Browser model routes, keys, usage and budget claims
// never become managed execution authority.
export function plusWorkspaceRequest(value,specInput){
  if(value==null)return null;
  const spec=plusTaskSpec(specInput),body=value.request;
  if(!body||typeof body!=='object'||Array.isArray(body))fail();
  for(const k of ['apiKeys','apiKey','provider','modelRoutes','thinkingConfig','thinkingSnapshot','plusBilling','plusPreset','userId','userEmail'])if(Object.hasOwn(body,k))fail();
  const taskId=id(value.taskId),runId=id(value.runId);
  const action=spec.path==='png'&&spec.kind==='edit'?'refineImage':'createJob';
  if(body.action!==action||body.outputFormat!==spec.path)fail();
  if(action==='refineImage'&&typeof body.editInstruction==='string'&&body.editInstruction.length>2000)throw Object.assign(Error('PLUS_EDIT_INSTRUCTION_TOO_LONG'),{code:'PLUS_EDIT_INSTRUCTION_TOO_LONG',status:400});
  const requirement=text(action==='refineImage'?body.editInstruction:body.requirements,action==='refineImage'?2000:20000);
  if(!requirement.trim())fail();
  const request={action,outputFormat:spec.path,requirements:requirement,methodContent:requirement,editInstruction:requirement,caption:text(body.caption||'',1000),negativePrompt:text(body.negativePrompt||'',1000),aspectRatio:spec.aspectRatio,imageSize:spec.imageSize,numCandidates:spec.candidates,maxCriticRounds:action==='refineImage'?0:spec.reviews,pipelineMode:'full',generationPath:'model-v1',taskName:body.taskName==='plot'?'plot':'diagram',visionMode:'assist',referenceImageMode:'vision_model'};
  for(const key of ['figureTypeId','figureSpecVersion','journalSelection','sourceContentType','figureAnalysis','retrievalSetting','manualReferenceIds','materialFiles','sourceImageUpload','refineInputs'])if(body[key]!==undefined)request[key]=clone(body[key]);
  if(body.sourceImageUrl||body.sourceImageObjectKey||body.sourceJobId)fail(); // Managed edits use owner-checked material uploads.
  if(JSON.stringify(request).length>100000)fail();
  return {taskId,runId,request};
}
export function plusModelRequest(workspace,specInput,{apiKey,operationKey,budget}){
  const spec=plusTaskSpec(specInput),w=plusWorkspaceRequest(workspace,spec),preset=PLUS_PRESETS[spec.mode];
  if(!w||typeof apiKey!=='string'||!apiKey.trim())fail();
  const route=modelId=>({accessProvider:'bailian',modelId});
  const textThinking={provider:'bailian',modelId:preset.mainModel,protocol:'bailian-openai-chat',options:{mode:true,budget:preset.pngThinkingBudget}};
  const thinkingConfig={version:1,roles:{main:textThinking,vision:textThinking,...(spec.path==='png'?{image:{provider:'bailian',modelId:PLUS_IMAGE_MODEL,protocol:'bailian-multimodal-generation',options:{}}}:{})}};
  return {...w.request,thinkingConfig,provider:'bailian',mainModelName:preset.mainModel,referenceVisionModelName:preset.mainModel,...(spec.path==='png'?{imageModelName:PLUS_IMAGE_MODEL}:{}),modelRoutes:{main:route(preset.mainModel),vision:route(preset.mainModel),...(spec.path==='png'?{image:route(PLUS_IMAGE_MODEL)}:{})},apiKeys:{bailian:apiKey},plusPreset:{version:PLUS_PRESET_VERSION,mode:spec.mode},plusBilling:{version:1,operationKey,taskId:w.taskId,runId:w.runId,...budget}};
}
