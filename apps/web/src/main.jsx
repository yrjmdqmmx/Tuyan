import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import LeaderboardRoot, { LeaderboardSessionProvider } from './components/LeaderboardRoot.jsx';
import { APP_BASE_URL, appRelativeLocation } from './appPaths.js';
import { API_BASE_DEFAULT, BACKEND_MODE, BENCH_ENABLED } from './config.js';
import { canonicalizeLeaderboardLocation, resolveLeaderboardRoute } from './leaderboardRoutes.js';
import './styles.css';
import './components/benchmark.css';

const currentAppLocation = appRelativeLocation(globalThis.location, APP_BASE_URL);
const leaderboardLocation = canonicalizeLeaderboardLocation(currentAppLocation, globalThis.history, APP_BASE_URL);
const leaderboardRoute = resolveLeaderboardRoute(leaderboardLocation?.pathname);
const TUYAN_BENCHMARK_TITLE = '图研 Tuyan Benchmark · 科研图示生成与编辑模型基准评测';
if (leaderboardRoute.methodology) document.title = '图研 Tuyan Benchmark · 方法说明';
else if (leaderboardRoute.promptSubmission) document.title = '提交评估题 · 图研 Tuyan Benchmark';
else if (leaderboardRoute.promptAdmin) document.title = '社区评估题审核 · 图研 Tuyan Benchmark';
else if (leaderboardRoute.modelProfileId) document.title = '模型生成证据 · 图研 Tuyan Benchmark';
else if (leaderboardRoute.caseId) document.title = '同题模型对比 · 图研 Tuyan Benchmark';
else if (leaderboardRoute.isLeaderboard) document.title = TUYAN_BENCHMARK_TITLE;

createRoot(document.getElementById('root')).render(
  leaderboardRoute.isLeaderboard
    ? <LeaderboardSessionProvider><LeaderboardRoot apiBase={API_BASE_DEFAULT} backendMode={BACKEND_MODE || 'gateway'} enabled={BENCH_ENABLED} pathname={leaderboardLocation.pathname} route={leaderboardRoute} /></LeaderboardSessionProvider>
    : <App />,
);
