// Read/reconcile original operations only. Never submits a model request or payment.
export function createPlusReconciler({service,store,logger=console,intervalMs=30000,now=()=>Date.now()}){
 let timer=null,running=null,stopped=false;
 const attempt=async(kind,row,action)=>{
  let failed=false;
  try{const result=await action();failed=result?.operation?.status==='unknown';}catch{failed=true;}
  try{await store.recordReconciliationAttempt(row.userId,{kind,key:row.key,delayMs:failed?300000:30000,failed});}catch{logger.warn?.('plus reconciliation metadata update deferred');}
 };
 async function run(){
  const batch=await store.reconciliationBatch();
  for(const row of batch.operations){if(stopped)break;await attempt('operation',row,()=>row.status==='reserved'&&Number.isFinite(row.createdAt)&&row.createdAt<=now()-300000?service.cancelUnsent(row.userId,row.key):service.poll(row.userId,row.key));}
  for(const row of batch.checkouts){if(stopped)break;await attempt('checkout',row,()=>service.check(row.userId,{exposePurchase:false}));}
 }
 function tick(){if(stopped)return Promise.resolve();if(running)return running;running=run().catch(()=>logger.warn?.('plus reconciliation cycle deferred')).finally(()=>{running=null});return running;}
 return {tick,start(){if(timer)return;stopped=false;timer=setInterval(tick,intervalMs);timer.unref?.();void tick();},async stop(){stopped=true;clearInterval(timer);timer=null;await running;}};
}
