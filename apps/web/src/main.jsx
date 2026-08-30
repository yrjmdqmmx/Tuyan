import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import BenchmarkPage from './components/BenchmarkPage.jsx';
import BenchmarkMethodologyPage from './components/BenchmarkMethodologyPage.jsx';
import { APP_BASE_URL, appRelativeLocation } from './appPaths.js';
import { API_BASE_DEFAULT, BACKEND_MODE, BENCH_ENABLED } from './config.js';
import { canonicalizeLeaderboardLocation, resolveLeaderboardRoute } from './leaderboardRoutes.js';
import './styles.css';
import './components/benchmark.css';

const currentAppLocation = appRelativeLocation(globalThis.location, APP_BASE_URL);
const leaderboardLocation = canonicalizeLeaderboardLocation(currentAppLocation, globalThis.history, APP_BASE_URL);
const leaderboardRoute = resolveLeaderboardRoute(leaderboardLocation?.pathname);
if (leaderboardRoute.methodology) document.title = 'PaperBanana 排行榜方法说明';
else if (leaderboardRoute.promptSubmission) document.title = '提交评估题 · PaperBanana';
else if (leaderboardRoute.promptAdmin) document.title = '社区评估题审核 · PaperBanana';
else if (leaderboardRoute.modelProfileId) document.title = '模型生成证据 · PaperBanana';
else if (leaderboardRoute.caseId) document.title = '同题模型对比 · PaperBanana';
else if (leaderboardRoute.isLeaderboard) document.title = 'PaperBanana 生图模型排行榜';

createRoot(document.getElementById('root')).render(
  leaderboardRoute.methodology
    ? <BenchmarkMethodologyPage apiBase={API_BASE_DEFAULT} backendMode={BACKEND_MODE || 'gateway'} enabled={BENCH_ENABLED} />
    : leaderboardRoute.isLeaderboard
    ? <BenchmarkPage apiBase={API_BASE_DEFAULT} backendMode={BACKEND_MODE || 'gateway'} enabled={BENCH_ENABLED} pathname={leaderboardLocation.pathname} />
    : <App />,
);
