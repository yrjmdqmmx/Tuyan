import { FileImage, UploadCloud, X } from 'lucide-react';
import { REFERENCE_IMAGE_LIMITS } from '../constants';

export default function ReferenceUploadPanel({ images, error, disabled, isUploading, retrievalBlocked = false, onAddFiles, onRemove }) {
  const uploadDisabled = disabled || isUploading || retrievalBlocked;
  return (
    <section className="reference-upload-panel">
      <div className="reference-upload-head">
        <div>
          <strong>参考图</strong>
          <span>PNG/JPG/WebP/SVG，最多 {REFERENCE_IMAGE_LIMITS.maxCount} 张，单张 5MB。</span>
        </div>
        <label className={`reference-upload-button ${uploadDisabled ? 'disabled' : ''}`}>
          <UploadCloud size={16} />
          {isUploading ? '上传中' : '选择图片'}
          <input
            type="file"
            accept={REFERENCE_IMAGE_LIMITS.accept}
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
                <button type="button" onClick={() => onRemove(image.id)} aria-label={`移除参考图 ${index + 1}`}>
                  <X size={14} />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="reference-empty">
          <FileImage size={18} />
          <span>可选：上传参考图后，系统会参考它的结构和风格生成新图。</span>
        </div>
      )}
    </section>
  );
}
