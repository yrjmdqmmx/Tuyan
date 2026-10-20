import express from 'express';
import { taskJobIds } from '../../../packages/api/src/workspace-deletion.mjs';
import { resultReferences } from '../../../packages/api/src/workspace-sync.mjs';
const fail=(status,message)=>Object.assign(Error(message),{status});
// Historical Mongo bytes remain as a rollback copy during migration. Once Core
// confirms removal, retire those duplicate bytes without relying on a login.
export function createLegacyImageCleanup({db,imageLibrary,intervalMs=60000}) {
  let timer,running;
  const sweep=async()=>{
    const rows=await db.collection('workspaceResults').find({library:true,base64:{$exists:true}},{projection:{userId:1,resultId:1}}).toArray();
    for(const userId of new Set(rows.map(r=>r.userId))){
      try{
        const status=await imageLibrary.status(userId);
        const ids=status.images.filter(r=>r.status==='removed').map(r=>r.id);
        if(ids.length)await db.collection('workspaceResults').updateMany({userId,library:true,resultId:{$in:ids}},{$unset:{base64:''}});
      }catch{/* Keep the copy; the next server tick retries. */}
    }
  };
  const tick=()=>{if(!running)running=sweep().catch(()=>{}).finally(()=>{running=null;});return running;};
  return {sweep,start(){if(!timer){timer=setInterval(tick,intervalMs);timer.unref?.();void tick();}},async stop(){clearInterval(timer);timer=null;await running;}};
}
export function createImageLibraryBridge(backend) {
  const call=async(userId,action,body={})=>{
    const result=await backend.call({action,...body},{},{authUserId:userId,timeoutMs:45000,imageStorage:action==='imageLibrarySave'});
    if(result.status!==200||result.data?.code)throw fail(result.data?.code||result.status||503,result.data?.error||'图片库暂时不可用');
    return result.data;
  };
  return {list:user=>call(user,'imageLibraryList'),status:user=>call(user,'imageLibraryStatus'),read:(user,id)=>call(user,'imageLibraryRead',{id}),
    remove:(user,id)=>call(user,'imageLibraryRemove',{id}),
    save:(user,input)=>call(user,'imageLibrarySave',input)};
}
export function createImageLibraryRouter({auth,backend,frontendOrigins,isMaintenance=()=>false,enabled=false}) {
  const router=express.Router(),bridge=createImageLibraryBridge(backend),origins=new Set(frontendOrigins);
  router.use(async(req,res,next)=>{
    res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');
    try{
      if(req.get('origin')&&!origins.has(req.get('origin'))||req.method!=='GET'&&!origins.has(req.get('origin')))throw fail(403,'INVALID_ORIGIN');
      if(isMaintenance())throw fail(503,'MAINTENANCE');
      const session=await auth.optionalSession(req);
      if(!session?.user?.id)throw fail(401,'SIGN_IN_REQUIRED');
      req.imageUserId=String(session.user.id);
      if(req.get('x-workspace-account')!==req.imageUserId)throw fail(409,'ACCOUNT_CHANGED');
      if(!enabled)throw fail(503,'图片库尚未完成历史数据核对，暂未启用。');
      next();
    }catch(e){next(e);}
  });
  const route=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
  router.get('/status',route(async(req,res)=>res.json(await bridge.status(req.imageUserId))));
  router.get('/',route(async(req,res)=>{
    const data=await bridge.list(req.imageUserId),workspace=await auth.workspaceStore.get(req.imageUserId);
    const tasks=workspace.state?.tasks||[];
    res.json({...data,images:data.images.map(image=>({...image,sources:undefined,
      taskIds:tasks.filter(t=>!t.deleted&&(image.sources||[]).some(s=>s.taskId===t.id||s.jobId&&taskJobIds(t).includes(s.jobId)||s.resultId&&resultReferences({tasks:[t]}).includes(s.resultId)||resultReferences({tasks:[t]}).includes(image.id))).map(t=>t.id)}))});
  }));
  router.get('/:id',route(async(req,res)=>res.json(await bridge.read(req.imageUserId,req.params.id))));
  router.delete('/:id',route(async(req,res)=>res.json(await bridge.remove(req.imageUserId,req.params.id))));
  router.use((error,_req,res,_next)=>res.status(error.status||503).json({error:error.status?error.message:'图片库暂时不可用，请稍后重试。'}));
  return router;
}
