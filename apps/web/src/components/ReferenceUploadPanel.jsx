import { useAppLocale } from './BenchmarkLocale.jsx'
import { FileImage, UploadCloud, X } from 'lucide-react';
import { activeReferenceUploadPolicy, referenceBytesLabel, referencePolicyHint, referenceProcessingHint } from '../lib/referenceUploadPolicy';

export default function ReferenceUploadPanel({ images, policy = activeReferenceUploadPolicy(null, null), error, disabled, isUploading, isInspecting = false, retrievalBlocked = false, onAddFiles, onRemove, title = '参考图', uploadBlocked = false, help, processingHint, onPurposeChange }) {
  const { t, locale } = useAppLocale()
  const original = policy.platform
  const submitted = policy.submission
  const limitsText = locale === 'en'
    ? `Originals: up to ${original.maxCount} images (${policy.maxCount} for this model), ${referenceBytesLabel(original.maxBytes)} each and ${referenceBytesLabel(original.maxTotalBytes)} total; ${original.maxDimension}px per edge, ${original.maxPixels / 1e6}MP per image. SVG: up to 5MiB, with text outlined. ${policy.workflow === 'refine' ? 'Editing model' : 'Reference vision and planning model'}: ${policy.modelLabel}.`
    : referencePolicyHint(policy)
  const processingText = locale === 'en' && policy.version >= 2
    ? `Orientation is corrected before submission. Compatible JPEG/WebP files keep their original bytes when no rotation or resizing is needed; otherwise lossless PNG is preferred. Images may be scaled down to ${submitted.maxDimension}px / ${submitted.maxPixels / 1e6}MP, never enlarged. Minimum short edge: ${submitted.minDimension}px; maximum aspect ratio: ${submitted.maxAspectRatio}; ${referenceBytesLabel(submitted.maxBytes)} each, ${referenceBytesLabel(submitted.maxTotalBytes)} total. Originals are retained without automatic lossy compression. Crop or choose another model if limits are still exceeded. ${t(submitted.note)}`
    : t(referenceProcessingHint(policy))
  const uploadDisabled = disabled || isUploading || retrievalBlocked || uploadBlocked;
  return (
    <section className="reference-upload-panel">
      <div className="reference-upload-head">
        <div>
          <strong>{t(title)}</strong>
          <span>PNG/JPG/WebP/SVG · {limitsText}</span>
        </div>
        <label className={`reference-upload-button ${uploadDisabled ? 'disabled' : ''}`}>
          <UploadCloud size={16} />
          {t(isInspecting ? '检查图片中' : isUploading ? '上传中' : '选择图片')}
          <input
            type="file"
            aria-label={t(title + '上传')}
            accept={policy.platform.accept}
            multiple
            disabled={uploadDisabled}
            onChange={(event) => {
              if (retrievalBlocked) {
                event.target.value = '';
                return;
              }
              onAddFiles(Array.from(event.target.files || []));
              event.target.value = '';
            }}
          />
        </label>
      </div>

      <details className="reference-processing-details"><summary>{t("模型限制与图片处理")}</summary><p className="reference-processing-note">{processingHint ? t(processingHint) : processingText}</p></details>
      {retrievalBlocked ? <div className="reference-upload-error">{t("请先将检索设置切换为“不使用检索”，再上传参考图。系统不会自动更改当前检索选择。")}</div> : null}
      {error ? <div className="reference-upload-error">{error}</div> : null}

      {images.length ? (
        <div className="reference-preview-grid">
          {images.map((image, index) => (
            <figure className="reference-preview-card" key={image.id}>
              <img src={image.previewUrl} alt={t("参考图 {v0}", {v0: index + 1})} />
              <figcaption>
                <span title={image.filename}>
                  <FileImage size={14} />
                  {image.filename}
                </span>
                <button type="button" disabled={disabled || isUploading} onClick={() => onRemove(image.id)} aria-label={t("移除参考图 {v0}", {v0: index + 1})}>
                  <X size={14} />
                </button>
              </figcaption>
              {onPurposeChange ? <div className="reference-purpose"><label>{t("参考用途")}<select aria-label={t("参考图 {v0} 用途", {v0: index+1})} value={image.purpose} disabled={disabled || isUploading} onChange={event=>onPurposeChange(image.id,{purpose:event.target.value})}><option value="content">{t("内容")}</option><option value="layout">{t("布局")}</option><option value="color">{t("配色")}</option><option value="style">{t("风格")}</option></select></label><label>{t("补充说明")}<input aria-label={t("参考图 {v0} 说明", {v0: index+1})} value={image.note} maxLength={300} disabled={disabled || isUploading} onChange={event=>onPurposeChange(image.id,{note:event.target.value})} placeholder={t("例如：只参考箭头配色")}/></label></div> : null}
            </figure>
          ))}
        </div>
      ) : (
        <div className="reference-empty">
          <FileImage size={18} />
          <span>{t(help || '可选：上传参考图后，系统会参考它的结构和风格生成新图。')}</span>
        </div>
      )}
    </section>
  );
}
