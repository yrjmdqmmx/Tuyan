import { AlertTriangle, Loader2, Settings2 } from 'lucide-react';
import { formatConfigurationMode, formatErrorMessage, formatOutputFormat, formatReferenceImageMode } from '../utils';
import DownloadJobZipButton from './DownloadJobZipButton';
import ResultFigure from './ResultFigure';
import StageTimeline from './StageTimeline';
import StatusBadge from './StatusBadge';
import { formatClientPlatform } from '@paperbanana/api';

export default function JobStatus({ job, apiBase, onUseForRefine }) {
  if (!job) {
    return (
      <div className="empty-state">
        <Settings2 size={34} />
        <p>等待新任务</p>
      </div>
    );
  }

  return (
    <div className="job-detail">
      <div className="status-strip">
        <StatusBadge status={job.status} />
        <span>任务来源：{formatClientPlatform(job.client_platform)}</span>
        <span>{formatConfigurationMode(job.configuration_mode)}</span>
        <span>{job.provider}</span>
        <span>{job.aspect_ratio}</span>
        <span>{formatOutputFormat(job.output_format)}</span>
        <span>{formatReferenceImageMode(job.reference_image_mode_used)}</span>
        <span>{formatRetrievalSetting(job.retrieval_setting)}</span>
        {job.critic_mode ? <span>{job.critic_mode === 'image' ? '图像评审' : '文本评审'}</span> : null}
        <span>{job.num_candidates} 张候选图</span>
      </div>
      {(job.result_images || []).length > 0 ? (
        <DownloadJobZipButton job={job} apiBase={apiBase} />
      ) : null}
      {job.error ? <div className="error-line"><AlertTriangle size={16} /> {formatErrorMessage(job.error)}</div> : null}
      {(job.reference_images || []).some((image) => image.url) ? (
        <>
          <p className="echo-label">参考回显（仅作风格参考，不决定版式）</p>
          <div className="image-grid reference-echo">
            {(job.reference_images || []).filter((image) => image.url).map((image, index) => (
              <ResultFigure key={image.object_key || image.filename || index} image={{ ...image, candidate_id: index }} apiBase={apiBase} labelPrefix="参考图" />
            ))}
          </div>
        </>
      ) : null}
      <div className="image-grid">
        {(job.result_images || []).map((image) => (
          <ResultFigure key={image.filename} image={image} apiBase={apiBase} outputFormat={job.output_format} onUseForRefine={onUseForRefine} />
        ))}
      </div>
      <StageTimeline job={job} apiBase={apiBase} />
      {job.status === 'running' || job.status === 'queued' ? (
        <div className="running-line"><Loader2 className="spin" size={17} />生成中，页面会自动刷新。</div>
      ) : null}
      {job.status === 'failed' && job.logs_tail ? <pre className="logs">{job.logs_tail}</pre> : null}
    </div>
  );
}

function formatRetrievalSetting(setting) {
  if (setting === 'auto') return '自动检索';
  if (setting === 'random') return '随机参考';
  if (setting === 'manual') return '手动参考';
  return '不检索';
}
