import { useCallback, useEffect, useState } from 'react';
import { useAppLocale } from '../components/BenchmarkLocale.jsx';
import { resolveWorkspaceLocation, workspacePageHref } from './workspaceRoutes.js';

export default function useWorkspaceNavigation() {
  const [route, setRoute] = useState(() => resolveWorkspaceLocation(window.location));
  const { t } = useAppLocale();
  useEffect(() => {
    const sync = () => setRoute(resolveWorkspaceLocation(window.location));
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, []);
  useEffect(() => { document.title = route.page === 'workspace' ? t('图研Tuyan工作台') : `${t(route.page === 'models' ? '模型管理' : route.page)} · ${t('图研Tuyan工作台')}`; }, [route.page, t]);
  const navigateHref = useCallback(href => {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.pushState(null, '', next);
    // Native pushState does not emit popstate. Notify embedded readers as well.
    window.dispatchEvent(new window.PopStateEvent('popstate'));
  }, []);
  const navigate = useCallback(page => navigateHref(workspacePageHref(page)), [navigateHref]);
  return { route, navigate, navigateHref };
}
