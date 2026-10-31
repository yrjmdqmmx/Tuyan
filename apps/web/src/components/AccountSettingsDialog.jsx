import { usePhoneAuth, visibleAccountEmail } from '../hooks/usePhoneAuth.js';
import PhoneCodeForm from './PhoneCodeForm.jsx';
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, ShieldCheck, Trash2, X } from 'lucide-react'
import { deleteAccountRequest, accountStatusRequest, accountLifecycleMessage } from '../lib/account.js'
import { formatErrorMessage } from '../utils.js'

export default function AccountSettingsDialog({ apiBase, email, userId, onClose, onDeleted, productionPreview = false, watcha, wechat, github, google }) {
  const closeButtonRef = useRef(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [lifecycle, setLifecycle] = useState(null)
  const [statusLoaded, setStatusLoaded] = useState(false)
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const phone = usePhoneAuth(apiBase,userId,!visibleAccountEmail(email) && !wechat?.status.linked && !github?.status.linked && !google?.status.linked && !productionPreview);
  const [phoneProof,setPhoneProof] = useState(null);
  useEffect(() => {
    if (!phoneProof) return;
    const timer = setTimeout(() => setPhoneProof(null), Math.max(0,phoneProof.expiresAt-Date.now()));
    return () => clearTimeout(timer);
  },[phoneProof]);
  const [wechatProof,setWechatProof] = useState(null);
  useEffect(()=>{if(!wechatProof)return;const timer=setTimeout(()=>setWechatProof(null),Math.max(0,wechatProof.expiresAt-Date.now()));return()=>clearTimeout(timer);},[wechatProof]);
  const [googleProof,setGoogleProof] = useState(null);
  useEffect(()=>{if(!googleProof)return;const timer=setTimeout(()=>setGoogleProof(null),Math.max(0,googleProof.expiresAt-Date.now()));return()=>clearTimeout(timer);},[googleProof]);
  useEffect(()=>setGoogleProof(null),[userId]);
  const [githubProof,setGithubProof] = useState(null);
  useEffect(()=>{if(!githubProof)return;const timer=setTimeout(()=>setGithubProof(null),Math.max(0,githubProof.expiresAt-Date.now()));return()=>clearTimeout(timer);},[githubProof]);
  useEffect(()=>setGithubProof(null),[userId]);
  const useGoogleCode = !visibleAccountEmail(email) && google?.status.linked;
  const useGithubCode = !useGoogleCode && !visibleAccountEmail(email) && github?.status.linked;
  const useWechatCode = !useGoogleCode && !useGithubCode && !visibleAccountEmail(email) && wechat?.status.linked;
  const usePhoneCode = !useGoogleCode && !useGithubCode && !useWechatCode && !visibleAccountEmail(email) && phone.status.linked;
  const useEmailCode = Boolean(watcha?.status?.available && watcha.status.linked && !watcha.status.hasPassword)
  const canDelete = (useGoogleCode ? Boolean(googleProof && googleProof.expiresAt > Date.now()) : useGithubCode ? Boolean(githubProof && githubProof.expiresAt > Date.now()) : useWechatCode ? Boolean(wechatProof && wechatProof.expiresAt > Date.now()) : usePhoneCode ? Boolean(phoneProof && phoneProof.expiresAt > Date.now()) : useEmailCode ? codeSent && /^\d{6}$/.test(code) : password.length >= 8) && confirmation.trim() === '删除账号' && !isDeleting && !watcha?.busy && statusLoaded && lifecycle?.state === 'active'

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function sendDeletionCode() {
    if (await watcha.requestCode('delete')) { setCodeSent(true); setCode(''); setCooldown(60) }
  }

  useEffect(() => {
    const previous = document.activeElement
    closeButtonRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isDeleting) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [isDeleting, onClose])

  useEffect(() => {
    if (productionPreview) return;
    let active = true
    async function refresh() {
      try {
        const state = await accountStatusRequest(apiBase)
        if (active) { setLifecycle(state); setStatusLoaded(true) }
      } catch (err) { if (active) setError(err.message) }
    }
    void refresh()
    const timer = setInterval(refresh, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [apiBase, productionPreview])

  async function submit(event) {
    event.preventDefault()
    if (!canDelete) return
    setError('')
    setIsDeleting(true)
    try {
      let confirmationToken = useGoogleCode ? googleProof?.confirmationToken : useGithubCode ? githubProof?.confirmationToken : useWechatCode ? wechatProof?.confirmationToken : usePhoneCode ? phoneProof?.confirmationToken : undefined
      setGoogleProof(null)
      setGithubProof(null)
      setWechatProof(null)
      setPhoneProof(null)
      if (useEmailCode && !useGoogleCode && !useGithubCode && !useWechatCode && !usePhoneCode) {
        const proof = await watcha.deletionConfirmation(code)
        setCode(''); setCodeSent(false)
        if (!proof?.confirmationToken) { setIsDeleting(false); return }
        confirmationToken = proof.confirmationToken
      }
      const result = await deleteAccountRequest(apiBase, { email, ...(confirmationToken ? { confirmationToken } : { password }) })
      setPassword('')
      setConfirmation('')
      if (result.accepted) { setLifecycle({ state: 'deleting', phase: result.phase }); setIsDeleting(false) }
      else await onDeleted()
    } catch (requestError) {
      setError(requestError?.message || String(requestError))
      setIsDeleting(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isDeleting && onClose()}>
      <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <button ref={closeButtonRef} className="dialog-close" type="button" aria-label="关闭账号设置" onClick={onClose} disabled={isDeleting}>
          <X size={18} />
        </button>
        <div className="section-head">
          <ShieldCheck size={22} />
          <div>
            <h2 id="account-dialog-title">账号与隐私</h2>
            <p>{visibleAccountEmail(email) || phone.status.maskedPhone}</p>
          </div>
        </div>
        <div className="legal-links" aria-label="法律文件">
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer">隐私政策</a>
          <a href="/terms-of-service.html" target="_blank" rel="noreferrer">服务条款</a>
        </div>
        {productionPreview ? <p role="status">当前使用正式图研账号。请在<a href="https://www.paperbanana.asia/" target="_blank" rel="noreferrer">正式图研站点</a>管理账号与隐私；本地预览的任务和图片保存在本机。</p> : <>
        {lifecycle?.state !== 'active' ? <p role="status">{accountLifecycleMessage(lifecycle)}</p> : null}
        {usePhoneCode && !phoneProof && <PhoneCodeForm controller={phone} purpose="delete" onVerified={proof=>setPhoneProof({...proof,expiresAt:Date.now()+300000})}/>}
        <form className="account-delete-panel" onSubmit={submit}>
          <div className="danger-heading"><Trash2 size={18} />永久删除账号</div>
          <p>将删除任务记录、生成结果、参考图、反馈、个人投稿、会话和账号。此操作不可恢复。</p>
          {useGoogleCode ? <><button type="button" className="account-button" disabled={isDeleting || google.busy || Boolean(googleProof)} onClick={async()=>{if(google.status.pending?.intent==='delete'){const result=await google.complete();if(result?.confirmationToken)setGoogleProof({...result,expiresAt:Date.now()+300000});}else await google.start('delete');}}>{googleProof?'Google 身份已验证':google.status.pending?.intent==='delete'?'确认使用本次 Google 验证':google.busy?'等待 Google 确认…':'使用 Google 验证身份'}</button>{google.error?<p className="error-line" role="alert">{google.error}</p>:null}</> : useGithubCode ? <><button type="button" className="account-button" disabled={isDeleting || github.busy || Boolean(githubProof)} onClick={async()=>{if(github.status.pending?.intent==='delete'){const result=await github.complete();if(result?.confirmationToken)setGithubProof({...result,expiresAt:Date.now()+300000});}else await github.start('delete');}}>{githubProof?'GitHub 身份已验证':github.status.pending?.intent==='delete'?'确认使用本次 GitHub 验证':github.busy?'等待 GitHub 确认…':'使用 GitHub 验证身份'}</button>{github.error?<p className="error-line" role="alert">{github.error}</p>:null}</> : useWechatCode ? <><button type="button" className="account-button" disabled={isDeleting || wechat.busy || Boolean(wechatProof)} onClick={async()=>{if(wechat.status.pending?.intent==='delete'){const result=await wechat.complete();if(result?.confirmationToken)setWechatProof({...result,expiresAt:Date.now()+300000});}else await wechat.start('delete');}}>{wechatProof?'微信身份已验证':wechat.status.pending?.intent==='delete'?'确认使用本次微信验证':wechat.busy?'等待微信确认…':'微信扫码验证身份'}</button>{wechat.error?<p className="error-line" role="alert">{wechat.error}</p>:null}</> : usePhoneCode ? <p role="status">{phoneProof ? "手机号已验证" : "请先验证已绑定的手机号"}</p> : useEmailCode ? <>
            <p>请使用当前图研邮箱收到的验证码确认注销。</p>
            <label className="field"><span>注销邮箱验证码</span><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>
            <button type="button" className="account-button" onClick={sendDeletionCode} disabled={isDeleting || watcha.busy || cooldown > 0 || lifecycle?.state !== 'active'}>{cooldown > 0 ? `${cooldown} 秒后重发` : '发送注销验证码'}</button>
          </> : <label className="field">
            <span>当前登录密码</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>}
          <label className="field">
            <span>输入“删除账号”确认</span>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" required />
          </label>
          <button className="danger-button" type="submit" disabled={!canDelete}>
            {isDeleting ? <Loader2 className="spin" size={17} /> : <Trash2 size={17} />}
            {isDeleting ? '正在永久删除' : '永久删除账号'}
          </button>
          {error ? <div className="error-line"><AlertTriangle size={16} />{formatErrorMessage(error)}</div> : null}
          {useEmailCode && watcha.error ? <div className="error-line" role="alert">{watcha.error}</div> : null}
        </form>
        </>}
      </section>
    </div>
  )
}
