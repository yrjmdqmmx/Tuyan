import { ArrowLeft, ShieldCheck, UserRound } from 'lucide-react';
import TokenDancePanel from './TokenDancePanel';

export default function AccountPage({ user, controller, onReturn, returnLabel, onManageAccount, onSignOut, onSignIn }) {
  return <section className="account-page" aria-labelledby="account-page-title">
    <div className="account-page-heading">
      <div><span className="account-eyebrow">ACCOUNT</span><h2 id="account-page-title">账户</h2><p>管理图研身份、渠道连接与模型消费。</p></div>
      <button type="button" className="account-button" onClick={onReturn}><ArrowLeft size={16} />{returnLabel || '返回工作台'}</button>
    </div>
    <div className="account-layout">
      <aside className="account-identity account-card">
        <div className="account-card-title"><UserRound size={20} /><h3>图研账号</h3></div>
        {user ? <><strong className="account-email">{user.email || user.name || '已登录用户'}</strong><span className="account-status"><ShieldCheck size={15} />已登录图研</span>
          <p>任务记录属于当前图研账号。连接渠道后，模型调用使用你授权的渠道账户额度。</p>
          <div className="account-identity-actions"><button type="button" className="account-button" onClick={onManageAccount}>账号与隐私</button><button type="button" className="account-button account-button-quiet" onClick={onSignOut}>退出登录</button></div>
        </> : <><p>登录图研后，连接自己的模型渠道并管理充值记录。</p><button type="button" className="account-button account-button-primary" onClick={onSignIn}>登录 / 注册</button></>}
      </aside>
      <TokenDancePanel controller={controller} />
    </div>
  </section>;
}
