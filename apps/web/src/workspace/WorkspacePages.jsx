import { lazy, Suspense, useEffect, useState } from 'react';
import { adminStatusRequest, submitFeedbackRequest } from '@paperbanana/api';
import { API_BASE_DEFAULT, CLIENT_VERSION, LOCAL_CONSUMPTION_TEST } from '../config.js';
import GuidePanel from '../components/GuidePanel.jsx';
import AgentConnectionDialog from '../components/AgentConnectionDialog.jsx';
import ContactDialog from '../components/ContactDialog.jsx';
import MiniProgramDialog from '../components/MiniProgramDialog.jsx';
import FeedbackDialog from '../components/FeedbackDialog.jsx';
import WorkspaceLocalDrafts from './WorkspaceLocalDrafts.jsx';
import WorkspaceTemplates from './WorkspaceTemplates.jsx';
import WorkspaceLeaderboard from './WorkspaceLeaderboard.jsx';
const ResearchEcosystem = lazy(() => import('../ecosystem/ResearchEcosystem.jsx'));
const AdminWorkspace = lazy(() => import('../components/admin/AdminWorkspace.jsx'));
const TokenDancePricing = lazy(() => import('../components/admin/TokenDancePricing.jsx'));
const Changelog = lazy(() => import('../components/ChangelogRoot.jsx').then(module=>({default:module.ChangelogPage})));
export function useWorkspaceAdmin(userId, health) {
  const [identity, setIdentity] = useState('');
  useEffect(() => {
    let live=true; setIdentity('');
    if(userId && health) adminStatusRequest(API_BASE_DEFAULT, health).then(value=>{if(live)setIdentity(value.isAdmin?userId:'');}).catch(()=>{});
    return ()=>{live=false;};
  },[userId,health?.runtime]);
  return !!userId && identity===userId;
}
export default function WorkspacePages({page,onClose,onNavigate,account,models,health,isAdmin,onTemplate,onRestoreSvg}) {
  const [feedback,setFeedback]=useState({busy:false,error:'',success:false});
  async function submit(payload){setFeedback({busy:true,error:'',success:false});try{await submitFeedbackRequest(API_BASE_DEFAULT,health,{...payload,platform:'web',clientVersion:CLIENT_VERSION});setFeedback({busy:false,error:'',success:true});return true;}catch(error){setFeedback({busy:false,error:error.message,success:false});return false;}}
  const dialogs={'智能体接入':AgentConnectionDialog,'联系作者':ContactDialog,'微信小程序':MiniProgramDialog};
  const Dialog=dialogs[page];
  if(Dialog)return <><p>通过下方窗口查看{page}。</p><Dialog open onClose={onClose}/></>;
  if(page==='意见反馈')return <FeedbackDialog open isSubmitting={feedback.busy} error={feedback.error} success={feedback.success} onSubmit={submit} onClose={onClose}/>;
  if(page==='浏览器手工稿')return <WorkspaceLocalDrafts userId={account.user?.id} onRestore={onRestoreSvg} onClose={onClose}/>;
  if(page==='绘图模板')return <WorkspaceTemplates onApply={template=>{onTemplate(template);onClose();}}/>;
  if(page==='排行榜')return <WorkspaceLeaderboard account={account} isAdmin={isAdmin} onReturn={onClose} onAdmin={()=>onNavigate('社区评估题审核')}/>;
  if(page==='他山科研生态')return <Suspense fallback={<p role="status">正在加载科研工具…</p>}><ResearchEcosystem account={account}/></Suspense>;
  if(page==='使用教程')return <GuidePanel workspace onStart={onClose} onContact={()=>onNavigate('联系作者')} registryVersion={models.registry?.registryVersion} providerLabels={Object.keys(models.registry?.providers||{})}/>;
  if(page==='更新日志')return <Suspense fallback={<p>正在加载更新日志…</p>}><Changelog embedded/></Suspense>;
  if(page==='站长页'||page==='社区评估题审核')return isAdmin && account.user ? <Suspense fallback={<p role="status">正在加载站长后台…</p>}><div className="tw-admin-page">{LOCAL_CONSUMPTION_TEST&&<p className="tw-page-notice">本地预览读取正式后台数据；运营写入请在正式站点处理。</p>}<AdminWorkspace embedded defaultSection={page==='社区评估题审核'?'community':'overview'} apiBase={API_BASE_DEFAULT} health={health}/><details className="tw-admin-pricing"><summary>TokenDance 产品方分润价目</summary><TokenDancePricing apiBase={API_BASE_DEFAULT}/></details></div></Suspense> : <p role="status">需要站长账号。后台接口会独立校验权限。</p>;
  return null;
}
