import { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { adminStatusRequest, submitFeedbackRequest } from '@paperbanana/api';
import { appPath } from '../appPaths.js';
import { CLIENT_VERSION } from '../config.js';
import { useAuthSession } from '../hooks/useAuthSession.js';
import useVisualViewport from '../hooks/useVisualViewport.js';
import WorkbenchHeader from './WorkbenchHeader.jsx';
import ContactDialog from './ContactDialog.jsx';
import MiniProgramDialog from './MiniProgramDialog.jsx';
import AgentConnectionDialog from './AgentConnectionDialog.jsx';
import AuthPanel from './AuthPanel.jsx';
import AuthUnavailablePanel from './AuthUnavailablePanel.jsx';
import FeedbackDialog from './FeedbackDialog.jsx';
import { useBenchmarkLocale } from './BenchmarkLocale.jsx';

const AccountSettingsDialog = lazy(() => import('./AccountSettingsDialog.jsx'));
const SiteSessionContext = createContext(null);
const defaultNavigate = (href) => window.location.assign(href);

export function SiteSessionProvider({ children, authEnabled, client, initialSession }) {
  const auth = useAuthSession({ authEnabled, client, initialSession });
  return <SiteSessionContext.Provider value={auth}>{children}</SiteSessionContext.Provider>;
}

export function useSiteSession() {
  const auth = useContext(SiteSessionContext);
  if (!auth) throw new Error('SiteSessionProvider is required');
  return auth;
}

/** Reuses an existing session provider, or owns exactly one for an independent page. */
export default function SitePageShell({ authEnabled, client, initialSession, ...props }) {
  const inherited = useContext(SiteSessionContext);
  return inherited ? <SitePageContent {...props} />
    : <SiteSessionProvider authEnabled={authEnabled} client={client} initialSession={initialSession}><SitePageContent {...props} /></SiteSessionProvider>;
}

function SitePageContent({ section = 'figure-studio', apiBase, backendMode = 'gateway', className = 'site-page-shell', renderHeader, children, navigate = defaultNavigate }) {
  useVisualViewport();
  const { t } = useBenchmarkLocale();
  const auth = useSiteSession();
  const currentUser = auth.session?.user || null;
  const userId = currentUser?.id;
  const identity = `${userId || 'anonymous'}:${auth.generation}`;
  const [dialog, setDialog] = useState(null);
  const [adminIdentity, setAdminIdentity] = useState(null);
  const [feedback, setFeedback] = useState({ pending: false, error: '', success: false });
  const feedbackRequest = useRef(0);
  const isAdmin = Boolean(userId && !auth.isPending && userId === adminIdentity?.userId && auth.generation === adminIdentity.generation);
  const visibleDialog = dialog?.identity === identity ? dialog.name : null;

  useEffect(() => {
    feedbackRequest.current += 1;
    setDialog(null); setAdminIdentity(null); setFeedback({ pending: false, error: '', success: false });
  }, [identity]);
  useEffect(() => {
    if (!userId || auth.isPending) return undefined;
    let active = true;
    const generation = auth.generation;
    adminStatusRequest(apiBase, { backendMode }).then((result) => {
      if (active && auth.isCurrentGeneration(generation)) setAdminIdentity(result.isAdmin ? { userId, generation } : null);
    }).catch(() => { if (active && auth.isCurrentGeneration(generation)) setAdminIdentity(null); });
    return () => { active = false; };
  }, [userId, auth.isPending, auth.generation, auth.isCurrentGeneration, apiBase, backendMode]);

  const openDialog = useCallback((name) => {
    feedbackRequest.current += 1;
    setFeedback({ pending: false, error: '', success: false });
    setDialog({ name, identity });
  }, [identity]);
  const closeDialog = useCallback(() => {
    feedbackRequest.current += 1;
    setDialog(null); setFeedback({ pending: false, error: '', success: false });
  }, []);
  const onSignIn = useCallback(() => openDialog('auth'), [openDialog]);
  const signOut = useCallback(async () => { closeDialog(); await auth.signOut(); }, [auth.signOut, closeDialog]);
  const submitFeedback = useCallback(async (payload) => {
    const request = ++feedbackRequest.current;
    const generation = auth.generation;
    setFeedback({ pending: true, error: '', success: false });
    const current = () => request === feedbackRequest.current && auth.isCurrentGeneration(generation);
    try {
      await submitFeedbackRequest(apiBase, { backendMode }, { ...payload, platform: 'web', clientVersion: CLIENT_VERSION, jobId: '' });
      if (!current()) return false;
      setFeedback({ pending: false, error: '', success: true });
      return true;
    } catch (reason) {
      if (current()) setFeedback({ pending: false, error: reason?.message || String(reason), success: false });
      return false;
    }
  }, [apiBase, backendMode, auth.generation, auth.isCurrentGeneration]);
  const headerProps = {
    section, currentUser, onSignIn, onSignOut: signOut,
    onAccount: () => currentUser ? openDialog('account') : onSignIn(),
    onWorkspaceAccount: () => navigate(appPath('/?view=account')),
    onGuide: () => navigate(appPath('/?view=guide')),
    onAdmin: isAdmin ? () => navigate(appPath('/?admin=overview')) : undefined,
    onContact: () => openDialog('contact'), onFeedback: () => openDialog('feedback'),
    onMiniProgram: () => openDialog('mini-program'), onAgentConnection: () => openDialog('agent'),
  };
  const childContext = useMemo(() => ({ auth, session: auth.session, currentUser, authGeneration: auth.generation, onSignIn, isAdmin }), [auth, currentUser, onSignIn, isAdmin]);
  return <div className={className} data-page-section={section}>
    {renderHeader ? renderHeader(headerProps) : <div className="app-shell site-page-navigation-shell"><WorkbenchHeader {...headerProps} /></div>}
    <ContactDialog key={`contact:${identity}`} open={visibleDialog === 'contact'} onClose={closeDialog} />
    <MiniProgramDialog key={`mini:${identity}`} open={visibleDialog === 'mini-program'} onClose={closeDialog} />
    <AgentConnectionDialog key={`agent:${identity}`} open={visibleDialog === 'agent'} onClose={closeDialog} />
    {auth.error ? <div className="service-alert" role="status">{t('登录状态检查失败：')}{auth.error.message || String(auth.error)}</div> : null}
    {visibleDialog === 'auth' && !currentUser ? (auth.authEnabled
      ? <AuthPanel key={identity} client={auth.client} onAuthenticated={async () => { if (auth.isCurrentGeneration(auth.generation)) await auth.refresh(); }} onCancel={closeDialog} />
      : <AuthUnavailablePanel onCancel={closeDialog} {...(section === 'figure-studio' ? {
        description: '账号服务暂不可用。本机编辑、源稿和 SVG 导出仍可使用。',
        detail: '结构规划、语言编辑和服务端导出需要登录后使用，请稍后重试。',
        returnLabel: '返回论文画布',
      } : {})} />) : null}
    {visibleDialog === 'account' && currentUser ? <Suspense fallback={null}><AccountSettingsDialog key={identity} apiBase={apiBase} email={currentUser.email || ''} onClose={closeDialog}
      onDeleted={() => { if (auth.isCurrentGeneration(auth.generation)) { auth.clear(); closeDialog(); } }} /></Suspense> : null}
    <FeedbackDialog key={`feedback:${identity}`} open={visibleDialog === 'feedback'} isSubmitting={feedback.pending} error={feedback.error} success={feedback.success} onClose={closeDialog} onSubmit={submitFeedback} />
    {typeof children === 'function' ? children(childContext) : children}
  </div>;
}
