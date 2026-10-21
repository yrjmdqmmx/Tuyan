import { useEffect, useState } from 'react';
import { appPath, appRelativePath } from '../appPaths.js';
import { resolveWorkspaceLocation } from './workspaceRoutes.js';
import {LeaderboardSessionProvider} from '../components/LeaderboardRoot.jsx';
import BenchmarkPage from '../components/BenchmarkPage.jsx';
import BenchmarkMethodologyPage from '../components/BenchmarkMethodologyPage.jsx';
import { API_BASE_DEFAULT } from '../config.js';

// Reuse the published ranking, filters and evidence views inside the workspace.
// Same-site ranking links navigate here; outbound official sources stay links.
export default function WorkspaceLeaderboard({account, isAdmin, onAdmin, onReturn, navigation}) {
  const [localPath, setLocalPath] = useState('/leaderboard');
  const path = navigation?.route.leaderboardPath || localPath;
  function setPath(next) { if (navigation) navigation.navigateHref(appPath(next)); else setLocalPath(next); }
  useEffect(() => { document.querySelector('.tw-leaderboard')?.closest('.tw-page')?.scrollTo?.({top:0}); }, [path]);
  function follow(event) {
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download') || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    const relative = appRelativePath(url.pathname);
    if (relative === '/' && !url.hash && !url.search) {
      event.preventDefault();
      if (!account?.user && path === '/leaderboard/submit-prompt') account?.onSignIn?.(); else onReturn?.();
      return;
    }
    const next = resolveWorkspaceLocation(url);
    if (!['排行榜', '社区评估题审核'].includes(next.page)) return;
    // Hash links in the same document keep native scrolling and history.
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    event.preventDefault();
    if (navigation) navigation.navigateHref(url.href); else setLocalPath(next.leaderboardPath);

  }
  return <LeaderboardSessionProvider key={account?.user?.id||'guest'} authEnabled={false} initialSession={account?.user?{user:account.user}:null}><section className="tw-leaderboard" onClick={follow} aria-label="科研绘图排行榜">
    <nav aria-label="排行榜页面"><button type="button" aria-current={path === '/leaderboard' ? 'page' : undefined} onClick={event => { event.currentTarget.closest('.tw-page')?.scrollTo({ top: 0 }); setPath('/leaderboard'); }}>综合排名</button><button type="button" aria-current={path === '/leaderboard/methodology' ? 'page' : undefined} onClick={event => { event.currentTarget.closest('.tw-page')?.scrollTo({ top: 0 }); setPath('/leaderboard/methodology'); }}>评估方法</button><button type="button" aria-current={path === '/leaderboard/submit-prompt' ? 'page' : undefined} onClick={event => { event.currentTarget.closest('.tw-page')?.scrollTo({ top: 0 }); setPath('/leaderboard/submit-prompt'); }}>提交评估题</button>{isAdmin && <button type="button" onClick={onAdmin}>社区评估题审核</button>}</nav>
    {path === '/leaderboard/methodology' ? <BenchmarkMethodologyPage apiBase={API_BASE_DEFAULT} backendMode="gateway" enabled showNavigation={false}/> : <BenchmarkPage apiBase={API_BASE_DEFAULT} backendMode="gateway" enabled pathname={path} showNavigation={false} embedded/>}
  </section></LeaderboardSessionProvider>;
}
