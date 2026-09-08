import { useEffect, useRef, useState } from 'react';
import { formatClientPlatform } from '@paperbanana/api';
import DownloadJobZipButton from '../DownloadJobZipButton';
import ResultFigure from '../ResultFigure';
import { formatReferenceImageMode } from '../../utils';
import { Facts, State } from './AdminCommon';
import { useAdminData } from './adminApi';
import { date, duration } from './adminState';

const valueLabel = (value, labels) => Object.hasOwn(labels, value) ? labels[value] : value || '未记录';
export const configurationLabel = (value) => valueLabel(value, { simple: '普通模式', advanced: '专业模式' });
export const outputLabel = (value) => valueLabel(value, { png: 'PNG 图片', svg: 'SVG 矢量图', jpeg: 'JPEG 图片', jpg: 'JPEG 图片', webp: 'WebP 图片' });
export const retrievalLabel = (value) => valueLabel(value, { auto: '自动', random: '随机', manual: '手动', none: '不检索' });
const countLabel = (value) => value == null ? '未记录' : String(value);
function visionLabel(task) {
  if (task.referenceImageModeUsed === 'vision_model') return task.models.vision || '未记录';
  if (['none', 'main_model'].includes(task.referenceImageModeUsed)) return '未使用';
  return '未记录是否使用';
}

export function TaskConfigurationSummary({ task }) {
  return <><span>{formatClientPlatform(task.clientPlatform)} · {configurationLabel(task.configurationMode)}</span><small>{task.infographicCategory || '类别未记录'}</small><small>{outputLabel(task.outputFormat)} · 检索：{retrievalLabel(task.retrievalSetting)}</small><small>阶段：{countLabel(task.stageCount)} · 参考图：{countLabel(task.referenceCount)}</small></>;
}

// Only the already allowlisted admin DTO enters the existing image archive helper.
function archiveJob(task) {
  const image = (item, index) => ({ ...item, mime_type: item.mimeType, candidate_id: index });
  return { ...task, result_images: task.results.map(image), reference_images: task.references.map(image), stages: task.stages.map((stage) => ({ ...stage, image: stage.image ? image(stage.image, 0) : null })) };
}
function Images({ images, apiBase, prefix, outputFormat }) {
  return <div className="ops-images">{images.map((image, index) => <div className="ops-task-image" key={`${image.url}-${index}`}>
    {image.url ? <><ResultFigure image={{ ...image, mime_type: image.mimeType, candidate_id: index }} apiBase={apiBase} labelPrefix={prefix} outputFormat={image.mimeType ? '' : outputFormat} /><a href={image.url} target="_blank" rel="noreferrer">打开{prefix} {index + 1}</a></> : <p className="ops-muted">{prefix} {index + 1} 暂无可用链接，请刷新详情重试。</p>}
    {image.filename && <p className="ops-image-filename" title={image.filename}>{image.filename}</p>}
  </div>)}</div>;
}

