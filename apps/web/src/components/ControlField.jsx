import { Children, cloneElement, Fragment, isValidElement, useId } from 'react';
import MenuSelect from './MenuSelect.jsx';

/** Separate the caption from the control, preserving native label activation. */
export default function ControlField({ label, children, className = '', htmlFor, ...props }) {
  const uid = useId(), labelId = `${uid}-label`;
  let nativeId;
  function associate(nodes) {
    return Children.map(nodes, child => {
      if (!isValidElement(child)) return child;
      if (['input', 'select', 'textarea'].includes(child.type)) {
        // Each field has one primary control; action buttons remain independent.
        const id = child.props.id || htmlFor || `${uid}-control`;
        nativeId ??= id;
        return cloneElement(child, { id });
      }
      if (child.type === MenuSelect) {
        return cloneElement(child, {
          'aria-labelledby': child.props['aria-label'] || child.props['aria-labelledby'] ? child.props['aria-labelledby'] : labelId,
        });
      }
      // Traverse native wrappers/fragments, without altering opaque components.
      if ((typeof child.type === 'string' || child.type === Fragment) && child.props.children) {
        return cloneElement(child, {}, associate(child.props.children));
      }
      return child;
    });
  }
  const controls = associate(children);
  const caption = nativeId
    ? <label id={labelId} htmlFor={nativeId}>{label}</label>
    : isValidElement(label) && label.type === 'span'
      ? cloneElement(label, { id: labelId }) : <span id={labelId}>{label}</span>;
  return <div {...props} className={`control-field ${className}`.trim()}>{caption}{controls}</div>;
}
