import { useId } from 'react';
import { X } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';

export default function ImagePreviewDialog({ item, imageUrl, onClose }) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <AccessibleDialog
      open={Boolean(item && imageUrl)}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      className="image-preview-dialog"
    >
      <button type="button" className="image-preview-close" aria-label="关闭大图预览" onClick={onClose}>
        <X size={20} />
      </button>
      <figure>
        <img src={imageUrl} alt={item?.titleZh || item?.title || '参考案例大图'} />
        <figcaption>
          <strong id={titleId}>{item?.titleZh || item?.title}</strong>
          <p id={descriptionId}>{item?.introZh || item?.summary}</p>
        </figcaption>
      </figure>
    </AccessibleDialog>
  );
}
