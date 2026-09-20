import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import useCompactLayout from '../hooks/useCompactLayout';

export default function GenerationSummaryDetails({ outputLabel, children }) {
  const compact = useCompactLayout();
  const [expanded, setExpanded] = useState(false);
  return <details className="generation-summary-details" open={!compact || expanded}>
    <summary onClick={event => { event.preventDefault(); setExpanded(value => !value); }}>
      <span>模型与输出</span><span>{outputLabel}</span><ChevronDown size={16} />
    </summary>
    {children}
  </details>;
}
