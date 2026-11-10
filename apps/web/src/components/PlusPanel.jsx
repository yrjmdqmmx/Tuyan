import ControlField from './ControlField.jsx';
import {useCallback,useEffect,useRef,useState} from 'react';
import {PLUS_PRESETS,PLUS_PRODUCT} from '../../../../packages/api/src/plus.mjs';
const date=value=>value?new Date(value*1000).toLocaleString('zh-CN',{dateStyle:'medium',timeStyle:'short'}):'—';
const labels={grant:'周期发放',reserve:'任务预留',settle:'任务结算',release:'失败释放',expired:'周期到期',suspended:'权益待核对',period_review:'会员周期异常',period_corrected:'平台周期修正',refund_requested:'退款申请',refund_confirmed:'退款权益收回'};
import {createPlusClient} from '../plus/plusClient.js';
export {createPlusClient} from '../plus/plusClient.js';
export default function PlusPanel({userId,apiBase='',enabled=false,request:providedRequest}){
  const request=useCallback((...args)=>providedRequest?providedRequest(...args):createPlusClient(apiBase,userId)(...args),[providedRequest,apiBase,userId]);
  const [catalog,setCatalog]=useState(null),[account,setAccount]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [purchase,setPurchase]=useState(null),[paymentState,setPaymentState]=useState('idle');
  const generation=useRef(0);
  useEffect(()=>{
    const id=++generation.current,controller=new AbortController();setCatalog(null);setAccount(null);setPurchase(null);setPaymentState('idle');setError('');setBusy(false);
    if(!enabled||!userId)return()=>controller.abort();
    Promise.all([request('/catalog',undefined,controller.signal),request('/account',undefined,controller.signal)]).then(([c,a])=>{if(generation.current===id){setCatalog(c);setAccount(a);setPaymentState(a.checkoutPending?'pending':'idle');}}).catch(e=>{if(!controller.signal.aborted&&generation.current===id&&e.status!==404)setError(e.message);});
    return()=>{++generation.current;controller.abort();};
  },[enabled,userId,request]);
  async function refresh(){const id=generation.current,a=await request('/account');if(generation.current===id)setAccount(a);}
  async function checkPayment(){
    if(busy)return;const id=generation.current;setBusy(true);setError('');setPaymentState('checking');
    try{const result=await request('/membership/check',{});if(generation.current!==id)return;
      setAccount(a=>({...a,membership:result.membership}));
      if(result.membership.status==='active'){setPurchase(null);setPaymentState('confirmed');await refresh();}
      else{setPurchase(result.purchaseUrl||null);setPaymentState(result.purchaseBlocked?'blocked':result.purchasePaused?'paused':result.purchaseUrl?'pending':'unavailable');}
    }catch(e){if(generation.current===id){setError(e.message);setPurchase(null);setPaymentState('unknown');if(e.code==='PLUS_PAYMENT_PERIOD_REVIEW')await refresh();}}
    finally{if(generation.current===id)setBusy(false);}
  }
  if(!enabled||!userId)return null;
  if(!catalog)return error?<section className="tw-plus" aria-label="Plus 套餐"><p role="alert">{error}</p></section>:null;
  const member=account?.membership||{},active=member.status==='active',live=catalog.environment==='live';
  return <section className="tw-plus" aria-label="Plus 套餐">
    <header className="tw-plus-header"><h3>Plus</h3><span className="tw-plus-badge">{live?'管理员内测':'沙箱预览'}</span></header>
    <div className="tw-plus-price"><strong>¥39</strong><span>/ 月</span><b>2000 积分</b></div>
    <ul className="tw-plus-benefits"><li>国内模型 · 快速 / 均衡 / 极致</li><li>PNG、SVG 共用积分</li></ul>
    <p className="tw-plus-terms">支付确认后生效，有效期以账户显示为准。到期积分失效、不结转。有效期内不可重复购买；到期手动续购，不自动续费。</p>
    <details><summary>积分与退款规则</summary><p>正式使用按模型计费成本换算：每 ¥{(PLUS_PRODUCT.creditCostMicros/1000000).toFixed(2)} 对应 1 积分，整项任务向上取整一次。失败任务只结算已确认的用量；费用未知时保留预留，等待核对。</p><p>有效期内可按未用积分 ÷ 2000 × ¥39 申请退款。提交申请后暂停新任务，退款成功后结束本期会员、收回余分。</p>{!live&&<p>当前为沙箱演练，模拟扣分不是正式用量；未开放真实收款。</p>}</details>
    <dl className="tw-plus-balances"><div><dt>可用积分</dt><dd>{member.available||0}</dd></div><div><dt>预留中</dt><dd>{member.held||0}</dd></div><div><dt>本期已用</dt><dd>{member.spent||0}</dd></div></dl>
    <div className="tw-plus-status"><span>{({active:'会员生效中',expired:'会员已到期',suspended:'权益待核对',review_required:'会员周期待核对',refund_requested:'退款处理中',refunded:'本期权益已收回'})[member.status]||'尚未开通'}</span>{member.expiresAt&&<span>{member.status==='review_required'?'平台返回到期时间':'会员到期时间'} {date(member.expiresAt)}</span>}</div>
    {member.lockedCredits>0&&<p role="status">待处理积分：{member.lockedCredits}，记录保留，暂不可用。</p>}
    <div className="tw-plus-actions"><button className="tw-primary" onClick={checkPayment} disabled={busy||!catalog.paymentConfigured}>{busy?'正在查询…':['pending','unknown','left'].includes(paymentState)?'查询购买结果':member.status==='expired'?'查看续购入口':member.cycleId||active?'核对会员状态':catalog.newPurchasesEnabled===false?'查询会员状态':live?'购买 Plus':'查看沙箱购买入口'}</button>
      {purchase&&!active&&<a href={purchase} target="_blank" rel="noopener noreferrer" onClick={()=>setPaymentState('pending')}>{live?'支付 ¥39':'模拟购买 ¥39'}</a>}
      {purchase&&<button onClick={()=>{setPurchase(null);setPaymentState('left');}}>返回套餐</button>}
    </div>
    <p role="status" className="tw-plus-payment-status">{({pending:'等待支付确认。完成购买后，请点击查询。',checking:'正在向支付平台核对',confirmed:'已由后端确认会员权益',unknown:'支付结果待确认，不重复购买。',left:'已退出购买；是否支付成功仍需查询确认。',blocked:'上期权益仍需核对，暂不提供再次购买入口。',paused:'新购买已暂停，已有会员仍可核对状态。',unavailable:'暂时无法购买，请稍后查询'})[paymentState]||(!catalog.paymentConfigured?(live?'开通准备中':'沙箱凭证尚未配置'):live?(catalog.newPurchasesEnabled?'':'暂未开放购买'):'本页为沙箱，不产生真实扣款。')}</p>
    {live&&purchase&&<p>本次支付 ¥39，购买一个日历月会员；不自动续费，周期结束未用积分失效。</p>}
    {error&&<p role="alert">{error}</p>}
    {member.status==='refund_requested'&&<p role="status">退款申请待人工处理：¥{(member.refundFen/100).toFixed(2)}。尚未退款，本期暂停新任务。</p>}
    {active&&<PlusRefundRequest live={live} request={request} member={member} hasPending={Boolean(account?.pending?.length)} onChange={refresh}/>}
    {catalog.executionMode==='simulation'&&<PlusSimulationTasks key={`simulation:${userId}`} request={request} member={member} pending={account?.pending?.[0]} allowStart={catalog.newTasksEnabled===true} onChange={refresh}/>}
    <PlusLedger key={`ledger:${userId}`} request={request} entries={account?.ledger} nextCursor={account?.ledgerNextCursor}/>
  </section>;
}

