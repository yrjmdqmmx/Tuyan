import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { appPath } from '../appPaths';

export default function ContactDialog({ open, onClose }) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [qrFailed, setQrFailed] = useState(false);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = event => { if (event.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return <div className="feedback-dialog-backdrop" onClick={onClose}>
    <section className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title" onClick={event => event.stopPropagation()}>
      <button ref={closeRef} type="button" className="contact-dialog-close" aria-label="关闭" onClick={onClose}><X size={18} /></button>
      <h2 id="contact-dialog-title">联系作者</h2>
      <p>使用中有任何问题、建议或合作意向，欢迎扫码添加作者微信。</p>
      {qrFailed ? <div className="contact-qr-fallback">二维码即将上线，可先点顶栏「意见反馈」联系作者。</div>
        : <img className="contact-qr" src={appPath('/contact-qr.png')} alt="作者微信二维码（赵）" onError={() => setQrFailed(true)} />}
    </section>
  </div>;
}
