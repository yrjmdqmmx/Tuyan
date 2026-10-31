import express from 'express';
const messages={PLUS_MEMBERSHIP_REQUIRED:'Plus 尚未生效或已到期',PLUS_INSUFFICIENT_CREDITS:'积分不足，请减少候选数量或评审轮数',PLUS_CONCURRENCY_LIMIT:'已有任务正在执行或核对，请先处理该任务',PLUS_PAYMENT_NOT_CONFIGURED:'支付服务尚未配置',PLUS_PAYMENT_CHECK_UNKNOWN:'支付状态待确认，请稍后重新查询',PLUS_SUBMISSION_UNKNOWN:'提交结果待核对；积分保持预留，不会重复提交',PLUS_PRICING_NOT_VALIDATED:'正式积分规则尚未验证，暂不开放套餐执行',PLUS_QUOTE_EXPIRED:'积分报价已过期，请重新确认',PLUS_RESULT_PENDING:'任务结果待确认，请稍后查询'};
messages.PLUS_PAYMENT_PERIOD_REVIEW='支付平台返回的会员周期与月度套餐不符，已暂停使用并等待核对';
messages.PLUS_REFUND_RECONCILIATION_REQUIRED='请先核对仍在预留中的任务，再计算退款';
messages.PLUS_RATE_LIMIT='操作较频繁，请稍后再试';
messages.PLUS_NEW_TASKS_PAUSED='已暂停新任务，原任务仍可查询和结算';
Object.assign(messages,{PLUS_OPERATION_NOT_FOUND:'尚未查询到这次提交，可稍后查询或取消未接收提交',PLUS_EDIT_INSTRUCTION_TOO_LONG:'图片修改要求请控制在 2000 字符以内，尚未调用模型',PLUS_WORKSPACE_CHANGED:'任务已发生变化，请检查当前任务后重新确认',PLUS_CORE_NOT_PREPARED:'套餐模型服务尚未启用，未调用模型',PLUS_PRICING_CHANGED:'积分规则已更新，请重新确认',PLUS_INVALID_WORKSPACE_REQUEST:'本次输入不符合套餐接口要求，请检查材料与修改要求',PLUS_UNSUPPORTED_MODEL_DIMENSIONS:'当前 Plus 图片型号支持 1K、2K，请调整清晰度',PLUS_DISPATCH_MAY_HAVE_OCCURRED:'此任务可能已发出，请查询原任务，不能直接释放积分'});
export function createPlusRouter({auth,service,config,frontendOrigins=[],isMaintenance=()=>false,isAllowed=()=>false}){
  const router=express.Router();router.use(express.json({limit:'160kb'}));
  router.use((req,res,next)=>{res.set('Cache-Control','no-store');if(!config?.enabled||!service)return res.status(404).json({code:'PLUS_DISABLED',error:'Plus 尚未开放'});next();});
  router.use(async(req,res,next)=>{try{
    if(req.get('origin')&&!frontendOrigins.includes(req.get('origin')))return res.status(403).json({error:'请求来源不匹配'});
    const session=await auth.optionalSession(req),userId=String(session?.user?.id||'');
    if(!userId)return res.status(401).json({error:'请先登录图研'});
    if(config.adminOnly&&!isAllowed(session.user))return res.status(403).json({code:'PLUS_ADMIN_ONLY',error:'暂未向该账号开放'});
    if(req.get('X-Workspace-Account')!==userId)return res.status(409).json({error:'账号已切换，请刷新页面'});
    if(isMaintenance())return res.status(503).json({error:'服务维护中，请稍后再试'});
    req.plusUserId=userId;next();
  }catch(error){next(error);}});
  const route=(method,path,handler)=>router[method](path,async(req,res)=>{try{await service.rateLimit?.(req.plusUserId,method==='post'?'write':'read');res.json(await handler(req));}catch(error){const candidate=error.code||error.message,code=typeof candidate==='string'&&/^PLUS_[A-Z_]+$/.test(candidate)?candidate:'PLUS_REQUEST_FAILED';if(error.retryAfterSeconds)res.set('Retry-After',String(error.retryAfterSeconds));res.status(error.status||503).json({code,error:messages[code]||'暂时无法完成，请保留当前任务并稍后查询'});}});
  route('get','/catalog',()=>service.catalog());
  route('get','/account',req=>service.status(req.plusUserId));
  route('get','/ledger',req=>service.history(req.plusUserId,req.query.cursor));
  route('post','/membership/check',req=>service.check(req.plusUserId));
  route('post','/quote',req=>service.quote(req.plusUserId,req.body));
  route('post','/refund/request',req=>service.requestRefund(req.plusUserId));
  route('post','/jobs',req=>service.submit(req.plusUserId,req.body));
  route('get','/jobs/:key',req=>service.poll(req.plusUserId,req.params.key));
  route('post','/jobs/:key/cancel',req=>service.cancelUnsent(req.plusUserId,req.params.key));
  return router;
}
