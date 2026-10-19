import { useCallback } from 'react';
import { logoUrl, AUTH_BASE_DEFAULT } from '../config.js';
import { useAppLocale } from '../components/BenchmarkLocale.jsx';
import TokenDancePanel from '../components/TokenDancePanel.jsx';
import WatchaIdentityPanel from '../components/WatchaIdentityPanel.jsx';
import '../components/watcha.css';
import '../components/tokendance.css';
import AccountProfileEditor from './AccountProfileEditor.jsx';
import DrawingActivity from './DrawingActivity.jsx';
import './account-profile.css';

export default function WorkspaceAccountPage({ preview = false, account, sync, state, models, onExport, apiBase = AUTH_BASE_DEFAULT }) {
  const { locale, setLocale } = useAppLocale();
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
  return <div className="tw-account-page">
    {account.user ? <><AccountProfileEditor key={userId} account={account} request={request} saveNickname={saveName}/><DrawingActivity key={`activity:${userId}`} userId={userId} request={request}/></> : <section className="tw-account-identity"><img src={logoUrl} alt="图研默认头像"/><div><h2>未登录</h2><p>登录后查看个人资料和绘制活动</p><button className="tw-primary" onClick={account.onSignIn}>登录图研</button></div></section>}
    <section className="tw-management-section"><h3>任务与存储</h3><p role="status">{sync.error || sync.saveStatus}</p><dl className="tw-account-facts"><div><dt>当前工作区</dt><dd>{state.tasks.length} 个任务 · {versions.filter(v => v.format === 'png').length} 个 PNG 版本 · {versions.filter(v => v.format === 'svg').length} 个 SVG 版本</dd></div><div><dt>同步内容</dt><dd>任务需求、分支、普通／专业设置、模型引用、执行快照和已保存结果</dd></div><div><dt>原材料</dt><dd>仅保存在当前浏览器。其他设备可查看任务和结果，需要原件执行时再提示补传。</dd></div><div><dt>当前服务</dt><dd>{preview ? '正式图研账号认证；任务与模型库保存在本机服务。' : '任务、设置、模型库和已保存版本随当前图研账号同步。'}</dd></div></dl><div className="tw-action-row">{account.user && <button onClick={sync.retry}>重新同步</button>}{sync.canImport && <button onClick={sync.importGuest}>将此浏览器草稿加入当前账号</button>}<button onClick={onExport}>导出本机备份</button></div></section>
    {account.watcha && <section className="tw-management-section"><h3>观猹账号</h3><WatchaIdentityPanel controller={account.watcha} user={account.user} onSignIn={account.onSignIn}/></section>}
    <section className="tw-management-section"><h3>TokenDance 模型授权</h3><TokenDancePanel controller={models.tokenDance}/></section>
    <section className="tw-management-section"><h3>语言</h3><label className="tw-field">界面语言<select value={locale} onChange={e => setLocale(e.target.value)}><option value="zh-CN">中文</option><option value="en">English</option></select></label></section>
    <section className="tw-management-section"><h3>隐私与登录</h3><div className="tw-action-row"><a href="/privacy-policy.html" target="_blank" rel="noreferrer">隐私政策</a><a href="/terms-of-service.html" target="_blank" rel="noreferrer">服务条款</a><button onClick={account.onAccountSettings} disabled={account.accountPending}>账号与隐私</button>{account.user && <button onClick={account.onSignOut} disabled={account.accountPending}>退出登录</button>}</div><p className="tw-muted">退出前保存当前草稿。原材料不会随退出删除，账号任务与游客草稿分别保留。</p></section>
  </div>;
}
