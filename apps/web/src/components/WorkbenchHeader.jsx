import { useEffect, useId, useState } from 'react';
import { BarChart3, BookOpen, Bot, LayoutDashboard, Menu, MessageSquare, QrCode, ShieldCheck, Wallet, X } from 'lucide-react';
import { AUTH_UI_ENABLED, BENCH_ENABLED, logoUrl } from '../config';
import { appPath } from '../appPaths';
import AccessibleDialog from './AccessibleDialog';
import useCompactLayout from '../hooks/useCompactLayout';

export function SiteNavigation({ currentUser, onContact, onFeedback, onMiniProgram, onAgentConnection, onSignOut, onSignIn, onAccount, onNavigate, section = 'workbench' }) {
  return (
    <nav className="header-navigation" aria-label="网站导航" onClick={onNavigate}>
      <div className="header-links">
        {section === 'leaderboard' ? <a href={appPath('/')}><LayoutDashboard size={16} /> 工作台</a>
          : BENCH_ENABLED ? <a href={appPath('/leaderboard')}><BarChart3 size={16} /> 排行榜</a> : null}
        <a href="https://openacad.xyz/" target="_blank" rel="noreferrer">OpenAcad</a>
        <button type="button" className="contact-author-button" onClick={() => onContact()}>
          <QrCode size={16} /> 联系作者
        </button>
        <button type="button" className="header-feedback-button" onClick={onFeedback}>
          <MessageSquare size={16} /> 意见反馈
        </button>
        <a href="https://github.com/yrjmdqmmx/Tuyan" target="_blank" rel="noreferrer">
          <img className="github-mark" src={appPath('/brand/github-invertocat.svg')} width="18" height="18" alt="" aria-hidden="true" /> GitHub
        </a>
        <button type="button" className="header-miniprogram-button" aria-haspopup="dialog" onClick={() => onMiniProgram()}>
          <img className="wechat-mark" src={appPath('/brand/wechat-mark.svg')} width="22" height="22" alt="" aria-hidden="true" /> 微信小程序
        </button>
      </div>
      <div className="header-actions">
        <button type="button" className="header-agent-button" aria-haspopup="dialog" onClick={() => onAgentConnection()}>
          <Bot size={18} /> 智能体接入
        </button>
        <a className="watcha-product-badge" href="https://watcha.cn/products/tu-yan?utm_source=product-badge&utm_content=invite" target="_blank" rel="noopener noreferrer">
          <img src={appPath('/brand/watcha-invite-light.png')} alt="去观猹点评图研 Tuyan" width="4500" height="972" />
        </a>
        {AUTH_UI_ENABLED ? (
          currentUser ? (
            <div className="auth-user">
              <ShieldCheck size={16} />
              <button type="button" className="auth-user-email" title={currentUser.email} aria-label={`${currentUser.email}，账户`} onClick={onAccount}>{currentUser.email}</button>
              <button type="button" onClick={onSignOut}>退出</button>
            </div>
          ) : (
            <button type="button" className="auth-entry-button" onClick={() => onSignIn()}>
              <ShieldCheck size={16} /> 登录 / 注册
            </button>
          )
        ) : null}
      </div>
    </nav>
  );
}

export function MobileMoreMenu({ open, onClose, onAccount, onWorkspaceAccount = onAccount, onGuide, onAdmin, ...navigationProps }) {
  const titleId = useId();
  function closeAfterAction(event) {
    if (event.target.closest('a, button')) onClose();
  }
  return <AccessibleDialog open={open} onClose={onClose} labelledBy={titleId} className="mobile-more-dialog" backdropClassName="mobile-more-backdrop">
    <header className="mobile-more-head"><h2 id={titleId}>更多功能</h2><button type="button" aria-label="关闭更多功能" onClick={onClose}><X size={20} /></button></header>
    <nav className="mobile-workspace-links" aria-label="工作台入口" onClick={closeAfterAction}>
      <button type="button" onClick={onWorkspaceAccount}><Wallet size={18} />账户与钱包</button>
      <button type="button" onClick={onGuide}><BookOpen size={18} />使用教程</button>
      {onAdmin && <button type="button" onClick={onAdmin}><ShieldCheck size={18} />站长</button>}
    </nav>
    <SiteNavigation {...navigationProps} onAccount={onAccount} onNavigate={closeAfterAction} />
  </AccessibleDialog>;
}

export default function WorkbenchHeader(props) {
  const { currentUser, onSignIn, onAccount } = props;
  const compact = useCompactLayout();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { if (!compact) setMoreOpen(false); }, [compact]);
  return <>
    <header className="paper-header">
      <div className="brand">
        <img className="brand-logo" src={logoUrl} alt="图研Tuyan 标志" />
        {compact ? <div className="mobile-brand-copy"><h1>图研 Tuyan</h1><span>学术图示工作台</span></div> : <h1>图研Tuyan工作台</h1>}
      </div>
      {compact ? <div className="mobile-header-actions">
        {AUTH_UI_ENABLED && <button type="button" onClick={currentUser ? onAccount : onSignIn}>{currentUser ? '账户' : '登录'}</button>}
        <button type="button" aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}><Menu size={18} />更多</button>
      </div> : <SiteNavigation {...props} />}
    </header>
    <MobileMoreMenu {...props} open={compact && moreOpen} onClose={() => setMoreOpen(false)} />
  </>;
}
