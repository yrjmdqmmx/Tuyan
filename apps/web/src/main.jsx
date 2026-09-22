import './components/ThinkingSettings.css'
import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { isChangelogPath } from './changelog.js';
import LeaderboardRoot, { LeaderboardSessionProvider } from './components/LeaderboardRoot.jsx';
import { APP_BASE_URL, appRelativeLocation } from './appPaths.js';
import { API_BASE_DEFAULT, BACKEND_MODE, BENCH_ENABLED } from './config.js';
import { canonicalizeLeaderboardLocation, resolveLeaderboardRoute } from './leaderboardRoutes.js';
import './styles.css';
import './components/tokendance.css';
import './components/watcha.css';
import './components/benchmark.css';
import './components/admin/admin.css';
import './mobile-workbench.css';
import './components/leaderboard-mobile.css';
import './components/changelog.css';

const ChangelogRoot = lazy(() => import('./components/ChangelogRoot.jsx'));

const currentAppLocation = appRelativeLocation(globalThis.location, APP_BASE_URL);
const leaderboardLocation = canonicalizeLeaderboardLocation(currentAppLocation, globalThis.history, APP_BASE_URL);
const leaderboardRoute = resolveLeaderboardRoute(leaderboardLocation?.pathname);
const isChangelog = isChangelogPath(currentAppLocation.pathname);
const TUYAN_BENCHMARK_TITLE = '图研 Tuyan Benchmark · 科研图示生成与编辑模型基准评测';
if (isChangelog) document.title = '更新日志 · 图研 Tuyan';
else if (leaderboardRoute.methodology) document.title = '图研 Tuyan Benchmark · 方法说明';
else if (leaderboardRoute.promptSubmission) document.title = '提交评估题 · 图研 Tuyan Benchmark';
else if (leaderboardRoute.promptAdmin) document.title = '社区评估题审核 · 图研 Tuyan Benchmark';
else if (leaderboardRoute.modelProfileId) document.title = '模型生成证据 · 图研 Tuyan Benchmark';
else if (leaderboardRoute.caseId) document.title = '同题模型对比 · 图研 Tuyan Benchmark';
else if (leaderboardRoute.isLeaderboard) document.title = TUYAN_BENCHMARK_TITLE;

createRoot(document.getElementById('root')).render(
  isChangelog
    ? <LeaderboardSessionProvider><Suspense fallback={<div className="changelog-page" role="status">正在载入更新日志…</div>}><ChangelogRoot apiBase={API_BASE_DEFAULT} backendMode={BACKEND_MODE || 'gateway'} /></Suspense></LeaderboardSessionProvider>
    : leaderboardRoute.isLeaderboard
    ? <LeaderboardSessionProvider><LeaderboardRoot apiBase={API_BASE_DEFAULT} backendMode={BACKEND_MODE || 'gateway'} enabled={BENCH_ENABLED} pathname={leaderboardLocation.pathname} route={leaderboardRoute} /></LeaderboardSessionProvider>
    : <App />,
);
