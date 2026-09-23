import { BarChart3, History, LayoutDashboard, PenTool } from 'lucide-react';

// One ordered set of public entries for every page and the mobile More menu.
// Public leaderboard navigation is independent of the benchmark executor flag.
const SITE_PAGE_LINKS = Object.freeze([
  { id: 'workbench', path: '/', label: '工作台', icon: LayoutDashboard },
  { id: 'figure-studio', path: '/figure-studio/', label: '论文画布', icon: PenTool },
  { id: 'leaderboard', path: '/leaderboard', label: '排行榜', icon: BarChart3 },
  { id: 'openacad', href: 'https://openacad.xyz/', label: 'openacad' },
  { id: 'changelog', path: '/changelog', label: '更新日志', icon: History },
]);

export function sitePageLinks() {
  return SITE_PAGE_LINKS;
}
