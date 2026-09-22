import { BarChart3, LayoutDashboard, PenTool } from 'lucide-react';

// Peer pages always retain the same order, including the current page.
// Feature availability is shared by the whole site, never selected by page.
const SITE_PAGE_LINKS = Object.freeze([
  { id: 'workbench', path: '/', label: '工作台', icon: LayoutDashboard },
  { id: 'figure-studio', path: '/figure-studio/', label: '论文画布', icon: PenTool },
  { id: 'leaderboard', path: '/leaderboard', label: '排行榜', icon: BarChart3 },
]);

export function sitePageLinks({ benchmarkEnabled }) {
  return SITE_PAGE_LINKS.filter((item) => item.id !== 'leaderboard' || benchmarkEnabled);
}
