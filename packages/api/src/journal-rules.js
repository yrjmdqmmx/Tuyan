import {JOURNALS,JOURNAL_ARCHIVES,JOURNAL_SOURCES,JOURNAL_VERSION} from './journal-catalog.js';
import {FIGURE_TYPES} from '../../figure-taxonomy/src/catalog.js';
export {JOURNALS,JOURNAL_VERSION,JOURNAL_SOURCES};
export const JOURNAL_STAGES = {initial:'初次投稿',revision:'修改稿',production:'录用后制作'};
export const JOURNAL_PURPOSES = {main:'正文图',supplementary:'补充图',graphical_abstract:'图形摘要',toc:'TOC 图',cover:'封面'};
export const JOURNAL_CONTENT = {schematic:'普通示意图',data:'数据图',primary:'原始科研图像',illustration:'艺术性插图'};
export const JOURNAL_LEVELS = {hard:'官方要求',recommendation:'官方建议',manual:'人工判断',unspecified:'未规定',pending:'待确认',conflict:'来源冲突'};
export const JOURNAL_STATUS = {supported:'已支持',partial:'部分支持',pending:'待核实'};
export function journalError(message) { const e = new Error(message); e.name='JournalRuleError'; e.businessCode='JOURNAL_RULE_CONFLICT'; e.statusCode=400; throw e; }
export function defaultJournalSelection(id) {
  const journal=JOURNALS.find(item=>item.id===id);
  return journal ? {journalId:id,version:JOURNAL_VERSION,stage:'initial',purpose:'main',contentType:'schematic',widthMm:journal.defaults.widthMm,rasterKind:'color'} : null;
}
// This is a task classification, not proof that an image contains no research evidence.
// Composite figures may contain data panels, so retain the numeric-review notice.
export function journalFigureContent(figureTypeId) {
  const type=FIGURE_TYPES.find(item=>item.id===figureTypeId);
  return type ? (['data','composite'].includes(type.kind)?'data':'schematic') : null;
}
export function journalSelectionForFigure(input,figureTypeId) {
  if(input?.contentSource!=='figure-type'||!figureTypeId)return input;
  if(['primary','illustration'].includes(input.contentType)){
    const {contentSource,figureTypeId:previousType,...manual}=input;
    return manual;
  }
  const contentType=journalFigureContent(figureTypeId);
  if(!contentType)journalError('无法识别当前信息图类别，请重新选择图型或确认图像性质。');
  if(input.contentType===contentType&&input.figureTypeId===figureTypeId)return input;
  return {...input,contentType,figureTypeId};
}
export function journalSnapshot(input) {
  if (input == null) return null;
  if (typeof input!=='object'||Array.isArray(input)) journalError('期刊选择格式无效，请重新选择。');
  const catalog=typeof input.version==='string'&&Object.hasOwn(JOURNAL_ARCHIVES,input.version)?JOURNAL_ARCHIVES[input.version]:null;
  const journal=catalog?.journals.find(item=>item.id===input.journalId);
  if (!journal) journalError('此期刊规则版本不可用；保留原选择，请明确选择可用版本后再提交。');
  if (!Object.hasOwn(JOURNAL_STAGES,input.stage)||!Object.hasOwn(JOURNAL_PURPOSES,input.purpose)||!Object.hasOwn(JOURNAL_CONTENT,input.contentType)||!['color','grayscale','lineart'].includes(input.rasterKind)) journalError('期刊的投稿阶段、用途或内容类型无效。');
  const widthMm=Number(input.widthMm);
  if(!Number.isFinite(widthMm)||widthMm<10||widthMm>1000)journalError('请指定 10–1000 mm 范围内的最终排版宽度。');
  const selection={journalId:journal.id,version:journal.version,stage:input.stage,purpose:input.purpose,contentType:input.contentType,rasterKind:input.rasterKind,widthMm};
  if(input.contentSource!==undefined){
    if(input.contentSource!=='figure-type'||!journalFigureContent(input.figureTypeId)||journalFigureContent(input.figureTypeId)!==input.contentType)journalError('期刊图像性质与信息图类别不一致，请重新确认。');
    Object.assign(selection,{contentSource:'figure-type',figureTypeId:input.figureTypeId});
  }
  return structuredClone({...journal,selection,sources:journal.sourceIds.map(id=>catalog.sources[id]),snapshotSchema:1});
}
export function activeJournalRules(snapshot,format) {
  if(!snapshot)return [];
  const s=snapshot.selection;
  // The production-only Frontiers format extends, rather than intersects, its earlier format list.
  return snapshot.rules.filter(rule=>(!format||!rule.applicability.formats||rule.applicability.formats.includes(format))&&(!rule.applicability.rasterKinds||rule.applicability.rasterKinds.includes(s.rasterKind))&&(!rule.applicability.contentTypes||rule.applicability.contentTypes.includes(s.contentType))&&(!rule.applicability.stages||rule.applicability.stages.includes(s.stage))&&(!rule.applicability.purposes||rule.applicability.purposes.includes(s.purpose))&&!(rule.id==='frontiers-format'&&s.stage==='production'));
}
export function journalPolicyIssues(snapshot,operation) {
  if(!snapshot)return [];
  const {selection:s}=snapshot,issues=[];
  if (s.contentType==='primary') issues.push({code:'primary-unsupported',blocking:true,kind:'capability',text:'当前生成/精修会改写图像，不能作为原始科研图像处理工具；请保留原始证据，使用适合的科研图像工作流。'});
  if(snapshot.version==='2026-10-13.v1') {
  if (['cell-reports','scientific-reports','ieee-access'].includes(snapshot.id)) issues.push({code:'ai-unverified',blocking:true,kind:'pending',text:'该期刊对当前 AI 图像操作的适用政策尚待确认，暂不能在此规则选择下生成或精修。可查看规则与检查已有文件；待政策核实后再执行。'});
  if(activeJournalRules(snapshot).some(rule=>rule.value?.blockAI))issues.push({code:'ai-use-restricted',blocking:true,kind:'policy',text:'ACS 不应将 AI 生成图用于 TOC/Abstract Graphic；本工作台的生成与精修均涉及生成式 AI，当前用途不可执行。'});
  // Only scopes actually verified as visual-generation permissions are enabled.
  if(['graphical_abstract','toc','cover'].includes(s.purpose)&&!(snapshot.id==='advanced-materials-interfaces'&&s.purpose==='toc')&&!issues.some(i=>i.code==='ai-use-restricted'))issues.push({code:'purpose-unverified',blocking:true,kind:'pending',text:'此特殊图件用途的 AI 许可或编辑条件尚未完整核实；当前只提供规则查看与文件检查。'});
  } else if(['2026-10-13.v3','2026-10-13.v4','2026-10-13.v5','2026-10-14.v6','2026-10-14.v7','2026-10-14.v8','2026-10-14.v9','2026-10-14.v10','2026-10-19.v11'].includes(snapshot.version)) {
    const rules=activeJournalRules(snapshot);
    const restrictions=rules.filter(r=>r.value?.blockAI&&r.requirement==='hard');
    for(const r of restrictions)issues.push({code:`policy-${r.id}`,blocking:true,kind:'policy',text:r.text});
    const assessments=rules.filter(r=>r.aiPolicy&&r.aiPolicy.operation!=='non-generative-edit');
    for(const r of assessments){
      const {operation:ruleOperation,status}=r.aiPolicy;
      // Unknown/conflicting permission is evidence to retain, not an invented publisher prohibition.
      issues.push({code:`policy-${r.id}`,blocking:status==='prohibited'&&(!operation||operation===ruleOperation),kind:status==='conflict'?'conflict':status==='conditional'?'manual':status==='prohibited'?'policy':'pending',text:r.text,operation:ruleOperation,policyStatus:status,sourceIds:r.sourceIds});
    }
    if(!restrictions.length&&!assessments.length&&!rules.some(r=>r.value?.allowAI))issues.push({code:'purpose-unverified',blocking:false,kind:'pending',text:'当前用途的 AI 条件尚未完整核实；这不是官方禁令，也不是许可证明，投稿适用性仍待确认。'});
  } else {
    const rules=activeJournalRules(snapshot);
    const restricted=rules.filter(r=>r.value?.blockAI);
    // A verified prohibition takes precedence over an unresolved general permission question.
    const hard=restricted.filter(r=>r.requirement==='hard');
    for(const r of hard.length?hard:restricted)issues.push({code:`policy-${r.id}`,blocking:true,kind:r.value.issueKind||'policy',text:r.text});
    if(!restricted.length&&!rules.some(r=>r.value?.allowAI))issues.push({code:'purpose-unverified',blocking:true,kind:'pending',text:'当前用途的 AI 操作条件尚未完整核实；可查看规则及检查已有文件，暂不能生成或精修。'});
  }
  if(s.contentType==='data')issues.push({code:'data-human-review',blocking:false,kind:'manual',text:'当前模型绘图不能保证数据、比例和统计量正确；请逐项对照原始数据。格式检查不验证数值真实性。'});
  return issues;
}
// A source disagreement about some alternatives must not invalidate agreed values.
export function journalWidthStatus(value,widthMm,content='unknown') {
  // Only actual file inspection may narrow the scope. An SVG extension is insufficient.
  if(content==='simple-vector'&&value.vectorOneOf)return value.vectorOneOf.some(n=>Math.abs(n-widthMm)<0.05)?'checked':'unmet';
  if(content==='raster'&&value.rasterOneOf)return value.rasterOneOf.some(n=>Math.abs(n-widthMm)<0.05)?'checked':'unmet';
  if(value.pendingOneOf?.some(n=>Math.abs(n-widthMm)<0.05))return 'pending';
  const fits=(!value.min||widthMm>=value.min)&&(!value.max||widthMm<=value.max)&&(!value.oneOf||value.oneOf.some(n=>Math.abs(n-widthMm)<0.05))&&(!value.ranges||value.ranges.some(([lo,hi])=>widthMm>=lo&&widthMm<=hi));
  return fits?'checked':'unmet';
}
export function journalPreflight(snapshot,outputFormat='png',operation) {
  if(!snapshot)return [];
  const issues=[...journalPolicyIssues(snapshot,operation)];
  const rules=activeJournalRules(snapshot,outputFormat);
  const format=rules.find(r=>r.field==='format'&&Array.isArray(r.value));
  if(format&&!format.value.includes('*')&&!format.value.includes(outputFormat)&&(format.openFormatList||format.pendingFormats?.includes(outputFormat)))issues.push({code:'format-unconfirmed',blocking:false,kind:'pending',text:`当前输出格式 ${outputFormat.toUpperCase()} 的接收条件待确认：${format.text}`});
  else if(format&&!format.value.includes('*')&&!format.value.includes(outputFormat))issues.push({code:'format-mismatch',blocking:false,kind:'format',text:outputFormat==='png'&&format.value.includes('tiff')?'当前生成 PNG，投稿前可选择保持像素的白底 TIFF 导出并检查。':'当前生成格式不在已核实接收列表内；需要外部处理或明确更改输出格式。本工具不会自动切换模型。'});
  const widthRule=rules.find(r=>r.field==='width'&&r.value&&['hard','recommendation'].includes(r.requirement));
  if(widthRule){const w=snapshot.selection.widthMm,status=journalWidthStatus(widthRule.value,w);
    if(status==='pending')issues.push({code:'width-unconfirmed',blocking:false,kind:'pending',text:`当前排版宽度 ${w} mm 的适用条件待确认：${widthRule.text}`});
    else if(status==='unmet')issues.push({code:'width-mismatch',blocking:false,kind:'dimensions',text:`当前排版宽度 ${w} mm 与这条规则不符：${widthRule.text} 可调整排版宽度；保留当前值时，文件检查会报告未满足。`});}
  if(outputFormat==='svg'&&rules.some(r=>r.field==='font'))issues.push({code:'svg-font',blocking:false,kind:'capability',text:'当前 SVG 渲染链使用 Noto 字体，与期刊字体要求可能冲突；需外部排版检查，不能声明字体达标。'});
  if(!rules.some(r=>r.field==='format'||r.value?.formatExempt))issues.push({code:'scope-unverified',blocking:false,kind:'pending',text:'当前投稿阶段/用途没有已核实的完整格式规则，不代表没有要求。'});
  return issues;
}
export function admitJournal(input,outputFormat='png',generationPath='model-v1',figureTypeId,operation='generate') {
  const snapshot=journalSnapshot(journalSelectionForFigure(input,figureTypeId));
  if(!snapshot)return null;
  if(generationPath!=='model-v1')journalError('期刊规则仅接入当前工作台流程，请恢复完整输入后提交。');
  const blocking=journalPreflight(snapshot,outputFormat,operation).filter(i=>i.blocking);
  if(blocking.length)journalError(blocking.map(i=>i.text).join(' '));
  return snapshot;
}
export function journalFields(body) {return Object.fromEntries(['journalSelection','journalProfile'].filter(key=>body[key]!==undefined).map(key=>[key,body[key]]));}
export function journalPrompt(body) {
  const snapshot=body.journalProfile??body.generationContext?.journalProfile;
  if(!snapshot)return null;
  return {journal:snapshot.name,version:snapshot.version,scope:snapshot.selection,rules:activeJournalRules(snapshot,body.outputFormat).map(({id,field,requirement,text,aiPolicy})=>({id,field,requirement,text,...(aiPolicy?{aiPolicy}:{})})),limitations:journalPreflight(snapshot,body.outputFormat,body.action==='refineImage'||body.editInstruction?'generative-refine':'generate'),instruction:'Apply verified applicable layout, typography and labeling requirements throughout planning, generation and refinement. Explain conflicts; do not change models, research data or scientific conclusions. Pending/conflicting rules are not official hard requirements or permission. Disclosure is an obligation, not authorization. Generative refinement is not non-generative editing. Never claim pixel upscaling, DPI metadata, format conversion or visual review proves compliance. Scientific fidelity and disclosure require author review; final files are checked separately.'};
}
export const JOURNAL_SETTINGS_KEY='tuyan.journal-selection.v1';
export function loadJournalSelection(storage) {
  try{return JSON.parse(storage.getItem(JOURNAL_SETTINGS_KEY)||'null');}catch{return null;}
}
export function saveJournalSelection(storage,value) {
  try{storage.setItem(JOURNAL_SETTINGS_KEY,JSON.stringify(value));return true;}catch{return false;}
}
