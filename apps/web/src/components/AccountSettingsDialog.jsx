import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, ShieldCheck, Trash2, X } from 'lucide-react'
import { deleteAccountRequest, accountStatusRequest, accountLifecycleMessage } from '../lib/account.js'
import { formatErrorMessage } from '../utils.js'

export default function AccountSettingsDialog({ apiBase, email, onClose, onDeleted, productionPreview = false, watcha }) {
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
  const useEmailCode = Boolean(watcha?.status?.available && watcha.status.linked && !watcha.status.hasPassword)
  const canDelete = (useEmailCode ? codeSent && /^\d{6}$/.test(code) : password.length >= 8) && confirmation.trim() === '删除账号' && !isDeleting && !watcha?.busy && statusLoaded && lifecycle?.state === 'active'

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
      let confirmationToken
      if (useEmailCode) {
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
            <p>{email}</p>
          </div>
        </div>
        <div className="legal-links" aria-label="法律文件">
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer">隐私政策</a>
          <a href="/terms-of-service.html" target="_blank" rel="noreferrer">服务条款</a>
        </div>
        {productionPreview ? <p role="status">当前使用正式图研账号。请在<a href="https://www.paperbanana.asia/" target="_blank" rel="noreferrer">正式图研站点</a>管理账号与隐私；本地预览的任务和图片保存在本机。</p> : <>
        {lifecycle?.state !== 'active' ? <p role="status">{accountLifecycleMessage(lifecycle)}</p> : null}
        <form className="account-delete-panel" onSubmit={submit}>
          <div className="danger-heading"><Trash2 size={18} />永久删除账号</div>
          <p>将删除任务记录、生成结果、参考图、反馈、个人投稿、会话和账号。此操作不可恢复。</p>
          {useEmailCode ? <>
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
