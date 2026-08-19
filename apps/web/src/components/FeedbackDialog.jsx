import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, Send, X } from 'lucide-react';
import { formatErrorMessage } from '../utils';

const FEEDBACK_CATEGORIES = [
  ['bug', '问题反馈'],
  ['feature', '功能建议'],
  ['experience', '体验意见'],
  ['other', '其他'],
];

export default function FeedbackDialog({ open, isSubmitting, error, success, onClose, onSubmit }) {
  const [category, setCategory] = useState('experience');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [isSubmitting, onClose, open]);

  if (!open) return null;

  async function submitFeedback(event) {
    event.preventDefault();
    const submitted = await onSubmit({ category, message, contact });
    if (submitted) setMessage('');
  }

  const messageLength = message.trim().length;
  const canSubmit = messageLength >= 1 && messageLength <= 2000 && !isSubmitting;

  return (
    <div className="feedback-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isSubmitting && onClose()}>
      <section className="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <div className="feedback-dialog-head">
          <div className="section-head">
            <MessageSquare size={20} />
            <div>
              <h2 id="feedback-title">意见反馈</h2>
              <p>告诉我们哪里需要修复或改进。</p>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" className="feedback-close-button" onClick={onClose} aria-label="关闭意见反馈" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form className="feedback-form" onSubmit={submitFeedback}>
          <div className="field">
            <span>类别</span>
            <div className="segmented feedback-category-switch">
              {FEEDBACK_CATEGORIES.map(([id, label]) => (
                <button type="button" key={id} className={category === id ? 'active' : ''} onClick={() => setCategory(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>反馈内容</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              rows={7}
              placeholder="描述遇到的问题、期望的功能或使用体验。"
            />
            <small className="field-help">{messageLength}/2000</small>
          </label>

          <label className="field">
            <span>联系方式</span>
            <input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              maxLength={300}
              placeholder="可选：邮箱、微信或其他联系方式"
            />
          </label>

          <button className="primary-button" type="submit" disabled={!canSubmit}>
            {isSubmitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            提交反馈
          </button>
          {success ? <div className="success-line"><CheckCircle2 size={16} /> 反馈已提交，感谢你的意见。</div> : null}
          {error ? <div className="error-line"><AlertTriangle size={16} /> {formatErrorMessage(error)}</div> : null}
        </form>
      </section>
    </div>
  );
}