function PlusLedger({request,entries,nextCursor}){
  const [older,setOlder]=useState([]),[cursor,setCursor]=useState(nextCursor),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const generation=useRef(0);
  useEffect(()=>{++generation.current;setOlder([]);setCursor(nextCursor);setBusy(false);setError('');return()=>{++generation.current;};},[entries,nextCursor]);
  async function more(){
    if(busy||!cursor)return;const id=generation.current;setBusy(true);setError('');
    try{const page=await request('/ledger?cursor='+encodeURIComponent(cursor));if(id===generation.current){setOlder(v=>[...v,...page.entries]);setCursor(page.nextCursor);}}
    catch(e){if(id===generation.current)setError(e.message);}finally{if(id===generation.current)setBusy(false);}
  }
  const rows=[...(entries||[]),...older];
  return <details className="tw-plus-ledger"><summary>积分记录</summary>{rows.length?<ol>{rows.map((entry,i)=><li key={entry.entryId||`${entry.kind}-${entry.operationKey||entry.cycleId}-${i}`}><span>{labels[entry.kind]||entry.kind}<small>{new Date(entry.at).toLocaleString('zh-CN')}</small></span><strong>{entry.kind==='settle'?`消耗 ${entry.charged}`:entry.availableDelta>0?`+${entry.availableDelta}`:entry.availableDelta||'—'}</strong></li>)}</ol>:<p>暂无记录</p>}{cursor&&<button disabled={busy} onClick={more}>{busy?'正在加载…':'加载更多记录'}</button>}{error&&<p role="alert">{error}</p>}</details>;
}

