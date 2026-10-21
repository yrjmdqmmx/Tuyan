import { useCallback, useState } from 'react';
import { Check, ChevronRight, HardDrive, Languages, LogOut, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { defaultAvatarUrl, AUTH_BASE_DEFAULT } from '../config.js';
import { useAppLocale } from '../components/BenchmarkLocale.jsx';
import TokenDancePanel from '../components/TokenDancePanel.jsx';
import WatchaIdentityPanel from '../components/WatchaIdentityPanel.jsx';
import '../components/watcha.css';
import '../components/tokendance.css';
import AccountProfileEditor from './AccountProfileEditor.jsx';
import WorkspaceStoragePage from './WorkspaceStoragePage.jsx';
import { ACCOUNT_SETTINGS_SECTIONS } from './accountSettingsSections.js';
import './account-settings.css';
import DrawingActivity from './DrawingActivity.jsx';
import './account-profile.css';

const SECTION_ICONS = { profile: UserRound, account: ShieldCheck, storage: HardDrive, language: Languages };

export default function WorkspaceAccountPage({ preview = false, account, sync, state, models, onExport, onOpenTask, mobile = false, section, onSectionChange, apiBase = AUTH_BASE_DEFAULT }) {
  const { locale, setLocale } = useAppLocale();
  const [localSection,setLocalSection]=useState(null);
  const selectedSection = section === undefined ? localSection : section;
  const page = selectedSection || 'profile';
  const overview = mobile && !selectedSection;
  const selectSection = onSectionChange || setLocalSection;
  const userId = account.user?.id;
  const request = useCallback(async(path,body,signal)=>{
    const response=await fetch(`${apiBase}/api/account/profile${path}`,{method:body===undefined?'GET':'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Workspace-Account':userId},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.error)throw Error(typeof result.error==='string'?result.error:'个人资料服务暂时不可用');
    return result;
  },[apiBase,userId]);
  const versions = state.tasks.flatMap(t => Object.values(t.branches).flatMap(b => b.groups.flatMap(g => g.candidates.flatMap(c => c.versions))));
  async function saveName(name) {
      const response = await fetch(`${apiBase}/api/auth/update-user`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Workspace-Account': account.user.id }, body: JSON.stringify({ name }), signal: AbortSignal.timeout(20000) });
      const result = await response.json(); if (!response.ok || result.error) throw Error(result.message || result.error?.message || '保存失败');
  }
  return <div className="tw-account-page tw-settings-layout">
    {overview && <div className="tw-settings-overview-identity"><img src={account.user?.image || defaultAvatarUrl} alt="当前头像"/><h2>{account.user?.name?.trim() || (account.user ? '图研用户' : '未登录')}</h2><p>{account.user?.email || '登录后管理个人资料和已保存图片'}</p></div>}
    <nav className="tw-settings-nav" aria-label="设置分类" hidden={mobile && !overview}>{ACCOUNT_SETTINGS_SECTIONS.map(({id,label,description})=>{
      const Icon = SECTION_ICONS[id];
      return <button type="button" key={id} data-settings-section={id} aria-label={label} aria-current={!mobile && page===id?'page':undefined} onClick={()=>selectSection(id)}><Icon className="tw-settings-entry-icon" size={22} aria-hidden="true"/><span className="tw-settings-entry-copy"><span>{label}</span><small>{description}</small></span><ChevronRight className="tw-settings-entry-chevron" size={19} aria-hidden="true"/></button>;
    })}</nav>
    <div className="tw-settings-content" hidden={overview}>
      <div hidden={page!=='profile' && page!=='account'}>
        {page==='account' && account.user && <><h2 className="tw-settings-title">账户</h2><div className="tw-account-top-actions" aria-label="账号操作"><button type="button" onClick={account.onSignOut} disabled={account.accountPending}><LogOut size={18} aria-hidden="true"/>退出登录</button><button type="button" className="tw-account-delete-entry" onClick={account.onAccountSettings} disabled={account.accountPending}><Trash2 size={18} aria-hidden="true"/>永久删除账号</button></div></>}
        {account.user?<>{page==='profile'&&<h2 className="tw-settings-title">个人资料</h2>}<AccountProfileEditor key={userId} view={page==='account'?'account':'profile'} account={account} request={request} saveNickname={saveName}/></>:<section className="tw-account-identity"><img src={defaultAvatarUrl} alt="图研默认头像"/><div><h2>未登录</h2><p>登录后查看个人资料和使用情况</p><button className="tw-primary" onClick={account.onSignIn}>登录图研</button></div></section>}
      </div>
      <section hidden={page!=='profile'} aria-label="使用情况">{account.user&&<><h3 className="tw-usage-title">使用情况</h3><DrawingActivity key={`activity:${userId}`} userId={userId} request={request}/></>}</section>
      <div hidden={page!=='account'}>
    {account.watcha && <section className="tw-management-section"><h3>观猹账号</h3><WatchaIdentityPanel controller={account.watcha} user={account.user} onSignIn={account.onSignIn}/></section>}
    <section className="tw-management-section"><h3>TokenDance 模型授权</h3><TokenDancePanel controller={models.tokenDance}/></section>
    <section className="tw-management-section"><h3>隐私</h3><div className="tw-action-row"><a href="/privacy-policy.html" target="_blank" rel="noreferrer">隐私政策</a><a href="/terms-of-service.html" target="_blank" rel="noreferrer">服务条款</a></div></section>
      </div>
      <section hidden={page!=='language'} aria-label="语言设置"><h2 className="tw-settings-title">语言</h2><p className="tw-muted">选择界面显示语言</p><div className="tw-language-options" role="group" aria-label="界面语言">{[['zh-CN','简体中文'],['en','English']].map(([value,label])=><button type="button" key={value} lang={value} aria-pressed={locale===value} onClick={()=>setLocale(value)}><span>{label}</span>{locale===value&&<Check size={20} aria-hidden="true"/>}</button>)}</div></section>
      <div hidden={page!=='storage'}><WorkspaceStoragePage key={userId||'guest'} userId={userId} apiBase={apiBase} active={page==='storage'} onOpenTask={onOpenTask}/>
    <section className="tw-management-section"><h3>任务同步与本机备份</h3><p role="status">{sync.error || sync.saveStatus}</p><dl className="tw-account-facts"><div><dt>当前工作区</dt><dd>{state.tasks.length} 个任务 · {versions.filter(v => v.format === 'png').length} 个 PNG 版本 · {versions.filter(v => v.format === 'svg').length} 个 SVG 版本</dd></div><div><dt>同步内容</dt><dd>任务需求、分支、普通／专业设置、模型引用、执行快照和已保存结果</dd></div><div><dt>原材料</dt><dd>仅保存在当前浏览器。其他设备可查看任务和结果，需要原件执行时再提示补传。</dd></div><div><dt>当前服务</dt><dd>{preview ? '正式图研账号认证；任务与模型库保存在本机服务。' : '任务、设置、模型库和已保存版本随当前图研账号同步。'}</dd></div></dl><div className="tw-action-row">{account.user && <button onClick={sync.retry}>重新同步</button>}{sync.canImport && <button onClick={sync.importGuest}>将此浏览器草稿加入当前账号</button>}<button onClick={onExport}>导出本机备份</button></div></section>
      </div>
    </div>
  </div>;
}
