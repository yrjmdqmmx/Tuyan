import {JournalTaskSummary} from './JournalExportPanel.jsx';
import { useAppLocale } from './BenchmarkLocale.jsx'
import JobFailureNotice from './JobFailureNotice';
import { Loader2, Settings2 } from 'lucide-react';
import { formatConfigurationMode, formatOutputFormat, formatReferenceImageMode } from '../utils';
import DownloadJobZipButton from './DownloadJobZipButton';
import ResultFigure from './ResultFigure';
import StageTimeline from './StageTimeline';
import StatusBadge from './StatusBadge';
import { formatClientPlatform } from '@paperbanana/api';
import { getFigureType } from '../../../../packages/figure-taxonomy/src/index.js';

function hasProgrammaticData(job) {
  const source=job.generationContext || job;
  if(source.generationPath==='model-v1')return false;
  return source.task_name==='plot' || source.taskName==='plot' || getFigureType(source.figureTypeId)?.kind==='data' || Boolean(source.figurePanels?.some(hasProgrammaticData));
}

export default function JobStatus({ job, apiBase, onUseForRefine, onRestoreInput }) {
  const { t } = useAppLocale()
  if (!job) {
    return (
      <div className="empty-state">
        <Settings2 size={34} />
        <p>{t("等待新任务")}</p>
      </div>
    );
  }
  const dataProtected=hasProgrammaticData(job);

  return (
    <div className="job-detail">
      <div className="status-strip">
        <StatusBadge status={job.status} />
        <span>{t("任务来源：")}{formatClientPlatform(job.client_platform)}</span>
        <span>{formatConfigurationMode(job.configuration_mode)}</span>
        <span>{job.provider}</span>
        <span>{job.aspect_ratio}</span>
        <span>{job.task_name === 'plot' && job.output_format === 'svg' && !job.figureTypeId ? t('历史请求 SVG · 实际绘图输出 PNG') : formatOutputFormat(job.output_format)}</span>
        <span>{formatReferenceImageMode(job.reference_image_mode_used)}</span>
        <span>{formatRetrievalSetting(job.retrieval_setting)}</span>
        {job.critic_mode ? <span>{t(job.critic_mode === 'visual_code' ? '画面与代码' : job.critic_mode === 'image' ? '图像评审' : '文本评审')}</span> : null}
        <span>{job.num_candidates}{t(" 张候选图")}</span>
      </div>
      {(job.result_images || []).length > 0 ? (
        <DownloadJobZipButton job={job} apiBase={apiBase} />
      ) : null}
      {onRestoreInput && (job.figureTypeId || job.generationContext?.figureTypeId) ? <button type="button" onClick={()=>onRestoreInput(job)}>恢复图型与完整输入</button> : null}
      <JournalTaskSummary job={job}/>
      <JobFailureNotice job={job} />
      {job.status === 'failed' && job.result_images?.length > 0 ? <p className="notice warning">{t(dataProtected?'任务部分失败，已完成的候选图仍可查看或下载。':'任务部分失败，已完成的候选图仍可查看、下载或继续精修。')}</p> : null}
      {dataProtected && job.result_images?.length > 0 ? <p className="notice">{t('数值子图由程序绘制。修改数据或布局时，请恢复图型与完整输入后重新生成；生图精修可能改变数值，已停用。')}</p> : null}
      {(job.candidateProgress || job.candidate_progress)?.length > 0 ? <ul className="candidate-progress" aria-label={t('候选图进度')}>{(job.candidateProgress || job.candidate_progress).map((candidate,index) => <li className={candidate.status} key={candidate.candidateId ?? candidate.candidate_id ?? index}>{t('候选图')} {Number(candidate.candidateId ?? candidate.candidate_id ?? index)+1} · {t((job.status === 'failed' && ['pending','queued','running'].includes(candidate.status)) ? '已停止' : ({pending:'等待中',queued:'等待中',running:'生成中',succeeded:'已完成',failed:'失败',cancelled:'已停止'})[candidate.status] || candidate.status)}{candidate.error ? `：${typeof candidate.error === 'string' ? candidate.error : candidate.error.message || candidate.error.code || ''}` : ''}</li>)}</ul> : null}
      {job.referenceSelection?.requestedTypeId && <p className="echo-label">图型匹配：{job.referenceSelection.exactCount || 0} 张精确匹配，{job.referenceSelection.compatibleCount || 0} 张兼容结构。{job.referenceSelection.matchStatus==='no_suitable_reference'?'没有合适案例，本次不采用参考图。':'目标图型保持用户选择。'}</p>}
      {job.referenceSelection?.manualUnmatchedCount>0 && <p className="echo-label">另有 {job.referenceSelection.manualUnmatchedCount} 张手选参考未证明结构相容；保留手选内容与原定图型，不视为自动匹配。</p>}
      {job.referenceSelection && <p className="echo-label">{t("参考图选择：实际采用 ")}{job.referenceSelection.selectedCount}{t(" 张，")}{t(job.referenceSelection.mode === 'images' ? `本阶段合计提交 ${job.referenceSelection.imageCount} 张图片` : job.referenceSelection.selectedCount ? '本阶段使用参考信息' : '本阶段未采用图库参考')}{t("；按相关性和当前模型限制筛选，无合适参考图时不使用。")}</p>}
      {(job.reference_images || []).some((image) => image.url) ? (
        <>
          <p className="echo-label">{t("参考回显（仅作风格参考，不决定版式）")}</p>
          <div className="image-grid reference-echo">
            {(job.reference_images || []).filter((image) => image.url).map((image, index) => (
              <ResultFigure key={image.object_key || image.filename || index} image={{ ...image, candidate_id: index }} apiBase={apiBase} labelPrefix="参考图" />
            ))}
          </div>
        </>
      ) : null}
      <div className="image-grid">
        {(job.result_images || []).map((image) => (
          <ResultFigure key={image.filename} image={image} apiBase={apiBase} outputFormat={job.output_format} journalProfile={job.journalProfile} jobId={job.id} onUseForRefine={dataProtected?undefined:onUseForRefine} />
        ))}
      </div>
      <StageTimeline job={job} apiBase={apiBase} />
      {job.providerCalls?.length > 0 && <details><summary>{t("模型调用记录")}</summary>{job.providerCalls.map((call, index) => <p key={index}>{call.requestedModel} → {t(call.actualModel || '未返回实际型号')}<br />{t("请求编号：")}{t(call.requestId || '未返回')}{t("；供应商：")}{t(call.supplier || '未返回')}</p>)}</details>}
      {job.status === 'running' || job.status === 'queued' ? (
        <div className="running-line"><Loader2 className="spin" size={17} />{t("任务在服务器继续执行，页面会自动刷新。关闭网页不会取消任务；提交时已登录的任务可从同一账号记录返回查看。")}</div>
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
