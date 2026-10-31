import './components/github.css';
import './components/google.css';
import './components/wechat.css';
import './components/menus.css';
import './focus.css';
import './components/journal-rules.css'
import './components/journal-bookshelf.css'
import './components/svgWorkspace.css'
import './components/referenceTaxonomy.css'
import './components/figureTypePicker.css'
import './components/workflowOptions.css'
import './components/guidePanel.css'
import './components/ThinkingSettings.css'
import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { AppLocaleProvider } from './components/BenchmarkLocale.jsx';
import './styles.css';
import './components/tokendance.css';
import './components/watcha.css';
import './components/phone-auth.css';
import './components/benchmark.css';
import './components/admin/admin.css';
import './mobile-workbench.css';
import './components/generationSettingsDrawer.css';
import './components/leaderboard-mobile.css';
import './components/changelog.css';
import './components/header-navigation.css';
import WorkspaceFrame from './workspace/WorkspaceFrame.jsx';

const WorkspaceRoot = lazy(() => import('./workspace/WorkspaceRoot.jsx'));
// Local acceptance only: the production build removes this branch and fixture.
const WorkspacePreview = import.meta.env.DEV ? lazy(() => import('./workspace/WorkspacePreview.jsx')) : null;
const workspacePreview = import.meta.env.DEV && new URLSearchParams(globalThis.location?.search).get('workspacePreview') === '1';

createRoot(document.getElementById('root')).render(
  <AppLocaleProvider><WorkspaceFrame><Suspense fallback={<p role="status">正在载入任务工作区…</p>}>{workspacePreview ? <WorkspacePreview /> : <WorkspaceRoot />}</Suspense></WorkspaceFrame></AppLocaleProvider>,
);
