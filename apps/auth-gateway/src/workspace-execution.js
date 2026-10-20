import { createHash } from 'node:crypto';
import { readHistoricalExecution, requireHistoricalPause } from './workspace-history-execution.js';
import { workflowRequiredRoles } from './workflow.js';
import { normalizeUniversalRoute, normalizeUniversalConnection } from './universal-contract.js';
const fail = (status, message) => Object.assign(new Error(message), { status });
const identifier = value => typeof value === 'string' && /^[\w-]{1,160}$/.test(value);
const terminal = status => ['completed','succeeded','failed','cancelled'].includes(status);
export function createWorkspaceExecutionStore({ db, assertActive = async () => {} }) {
  const runs = db.collection('workspaceExecutions'), locks = db.collection('workspaceExecutionLocks');
  const key = (user, id) => createHash('sha256').update(`${user}\0${id}`).digest('hex');
  return {
    async adoptHistory(user, taskId, runId, verified) {
      await assertActive(user);
      const bindings=db.collection('workspaceHistoryExecutions'),bindingId=key(user,verified.jobId);
      const existing=await runs.findOne({userId:user,jobId:verified.jobId});
      if(existing && (existing.runId!==runId || existing.taskId!==taskId || !existing.historical))throw fail(409,'原执行已关联其他任务，请打开原任务继续。');
      let reserved=false;
      const binding=await bindings.findOne({_id:bindingId});
      if(binding&&(binding.taskId!==taskId||binding.runId!==runId))throw fail(409,'原执行已关联其他任务');
      if(!binding)try { await bindings.insertOne({_id:bindingId,userId:user,jobId:verified.jobId,taskId,runId});reserved=true; }
      catch(error){if(error.code!==11000)throw error;throw fail(409,'原执行正在建立关联，请刷新状态');}
      try {
        const prior=await this.get(user,runId);
        if(prior){if(!prior.historical||prior.jobId!==verified.jobId||prior.taskId!==taskId||prior.fingerprint!==verified.fingerprint)throw fail(409,'执行身份不匹配');return prior;}
        await this.claim(user,taskId,runId);
        return await this.update(user,runId,{...verified,historical:true,status:'awaiting_provider'});
      }catch(error){if(reserved)await bindings.deleteOne({_id:bindingId,runId});throw error;}
    },
    async get(user, runId) { await assertActive(user); const row = await runs.findOne({_id:key(user,runId)}); if (!row) return null; const {_id,userId,...safe}=row; return safe; },
    async claim(user, taskId, runId) {
      await assertActive(user);
      if(await db.collection('workspaceTaskDeletions').findOne({userId:user,taskId}))throw fail(409,'任务已彻底删除。');
      const document=await db.collection('workspaceDocuments').findOne({userId:user});
      if(document?.state?.purgedTasks?.some(p=>p.id===taskId))throw fail(409,'任务已彻底删除。');
      const existing = await this.get(user,runId); if(existing) { if(existing.taskId!==taskId)throw fail(409,'执行标识已用于其他任务');return {fresh:false,execution:existing}; }
      const lockId=key(user,taskId);
      if(await locks.findOne({_id:lockId}))throw fail(409,'本任务已有活动执行；请恢复执行状态，不要重复提交。');
      try {await locks.insertOne({_id:lockId,userId:user,taskId,runId});}
      catch(error) {if(error.code===11000)throw fail(409,'本任务已有活动执行；请恢复执行状态，不要重复提交。');throw error;}
      const row={userId:user,taskId,runId,status:'submitting',jobId:null,createdAt:Date.now()};
      let inserted=false;
      try {await runs.insertOne({_id:key(user,runId),...row});inserted=true;await assertActive(user);}
      catch(error){await locks.deleteOne({_id:lockId,runId});if(inserted)await runs.deleteOne({_id:key(user,runId)});throw error;}
      return {fresh:true,execution:row};
    },
    async closeUnaccepted(user,taskId,runId) {
      await assertActive(user);
      // An atomic tombstone wins against a late submit, without cancelling a
      // request which may already have reached Core or a provider.
      const existing=await this.get(user,runId);
      if(existing){if(existing.taskId!==taskId||!existing.closedUnaccepted)throw fail(409,'服务已接收此提交，不能取消；请继续查询状态。');return existing;}
      try {await runs.insertOne({_id:key(user,runId),userId:user,taskId,runId,status:'failed',jobId:null,createdAt:Date.now(),closedUnaccepted:true});}
      catch(error){if(error.code!==11000)throw error;throw fail(409,'执行状态已改变，请继续查询状态。');}
      return this.get(user,runId);
    },
    async update(user,runId,patch) {
      await assertActive(user);
      await runs.updateOne({_id:key(user,runId)},{$set:patch});
      const run=await this.get(user,runId);
      if(run&&terminal(run.status))await locks.deleteOne({_id:key(user,run.taskId),runId});
      return run;
    },
  };
}
export async function resolveWorkspaceModels({libraryStore,user,body,simulation=false,rolesOverride}) {
  const library=await libraryStore.get(user), request=body.workspaceExecution;
  if(library.revision!==request.libraryRevision)throw fail(409,'模型库已更新，请刷新配置后再提交。草稿保持不变。');
  const roles=rolesOverride||(body.action==='optimizeInputs'?['main']:workflowRequiredRoles(body)), routes={},keys={},customKeys={},regions={},providerConnections={};
  for(const role of roles) {
    const ref=request.models?.[role], entry=library.models.find(m=>m.id===ref?.libraryModelId && m.connectionId===ref.connectionId && m.modelId===ref.modelId && !m.disabled);
    const c=library.connections.find(c=>c.id===entry?.connectionId && !c.disabled);
    if(!entry||!c||ref.accessProvider!==c.provider)throw fail(400,`${role} 的型号或连接已失效，请重新选择。`);
    if(c.provider==='custom'&&['connectionId','baseUrl','protocol','auth'].some(key=>normalizeUniversalConnection(entry.custom)[key]!==c.custom[key]))throw fail(409,'连接已改变，请重新确认型号能力');
    const route=c.provider==='custom'?normalizeUniversalRoute({accessProvider:'custom',modelId:entry.modelId,custom:{...entry.custom,...c.custom}}):{accessProvider:c.provider,modelId:entry.modelId};
    if(JSON.stringify(route)!==JSON.stringify(body.modelRoutes?.[role]))throw fail(409,'模型能力或连接已改变，请重新确认配置。');
    routes[role]=route;
    if(c.provider==='minimax') { if(regions.minimax&&regions.minimax!==c.region)throw fail(400,'同次执行不支持不同区域的稀宇连接'); regions.minimax=c.region; }
    if(c.provider==='tokendance')continue;
    if(c.provider!=='custom'&&providerConnections[c.provider]&&providerConnections[c.provider]!==c.id)throw fail(400,'现有执行协议不支持同一渠道同时使用不同连接；请明确使用同一连接。');
    providerConnections[c.provider]=c.id;
    const credential=simulation?'local-simulation-only':c.scope==='account'?await libraryStore.resolve(user,c.id):request.browserCredentials?.[c.id];
    if(typeof credential!=='string'||!credential.trim())throw fail(400,'当前执行缺少连接密钥，请在模型管理配置。');
    if(c.provider==='custom')customKeys[c.id]={...c.custom,apiKey:credential,...(c.expiresAt?{expiresAt:new Date(c.expiresAt).toISOString()}:{})};
    else {if(keys[c.provider]&&keys[c.provider]!==credential)throw fail(400,'现有执行协议不支持同一渠道同时使用不同密钥；请明确使用同一连接。');keys[c.provider]=credential;}
  }
  if(Object.keys(customKeys).length)keys.custom=JSON.stringify(customKeys);
  return {modelRoutes:routes,apiKeys:keys,providerRegions:regions,provider:routes.main.accessProvider,mainModelName:routes.main.modelId,...(routes.image?{imageModelName:routes.image.modelId}:{}),...(routes.vision?{referenceVisionModelName:routes.vision.modelId}:{})};
}
// Optional envelope: existing routes still perform their own auth, ownership,
// material, journal, capability and Core admission checks. Secrets stay in memory.
export function workspaceExecutionMiddleware({auth,store,libraryStore,workspaceStore,backend,frontendOrigins,isMaintenance=()=>false,simulation=false}) {
  const origins=new Set(frontendOrigins);
  return async (req,res,next)=>{
    const envelope=req.body?.workspaceExecution;
    if(!envelope)return next();
    res.set('Cache-Control','no-store');
    const send=res.json.bind(res);
    try {
      if(!origins.has(req.get('origin')))throw fail(403,'INVALID_ORIGIN');
      if(isMaintenance())throw fail(503,'MAINTENANCE');
      const session=await auth.optionalSession(req),user=String(session?.user?.id||'');
      if(!user)throw fail(401,'请先登录图研');
      if(req.get('x-workspace-account')!==user)throw fail(409,'账号已切换，未提交执行');
      if(!store||!libraryStore||!workspaceStore)throw fail(503,'当前服务尚未支持工作区执行');
      if(envelope.version!==1||!identifier(envelope.taskId)||!identifier(envelope.runId))throw fail(400,'无效执行标识');
      const {taskId,runId}=envelope;
      const task=(await workspaceStore.get(user)).state?.tasks.find(t=>t.id===taskId);
      if(!task||task.deleted)throw fail(409,'请先完成此任务的账号同步，再开始执行。');
      const prior=await store.get(user,runId);
      if(req.body.action==='workspaceAdoptHistory') {
        const run=task.runs?.find(r=>r.id===runId);
        if(!run?.history?.jobId||task.activeRunId!==runId)throw fail(409,'这不是当前任务的活动历史执行。');
        const verified=await readHistoricalExecution(backend,user,run.history.jobId);
        if(!prior)requireHistoricalPause(verified.job);
        const execution=await store.adoptHistory(user,taskId,runId,{jobId:run.history.jobId,routes:verified.routes,fingerprint:verified.fingerprint});
        return send({execution});
      }
      if(req.body.action==='workspaceCloseUnaccepted')return send({execution:await store.closeUnaccepted(user,taskId,runId)});
      if(req.body.action==='workspaceExecutionStatus') {
        if(prior&&prior.taskId!==taskId)throw fail(404,'执行不存在');
        return send({execution:prior});
      }
      const resume=['tokenDanceResume','providerResume'].includes(req.body.action);
      if(resume){
        if(!prior||prior.taskId!==taskId||!prior.jobId)throw fail(409,'无法确认原执行，不会创建新的任务。');
        if(['running','queued','completed','succeeded'].includes(prior.status))return send({jobId:prior.jobId,status:prior.status});
        if(prior.status!=='awaiting_provider')throw fail(409,'原任务尚未确认可恢复，请先刷新执行状态。');
        if(prior.historical){
          const verified=await readHistoricalExecution(backend,user,prior.jobId);
          if(verified.fingerprint!==prior.fingerprint)throw fail(409,'原执行配置已改变，停止自动恢复。');
          if(['running','queued','completed','succeeded'].includes(verified.job.status)){
            await store.update(user,runId,{status:verified.job.status});return send({jobId:prior.jobId,status:verified.job.status});
          }
          requireHistoricalPause(verified.job);
          // No client model, prompt, settings or credential override. Core
          // resumes its existing checkpoint and independently enforces the lock.
          req.body={action:verified.job.recovery.channel==='tokendance'||!verified.job.recovery.channel?'tokenDanceResume':'providerResume',jobId:prior.jobId};
        }else{
        const input=task.runs?.find(run=>run.id===runId)?.input;
        const expectedModels=prior.models||input?.settings?.[input.mode]?.models;
        if(!expectedModels||Object.keys(prior.routes||{}).some(role=>expectedModels[role]?.connectionId!==envelope.models?.[role]?.connectionId||expectedModels[role]?.libraryModelId!==envelope.models?.[role]?.libraryModelId))throw fail(409,'恢复不能更换原执行的连接。');
        const routing=await resolveWorkspaceModels({libraryStore,user,body:req.body,simulation,rolesOverride:['main','image','vision'].filter(role=>prior.routes?.[role])});
        if(JSON.stringify(routing.modelRoutes)!==JSON.stringify(prior.routes))throw fail(409,'恢复不能更换原执行的模型与连接。');
        Object.assign(req.body,routing,{jobId:prior.jobId});
        }
      } else if(req.body.action==='getJob') {
        if(!prior||prior.taskId!==taskId||!prior.jobId)throw fail(409,'执行结果尚未确认；不会重复发送生成请求。');
        req.body.jobId=prior.jobId;
      } else {
        if(!['createJob','refineImage','optimizeInputs'].includes(req.body.action))throw fail(400,'不支持的工作区操作');
        if(prior) {if(prior.taskId!==taskId)throw fail(409,'执行标识冲突');if(req.body.action==='optimizeInputs'&&prior.optimizationResult)return send(prior.optimizationResult);return prior.jobId?send({jobId:prior.jobId,status:prior.status}):res.status(409).json({error:'执行已接收，结果尚未确认；请恢复状态，不要重复提交。'});}
        if(req.body.action!=='optimizeInputs'&&(task.activeRunId!==runId||!task.runs?.some(r=>r.id===runId&&r.status==='submitting')))throw fail(409,'此提交已被其他标签页更新，请同步当前任务；不会重复发起生成。');
        const routing=await resolveWorkspaceModels({libraryStore,user,body:req.body,simulation});
        const {fresh,execution}=await store.claim(user,taskId,runId);
        if(!fresh)return execution.jobId?send({jobId:execution.jobId,status:execution.status}):res.status(409).json({error:'执行正在确认'});
        if(req.body.action!=='optimizeInputs'){
          const latest=(await workspaceStore.get(user)).state?.tasks.find(t=>t.id===taskId);
          if(latest?.deleted||latest?.activeRunId!==runId||!latest?.runs?.some(r=>r.id===runId&&r.status==='submitting')){await store.update(user,runId,{status:'failed',closedUnaccepted:true});throw fail(409,'此提交已被其他标签页更新，未发送生成请求。');}
        }
        Object.assign(req.body,routing);
        if(req.body.action==='optimizeInputs'){req.body.mainRoute=routing.modelRoutes.main;req.body.apiKey=routing.apiKeys[req.body.mainRoute.accessProvider];}
      }
      req.workspaceContext={user,taskId,runId,simulation:envelope.simulation};
      delete req.body.workspaceExecution;
      res.json=data=>{
        const patch=req.body.action==='optimizeInputs'&&typeof data.optimizedText==='string'&&res.statusCode<400?{status:'completed',optimizationResult:{target:data.target,optimizedText:data.optimizedText.slice(0,12000),...(Array.isArray(data.materialWarnings)?{materialWarnings:data.materialWarnings.filter(w=>typeof w==='string')}: {})}}:req.body.action==='getJob'?{status:data.job?.status||prior.status}:data.jobId?{jobId:prior?.historical?prior.jobId:String(data.jobId),status:data.status||'running',...(!prior?.historical?{routes:req.body.modelRoutes,models:Object.fromEntries(Object.keys(req.body.modelRoutes||{}).map(role=>[role,Object.fromEntries(['libraryModelId','connectionId','accessProvider','modelId'].map(k=>[k,envelope.models?.[role]?.[k]]))]))}:{})}:(res.statusCode>=400&&res.statusCode<500||Number(data.code)>=400&&Number(data.code)<500||data.requestState==='not_sent')?{status:resume?'awaiting_provider':'failed'}:{status:resume?'awaiting_provider':'unknown'};
        // Persist acceptance before responding; a crash leaves the slot occupied.
        void store.update(user,runId,patch).then(()=>send(data)).catch(()=>{res.status(503);send({error:'执行状态保存未完成，请恢复状态；不要重复提交。'});});
        return res;
      };
      next();
    } catch(error){res.status(error.status||503);send({error:error.status?error.message:'执行服务暂时不可用；原草稿已保留。'});}
  };
}