function PlusRefundRequest({live=false,request,member,hasPending,onChange}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const eligible=member.available>0&&member.held===0&&!hasPending;
  async function apply(){setBusy(true);setError('');try{await request('/refund/request',{});await onChange();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <details><summary>按剩余积分申请退款</summary><p>预计可退 ¥{(Math.round(3900*member.available/2000)/100).toFixed(2)}（{member.available} ÷ 2000 × ¥39）</p><p className="tw-plus-terms">申请后暂停新任务，等待人工核对。退款成功后结束本周期会员并收回未用积分。预留中的任务须先结清。{!live&&'本次仅演练，不退真实款项。'}</p><button disabled={busy||!eligible} onClick={apply}>{busy?'正在提交…':'确认提交退款申请'}</button>{error&&<p role="alert">{error}</p>}</details>;
}

// Exercises the same authenticated reservation APIs. Deliberately separate from
// real drawing: mock tariff and images must never masquerade as a paid service.
export function PlusSimulationTasks({request,member,pending,onChange,allowStart=true}){
  const [spec,setSpec]=useState({path:'png',mode:'fast',kind:'generate',candidates:1,reviews:1,imageSize:'2K',aspectRatio:'landscape'});
  const [quote,setQuote]=useState(null),[operation,setOperation]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const keyRef=useRef(null),live=useRef(true);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  useEffect(()=>{if(pending&&!keyRef.current){keyRef.current=pending.key;setOperation(pending);if(pending.spec)setSpec(pending.spec);}},[pending]);
  const change=patch=>{setSpec(s=>({...s,...patch}));setQuote(null);setError('');};
  async function estimate(){setBusy(true);setError('');try{const q=await request('/quote',spec);if(live.current)setQuote(q);}catch(e){if(live.current)setError(e.message);}finally{if(live.current)setBusy(false);}}
  async function submit(){
    if(!quote||busy)return;setBusy(true);setError('');
    const key=keyRef.current||crypto.randomUUID();keyRef.current=key;setQuote(null);
    try{const op=await request('/jobs',{key,quote:quote.token,spec});if(live.current){setOperation(op);setQuote(null);}await onChange();}
    catch(e){if(live.current){if(e.status>=400&&e.status<500&&e.code!=='PLUS_IDEMPOTENCY_CONFLICT'){keyRef.current=null;setQuote(null);setOperation(null);}else setOperation({key,status:'unknown'});setError(e.message);}}
    finally{if(live.current)setBusy(false);}
  }
  async function poll(){if(!keyRef.current)return;setBusy(true);setError('');try{const result=await request('/jobs/'+encodeURIComponent(keyRef.current));if(live.current)setOperation(result.operation);await onChange();}catch(e){if(live.current)setError(e.message);}finally{if(live.current)setBusy(false);}}
  async function cancel(){setBusy(true);try{const op=await request('/jobs/'+encodeURIComponent(keyRef.current)+'/cancel',{});if(live.current)setOperation(op);await onChange();}catch(e){if(live.current)setError(e.message);}finally{if(live.current)setBusy(false);}}
  const terminal=['settled','released'].includes(operation?.status),locked=Boolean(keyRef.current&&!terminal);
  return <details className="tw-plus-simulation"><summary>积分流程演练</summary><p>模拟扣分与占位结果，不代表正式扣分标准，不调用模型。</p>
    {!allowStart&&<p role="status">新任务已暂停，原任务仍可查询和结算。</p>}
    <fieldset disabled={busy||locked||!allowStart}><legend>任务设置</legend><div className="tw-plus-fields">
      <ControlField label={<>格式</>}><select value={spec.path} onChange={e=>change({path:e.target.value})}><option value="png">PNG</option><option value="svg">SVG</option></select></ControlField>
      <ControlField label={<>模式</>}><select value={spec.mode} onChange={e=>change({mode:e.target.value})}>{Object.entries(PLUS_PRESETS).map(([id,p])=><option key={id} value={id}>{p.label}</option>)}</select></ControlField>
      <ControlField label={<>候选数</>}><input type="number" min="1" max="6" value={spec.candidates} onChange={e=>change({candidates:Number(e.target.value)})}/></ControlField>
      <ControlField label={<>评审轮数</>}><input type="number" min="1" max="5" value={spec.reviews} onChange={e=>change({reviews:Number(e.target.value)})}/></ControlField>
      <ControlField label={<>清晰度</>}><select value={spec.imageSize} onChange={e=>change({imageSize:e.target.value})}>{['1K','2K'].map(x=><option key={x}>{x}</option>)}</select></ControlField>
    </div></fieldset>
    {!locked&&!terminal&&<button onClick={estimate} disabled={busy||!allowStart||member.status!=='active'}>查看本次预留积分</button>}
    {quote&&<div className="tw-plus-confirm"><strong>本次预留 {quote.credits} 积分（模拟）</strong><p>提交后先预留；结果或费用未知时保持预留，等待核对。</p><button className="tw-primary" disabled={busy||!allowStart} onClick={submit}>确认并开始演练</button><button disabled={busy} onClick={()=>setQuote(null)}>取消</button></div>}
    {operation&&<p role="status">{({reserved:'积分已预留',submitting:'正在提交',running:'等待结算',unknown:'结果待核对；不会重复提交',settled:'任务已结算',released:'预留已释放'})[operation.status]}</p>}
    {locked&&<button disabled={busy} onClick={poll}>查询原任务并结算</button>}
    {operation?.status==='reserved'&&<button disabled={busy} onClick={cancel}>取消未提交任务</button>}
    {terminal&&<button onClick={()=>{keyRef.current=null;setOperation(null);setQuote(null);}}>新建演练任务</button>}
    {error&&<p role="alert">{error}</p>}
  </details>;
}
