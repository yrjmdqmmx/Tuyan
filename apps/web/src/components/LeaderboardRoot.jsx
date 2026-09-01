import { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, MessageSquare, ShieldCheck } from 'lucide-react'
import { submitFeedbackRequest } from '@paperbanana/api'

import { appPath } from '../appPaths.js'
import {
  AUTH_ENABLED,
  AUTH_UI_ENABLED,
  CLIENT_VERSION,
  authClient,
} from '../config.js'
import AuthPanel from './AuthPanel.jsx'
import AuthUnavailablePanel from './AuthUnavailablePanel.jsx'
import BenchmarkMethodologyPage from './BenchmarkMethodologyPage.jsx'
import BenchmarkPage from './BenchmarkPage.jsx'
import FeedbackDialog from './FeedbackDialog.jsx'

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
  { id: 'workspace', label: '工作台', href: appPath('/') },
  { id: 'leaderboard', label: '排行榜', href: appPath('/leaderboard') },
  { id: 'methodology', label: '方法说明', href: appPath('/leaderboard/methodology') },
  { id: 'submit', label: '提交评估题', href: appPath('/leaderboard/submit-prompt') },
  { id: 'github', label: 'GitHub', href: 'https://github.com/zdywrnm/PaperBanana-clients', external: true },
]

function activeNav(route) {
  if (route.methodology) return 'methodology'
  if (route.promptSubmission || route.promptAdmin) return 'submit'
  return 'leaderboard'
}

export function BenchmarkSiteHeader({ route, onFeedback, onLogin, onAccount, onSignOut }) {
  const auth = useLeaderboardSession()
  const user = auth.session?.user
  const active = activeNav(route)
  return (
    <header className="benchmark-site-header">
      <a className="benchmark-site-brand" href={appPath('/')}>
        <img src={appPath('/logo.svg')} alt="PaperBanana 标志" />
        <span><strong>PaperBanana</strong><small><i>多智能体</i><i>学术图示生成</i></small></span>
      </a>
      <nav className="benchmark-site-nav" aria-label="排行榜导航">
        {navItems.map((item) => active === item.id
          ? <span key={item.id} aria-current="page">{item.label}</span>
          : <a key={item.id} href={item.href} {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}>{item.label}{item.external ? <ExternalLink size={12} /> : null}</a>)}
      </nav>
      <div className="benchmark-site-actions">
        <button className="benchmark-feedback-action" type="button" onClick={onFeedback}><MessageSquare size={15} />意见反馈</button>
        {AUTH_UI_ENABLED ? user ? (
          <div className="benchmark-auth-user"><ShieldCheck size={15} /><span title={user.email}>{user.email}</span><button type="button" onClick={onAccount}>账号</button><button type="button" onClick={onSignOut}>退出</button></div>
        ) : <button type="button" onClick={onLogin}><ShieldCheck size={15} />登录 / 注册</button> : null}
      </div>
    </header>
  )
}

export default function LeaderboardRoot({ apiBase, backendMode, enabled, pathname, route }) {
  const auth = useLeaderboardSession()
  const [showAuth, setShowAuth] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
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
      <BenchmarkSiteHeader route={route} onFeedback={() => setShowFeedback(true)} onLogin={() => setShowAuth(true)} onAccount={() => setShowAccount(true)} onSignOut={signOut} />
      {auth.error ? <div className="service-alert" role="status">登录状态检查失败：{auth.error.message || String(auth.error)}</div> : null}
      {showAuth && !auth.session?.user ? (AUTH_ENABLED
        ? <AuthPanel onAuthenticated={async () => { await auth.refresh(); setShowAuth(false) }} onCancel={() => setShowAuth(false)} />
        : <AuthUnavailablePanel onCancel={() => setShowAuth(false)} />) : null}
      {showAccount && auth.session?.user ? <Suspense fallback={null}><AccountSettingsDialog apiBase={apiBase} email={auth.session.user.email || ''} onClose={() => setShowAccount(false)} onDeleted={accountDeleted} /></Suspense> : null}
      <FeedbackDialog open={showFeedback} isSubmitting={feedbackPending} error={feedbackError} success={feedbackSuccess} onClose={closeFeedback} onSubmit={submitFeedback} />
      {route.methodology
        ? <BenchmarkMethodologyPage apiBase={apiBase} backendMode={backendMode} enabled={enabled} showNavigation={false} />
        : <BenchmarkPage apiBase={apiBase} backendMode={backendMode} enabled={enabled} pathname={pathname} showNavigation={false} />}
    </div>
  )
}
