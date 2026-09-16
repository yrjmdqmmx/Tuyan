import { AlertTriangle } from 'lucide-react';
import { formatErrorMessage } from '../utils';

export default function JobFailureNotice({ job }) {
  if (!job?.error) return null;
  const failure = job.failure;
  return <div className="error-line job-failure-notice" role="alert"><AlertTriangle size={16} /><div>
    <p>{failure?.message || formatErrorMessage(job.error)}</p>
    {(failure?.billingMessage || job.recovery?.billingMessage) && <p>{failure?.billingMessage || job.recovery.billingMessage}</p>}
    {job.recovery?.message && job.recovery.message !== failure?.message && <p>{job.recovery.message}</p>}
  </div></div>;
}
