import { Children, cloneElement, Fragment, isValidElement, useId } from 'react';
import MenuSelect from './MenuSelect.jsx';

/** Separate the caption from the control, preserving native label activation. */
export default function ControlField({ label, children, className = '', htmlFor, ...props }) {
  const uid = useId();
  const captionProps = isValidElement(label) && label.type === 'span' ? label.props : { children: label };
  const labelId = captionProps.id || `${uid}-label`;
  const natives = [];
  function findNative(nodes) {
    Children.forEach(nodes, child => {
      if (!isValidElement(child)) return;
      if (['input', 'select', 'textarea'].includes(child.type)) natives.push(child);
      else if (typeof child.type === 'string' || child.type === Fragment) findNative(child.props.children);
    });
  }
  findNative(children);
  // Precedence: explicit htmlFor always names the label target, including a
  // matching nested native control. Only when NO native child has an id do we
  // assign htmlFor to the first one; existing ids are never overwritten.
  // Without htmlFor, use the first native child's id, or assign a useId id to
  // that first child only. MenuSelect instead gets a non-clickable span heading.
  const nativeId = natives.length ? htmlFor ?? (natives[0].props.id || `${uid}-control`) : undefined;
  const assignFirst = htmlFor != null ? !natives.some(child => child.props.id) : !natives[0]?.props.id;
  let nativeIndex = 0;
  function associate(nodes) {
    return Children.map(nodes, child => {
      if (!isValidElement(child)) return child;
      if (['input', 'select', 'textarea'].includes(child.type)) {
        return nativeIndex++ === 0 && assignFirst ? cloneElement(child, { id: nativeId }) : child;
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
  const captionClass = `control-field-label ${captionProps.className || ''}`.trim();
  const caption = natives.length
    ? <label {...captionProps} className={captionClass} id={labelId} htmlFor={nativeId} />
    : <span {...captionProps} className={captionClass} id={labelId} />;
  return <div {...props} className={`control-field ${className}`.trim()}>{caption}{controls}</div>;
}
