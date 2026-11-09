import { Children, cloneElement, Fragment, isValidElement, useId } from 'react';
import MenuSelect from './MenuSelect.jsx';

/** Native labels focus their field; menu headings never open the menu. */
export default function ControlField({ label, children, className = '', htmlFor, ...props }) {
  const uid = useId(), labelId = `${uid}-label`;
  let nativeId;
  function associate(nodes) {
    return Children.map(nodes, child => {
      if (!isValidElement(child)) return child;
      if (['input', 'select', 'textarea'].includes(child.type)) {
        // Preserve existing IDs, including an explicitly targeted nested field.
        const id = child.props.id || htmlFor || `${uid}-control`;
        if (!nativeId || id === htmlFor) nativeId = id;
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
  const captionProps = isValidElement(label) && label.type === 'span' ? label.props : { children: label };
  const caption = nativeId
    ? <label {...captionProps} id={labelId} htmlFor={nativeId} />
    : isValidElement(label) && label.type === 'span'
    ? cloneElement(label, { id: labelId }) : <span id={labelId}>{label}</span>;
  return <div {...props} className={`control-field ${className}`.trim()}>{caption}{controls}</div>;
}
