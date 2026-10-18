import { useState } from 'react';
import {LeaderboardSessionProvider} from '../components/LeaderboardRoot.jsx';
import BenchmarkPage from '../components/BenchmarkPage.jsx';
import BenchmarkMethodologyPage from '../components/BenchmarkMethodologyPage.jsx';
import { API_BASE_DEFAULT } from '../config.js';

// Reuse the published ranking, filters and evidence views inside the workspace.
// Same-site ranking links navigate here; outbound official sources stay links.
export default function WorkspaceLeaderboard({account, isAdmin, onAdmin, onReturn}) {
  const [path, setPath] = useState('/leaderboard');
  function follow(event) {
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download') || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    // Submission retains the existing explicit form, without auto-submitting anything.
    const route=url.searchParams.get('__route') || url.pathname;
    if (route === '/' && !url.hash) { event.preventDefault(); if (!account?.user && path === '/leaderboard/submit-prompt') account?.onSignIn?.(); else onReturn?.(); return; }
    if(!/^\/leaderboard(?:\/|$)/.test(route) || url.hash && route === '/leaderboard')return;
    event.preventDefault(); setPath(route);
    event.currentTarget.closest('.tw-page')?.scrollTo({ top: 0 });
  }
  return <LeaderboardSessionProvider key={account?.user?.id||'guest'} authEnabled={false} initialSession={account?.user?{user:account.user}:null}><section className="tw-leaderboard" onClick={follow} aria-label="科研绘图排行榜">
    <nav aria-label="排行榜页面"><button type="button" aria-current={path === '/leaderboard' ? 'page' : undefined} onClick={event => { event.currentTarget.closest('.tw-page')?.scrollTo({ top: 0 }); setPath('/leaderboard'); }}>综合排名</button><button type="button" aria-current={path === '/leaderboard/methodology' ? 'page' : undefined} onClick={event => { event.currentTarget.closest('.tw-page')?.scrollTo({ top: 0 }); setPath('/leaderboard/methodology'); }}>评估方法</button><button type="button" aria-current={path === '/leaderboard/submit-prompt' ? 'page' : undefined} onClick={event => { event.currentTarget.closest('.tw-page')?.scrollTo({ top: 0 }); setPath('/leaderboard/submit-prompt'); }}>提交评估题</button>{isAdmin && <button type="button" onClick={onAdmin}>社区评估题审核</button>}</nav>
    {path === '/leaderboard/methodology' ? <BenchmarkMethodologyPage apiBase={API_BASE_DEFAULT} backendMode="gateway" enabled showNavigation={false}/> : <BenchmarkPage apiBase={API_BASE_DEFAULT} backendMode="gateway" enabled pathname={path} showNavigation={false} embedded/>}
  </section></LeaderboardSessionProvider>;
}
