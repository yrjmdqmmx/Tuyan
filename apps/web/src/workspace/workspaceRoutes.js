import { APP_BASE_URL, appPath, appRelativePath } from '../appPaths.js';
import { CHANGELOG_VIEWS, resolveChangelogAnchor } from '../changelog.js';
import changelog from '../data/changelog.json';
import { ACCOUNT_SETTINGS_SECTIONS } from './accountSettingsSections.js';
import { resolveLeaderboardRoute } from '../leaderboardRoutes.js';

const views = {
  guide: '使用教程', account: '账户设置', records: '任务记录', models: 'models',
  ecosystem: '他山科研生态', agents: '智能体接入', feedback: '意见反馈',
  contact: '联系作者', miniprogram: '微信小程序', changelog: '更新日志',
};
const publicPages = new Set(['更新日志', '排行榜', '使用教程', '智能体接入', '联系作者', '微信小程序', '页面未找到']);
const cleanPath = path => path.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';

// Interpret compatibility URLs without discarding their query or fragment. The
// same resolver handles direct requests, Pages fallbacks and browser history.
export function resolveWorkspaceLocation(location, base = APP_BASE_URL) {
  const params = new URLSearchParams(location.search || '');
  let path = cleanPath(appRelativePath(location.pathname, base) || '/unknown');
  const fallback = params.get('__route');
  if (['/leaderboard', '/bench'].includes(path) && /^\/(?:leaderboard|bench)(?:\/|$)/.test(fallback || '')) path = cleanPath(fallback);
  path = path.replace(/^\/bench(?=\/|$)/, '/leaderboard');
  const leaderboard = resolveLeaderboardRoute(path);
  const view = params.get('view');
  let anchor = ''; try { anchor = decodeURIComponent((location.hash || '').slice(1)); } catch {}
  const logAnchor = Object.hasOwn(CHANGELOG_VIEWS, anchor) || resolveChangelogAnchor(changelog, anchor);
  const page = path === '/changelog' ? '更新日志'
    : leaderboard.isLeaderboard ? (leaderboard.promptAdmin ? '社区评估题审核' : '排行榜')
      : path !== '/' ? '页面未找到'
        : params.has('admin') ? '站长页'
          : params.has('tokendance_wallet') ? '账户设置'
            : (Object.hasOwn(views, view) ? views[view] : null) || (!view && logAnchor ? '更新日志' : !view && anchor.startsWith('guide-') ? '使用教程' : 'workspace');
  return {
    page, publicPage: publicPages.has(page), leaderboardPath: path,
    accountSection: params.has('tokendance_wallet') ? 'account' : ACCOUNT_SETTINGS_SECTIONS.some(section => section.id === params.get('section')) ? params.get('section') : null,
    composerAction: path === '/' && view === 'refine' ? 'attachments' : null,
    href: `${location.pathname}${location.search || ''}${location.hash || ''}`,
    search: location.search || '', hash: location.hash || '',
  };
}

export function workspacePageHref(page, location = window.location, base = APP_BASE_URL) {
  const query = new URLSearchParams(location.search || '');
  for (const key of [...query.keys()]) if (['view', '__route', 'admin', 'tokendance_wallet', 'section', 'auth'].includes(key) || key.startsWith('a_')) query.delete(key);
  let path = '/';
  if (page === '更新日志') path = '/changelog';
  else if (page === '排行榜') path = '/leaderboard';
  else if (page === '社区评估题审核') path = '/leaderboard/admin/prompt-submissions';
  else if (page === '站长页') query.set('admin', 'overview');
  else {
    const view = Object.keys(views).find(key => views[key] === page);
    if (view) query.set('view', view);
  }
  return `${appPath(path, base)}${query.size ? `?${query}` : ''}`;
}
