const failure=(code,status=503)=>Object.assign(Error(code),{code,status});
export function safePurchaseUrl(value){
  if(typeof value!=='string'||value.length>8192)throw failure('PLUS_INVALID_PURCHASE_LINK');
  let url;try{url=new URL(value);}catch{throw failure('PLUS_INVALID_PURCHASE_LINK');}
  if(url.username||url.password||!(url.protocol==='https:'||url.protocol==='alipays:'&&url.hostname==='platformapi'&&url.pathname==='/startapp'))throw failure('PLUS_INVALID_PURCHASE_LINK');
  return value;
}
export function normalizeWatchaAccess(data, nowSeconds=Math.floor(Date.now()/1000)){
  if(data?.access==='unavailable')throw failure('PLUS_PAYMENT_UNAVAILABLE');
  if(!['granted','purchase_required'].includes(data?.access)||data.entitlement?.type!=='duration')throw failure('PLUS_INVALID_PAYMENT_RESPONSE');
  if(data.access==='granted'){
    const {starts_at:startsAt,expires_at:expiresAt}=data.entitlement;
    if(!Number.isSafeInteger(startsAt)||!Number.isSafeInteger(expiresAt)||startsAt<1||startsAt>nowSeconds||expiresAt<=startsAt||expiresAt<=nowSeconds)throw failure('PLUS_INVALID_PAYMENT_PERIOD');
    // Provider timestamps remain authoritative. This broad invariant catches
    // obviously non-monthly periods without inventing a 30-day replacement or
    // assuming an undocumented month-end / timezone rounding policy.
    if(expiresAt-startsAt<27*86400||expiresAt-startsAt>32*86400)throw Object.assign(failure('PLUS_PAYMENT_PERIOD_REVIEW'),{observedPeriod:{startsAt,expiresAt}});
    return {access:'granted',startsAt,expiresAt};
  }
  return {access:'purchase_required',...(data.purchase?.url?{purchaseUrl:safePurchaseUrl(data.purchase.url)}:{})};
}
export function createPlusWatcha({config,fetchImpl=fetch,now=()=>Date.now()}){
  return {async access(userId){
    if(!config.enabled||!['sandbox','live'].includes(config.environment)||!config.paymentConfigured)throw failure('PLUS_PAYMENT_NOT_CONFIGURED');
    let response,data;
    try{
      // No retry: a timeout leaves this check pending. The next explicit check
      // uses the same stable user and entitlement, never a new buyer identity.
      response=await fetchImpl('https://pay.watcha.cn/v1/entitlements/access',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({entitlement_id:config.entitlementId,user_id:String(userId),return_url:config.returnUrl})});
      if(!response.ok)throw failure('PLUS_PAYMENT_CHECK_UNKNOWN');
      data=await response.json();
    }catch{throw failure('PLUS_PAYMENT_CHECK_UNKNOWN');}
    return normalizeWatchaAccess(data,Math.floor(now()/1000));
  }};
}
