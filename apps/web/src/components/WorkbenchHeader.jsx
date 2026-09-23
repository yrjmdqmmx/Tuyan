import LanguageSwitch from './LanguageSwitch.jsx'
import { useBenchmarkLocale } from './BenchmarkLocale.jsx'
import { useEffect, useId, useState } from 'react'
import { ArrowUpRight, BookOpen, Bot, Menu, MessageSquare, QrCode, ShieldCheck, Wallet, X } from 'lucide-react'
import { AUTH_UI_ENABLED, logoUrl } from '../config'
import { appPath } from '../appPaths'
import AccessibleDialog from './AccessibleDialog'
import useCompactLayout from '../hooks/useCompactLayout'
import { sitePageLinks } from './siteNavigation.js'

function NavigationGroup({ id, title, children }) {
  const { t } = useBenchmarkLocale()
  return <div className={`header-group header-group-${id}`} role="group" aria-label={t(title)}>
    <span className="header-group-label" aria-hidden="true">{t(title)}</span>
    <div className="header-group-items">{children}</div>
  </div>
}

function PrimaryPageLinks({ section }) {
  const { t } = useBenchmarkLocale()
  return sitePageLinks().map(({ id, path, href, label, icon: Icon }) => href
    ? <a key={id} className="header-product-link" href={href} target="_blank" rel="noreferrer">{label}<ArrowUpRight /></a>
    : <a key={id} className="header-primary-link" href={appPath(path)} aria-current={section === id ? 'page' : undefined}><Icon />{t(label)}</a>)
}

export function SiteNavigation({ currentUser, onContact, onFeedback, onMiniProgram, onAgentConnection, onSignOut, onSignIn, onAccount, onWorkspaceAccount = onAccount, onGuide, onAdmin, onNavigate, showLanguage = true, inMenu = false, section = 'workbench' }) {
  const { t } = useBenchmarkLocale()
  return <nav className="header-navigation" aria-label={t('网站导航')} onClick={onNavigate}>
    <NavigationGroup id="pages" title="页面导航"><PrimaryPageLinks section={section} /></NavigationGroup>
    <NavigationGroup id="tools" title="工具与生态">
      <button type="button" className="header-agent-button" aria-haspopup="dialog" onClick={onAgentConnection}><Bot />{t('智能体接入')}</button>
      <a href="https://github.com/yrjmdqmmx/Tuyan" target="_blank" rel="noreferrer"><img className="github-mark" src={appPath('/brand/github-invertocat.svg')} alt="" aria-hidden="true" />GitHub</a>
      <button type="button" className="header-miniprogram-button" aria-haspopup="dialog" onClick={onMiniProgram}><img className="wechat-mark" src={appPath('/brand/wechat-mark.svg')} alt="" aria-hidden="true" />{t('微信小程序')}</button>
      {inMenu && <button type="button" onClick={onGuide}><BookOpen />{t('使用教程')}</button>}
    </NavigationGroup>
    <NavigationGroup id="support" title="支持与交流">
      <button type="button" className="contact-author-button" onClick={onContact}><QrCode />{t('联系作者')}</button>
      <button type="button" className="header-feedback-button" onClick={onFeedback}><MessageSquare />{t('意见反馈')}</button>
      <a className="watcha-product-badge" aria-label={t('去观猹点评图研 Tuyan')} href="https://watcha.cn/products/tu-yan?utm_source=product-badge&utm_content=invite" target="_blank" rel="noopener noreferrer"><img src={appPath('/brand/watcha-rounded.svg')} alt="" aria-hidden="true" /><span>{t('观猹点评')}</span><ArrowUpRight /></a>
    </NavigationGroup>
    <NavigationGroup id="account" title="语言与账户">
      {showLanguage && <LanguageSwitch />}
      {inMenu && <button type="button" onClick={onWorkspaceAccount}><Wallet />{t('账户与钱包')}</button>}
      {AUTH_UI_ENABLED && (currentUser ? <div className="auth-user">
        <button type="button" className="auth-user-email" title={currentUser.email} aria-label={t('{v0}，账户', {v0: currentUser.email})} onClick={onAccount}><ShieldCheck /><span>{currentUser.email}</span></button>
        <button type="button" className="auth-sign-out" onClick={onSignOut}>{t('退出')}</button>
      </div> : <button type="button" className="auth-entry-button" onClick={onSignIn}><ShieldCheck />{t('登录 / 注册')}</button>)}
      {inMenu && onAdmin && <button type="button" onClick={onAdmin}><ShieldCheck />{t('站长')}</button>}
    </NavigationGroup>
  </nav>
}

export function MobileMoreMenu({ open, onClose, ...navigationProps }) {
  const { t } = useBenchmarkLocale()
  const titleId = useId()
  function closeAfterAction(event) { if (event.target.closest('a, button')) onClose() }
  return <AccessibleDialog open={open} onClose={onClose} labelledBy={titleId} className="mobile-more-dialog" backdropClassName="mobile-more-backdrop">
    <header className="mobile-more-head"><h2 id={titleId}>{t('更多功能')}</h2><button type="button" aria-label={t('关闭更多功能')} onClick={onClose}><X size={20} /></button></header>
    <SiteNavigation {...navigationProps} onNavigate={closeAfterAction} showLanguage={false} inMenu />
  </AccessibleDialog>
}

export default function WorkbenchHeader(props) {
  const { t, locale } = useBenchmarkLocale()
  const { currentUser, onSignIn, onAccount, section = 'workbench' } = props
  const figureStudio = section === 'figure-studio'
  const compact = useCompactLayout()
  const [moreOpen, setMoreOpen] = useState(false)
  useEffect(() => { if (!compact) setMoreOpen(false) }, [compact])
  return <>
    <header className="paper-header">
      <div className="brand">
        <img className="brand-logo" src={logoUrl} alt={t('图研Tuyan 标志')} />
        <div className="site-brand-copy"><h1 aria-label={t(figureStudio ? '图研 · 论文画布' : '图研Tuyan工作台')}>{locale === 'en' ? 'Tuyan' : <>图研 <span>Tuyan</span></>}</h1><span>{t(figureStudio ? '论文画布' : '学术图示工作台')}</span></div>
      </div>
      {compact ? <div className="mobile-header-actions">
        <LanguageSwitch compact />
        {AUTH_UI_ENABLED && <button type="button" onClick={currentUser ? onAccount : onSignIn}>{currentUser ? t('账户') : t('登录')}</button>}
        <button type="button" className="mobile-more-trigger" aria-label={t('更多')} aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}><Menu size={20} /><span className="mobile-more-label">{t('更多')}</span></button>
      </div> : <SiteNavigation {...props} />}
    </header>
    <MobileMoreMenu {...props} open={compact && moreOpen} onClose={() => setMoreOpen(false)} />
  </>
}
