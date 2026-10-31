import { useCallback, useEffect, useState } from 'react';
import { AUTH_BASE_DEFAULT } from '../config.js';

const messages = {
  PHONE_INVALID_NUMBER:'请输入中国大陆 11 位手机号', PHONE_INVALID_CODE:'验证码无效、已过期或尝试次数过多，请重新获取',
  PHONE_CAPTCHA_INVALID:'图形验证码不正确或已过期，请重新获取', PHONE_CHALLENGE_EXPIRED:'验证已过期，请重新获取',
  PHONE_RATE_LIMIT:'发送或验证过于频繁，请稍后再试', PHONE_BINDING_CONFLICT:'手机号已绑定其他账号，不能合并或覆盖账号数据',
  PHONE_ALREADY_LINKED:'当前账号已绑定手机号', PHONE_SIGN_IN_REQUIRED:'登录已失效，请重新登录', PHONE_ACCOUNT_CHANGED:'账号已切换，请重新打开此页面',
  PHONE_SIGN_OUT_REQUIRED:'当前已登录，请刷新登录状态', PHONE_SEND_UNCONFIRMED:'暂未确认短信发送成功，请稍后再试',
  PHONE_DISABLED:'手机号登录暂未启用，请使用其他登录方式', PHONE_ACCOUNT_UNAVAILABLE:'此账号暂不可用',
};
export const visibleAccountEmail = email => /@(phone|wechat|github|google)\.tuyan\.invalid$/i.test(String(email || '')) ? '' : email;
export async function phoneRequest(apiBase, path, body, userId, signal) {
  const response = await fetch(`${apiBase}/api/auth/phone/${path}`,{method:body === undefined ? 'GET':'POST',credentials:'include',
    headers:{'Content-Type':'application/json',...(userId ? {'X-Workspace-Account':userId}: {})},
    ...(body === undefined ? {} : {body:JSON.stringify(body)}),signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000)});
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw Object.assign(Error(messages[data.code] || '手机验证暂不可用，请稍后重试'),{code:data.code,retryAfter:Number(response.headers.get('retry-after') || data.retryAfter || 0)});
  return data;
}
export function usePhoneAuth(apiBase = AUTH_BASE_DEFAULT,userId,enabled=true) {
  const [state,setState] = useState({owner:userId,available:false,pending:true});
  const request = useCallback((path,body,signal)=>phoneRequest(apiBase,path,body,userId,signal),[apiBase,userId]);
  const refresh = useCallback(async(signal)=>{
    if(!enabled){setState({owner:userId,available:false,pending:false});return;}
    try {const result = await request('status',undefined,signal); if(!signal?.aborted)setState({...result,owner:userId,pending:false});}
    catch {if(!signal?.aborted)setState({owner:userId,available:false,pending:false});}
  },[request,userId,enabled]);
  useEffect(()=>{const controller=new AbortController();void refresh(controller.signal);return()=>controller.abort();},[refresh]);
  return {status:!enabled ? {available:false,pending:false} : state.owner===userId ? state : {available:false,pending:true},request,refresh};
}
