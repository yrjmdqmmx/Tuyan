import { useBenchmarkLocale } from './BenchmarkLocale.jsx'
import { useEffect, useId, useState } from 'react';
import { BarChart3, BookOpen, Bot, LayoutDashboard, Menu, MessageSquare, QrCode, ShieldCheck, Wallet, X } from 'lucide-react';
import { AUTH_UI_ENABLED, BENCH_ENABLED, logoUrl } from '../config';
import { appPath } from '../appPaths';
import AccessibleDialog from './AccessibleDialog';
import useCompactLayout from '../hooks/useCompactLayout';

export function SiteNavigation({ currentUser, onContact, onFeedback, onMiniProgram, onAgentConnection, onSignOut, onSignIn, onAccount, onNavigate, section = 'workbench' }) {
  const { t, locale } = useBenchmarkLocale()
  return (
    <nav className="header-navigation" aria-label={t("网站导航")} onClick={onNavigate}>
      <div className="header-links">
        <a href={appPath('/figure-studio/')}><BookOpen size={16} /> 图稿编辑</a>
        {section === 'leaderboard' ? <a href={appPath('/')}><LayoutDashboard size={16} /> {t("工作台")}</a>
          : BENCH_ENABLED ? <a href={appPath('/leaderboard')}><BarChart3 size={16} /> {t("排行榜")}</a> : null}
        <a href="https://openacad.xyz/" target="_blank" rel="noreferrer">OpenAcad</a>
        <button type="button" className="contact-author-button" onClick={() => onContact()}>
          <QrCode size={16} /> {t("联系作者")}</button>
        <button type="button" className="header-feedback-button" onClick={onFeedback}>
          <MessageSquare size={16} /> {t("意见反馈")}</button>
        <a href="https://github.com/yrjmdqmmx/Tuyan" target="_blank" rel="noreferrer">
          <img className="github-mark" src={appPath('/brand/github-invertocat.svg')} width="18" height="18" alt="" aria-hidden="true" /> GitHub
        </a>
        <button type="button" className="header-miniprogram-button" aria-haspopup="dialog" onClick={() => onMiniProgram()}>
          <img className="wechat-mark" src={appPath('/brand/wechat-mark.svg')} width="22" height="22" alt="" aria-hidden="true" /> {t("微信小程序")}</button>
      </div>
      <div className="header-actions">
        <button type="button" className="header-agent-button" aria-haspopup="dialog" onClick={() => onAgentConnection()}>
          <Bot size={18} /> {t("智能体接入")}</button>
        <a className="watcha-product-badge" href="https://watcha.cn/products/tu-yan?utm_source=product-badge&utm_content=invite" target="_blank" rel="noopener noreferrer">
          <>{locale === 'en' ? <span className="bench-watcha-link">Review Tuyan on Watcha ↗</span> : <img src={appPath('/brand/watcha-invite-light.png')} alt={t("去观猹点评图研 Tuyan")} width="4500" height="972" />}</>
        </a>
        {AUTH_UI_ENABLED ? (
          currentUser ? (
            <div className="auth-user">
              <ShieldCheck size={16} />
              <button type="button" className="auth-user-email" title={currentUser.email} aria-label={t("{v0}，账户", {v0: currentUser.email})} onClick={onAccount}>{currentUser.email}</button>
              <button type="button" onClick={onSignOut}>{t("退出")}</button>
            </div>
          ) : (
            <button type="button" className="auth-entry-button" onClick={() => onSignIn()}>
              <ShieldCheck size={16} /> {t("登录 / 注册")}</button>
          )
        ) : null}
      </div>
    </nav>
  );
}

export function MobileMoreMenu({ open, onClose, onAccount, onWorkspaceAccount = onAccount, onGuide, onAdmin, ...navigationProps }) {
  const { t, locale } = useBenchmarkLocale()
  const titleId = useId();
  function closeAfterAction(event) {
    if (event.target.closest('a, button')) onClose();
  }
  return <AccessibleDialog open={open} onClose={onClose} labelledBy={titleId} className="mobile-more-dialog" backdropClassName="mobile-more-backdrop">
    <header className="mobile-more-head"><h2 id={titleId}>{t("更多功能")}</h2><button type="button" aria-label={t("关闭更多功能")} onClick={onClose}><X size={20} /></button></header>
    <nav className="mobile-workspace-links" aria-label={t("工作台入口")} onClick={closeAfterAction}>
      <button type="button" onClick={onWorkspaceAccount}><Wallet size={18} />{t("账户与钱包")}</button>
      <button type="button" onClick={onGuide}><BookOpen size={18} />{t("使用教程")}</button>
      {onAdmin && <button type="button" onClick={onAdmin}><ShieldCheck size={18} />{t("站长")}</button>}
    </nav>
    <SiteNavigation {...navigationProps} onAccount={onAccount} onNavigate={closeAfterAction} />
  </AccessibleDialog>;
}

export default function WorkbenchHeader(props) {
  const { t, locale } = useBenchmarkLocale()
  const { currentUser, onSignIn, onAccount } = props;
  const compact = useCompactLayout();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { if (!compact) setMoreOpen(false); }, [compact]);
  return <>
    <header className="paper-header">
      <div className="brand">
        <img className="brand-logo" src={logoUrl} alt={t("图研Tuyan 标志")} />
        {compact ? <div className="mobile-brand-copy"><h1>{t("图研 Tuyan")}</h1><span>{t("学术图示工作台")}</span></div> : <h1>{t("图研Tuyan工作台")}</h1>}
      </div>
      {compact ? <div className="mobile-header-actions">
        {AUTH_UI_ENABLED && <button type="button" onClick={currentUser ? onAccount : onSignIn}>{currentUser ? t("账户") : t("登录")}</button>}
        <button type="button" aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}><Menu size={18} />{t("更多")}</button>
      </div> : <SiteNavigation {...props} />}
    </header>
    <MobileMoreMenu {...props} open={compact && moreOpen} onClose={() => setMoreOpen(false)} />
  </>;
}
