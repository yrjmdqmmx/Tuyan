import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import BenchmarkPage from './components/BenchmarkPage.jsx';
import { API_BASE_DEFAULT, BACKEND_MODE, BENCH_ENABLED } from './config.js';
import './styles.css';
import './components/benchmark.css';

const isBenchmarkRoute = globalThis.location?.pathname === '/bench' || globalThis.location?.pathname?.startsWith('/bench/');
if (isBenchmarkRoute) document.title = 'PaperBanana 模型横评';

createRoot(document.getElementById('root')).render(
  isBenchmarkRoute
    ? <BenchmarkPage apiBase={API_BASE_DEFAULT} backendMode={BACKEND_MODE || 'gateway'} enabled={BENCH_ENABLED} />
    : <App />,
);
