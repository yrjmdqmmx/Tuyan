import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Languages, LogIn, LogOut, MoreHorizontal, Settings, ShieldCheck } from 'lucide-react';
import { appPath } from '../appPaths.js';
import { defaultAvatarUrl } from '../config.js';
import { useAppLocale } from '../components/BenchmarkLocale.jsx';
import SidebarTooltip from './SidebarTooltip.jsx';

const ITEM_SELECTOR = '[role="menuitem"]:not(:disabled), [role="menuitemradio"]';

function AccountPopover({ id, triggerRef, compact, user, onClose, onSignIn, onSignOut, onAccountSettings, onAdmin, accountPending = false }) {
  const panel = useRef(null), closeRef = useRef(onClose), languageTrigger = useRef(null);
  closeRef.current = onClose;
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const { locale, setLocale } = useAppLocale();
  const languageId = useId(), noticeId = useId();
  const authAction = user ? onSignOut : onSignIn;
  useLayoutEffect(() => {
    function position() {
      const anchor = triggerRef.current?.getBoundingClientRect(), box = panel.current;
      if (!anchor || !box) return;
      // The rail menu grows upward beside the avatar; the expanded menu sits above its row.
      const bottom = compact ? anchor.bottom : anchor.top - 8;
      box.style.maxHeight = `${Math.max(0, bottom - 8)}px`;
      box.style.left = `${Math.max(8, Math.min(compact ? anchor.right + 12 : anchor.left, window.innerWidth - box.offsetWidth - 8))}px`;
      box.style.top = `${Math.max(8, bottom - box.offsetHeight)}px`;
    }
    position();
    const observer = new ResizeObserver(position);
    observer.observe(panel.current);
    window.addEventListener('resize', position);
    document.addEventListener('scroll', position, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', position); document.removeEventListener('scroll', position, true); };
  }, [triggerRef, compact, languagesOpen]);
  useLayoutEffect(() => { panel.current.querySelector(ITEM_SELECTOR)?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const outside = event => {
      if (!panel.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) closeRef.current(false);
    };
    const escape = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(true); }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', escape, true); };
  }, [triggerRef]);
  function moveFocus(event) {
    const items = [...panel.current.querySelectorAll(ITEM_SELECTOR)], index = items.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === 'Tab') {
      // Portaled items are outside normal tab order. Continue from the avatar, within a mobile dialog when present.
      event.preventDefault(); event.stopPropagation();
      const scope = triggerRef.current.closest('[role="dialog"]') || document;
      const controls = [...scope.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary')]
        .filter(el => !panel.current.contains(el) && !el.closest('[hidden],[inert]') && (!el.closest('details:not([open])') || el.tagName === 'SUMMARY'));
      const index = controls.indexOf(triggerRef.current);
      const next = controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length];
      onClose(false); (next || triggerRef.current).focus({ preventScroll: true });
    } else if (event.key === ' ' && event.target.tagName === 'A') {
      event.preventDefault(); event.target.click();
    }
  }
  function run(action) { onClose(true); action?.(); }
  const settingsContent = <><Settings size={20} aria-hidden="true" /><span>账户设置</span><ChevronRight size={16} className="tw-account-chevron" aria-hidden="true" /></>;
  const menu = <div className="tw-account-popover" ref={panel} onKeyDown={moveFocus}>
    <div className="tw-account-identity"><img src={user?.image || defaultAvatarUrl} alt="" /><div><strong>{user?.name || user?.email || (user ? '图研用户' : (accountPending ? '正在检查账号状态' : '未登录'))}</strong><small>{user ? (user.name && user.email ? user.email : '已登录图研账号') : '登录后同步任务与结果'}</small></div></div>
    <div role="menu" aria-label="账户菜单" id={id}>
      <div className="tw-account-separator" role="separator" />
      {onAccountSettings ? <button type="button" role="menuitem" tabIndex={-1} disabled={accountPending} onClick={() => run(onAccountSettings)}>{settingsContent}</button>
        : <a role="menuitem" tabIndex={-1} href={appPath('/?view=account')} onClick={() => onClose(true)}>{settingsContent}</a>}
      {user && onAdmin && <button type="button" role="menuitem" tabIndex={-1} onClick={() => run(onAdmin)}><ShieldCheck size={20} aria-hidden="true"/><span>站长页</span><ChevronRight size={16} className="tw-account-chevron" aria-hidden="true"/></button>}
      <button type="button" role="menuitem" tabIndex={-1} ref={languageTrigger} aria-expanded={languagesOpen} aria-controls={languagesOpen ? languageId : undefined} onClick={() => setLanguagesOpen(open => !open)}><Languages size={20} aria-hidden="true" /><span>语言</span><small>{locale === 'en' ? 'English' : '简体中文'}</small><ChevronRight size={16} className={`tw-account-chevron ${languagesOpen ? 'is-open' : ''}`} aria-hidden="true" /></button>
      {languagesOpen && <div className="tw-account-languages" role="group" aria-label="界面语言" id={languageId}>
        {[['zh-CN', '简体中文'], ['en', 'English']].map(([value, label]) => <button type="button" key={value} role="menuitemradio" aria-checked={locale === value} tabIndex={-1} lang={value} onClick={() => { setLocale(value); setLanguagesOpen(false); languageTrigger.current?.focus(); }}><span>{label}</span>{locale === value && <Check size={16} aria-hidden="true" />}</button>)}
      </div>}
      <div className="tw-account-separator" role="separator" />
      <button type="button" role="menuitem" tabIndex={-1} disabled={!authAction || accountPending} aria-describedby={!authAction ? noticeId : undefined} onClick={() => run(authAction)}>{user ? <LogOut size={20} aria-hidden="true" /> : <LogIn size={20} aria-hidden="true" />}<span>{user ? '退出登录' : '登录 / 注册'}</span></button>
    </div>
    {!authAction && <p className="tw-account-notice" id={noticeId}>本地预览未连接账号服务{user ? '。' : '，登录暂不可用。'}</p>}
  </div>;
  // Keep the menu in the mobile navigation dialog's accessible subtree, without a second modal.
  return createPortal(menu, triggerRef.current?.closest('[role="dialog"]') || document.body);
}

