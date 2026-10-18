import FigureReferencePreferences from '../components/FigureReferencePreferences.jsx';
import WorkspaceRefineControls from './WorkspaceRefineControls.jsx';
import WorkspaceReferences from './WorkspaceReferences.jsx';
import {buildAspectRatioOptions,CANONICAL_ASPECT_RATIOS} from '../lib/aspectRatios.js';
import RatioCanvas from './RatioCanvas.jsx';
import FigureTypePicker from '../components/FigureTypePicker.jsx';
import JournalRulePicker from '../components/JournalRulePicker.jsx';
import { modelOption } from './workspaceModels.js';
import WorkflowOptions from '../components/WorkflowOptions.jsx';
import { journalSelectionForFigure, journalFigureContent } from '../../../../packages/api/src/journal-rules.js';

export default function WorkspaceDrawingSettings({ draft, path, editing, models, target, userId, base, onChange }) {
  const settings = draft.settings[draft.mode], advanced = draft.mode === 'advanced';
  const image = settings.models?.image;
  const entry = models.library?.models.find(m => m.id === image?.libraryModelId);
  const model = entry ? modelOption(entry, models.library, models.registry, 'image', path, editing, models.summary?.tokenDance).model : models.registry?.providers?.[image?.accessProvider]?.models.find(m => m.id === image?.modelId);
  const resolutions = editing ? model?.capabilities?.refineResolutions : model?.capabilities?.resolutions;
  const ratioOptions=path==='svg'?['auto',...CANONICAL_ASPECT_RATIOS]:model?buildAspectRatioOptions({capabilities:model.capabilities,capabilityField:editing?'refineAspectRatios':'aspectRatios',resolution:settings.imageSize||'auto'}).map(o=>o.value):['auto','16:9','4:3','1:1','3:4'];
  const update = (key, value) => onChange({ ...settings, [key]: value });
  return <>
    <section className="tw-settings-section"><h3>内容与规范</h3>
      <FigureTypePicker value={settings.figureTypeId || ''} onChange={figureTypeId => onChange({ ...settings, figureTypeId, journalSelection: journalSelectionForFigure(settings.journalSelection, figureTypeId) || null })}/>
      <JournalRulePicker backdropClassName="tw-nested-backdrop" value={settings.journalSelection || null} onChange={value => update('journalSelection', value)} figureTypeId={settings.figureTypeId} refineContext={editing ? { hasSource: true, contentType: settings.journalSelection?.contentType || journalFigureContent(settings.figureTypeId) || 'schematic' } : undefined} outputFormat={path}/>
    </section>
    <section className="tw-settings-section"><h3>画面</h3><label className="tw-setting-row">比例<select value={settings.ratio} onChange={e => update('ratio', e.target.value)}>{!ratioOptions.includes(settings.ratio)&&<option value={settings.ratio} disabled>{settings.ratio} · 当前模型尚未确认支持</option>}{ratioOptions.map(value => <option key={value} value={value}>{value === 'auto' ? '自动' : value}</option>)}</select></label><RatioCanvas ratio={settings.ratio} compact/>
      {path === 'png' && (advanced && resolutions?.length ? <label className="tw-setting-row">清晰度<select value={settings.imageSize || ''} onChange={e => update('imageSize', e.target.value)}><option value="">沿用模型默认</option>{settings.imageSize && !resolutions.includes(settings.imageSize) && <option value={settings.imageSize} disabled>{settings.imageSize} · 当前模型不适用</option>}{resolutions.map(size => <option key={size}>{size}</option>)}</select></label> : <p className="tw-muted">清晰度：{settings.imageSize || '沿用所选模型默认'}{!model ? '，选择绘图模型后显示可用选项。' : '。'}</p>)}
    </section>
    {!editing && <section className="tw-settings-section"><h3>生成方式</h3>{advanced ? <><label className="tw-setting-row">图库检索<select value={settings.retrievalSetting || 'auto'} onChange={e => update('retrievalSetting', e.target.value)}><option value="auto">自动检索</option><option value="none">不检索</option><option value="random">随机参考</option><option value="manual">手动选择参考</option></select></label>{settings.retrievalSetting==='manual'&&<WorkspaceReferences selectedIds={settings.manualReferenceIds} onChange={value=>update('manualReferenceIds',value)}/>}<FigureReferencePreferences mode={settings.retrievalSetting||'auto'} draft={{analysis:{referencePreferences:settings.referencePreferences}}} onChange={value=>update('referencePreferences',value.analysis.referencePreferences)}/><WorkflowOptions value={settings.pipelineMode || 'full'} onChange={value => update('pipelineMode', value)} body={{generationPath:'model-v1',outputFormat:path,maxCriticRounds:settings.reviews}}/></> : <p>普通预设：{{none:'不检索',auto:'自动检索',random:'随机参考',manual:'手动参考'}[settings.retrievalSetting || 'auto']} · {settings.pipelineMode === 'planner_critic' ? '快速生成' : '完整生成'}。上传材料与图库检索相互独立。</p>}</section>}
    <section className="tw-settings-section"><h3>候选与评审</h3>{editing&&path==='png'?<p>单张精修并执行结果评审，沿用现有精修流程；生成时的候选数量与评审轮数不应用于本次精修。</p>:advanced ? <>{!editing && <label className="tw-setting-row">候选数量<select value={settings.candidates} onChange={e => update('candidates', Number(e.target.value))}>{[1,2,3,4,5,6].map(n => <option key={n}>{n}</option>)}</select></label>}<label className="tw-setting-row">评审轮数<select value={settings.reviews} onChange={e => update('reviews', Number(e.target.value))}>{settings.reviews===0&&<option value={0} disabled>0 · 当前流程至少需要 1 轮</option>}{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label></> : <p>{editing ? '修改所选版本' : `${settings.candidates} 个候选`} · {settings.reviews} 轮评审</p>}</section>
    {editing&&path==='png'&&<WorkspaceRefineControls key={target?.id||draft.attachments.find(a=>a.purpose==='source')?.id} settings={settings} model={model} target={target} source={draft.attachments.find(a=>a.purpose==='source')} userId={userId} base={base} onChange={onChange}/>}
  </>;
}
