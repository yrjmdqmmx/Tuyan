import { useAppLocale } from './BenchmarkLocale.jsx'
import { useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, ImagePlus, Loader2, RefreshCcw, Send, Settings2, Upload, X } from 'lucide-react';
import { formatErrorMessage } from '../utils';
import AspectRatioPicker from './AspectRatioPicker';
import InputOptimizationFieldActions from './InputOptimizationFieldActions';
import ResultFigure from './ResultFigure';
import StageTimeline from './StageTimeline';
import StatusBadge from './StatusBadge';
import Select from './Select';
import ReferenceUploadPanel from './ReferenceUploadPanel';
import RefineMaskEditor from './RefineMaskEditor';

export default function RefinePanel({
  controls, references, referencePolicy, mask, onMaskChange, structuredEnabled, onStructuredEnabledChange, structured, onStructuredChange, controlsIssue,
  source = {}, upload = {}, uploadLimits, uploadEnabled, capability, instruction, imageSize, resolutionOptions = [],
  aspectRatio, aspectRatioOptions = [], settingsSummary, canSubmit, submitHint, isSubmitting, error, job, pollError,
  apiBase, optimizationSupported, optimizationDisabledReason, optimizationHasUndo, optimizationGuidance,
  onOptimize, onRestore, onInstructionChange, onImageSizeChange, onAspectRatioChange, onOpenSettings,
  onSubmit, onUpload, onRetryUpload, onRemoveSource, onOpenRecords, onOpenGenerate, onUseForRefine,
}) {
  const { t } = useAppLocale()
  const fileInput = useRef(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const uploading = ['validating', 'uploading', 'checking'].includes(upload.status);
  const running = isSubmitting || job?.status === 'running' || job?.status === 'queued';
  const images = job?.result_images || [];
  const statusLabel = { validating: '正在读取图片…', uploading: `正在上传 ${upload.progress || 0}%`, checking: '上传完成，正在校验图片…', ready: '原图已就绪', failed: '上传未完成' }[upload.status];
  const chooseFile = () => fileInput.current?.click();
  const allowUpload = uploadEnabled && !running;

  return (
    <section className="refine-panel" aria-label={t("精修图片工作区")}>
      <form className="refine-form" onSubmit={onSubmit}>
        <div className="section-head"><ImagePlus size={20} /><div><h2>{t("精修图片")}</h2><p>{t("保留原图，按你的指令调整细节。")}</p></div></div>
        <section className="refine-step" aria-labelledby="refine-source-title">
          <div className="refine-step-head"><h3 id="refine-source-title"><span>1</span>{t("选择原图")}</h3>
            {source.url ? <div className="refine-source-actions"><button type="button" disabled={!allowUpload} onClick={chooseFile}><RefreshCcw size={14} />{t("替换")}</button><button type="button" aria-label={t("移除原图")} disabled={running} onClick={onRemoveSource}><X size={15} /></button></div> : null}
          </div>
          <input ref={fileInput} className="sr-only" type="file" tabIndex={-1} aria-label={t("上传精修原图")} accept={uploadLimits?.mimeTypes?.join(',') || 'image/png,image/jpeg,image/webp'} disabled={!allowUpload}
            onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ''; onUpload(files); }} />
          <div className={`refine-dropzone${dragging ? ' dragging' : ''}${source.url ? ' has-source' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); if (allowUpload && Array.from(event.dataTransfer.types).includes('Files')) { dragDepth.current += 1; setDragging(true); } }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = allowUpload ? 'copy' : 'none'; }}
            onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragging(false); if (allowUpload) onUpload(Array.from(event.dataTransfer.files)); }}>
            {source.url ? <figure className="refine-original"><img src={source.url} alt={t("待精修原图")} /><figcaption>{t(source.filename || '来自任务结果')}{source.width ? ` · ${source.width} × ${source.height}` : ''}</figcaption></figure>
              : <button className="refine-upload-button" type="button" disabled={!allowUpload} onClick={chooseFile}><Upload size={26} /><strong>{t("点击上传或拖拽图片到这里")}</strong><span>{t(uploadEnabled ? `PNG / JPG / WebP · 最大 ${(uploadLimits.maxBytes / 1024 / 1024).toFixed(1)} MiB` : '连接支持上传精修的后端后即可上传')}</span></button>}
            {dragging ? <div className="refine-drop-overlay">{t("松开以上传原图")}</div> : null}
          </div>
          {uploadLimits?.processingHint ? <details className="reference-processing-details"><summary>{t("模型限制与图片处理")}</summary><p className="reference-processing-note">{uploadLimits.processingHint}</p></details> : null}
          {statusLabel ? <div className={`refine-upload-status ${upload.status}`} role="status">{uploading ? <Loader2 className="spin" size={14} /> : upload.status === 'ready' ? <Check size={14} /> : null}{t(statusLabel)}{upload.status === 'uploading' ? <progress aria-label={t("原图上传进度")} max="100" value={upload.progress || 0} /> : null}</div> : null}
          {upload.error ? <div className="refine-upload-error" role="alert"><span>{formatErrorMessage(upload.error)}</span>{upload.status === 'failed' ? <button type="button" disabled={running} onClick={onRetryUpload}>{t("重新上传")}</button> : null}</div> : null}
          <div className="refine-source-links"><span>{t("也可从")}</span><button type="button" disabled={running} onClick={onOpenGenerate}>{t("生成结果")}</button><span>{t("或")}</span><button type="button" disabled={running} onClick={onOpenRecords}>{t("任务记录")}</button><span>{t("选择原图")}</span></div>
        </section>
        {references && referencePolicy ? <section className="refine-step" aria-label={t("辅助参考图与编辑控制")}>
          <ReferenceUploadPanel title={t("辅助参考图")} images={references.images} policy={referencePolicy} disabled={running} uploadBlocked={!controls || referencePolicy.maxCount === 0} isUploading={references.busy} error={references.error} onAddFiles={references.add} onRemove={references.remove} onPurposeChange={references.update} help={t("原图是修改对象；辅助图按所选用途一同传给最终编辑模型。")} processingHint={`原图占用 1 个模型图片名额，当前最多 ${referencePolicy.maxCount} 张辅助图。提交前只校正方向并转为无损 PNG；不自动缩小、截断或有损压缩。超限将保留输入并阻止提交。SVG 会栅格化，文字需转曲；不是矢量对象编辑。单张提交额度 ${(referencePolicy.submission.maxBytes/1048576).toFixed(1)} MiB。`}/>
          {!controls ? <p className="refine-submit-hint">{t("当前型号尚未接入辅助参考图、遮罩或结构化控制；已有输入保留。")}</p> : <p className="refine-submit-hint">{t("模型总名额 ")}{controls.maxImages}{t(" 张，包含待精修原图。")}{t(controls.mask ? '遮罩仅限一张原图，不能同时使用辅助参考图。' : '')}</p>}
          {controls?.mask && source.url ? <RefineMaskEditor source={source} value={mask} onChange={onMaskChange} disabled={running}/> : mask ? <p>{t("遮罩已保留，当前模型不能提交。")}<button type="button" disabled={running} onClick={()=>onMaskChange(null)}>{t("清除遮罩")}</button></p> : null}
          {controls?.structured || structuredEnabled ? <div className="refine-structured">
            <label><input type="checkbox" checked={structuredEnabled} disabled={running || !controls?.structured && !structuredEnabled} onChange={event=>onStructuredEnabledChange(event.target.checked)}/>{t("使用原生结构化编辑")}</label>
            {structuredEnabled ? <><p>{t("将对象、属性和关系映射到 BRIA 的正式结构化字段；结果仍是像素图，文字、箭头不会成为独立可编辑对象。")}</p><div className="refine-structured-fields">{[['object','修改对象','例如：流程图右侧的对照组节点'],['attributes','目标属性','例如：蓝色边框，标签更大'],['relationship','对象关系','例如：保留与上游节点的箭头连接'],['preserve','保留约束','例如：所有数值、文字内容与其余节点位置']].map(([key,label,placeholder])=><label key={key}>{t(label)}<textarea aria-label={t(label)} value={structured[key]} maxLength={500} rows={2} placeholder={placeholder} disabled={running || !controls?.structured} onChange={event=>onStructuredChange({...structured,[key]:event.target.value})}/></label>)}</div></> : null}
          </div> : null}
          {controlsIssue ? <p className="refine-upload-error" role="alert">{controlsIssue}</p> : null}
        </section> : null}
        <section className="refine-step">
          <div className="refine-step-head input-field-head"><h3><span>2</span><label id="refine-instruction-label" htmlFor="refine-instruction">{t("精修指令")}</label></h3>
            {optimizationSupported ? <InputOptimizationFieldActions target="editInstruction" disabledReason={optimizationDisabledReason} hasUndo={optimizationHasUndo} onOptimize={onOptimize} onRestore={onRestore} /> : null}
          </div>
          <textarea id="refine-instruction" value={instruction} onChange={(event) => onInstructionChange(event.target.value)} rows={4} maxLength={2000} disabled={running}
            placeholder={t("例如：放大标签，让箭头更清晰；保留原有文字、配色和布局。")} />
          <div className="refine-instruction-foot"><span>{t("写清要修改的内容，以及需要保留的部分。")}</span><span>{instruction.length} / 2000</span></div>
          {optimizationGuidance ? <p className="refine-upload-error" role="alert">{optimizationGuidance}</p> : null}
        </section>
        <section className="refine-step refine-parameters" aria-labelledby="refine-parameters-title">
          <div className="refine-step-head"><h3 id="refine-parameters-title"><span>3</span>{t("调整参数")}</h3><button type="button" className="refine-settings-button" disabled={running} onClick={onOpenSettings}><Settings2 size={15} />{t("精修设置")}</button></div>
          <div className="refine-model-line" aria-label={t("精修模型路由")}><span title={settingsSummary}>{settingsSummary}</span><small title={capability?.reason}>{t(capability?.directEdit ? '直接编辑' : capability?.mode === 'analyze-redraw' ? '分析后重绘' : '暂不支持精修')}</small></div>
          <fieldset className="refine-parameter-fields" disabled={running}>
            {resolutionOptions.length ? <Select label={t("清晰度")} value={imageSize} onChange={onImageSizeChange} options={resolutionOptions} /> : <p className="refine-resolution-unavailable" role="status">{t("当前模型没有可用精修清晰度，请在精修设置中更换。")}</p>}
            <AspectRatioPicker label={t("目标比例")} value={aspectRatio} onChange={onAspectRatioChange} options={aspectRatioOptions} compact maxVisible={12} />
          </fieldset>
          {controls?.autoAspectRatio && aspectRatio === 'auto' ? <p className="refine-submit-hint">{t("此型号的自动比例按 ")}{controls.autoAspectRatio}{t(" 输出；需要保持原图长宽比时，请手动选择相应比例。")}</p> : null}
        </section>
        <div className="refine-submit-area"><button className="primary-button" type="submit" disabled={!canSubmit}>{running ? <Loader2 className="spin" size={18} /> : <Send size={18} />}{t(running ? '正在精修…' : '提交精修')}</button>
          {submitHint && !error ? <p className="refine-submit-hint">{submitHint}</p> : null}
          {error ? <div className="error-line" role="alert"><AlertTriangle size={16} />{formatErrorMessage(error)}</div> : null}
        </div>
      </form>
      <section className="refine-result" aria-labelledby="refine-result-title">
        <div className="refine-result-head"><h2 id="refine-result-title">{t("精修结果")}</h2>{job ? <StatusBadge status={job.status} /> : <span>{t("提交后在这里查看")}</span>}</div>
        {running ? <div className="refine-processing" role="status"><Loader2 className="spin" size={20} /><div><strong>{t(job?.status === 'running' ? '正在调整图片细节' : '正在提交与等待处理')}</strong><p>{t("原图保持不变，完成后会自动显示精修结果。")}</p></div></div> : null}
        {pollError ? <p className="error-line" role="alert">{formatErrorMessage(pollError)}</p> : null}
        {job?.error ? <p className="error-line" role="alert">{formatErrorMessage(job.error)}</p> : null}
        {images.length ? <div className="refine-output-images">{images.map((image, index) => <ResultFigure key={image.filename || index} image={image} apiBase={apiBase} outputFormat={job.output_format} labelPrefix="精修结果" onUseForRefine={onUseForRefine} />)}</div>
          : <div className={`refine-result-empty${running ? ' processing' : ''}`}><ImagePlus size={38} /><h3>{t(running ? '精修结果生成中' : job?.status === 'failed' ? '本次精修未完成' : '让原图更接近你的想法')}</h3><p>{t(running ? '完成后会在这里显示，可下载或继续精修。' : job?.status === 'failed' ? job?.recovery?.canResume ? '原图和指令已保留，请使用上方任务恢复入口。' : '原图和指令已保留。若调用结果或费用未知，请先核对渠道记录，勿重复提交。' : '选择一张原图，写下修改要求，再提交精修。')}</p>{!job && !running ? <div><span>{t("选择原图")}</span><ArrowRight size={14} /><span>{t("描述修改")}</span><ArrowRight size={14} /><span>{t("查看结果")}</span></div> : null}</div>}
        {job?.providerCalls?.length ? <details className="refine-process-details"><summary>{t("调用用量与费用记录")}</summary>{job.providerCalls.map((call,index)=><div key={index}><p>{t(call.provider || call.channel || '渠道')} · {t(call.model || call.requestedModel || '型号待确认')}{t(" · 请求 ")}{t(call.requestId || '待确认')}</p><p>{t("公开单价：")}{t(call.publicPrice?.amount ?? '待确认')}{t("；估算费用：")}{t(call.estimatedCost?.amount ?? '未估算')}{t("；渠道返回费用：")}{t(call.reportedCost ? `${call.reportedCost.amount} ${call.reportedCost.currency}` : '未返回')}{t("；已核对账单：")}{t(call.invoiceCost?.amount ?? '待确认')}。</p>{call.usage ? <p>{t("渠道用量：")}{JSON.stringify(call.usage)}</p> : null}{call.structuredInstruction ? <details><summary>{t("查看模型返回的结构化指令")}</summary><pre>{JSON.stringify(call.structuredInstruction,null,2)}</pre></details> : null}</div>)}</details> : null}
        {job?.stages?.length ? <details className="refine-process-details"><summary>{t("查看处理过程")}</summary><StageTimeline job={job} apiBase={apiBase} /></details> : null}
      </section>
    </section>
  );
}