export function TaskContent({ task, apiBase }) {
  return <div className="ops-task-content">
    <section className="ops-card"><h3>生成配置</h3><Facts items={[
      ['任务来源', formatClientPlatform(task.clientPlatform)], ['模式', configurationLabel(task.configurationMode)], ['类别', task.infographicCategory],
      ['格式', outputLabel(task.outputFormat)], ['检索', retrievalLabel(task.retrievalSetting)], ['阶段', countLabel(task.stageCount)],
      ['主模型', task.models.main], ['图像生成模型', task.models.image], ['参考图识别模型', visionLabel(task)],
      ['参考图处理', formatReferenceImageMode(task.referenceImageModeUsed)], ['参考图处理设置', formatReferenceImageMode(task.referenceImageMode)],
      ['评审模式', valueLabel(task.criticMode, { image: '图像评审', text: '文本评审' })],
      ['生成流程', valueLabel(task.pipelineMode, { vanilla: '直接生成', planner_critic: '规划与评审', refine: '图片精修' })],
      ['画面比例', task.aspectRatio], ['图像尺寸', task.imageSize], ['候选数量', countLabel(task.numCandidates)], ['最多评审轮数', countLabel(task.maxCriticRounds)], ['参考图数量', countLabel(task.referenceCount)],
    ]} />{task.referenceImageModeUsed !== 'vision_model' && task.models.vision && <p className="ops-muted">配置的识图模型：{task.models.vision}。是否实际使用以“参考图处理”记录为准。</p>}</section>
    {task.error && <section className="ops-card ops-error"><h3>失败原因{task.errorCode ? ` · ${task.errorCode}` : ''}</h3><p className="ops-pre">{task.error}</p></section>}
    <section className="ops-card"><h3>输入与图片</h3><div className="ops-task-inputs"><div><h4>论文方法内容</h4><p className="ops-pre">{task.methodContent || '未记录'}</p></div><div><h4>目标图注</h4><p className="ops-pre">{task.caption || '未记录'}</p></div></div><details><summary>负向提示词</summary><p className="ops-pre">{task.negativePrompt || '未提供'}</p></details>
      <div className="ops-card-head ops-results-head"><h4>结果图（{task.results.length}）</h4><DownloadJobZipButton job={archiveJob(task)} apiBase={apiBase} /></div>
      {task.results.length ? <Images images={task.results} apiBase={apiBase} prefix="结果图" outputFormat={task.outputFormat} /> : <p className="ops-muted">{['reserved', 'queued', 'running'].includes(task.status) ? '任务尚未产出结果。' : '该任务没有可展示的生成结果。'}</p>}
      {task.references.length > 0 && <><h4>参考图（{task.references.length}）</h4><Images images={task.references} apiBase={apiBase} prefix="参考图" /></>}
      {(task.results.length > 0 || task.references.length > 0 || task.stages.some((s) => s.image?.url)) && <p className="ops-muted ops-download-note">下载全部包含结果图、参考图、阶段图片与任务信息；链接有有效期，失效后可刷新重新获取。</p>}
    </section>
    <section className="ops-card"><h3>执行记录</h3>{task.stages.length ? task.stages.map((stage, index) => <details key={index}><summary>{stage.title || stage.type || `阶段 ${index + 1}`}</summary><Facts items={[
      ['候选编号', stage.candidateId == null ? '未记录' : String(stage.candidateId + 1)], ['评审轮次', countLabel(stage.round)], ['耗时', stage.durationMs == null ? '未记录' : duration(stage.durationMs)], ['开始时间', date(stage.startedAt)], ['完成时间', date(stage.completedAt)],
    ]} /><p className="ops-pre">{stage.text || '没有文字记录'}</p>{stage.suggestion && <><h4>评审建议</h4><p className="ops-pre">{stage.suggestion}</p></>}{stage.error && <p className="ops-error">{stage.error}</p>}{stage.image && <Images images={[stage.image]} apiBase={apiBase} prefix="阶段图" />}</details>) : <p className="ops-muted">没有阶段记录。</p>}<details><summary>最近日志（最多 200 条）</summary><pre>{task.logs.join('\n') || '暂无日志'}</pre></details></section>
  </div>;
}

export function TaskPreview({ apiBase, id, open }) {
  const [refresh, setRefresh] = useState(0);
  const result = useAdminData(apiBase, 'adminTaskDetail', { id }, refresh);
  const restoreScroll = useRef(Number(window.history.state?.opsScroll || 0));
  useEffect(() => {
    if (!result.loading && result.data && restoreScroll.current > 0) {
      const scroll = restoreScroll.current; restoreScroll.current = 0;
      requestAnimationFrame(() => window.scrollTo(0, scroll));
    }
  }, [result.loading, result.data]);
  return <div className="ops-task-preview"><div className="ops-card-head"><h3>任务内容</h3><div className="ops-actions"><button onClick={() => setRefresh((n) => n + 1)}>刷新任务内容</button><button onClick={() => open(id)}>进入详情与运营跟进 →</button></div></div><State {...result} retry={() => setRefresh((n) => n + 1)}>{result.data?.task && <TaskContent task={result.data.task} apiBase={apiBase} />}</State></div>;
}
