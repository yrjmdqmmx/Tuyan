const messages = {
  WECHAT_DISABLED:'微信登录尚未启用，请使用其他方式', WECHAT_EXPIRED:'微信授权已过期，请重新扫码',
  WECHAT_BINDING_CONFLICT:'该微信已绑定其他账号，不能合并或覆盖账号数据', WECHAT_ALREADY_LINKED:'当前账号已绑定微信',
  WECHAT_ACCOUNT_CHANGED:'登录账号已变化，请重新发起微信授权', WECHAT_SIGN_IN_REQUIRED:'请先登录原来的图研账号',
  WECHAT_SIGN_OUT_REQUIRED:'当前已有登录账号，请到账户设置绑定微信', WECHAT_ACCOUNT_UNAVAILABLE:'账号暂不可用',
  WECHAT_REGISTRATION_REQUIRED:'请确认创建新账号，或使用原账号登录后绑定微信',
};
export async function wechatRequest(apiBase,action,body,userId,fetcher=fetch) {
  if(!['status','start','complete','cancel'].includes(action))throw Error('不支持的微信账号操作');
  const response=await fetcher(`${String(apiBase || '').replace(/\/$/,'')}/api/auth/wechat/${action}`,{method:action==='status'?'GET':'POST',credentials:'include',cache:'no-store',
    headers:{'Content-Type':'application/json',...(userId?{'X-Workspace-Account':userId}:{})},...(action==='status'?{}:{body:JSON.stringify(body || {})}),signal:AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok || !data || (['complete','cancel'].includes(action) && data.ok!==true))throw Error(messages[data?.code] || (response.status===429?'操作过于频繁，请稍后重试':'微信账号操作未完成，请稍后重试'));
  return data;
}
export function wechatLaunchUrl(value,apiBase,origin) {
  const url=new URL(value),apiOrigin=new URL(apiBase || origin,origin).origin;
  if(!new Set([apiOrigin,'https://tuyansci.cn','https://openacad.xyz','https://api.paperbanana.asia']).has(url.origin)
    || url.username || url.password || url.hash || url.pathname!=='/api/auth/wechat/launch' || [...url.searchParams.keys()].join()!=='ticket' || !/^[a-f0-9]{64}$/.test(url.searchParams.get('ticket') || ''))throw Error('微信授权地址无效');
  return url.toString();
}
export function isWechatCallback(event,popup,origin) {
  return Boolean(popup && event.source===popup && event.origin===origin && event.data?.type==='tuyan-wechat-complete' && ['pending','error'].includes(event.data.status));
}
