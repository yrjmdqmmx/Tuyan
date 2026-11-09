import { Children, cloneElement, Fragment, isValidElement, useId } from 'react';
import MenuSelect from './MenuSelect.jsx';

/** Keep the visible label outside the control's hover/click area. */
export default function ControlField({ label, children, className = '', htmlFor, ...props }) {
  const uid = useId(), labelId = `${uid}-label`;
  function associate(nodes) {
    return Children.map(nodes, child => {
      if (!isValidElement(child)) return child;
      if (child.type === MenuSelect || ['input', 'select', 'textarea'].includes(child.type)) {
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
  const caption = isValidElement(label) && label.type === 'span'
    ? cloneElement(label, { id: labelId }) : <span id={labelId}>{label}</span>;
  return <div {...props} className={`control-field ${className}`.trim()}>{caption}{associate(children)}</div>;
}
