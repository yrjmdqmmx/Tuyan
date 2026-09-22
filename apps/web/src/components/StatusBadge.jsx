import { useAppLocale } from './BenchmarkLocale.jsx'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { STATUS_LABELS } from '../constants';

export default function StatusBadge({ status }) {
  const { t } = useAppLocale()
  const className = `status-badge ${status}`;
  const icon = status === 'succeeded' ? <CheckCircle2 size={15} /> : status === 'failed' ? <AlertTriangle size={15} /> : <Loader2 className="spin" size={15} />;
  return <span className={className}>{icon}{t(STATUS_LABELS[status] || status || '未知')}</span>;
}