export default function SidebarAccount({ compact = false, mobile = false, user, onSignIn, onSignOut, onAccountSettings, onAdmin, accountPending = false }) {
  const [open, setOpen] = useState(false), trigger = useRef(null), id = useId();
  const label = accountPending ? '正在检查账号状态' : user ? '账户与设置' : '登录图研';
  function close(restoreFocus) { setOpen(false); if (restoreFocus) trigger.current?.focus({ preventScroll: true }); }
  const button = <button type="button" ref={trigger} className={mobile ? 'tw-mobile-account' : compact ? 'tw-rail-control tw-rail-account' : 'tw-account'} onClick={() => setOpen(value => !value)} aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}>
    {mobile ? <Settings size={25} aria-hidden="true" /> : <img src={user?.image || defaultAvatarUrl} alt="" />}{!compact && !mobile && <><span><strong>{user?.name || user?.email || (user ? '图研用户' : (accountPending ? '正在检查账号状态' : '登录图研'))}</strong><small>{user ? '账户与设置' : '登录后同步任务与结果'}</small></span><MoreHorizontal size={19} aria-hidden="true" /></>}
  </button>;
  return <>{compact ? <SidebarTooltip label={label} disabled={open}>{button}</SidebarTooltip> : button}{open && <AccountPopover id={id} triggerRef={trigger} compact={compact} user={user} onClose={close} onSignIn={onSignIn} onSignOut={onSignOut} onAccountSettings={onAccountSettings} onAdmin={onAdmin} accountPending={accountPending} />}</>;
}
