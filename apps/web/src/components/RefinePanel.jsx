import { useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, ImagePlus, Loader2, RefreshCcw, Send, Settings2, Upload, X } from 'lucide-react';
import { formatErrorMessage } from '../utils';
import AspectRatioPicker from './AspectRatioPicker';
import InputOptimizationFieldActions from './InputOptimizationFieldActions';
import ResultFigure from './ResultFigure';
import StageTimeline from './StageTimeline';
import StatusBadge from './StatusBadge';
import Select from './Select';

export default function RefinePanel({
  source = {}, upload = {}, uploadLimits, uploadEnabled, capability, instruction, imageSize, resolutionOptions = [],
  aspectRatio, aspectRatioOptions = [], settingsSummary, canSubmit, submitHint, isSubmitting, error, job, pollError,
  apiBase, optimizationSupported, optimizationDisabledReason, optimizationHasUndo, optimizationGuidance,
  onOptimize, onRestore, onInstructionChange, onImageSizeChange, onAspectRatioChange, onOpenSettings,
  onSubmit, onUpload, onRetryUpload, onRemoveSource, onOpenRecords, onOpenGenerate, onUseForRefine,
}) {
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
    <section className="refine-panel" aria-label="精修图片工作区">
      <form className="refine-form" onSubmit={onSubmit}>
        <div className="section-head"><ImagePlus size={20} /><div><h2>精修图片</h2><p>保留原图，按你的指令调整细节。</p></div></div>
        <section className="refine-step" aria-labelledby="refine-source-title">
          <div className="refine-step-head"><h3 id="refine-source-title"><span>1</span>选择原图</h3>
            {source.url ? <div className="refine-source-actions"><button type="button" disabled={!allowUpload} onClick={chooseFile}><RefreshCcw size={14} />替换</button><button type="button" aria-label="移除原图" disabled={running} onClick={onRemoveSource}><X size={15} /></button></div> : null}
          </div>
          <input ref={fileInput} className="sr-only" type="file" tabIndex={-1} aria-label="上传精修原图" accept={uploadLimits?.mimeTypes?.join(',') || 'image/png,image/jpeg,image/webp'} disabled={!allowUpload}
            onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ''; onUpload(files); }} />
          <div className={`refine-dropzone${dragging ? ' dragging' : ''}${source.url ? ' has-source' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); if (allowUpload && Array.from(event.dataTransfer.types).includes('Files')) { dragDepth.current += 1; setDragging(true); } }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = allowUpload ? 'copy' : 'none'; }}
            onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragging(false); if (allowUpload) onUpload(Array.from(event.dataTransfer.files)); }}>
            {source.url ? <figure className="refine-original"><img src={source.url} alt="待精修原图" /><figcaption>{source.filename || '来自任务结果'}{source.width ? ` · ${source.width} × ${source.height}` : ''}</figcaption></figure>
              : <button className="refine-upload-button" type="button" disabled={!allowUpload} onClick={chooseFile}><Upload size={26} /><strong>点击上传或拖拽图片到这里</strong><span>{uploadEnabled ? `PNG / JPG / WebP · 最大 ${(uploadLimits.maxBytes / 1024 / 1024).toFixed(1)} MB` : '连接支持上传精修的后端后即可上传'}</span></button>}
            {dragging ? <div className="refine-drop-overlay">松开以上传原图</div> : null}
          </div>
          {statusLabel ? <div className={`refine-upload-status ${upload.status}`} role="status">{uploading ? <Loader2 className="spin" size={14} /> : upload.status === 'ready' ? <Check size={14} /> : null}{statusLabel}{upload.status === 'uploading' ? <progress aria-label="原图上传进度" max="100" value={upload.progress || 0} /> : null}</div> : null}
          {upload.error ? <div className="refine-upload-error" role="alert"><span>{formatErrorMessage(upload.error)}</span>{upload.status === 'failed' ? <button type="button" disabled={running} onClick={onRetryUpload}>重新上传</button> : null}</div> : null}
          <div className="refine-source-links"><span>也可从</span><button type="button" disabled={running} onClick={onOpenGenerate}>生成结果</button><span>或</span><button type="button" disabled={running} onClick={onOpenRecords}>任务记录</button><span>选择原图</span></div>
        </section>
        <section className="refine-step">
          <div className="refine-step-head input-field-head"><h3><span>2</span><label id="refine-instruction-label" htmlFor="refine-instruction">精修指令</label></h3>
            {optimizationSupported ? <InputOptimizationFieldActions target="editInstruction" disabledReason={optimizationDisabledReason} hasUndo={optimizationHasUndo} onOptimize={onOptimize} onRestore={onRestore} /> : null}
          </div>
          <textarea id="refine-instruction" value={instruction} onChange={(event) => onInstructionChange(event.target.value)} rows={4} maxLength={2000} disabled={running}
            placeholder="例如：放大标签，让箭头更清晰；保留原有文字、配色和布局。" />
          <div className="refine-instruction-foot"><span>写清要修改的内容，以及需要保留的部分。</span><span>{instruction.length} / 2000</span></div>
          {optimizationGuidance ? <p className="refine-upload-error" role="alert">{optimizationGuidance}</p> : null}
        </section>
        <section className="refine-step refine-parameters" aria-labelledby="refine-parameters-title">
          <div className="refine-step-head"><h3 id="refine-parameters-title"><span>3</span>调整参数</h3><button type="button" className="refine-settings-button" disabled={running} onClick={onOpenSettings}><Settings2 size={15} />精修设置</button></div>
          <div className="refine-model-line" aria-label="精修模型路由"><span title={settingsSummary}>{settingsSummary}</span><small title={capability?.reason}>{capability?.directEdit ? '直接编辑' : capability?.mode === 'analyze-redraw' ? '分析后重绘' : '暂不支持精修'}</small></div>
          <fieldset className="refine-parameter-fields" disabled={running}>
            {resolutionOptions.length ? <Select label="清晰度" value={imageSize} onChange={onImageSizeChange} options={resolutionOptions} /> : <p className="refine-resolution-unavailable" role="status">当前模型没有可用精修清晰度，请在精修设置中更换。</p>}
            <AspectRatioPicker label="目标比例" value={aspectRatio} onChange={onAspectRatioChange} options={aspectRatioOptions} compact maxVisible={12} />
          </fieldset>
        </section>
        <div className="refine-submit-area"><button className="primary-button" type="submit" disabled={!canSubmit}>{running ? <Loader2 className="spin" size={18} /> : <Send size={18} />}{running ? '正在精修…' : '提交精修'}</button>
          {submitHint && !error ? <p className="refine-submit-hint">{submitHint}</p> : null}
          {error ? <div className="error-line" role="alert"><AlertTriangle size={16} />{formatErrorMessage(error)}</div> : null}
        </div>
      </form>
      <section className="refine-result" aria-labelledby="refine-result-title">
        <div className="refine-result-head"><h2 id="refine-result-title">精修结果</h2>{job ? <StatusBadge status={job.status} /> : <span>提交后在这里查看</span>}</div>
        {running ? <div className="refine-processing" role="status"><Loader2 className="spin" size={20} /><div><strong>{job?.status === 'running' ? '正在调整图片细节' : '正在提交与等待处理'}</strong><p>原图保持不变，完成后会自动显示精修结果。</p></div></div> : null}
        {pollError ? <p className="error-line" role="alert">{formatErrorMessage(pollError)}</p> : null}
        {job?.error ? <p className="error-line" role="alert">{formatErrorMessage(job.error)}</p> : null}
        {images.length ? <div className="refine-output-images">{images.map((image, index) => <ResultFigure key={image.filename || index} image={image} apiBase={apiBase} outputFormat={job.output_format} labelPrefix="精修结果" onUseForRefine={onUseForRefine} />)}</div>
          : <div className={`refine-result-empty${running ? ' processing' : ''}`}><ImagePlus size={38} /><h3>{running ? '精修结果生成中' : job?.status === 'failed' ? '本次精修未完成' : '让原图更接近你的想法'}</h3><p>{running ? '完成后会在这里显示，可下载或继续精修。' : job?.status === 'failed' ? '原图和指令已保留，可调整设置后重新提交。' : '选择一张原图，写下修改要求，再提交精修。'}</p>{!job && !running ? <div><span>选择原图</span><ArrowRight size={14} /><span>描述修改</span><ArrowRight size={14} /><span>查看结果</span></div> : null}</div>}
        {job?.stages?.length ? <details className="refine-process-details"><summary>查看处理过程</summary><StageTimeline job={job} apiBase={apiBase} /></details> : null}
      </section>
    </section>
  );
}
