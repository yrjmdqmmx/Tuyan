import { useAppLocale } from './BenchmarkLocale.jsx'
import JobFailureNotice from './JobFailureNotice';
import { AlertTriangle } from 'lucide-react';
import { formatConfigurationMode, formatDate, formatOutputFormat, formatReferenceImageMode } from '../utils';
import DownloadJobZipButton from './DownloadJobZipButton';
import ResultFigure from './ResultFigure';
import StatusBadge from './StatusBadge';
import { formatClientPlatform } from '@paperbanana/api';

export default function JobTable({ jobs, showUser, apiBase, onUseForRefine, renderRecovery }) {
  const { t } = useAppLocale()
  return (
    <div className="job-table">
      {!jobs.length ? <div className="job-empty">{t("暂无任务记录")}</div> : null}
      {jobs.map((item) => (
        <div className="job-record-card" key={item.id}>
          <div className="job-record-topline">
            <div className="job-record-meta">
              <span>
                <strong>{t("时间")}</strong>
                {formatDate(item.created_at || item.createdAt)}
              </span>
              <span>
                <strong>{t("状态")}</strong>
                <StatusBadge status={item.status} />
              </span>
              <span>
                <strong>{t("任务来源")}</strong>
                {formatClientPlatform(item.client_platform)}
              </span>
              <span>
                <strong>{t("模式")}</strong>
                {formatConfigurationMode(item.configuration_mode)}
              </span>
              <span>
                <strong>{t("类别")}</strong>
                {t(item.infographic_category || '方法框架图')}
              </span>
              <span>
                <strong>{t("格式")}</strong>
                {formatOutputFormat(item.output_format)}
              </span>
              <span>
                <strong>{t("检索")}</strong>
                {formatRetrievalSetting(item.retrieval_setting)}
              </span>
              <span>
                <strong>{t("阶段")}</strong>
                {(item.stages || []).length || 0}
              </span>
              {showUser ? (
                <span>
                  <strong>{t("用户")}</strong>
                  <span title={item.user_email}>{t(item.user_email || '匿名')}</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="job-models">
            <div>
              <strong>{t("主模型")}</strong>
              <span title={item.main_model_name}>{t(item.main_model_name || '未记录')}</span>
            </div>
            <div>
              <strong>{t("图像生成模型")}</strong>
              <span title={item.image_gen_model_name}>{t(item.image_gen_model_name || '未记录')}</span>
            </div>
            <div>
              <strong>{t("参考图识别模型")}</strong>
              <span title={item.reference_image_mode_used === 'vision_model' ? item.reference_vision_model_name : ''}>
                {t(item.reference_image_mode_used === 'vision_model' ? item.reference_vision_model_name || '未记录' : '未使用')}
              </span>
            </div>
            <div>
              <strong>{t("参考图处理")}</strong>
              <span title={item.reference_image_mode_used || item.reference_image_mode}>{formatReferenceImageMode(item.reference_image_mode_used || item.reference_image_mode)}</span>
            </div>
            <div>
              <strong>{t("评审模式")}</strong>
              <span>{t(item.critic_mode === 'image' ? '图像评审' : item.critic_mode === 'text' ? '文本评审' : '未记录')}</span>
            </div>
          </div>

          <div className="job-prompts">
            <div>
              <strong>{t("论文方法内容")}</strong>
              <p>{t(item.method_content || '未记录')}</p>
            </div>
            <div>
              <strong>{t("目标图注")}</strong>
              <p>{t(item.caption || '未记录')}</p>
            </div>
          </div>

          {item.status === 'failed' && (item.error || item.logs_tail) ? (
            <JobFailureNotice job={{ ...item, error: item.error || lastDiagnosticLine(item.logs_tail) }} />
          ) : null}
          {renderRecovery?.(item)}
          {item.providerCalls?.length > 0 && <details><summary>{t("模型调用记录")}</summary>{item.providerCalls.map((call, index) => <p key={index}>{call.requestedModel} → {t(call.actualModel || '未返回实际型号')}<br />{t("请求编号：")}{t(call.requestId || '未返回')}{t("；供应商：")}{t(call.supplier || '未返回')}</p>)}</details>}

          {(item.reference_images || []).some((image) => image.url) ? (
            <div className="job-record-images">
              <strong>{t("参考图")}</strong>
              <div className="job-record-image-grid">
                {(item.reference_images || []).filter((image) => image.url).map((image, index) => (
                  <ResultFigure
                    key={image.object_key || image.filename || index}
                    image={{ ...image, candidate_id: index }}
                    apiBase={apiBase}
                    labelPrefix="参考图"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {item.status === 'succeeded' && (item.result_images || []).some((image) => image.url) ? (
            <div className="job-record-images">
              <div className="job-record-images-head">
                <strong>{t("结果图")}</strong>
                <DownloadJobZipButton job={item} apiBase={apiBase} />
              </div>
              <div className="job-record-image-grid">
                {(item.result_images || []).filter((image) => image.url).map((image) => (
                  <ResultFigure key={image.filename} image={image} apiBase={apiBase} labelPrefix="结果图" outputFormat={item.output_format} onUseForRefine={onUseForRefine} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function formatRetrievalSetting(setting) {
  if (setting === 'auto') return '自动';
  if (setting === 'random') return '随机';
  if (setting === 'manual') return '手动';
  return '无';
}

function lastDiagnosticLine(logs) {
  const lines = String(logs || '').split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.at(-1) || '任务失败，暂无更多诊断信息。';
}
