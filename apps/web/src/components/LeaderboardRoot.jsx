import { appPath } from '../appPaths.js'
import WorkbenchHeader from './WorkbenchHeader.jsx'
import PageNavigation from './PageNavigation.jsx'
import BenchmarkMethodologyPage from './BenchmarkMethodologyPage.jsx'
import BenchmarkPage from './BenchmarkPage.jsx'
import { BenchmarkLocaleProvider, useBenchmarkLocale } from './BenchmarkLocale.jsx'
import SharedSitePageShell, { SiteSessionProvider, useSiteSession } from './SitePageShell.jsx'

// Compatibility contract for every published leaderboard route consumer.
export function LeaderboardSessionProvider(props) {
  return <SiteSessionProvider {...props} />
}

export function useLeaderboardSession() {
  return useSiteSession()
}

const navItems = [
  { id: 'leaderboard', label: '排行榜', href: appPath('/leaderboard') },
  { id: 'methodology', label: '方法说明', href: appPath('/leaderboard/methodology') },
  { id: 'submit', label: '提交评估题', href: appPath('/leaderboard/submit-prompt') },
]

function activeNav(route) {
  if (route.methodology) return 'methodology'
  if (route.promptSubmission || route.promptAdmin) return 'submit'
  return 'leaderboard'
}

export function BenchmarkSiteHeader({ route = {}, section = 'leaderboard', onFeedback, onLogin, onAccount, onSignOut, onContact, onMiniProgram, onAgentConnection, onAdmin,
  onWorkspaceAccount = () => window.location.assign(appPath('/?view=account')),
  onGuide = () => window.location.assign(appPath('/?view=guide')),
}) {
  const { t } = useBenchmarkLocale()
  const auth = useLeaderboardSession()
  const user = auth.session?.user
  return <div className="app-shell benchmark-navigation-shell">
    <WorkbenchHeader section={section} currentUser={user} onSignIn={onLogin} onSignOut={onSignOut}
      onAccount={onAccount} onWorkspaceAccount={onWorkspaceAccount} onGuide={onGuide} onAdmin={onAdmin}
      onContact={onContact} onFeedback={onFeedback} onMiniProgram={onMiniProgram} onAgentConnection={onAgentConnection} />
    {section === 'leaderboard' && <div className="bench-page-navigation"><PageNavigation label={t('排行榜导航')} items={navItems.map(item => ({ ...item, label: t(item.label) }))} activeId={activeNav(route)} /></div>}
  </div>
}

export default function LeaderboardRoot(props) {
  return <BenchmarkLocaleProvider><LeaderboardContent {...props} /></BenchmarkLocaleProvider>
}

function LeaderboardContent({ apiBase, backendMode, enabled, pathname, route }) {
  return <SitePageShell section="leaderboard" apiBase={apiBase} backendMode={backendMode} route={route}>
    {route.methodology
      ? <BenchmarkMethodologyPage apiBase={apiBase} backendMode={backendMode} enabled={enabled} showNavigation={false} />
      : <BenchmarkPage apiBase={apiBase} backendMode={backendMode} enabled={enabled} pathname={pathname} showNavigation={false} />}
  </SitePageShell>
}

// Preserve the public-page interface introduced by 3.8 while sharing one session shell.
export function SitePageShell({ route = {}, section = 'leaderboard', children, ...props }) {
  return <SharedSitePageShell {...props} section={section} className="benchmark-site-shell"
    renderHeader={(headerProps) => <BenchmarkSiteHeader {...headerProps} route={route} onLogin={headerProps.onSignIn} />}>
    {children}
  </SharedSitePageShell>
}
