import { AlertTriangle, ImagePlus, Loader2, Send, Settings2 } from 'lucide-react';
import { formatErrorMessage } from '../utils';
import JobStatus from './JobStatus';
import Select from './Select';

export default function RefinePanel({
  sourceUrl,
  sourceObjectKey,
  capability,
  instruction,
  imageSize,
  resolutionOptions = [],
  aspectRatio,
  settingsSummary,
  canSubmit,
  isSubmitting,
  error,
  job,
  apiBase,
  onInstructionChange,
  onImageSizeChange,
  onAspectRatioChange,
  onOpenSettings,
  onSubmit,
}) {
  return (
    <section className="refine-panel">
      <form className="refine-form" onSubmit={onSubmit}>
        <div className="section-head">
          <ImagePlus size={20} />
          <div>
            <h2>精修图片</h2>
            <p>从“生成结果”或“任务记录”选择本人图片，再描述需要调整的内容。</p>
          </div>
        </div>
        {sourceUrl ? (
          <figure className="refine-source-preview">
            <img src={sourceUrl} alt="已选择的待精修图片" />
            <figcaption>已选择本人任务中的结果图；如需更换，请返回生成结果或任务记录重新选择。</figcaption>
          </figure>
        ) : (
          <div className="refine-source-empty">尚未选择图片。请从“生成结果”或“任务记录”点击“精修”。</div>
        )}
        <div className={`refine-capability ${capability?.mode || 'none'}`}>
          <strong>{capability?.directEdit ? '直接编辑' : capability?.mode === 'analyze-redraw' ? '分析后重绘' : '当前模型不支持精修'}</strong>
          <span>{capability?.directEdit ? '所选图像模型会直接接收源图。' : capability?.mode === 'analyze-redraw' ? '系统先分析源图，再依据指令重新绘制。' : '请在生成设置中选择支持精修的图像模型。'}</span>
          {sourceObjectKey ? <small>已锁定任务源文件，签名链接仅用于预览。</small> : null}
        </div>
        <div className="refine-routing-summary" aria-label="精修模型路由">
          <div><span>当前精修路由</span><strong>{settingsSummary}</strong></div>
          <button type="button" className="generation-settings-trigger" onClick={onOpenSettings}><Settings2 size={17} /> 精修设置</button>
        </div>
        <label className="field">
          <span>精修指令</span>
          <textarea value={instruction} onChange={(event) => onInstructionChange(event.target.value)} rows={8} placeholder="例如：放大标签、减少装饰、让流程箭头更清晰。" />
        </label>
        <div className="settings-grid">
          <Select label="目标比例" value={aspectRatio} onChange={onAspectRatioChange} options={[
            ['16:9', '16:9'],
            ['21:9', '21:9'],
            ['3:2', '3:2'],
            ['1:1', '1:1'],
          ]} />
          {resolutionOptions.length ? (
            <Select label="清晰度" value={imageSize} onChange={onImageSizeChange} options={resolutionOptions} />
          ) : (
            <div className="field refine-resolution-unavailable" role="status" aria-label="精修清晰度不可用">
              <span>精修清晰度不可用</span>
              <small>当前图像模型未声明可执行的精修清晰度，请在精修设置中更换模型。</small>
            </div>
          )}
        </div>
        <button className="primary-button" type="submit" disabled={!canSubmit}>
          {isSubmitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          提交精修
        </button>
        {error ? <div className="error-line"><AlertTriangle size={16} /> {formatErrorMessage(error)}</div> : null}
      </form>
      <div className="refine-result">
        <JobStatus job={job} apiBase={apiBase} />
      </div>
    </section>
  );
}
