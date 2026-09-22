import { FileImage, UploadCloud, X } from 'lucide-react';
import { activeReferenceUploadPolicy, referencePolicyHint, referenceProcessingHint } from '../lib/referenceUploadPolicy';

export default function ReferenceUploadPanel({ images, policy = activeReferenceUploadPolicy(null, null), error, disabled, isUploading, isInspecting = false, retrievalBlocked = false, onAddFiles, onRemove, title = '参考图', uploadBlocked = false, help, processingHint, onPurposeChange }) {
  const uploadDisabled = disabled || isUploading || retrievalBlocked || uploadBlocked;
  return (
    <section className="reference-upload-panel">
      <div className="reference-upload-head">
        <div>
          <strong>{title}</strong>
          <span>PNG/JPG/WebP/SVG。{referencePolicyHint(policy)}</span>
        </div>
        <label className={`reference-upload-button ${uploadDisabled ? 'disabled' : ''}`}>
          <UploadCloud size={16} />
          {isInspecting ? '检查图片中' : isUploading ? '上传中' : '选择图片'}
          <input
            type="file"
            aria-label={title + '上传'}
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

      <details className="reference-processing-details"><summary>模型限制与图片处理</summary><p className="reference-processing-note">{processingHint || referenceProcessingHint(policy)}</p></details>
      {retrievalBlocked ? <div className="reference-upload-error">请先将检索设置切换为“不使用检索”，再上传参考图。系统不会自动更改当前检索选择。</div> : null}
      {error ? <div className="reference-upload-error">{error}</div> : null}

      {images.length ? (
        <div className="reference-preview-grid">
          {images.map((image, index) => (
            <figure className="reference-preview-card" key={image.id}>
              <img src={image.previewUrl} alt={`参考图 ${index + 1}`} />
              <figcaption>
                <span title={image.filename}>
                  <FileImage size={14} />
                  {image.filename}
                </span>
                <button type="button" disabled={disabled || isUploading} onClick={() => onRemove(image.id)} aria-label={`移除参考图 ${index + 1}`}>
                  <X size={14} />
                </button>
              </figcaption>
              {onPurposeChange ? <div className="reference-purpose"><label>参考用途<select aria-label={`参考图 ${index+1} 用途`} value={image.purpose} disabled={disabled || isUploading} onChange={event=>onPurposeChange(image.id,{purpose:event.target.value})}><option value="content">内容</option><option value="layout">布局</option><option value="color">配色</option><option value="style">风格</option></select></label><label>补充说明<input aria-label={`参考图 ${index+1} 说明`} value={image.note} maxLength={300} disabled={disabled || isUploading} onChange={event=>onPurposeChange(image.id,{note:event.target.value})} placeholder="例如：只参考箭头配色"/></label></div> : null}
            </figure>
          ))}
        </div>
      ) : (
        <div className="reference-empty">
          <FileImage size={18} />
          <span>{help || '可选：上传参考图后，系统会参考它的结构和风格生成新图。'}</span>
        </div>
      )}
    </section>
  );
}
