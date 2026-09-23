import { useAppLocale } from './BenchmarkLocale.jsx'
import { X } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';
import { appPath } from '../appPaths';

export default function MiniProgramDialog({ open, onClose }) {
  const { t } = useAppLocale()
  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      labelledBy="miniprogram-dialog-title"
      describedBy="miniprogram-dialog-description"
      className="miniprogram-dialog"
      backdropClassName="miniprogram-dialog-backdrop"
    >
      <button type="button" className="miniprogram-dialog-close" aria-label={t("关闭小程序码")} data-autofocus onClick={onClose}>
        <X size={18} />
      </button>
      <h2 id="miniprogram-dialog-title">{t("微信扫码打开图研")}</h2>
      <p id="miniprogram-dialog-description">{t("使用微信扫一扫，进入图研小程序")}</p>
      <img className="miniprogram-code" src={appPath('/miniprogram-code.png')} width="430" height="430" alt={t("图研微信小程序码")} />
    </AccessibleDialog>
  );
}
