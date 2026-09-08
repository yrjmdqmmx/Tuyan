import { useEffect, useState } from 'react';
import { adminOperationsRequest } from '@paperbanana/api';

export function useAdminData(apiBase, action, query, refresh = 0) {
  const key = JSON.stringify(query);
  const requestKey = `${apiBase}|${action}|${key}`;
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState((previous) => ({ data: previous.requestKey === requestKey ? previous.data : null, requestKey, loading: true, error: null }));
    adminOperationsRequest(apiBase, action, JSON.parse(key), { signal: controller.signal }).then((data) => {
      if (active) setState({ data, requestKey, loading: false, error: null });
    }).catch((error) => { if (active) setState({ data: null, requestKey, loading: false, error }); });
    return () => { active = false; controller.abort(); };
  }, [apiBase, action, key, requestKey, refresh]);
  return state.requestKey && state.requestKey !== requestKey ? { data: null, loading: true, error: null } : state;
}
export function errorText(error) {
  if ([401, 403].includes(error?.code) || [401, 403].includes(error?.status)) return '登录已失效或当前账号没有站长权限。请重新登录有权限的账号。';
  return error?.message || '请求失败，请稍后重试。';
}
