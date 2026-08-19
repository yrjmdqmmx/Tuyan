import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, ShieldCheck, Trash2, X } from 'lucide-react'
import { deleteAccountRequest } from '../lib/account.js'
import { formatErrorMessage } from '../utils.js'

export default function AccountSettingsDialog({ apiBase, email, onClose, onDeleted }) {
  const closeButtonRef = useRef(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const canDelete = password.length >= 8 && confirmation.trim() === '删除账号' && !isDeleting

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

  async function submit(event) {
    event.preventDefault()
    if (!canDelete) return
    setError('')
    setIsDeleting(true)
    try {
      await deleteAccountRequest(apiBase, { email, password })
      await onDeleted()
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
        <form className="account-delete-panel" onSubmit={submit}>
          <div className="danger-heading"><Trash2 size={18} />永久删除账号</div>
          <p>将删除任务记录、生成结果、参考图、反馈、会话和账号。此操作不可恢复。</p>
          <label className="field">
            <span>当前登录密码</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          <label className="field">
            <span>输入“删除账号”确认</span>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" required />
          </label>
          <button className="danger-button" type="submit" disabled={!canDelete}>
            {isDeleting ? <Loader2 className="spin" size={17} /> : <Trash2 size={17} />}
            {isDeleting ? '正在永久删除' : '永久删除账号'}
          </button>
          {error ? <div className="error-line"><AlertTriangle size={16} />{formatErrorMessage(error)}</div> : null}
        </form>
      </section>
    </div>
  )
}
