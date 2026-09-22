import { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { adminStatusRequest, submitFeedbackRequest } from '@paperbanana/api'

import { appPath } from '../appPaths.js'
import {
  AUTH_ENABLED,
  CLIENT_VERSION,
  authClient,
} from '../config.js'
import useCompactLayout from '../hooks/useCompactLayout.js'
import useVisualViewport from '../hooks/useVisualViewport.js'
import WorkbenchHeader from './WorkbenchHeader.jsx'
import PageNavigation from './PageNavigation.jsx'
import ContactDialog from './ContactDialog.jsx'
import MiniProgramDialog from './MiniProgramDialog.jsx'
import AgentConnectionDialog from './AgentConnectionDialog.jsx'
import AuthPanel from './AuthPanel.jsx'
import AuthUnavailablePanel from './AuthUnavailablePanel.jsx'
import BenchmarkMethodologyPage from './BenchmarkMethodologyPage.jsx'
import BenchmarkPage from './BenchmarkPage.jsx'
import FeedbackDialog from './FeedbackDialog.jsx'
import { BenchmarkLocaleProvider, BenchmarkLanguageSwitch, useBenchmarkLocale } from './BenchmarkLocale.jsx'

const AccountSettingsDialog = lazy(() => import('./AccountSettingsDialog.jsx'))

const LeaderboardSessionContext = createContext(null)

export function LeaderboardSessionProvider({ children, authEnabled = AUTH_ENABLED, client = authClient, initialSession = null }) {
  const [session, setSession] = useState(initialSession)
  const [isPending, setIsPending] = useState(authEnabled && !initialSession)
  const [error, setError] = useState(null)
  const generationRef = useRef(0)
  const [generation, setGeneration] = useState(0)

  const advanceGeneration = useCallback(() => {
    generationRef.current += 1
    setGeneration(generationRef.current)
    return generationRef.current
  }, [])

  const clear = useCallback(() => {
    advanceGeneration()
    setSession(null)
    setError(null)
    setIsPending(false)
  }, [advanceGeneration])

  const refresh = useCallback(async () => {
    if (!authEnabled) {
      setSession(null)
      setError(null)
      setIsPending(false)
      return null
    }
    const requestGeneration = generationRef.current
    setIsPending(true)
    const { data, error: authError } = await client.getSession()
    if (requestGeneration !== generationRef.current) return null
    setSession(data || null)
    setError(authError || null)
    setIsPending(false)
    return data || null
  }, [authEnabled, client])

  useEffect(() => {
    let cancelled = false
    if (!authEnabled || initialSession) {
      setIsPending(false)
      return undefined
    }
    const requestGeneration = generationRef.current
    client.getSession()
      .then(({ data, error: authError }) => {
        if (cancelled || requestGeneration !== generationRef.current) return
        setSession(data || null)
        setError(authError || null)
      })
      .finally(() => {
        if (!cancelled && requestGeneration === generationRef.current) setIsPending(false)
      })
    return () => { cancelled = true }
  }, [authEnabled, client, initialSession])

  const value = useMemo(() => ({
    session, isPending, error, refresh, clear, generation,
    isCurrentGeneration: (candidate) => candidate === generationRef.current,
  }), [clear, error, generation, isPending, refresh, session])
  return <LeaderboardSessionContext.Provider value={value}>{children}</LeaderboardSessionContext.Provider>
}

export function useLeaderboardSession() {
  const value = useContext(LeaderboardSessionContext)
  if (!value) throw new Error('LeaderboardSessionProvider is required')
  return value
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
    {section === 'leaderboard' && <div className="bench-page-navigation"><PageNavigation label={t('排行榜导航')} items={navItems.map(item => ({ ...item, label: t(item.label) }))} activeId={activeNav(route)} /><BenchmarkLanguageSwitch /></div>}
  </div>
}

export default function LeaderboardRoot({ apiBase, backendMode, enabled, pathname, route }) {
  return <BenchmarkLocaleProvider><SitePageShell apiBase={apiBase} backendMode={backendMode} route={route}>
    {route.methodology
      ? <BenchmarkMethodologyPage apiBase={apiBase} backendMode={backendMode} enabled={enabled} showNavigation={false} />
      : <BenchmarkPage apiBase={apiBase} backendMode={backendMode} enabled={enabled} pathname={pathname} showNavigation={false} />}
  </SitePageShell></BenchmarkLocaleProvider>
}

// Public pages share one session provider and the same account / feedback actions.
export function SitePageShell({ apiBase, backendMode, route = {}, section = 'leaderboard', children }) {
  const { t, locale } = useBenchmarkLocale()
  useVisualViewport()
  const auth = useLeaderboardSession()
  const [showAuth, setShowAuth] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showMiniProgram, setShowMiniProgram] = useState(false)
  const [showAgentConnection, setShowAgentConnection] = useState(false)
  const [adminIdentity, setAdminIdentity] = useState(null)
  const compact = useCompactLayout()
  const userId = auth.session?.user?.id
  useEffect(() => {
    if (!compact || !userId || auth.isPending) return undefined
    let cancelled = false
    const generation = auth.generation
    adminStatusRequest(apiBase, { backendMode }).then(result => {
      if (!cancelled && auth.isCurrentGeneration(generation)) setAdminIdentity(result.isAdmin ? { userId, generation } : null)
    }).catch(() => { if (!cancelled) setAdminIdentity(null) })
    return () => { cancelled = true }
  }, [compact, userId, auth.isPending, auth.generation, apiBase, backendMode])
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackPending, setFeedbackPending] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  const closeFeedback = () => {
    setShowFeedback(false)
    setFeedbackError('')
    setFeedbackSuccess(false)
  }
  const submitFeedback = async (payload) => {
    setFeedbackPending(true)
    setFeedbackError('')
    setFeedbackSuccess(false)
    try {
      await submitFeedbackRequest(apiBase, { backendMode }, { ...payload, platform: 'web', clientVersion: CLIENT_VERSION, jobId: '' })
      setFeedbackSuccess(true)
      return true
    } catch (reason) {
      setFeedbackError(reason?.message || String(reason))
      throw reason
    } finally {
      setFeedbackPending(false)
    }
  }
  const signOut = async () => {
    auth.clear()
    setShowAccount(false)
    setShowAuth(false)
    await authClient.signOut()
  }
  const accountDeleted = async () => {
    auth.clear()
    setShowAccount(false)
  }

  return (
    <div className="benchmark-site-shell">
      <BenchmarkSiteHeader route={route} section={section} onFeedback={() => setShowFeedback(true)} onLogin={() => setShowAuth(true)} onAccount={() => setShowAccount(true)} onSignOut={signOut}
        onContact={() => setShowContact(true)} onMiniProgram={() => setShowMiniProgram(true)} onAgentConnection={() => setShowAgentConnection(true)}
        onAdmin={userId && userId === adminIdentity?.userId && auth.generation === adminIdentity.generation ? () => window.location.assign(appPath('/?admin=overview')) : undefined} />
      <ContactDialog open={showContact} onClose={() => setShowContact(false)} />
      <MiniProgramDialog open={showMiniProgram} onClose={() => setShowMiniProgram(false)} />
      <AgentConnectionDialog open={showAgentConnection} onClose={() => setShowAgentConnection(false)} />
      {auth.error ? <div className="service-alert" role="status">{t("登录状态检查失败：")}{auth.error.message || String(auth.error)}</div> : null}
      {showAuth && !auth.session?.user ? (AUTH_ENABLED
        ? <AuthPanel onAuthenticated={async () => { await auth.refresh(); setShowAuth(false) }} onCancel={() => setShowAuth(false)} />
        : <AuthUnavailablePanel onCancel={() => setShowAuth(false)} />) : null}
      {showAccount && auth.session?.user ? <Suspense fallback={null}><AccountSettingsDialog apiBase={apiBase} email={auth.session.user.email || ''} onClose={() => setShowAccount(false)} onDeleted={accountDeleted} /></Suspense> : null}
      <FeedbackDialog open={showFeedback} isSubmitting={feedbackPending} error={feedbackError} success={feedbackSuccess} onClose={closeFeedback} onSubmit={submitFeedback} />
      {children}
    </div>
  )
}
