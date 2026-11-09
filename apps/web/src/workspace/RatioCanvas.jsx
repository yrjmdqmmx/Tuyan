// A draft's planned canvas is separate from the intrinsic size of saved results.
export default function RatioCanvas({ ratio, compact = false, children }) {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(ratio || '');
  const aspect = match ? Number(match[1]) / Number(match[2]) : 4 / 3;
  return <div className={`tw-ratio-preview ${compact ? 'is-compact' : ''}`} aria-label={`画布比例预览：${match ? ratio : '自动'}`}>
    <div className="tw-ratio-paper" style={{ aspectRatio: aspect, width: `min(100%, ${aspect * (compact ? 90 : 180)}px)` }}>{children || <span>{match ? ratio : '自动'}</span>}</div>
    <small>{match ? `预期画面比例 · ${ratio}` : '自动 · 执行时按内容决定'}{children ? ' · 以提交设置为准' : ''}</small>
  </div>;
}
