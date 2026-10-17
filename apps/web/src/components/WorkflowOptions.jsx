import { useId, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { useAppLocale } from './BenchmarkLocale.jsx'

const MODES = [['planner_critic', '快速生成', '规划并按需修正'], ['full', '完整生成', '增加风格整理']]

export function workflowExplanation(mode, body = {}, locale = 'zh-CN') {
  if (body.generationPath === 'model-v1') {
    const full = mode === 'full' || mode === 'demo_full', svg = body.outputFormat === 'svg'
    const revisions = Number(body.maxCriticRounds) || 1
    return locale === 'en' ? [
      'The main model reads your materials and plans the complete figure. Uploaded files and library retrieval are independent.',
      ...(full ? ['Adds one main-model style pass per candidate, using the complete style guide. It can simplify details; verify that research meaning is preserved.'] : []),
      svg ? 'The main model writes SVG source. Local code renders it and checks bounded marker visibility; numerical and scientific correctness still require verification.' : 'The image model draws PNG from the complete plan.',
      `Review rounds set to ${revisions}: up to ${revisions} reviews, each followed by one revision if needed. A revised version is reviewed only if a round remains. The process ends after the last revision without adding a final review.`,
      'Reviews may finish early. Unresolved findings or uncertain local checks prevent a pass. Model approval does not guarantee scientific correctness.',
      full ? 'Style preparation, material reading, assisted vision, reviews and rendering may add calls. Candidate count is not concurrency.' : 'Material reading, assisted vision, reviews and rendering may add calls. Candidate count is not concurrency.',
    ] : [
      '主模型读取原材料并制定完整方案。上传文件与图库检索独立，所选模式不会被上传覆盖。',
      ...(full ? ['每张候选增加 1 次主模型风格整理，使用完整风格指南。风格整理可能简化细节，仍须核对研究含义。'] : []),
      svg ? '主模型编写 SVG 源码；程序渲染并对声明的箭头标记做有界可见性检查，不证明数值或科学正确性。' : '生图模型按完整方案绘制 PNG。',
      `评审轮数设为 ${revisions} 轮：最多评审 ${revisions} 次，每轮必要时修改一次。仅在还有剩余轮数时继续评审新版；最后一轮修改后结束，不追加最终复审。`,
      '评审可提前结束。未解决的问题或本地检查的不确定项不能通过；模型通过也不等于科研正确。',
      full ? '风格整理、材料读取、辅助视觉、评审与绘制都可能增加调用和等待；候选数不是并发数。' : '材料读取、辅助视觉、评审与绘制都可能增加调用和等待；候选数不是并发数。',
    ]
  }
  const basic = mode === 'vanilla'
  const full = mode === 'demo_full' || mode === 'full'
  const plot = body.taskName === 'plot'
  const svg = body.outputFormat === 'svg' && !plot
  const vector = svg && body.modelRoutes?.image?.accessProvider === 'recraft' && /_vector$/.test(body.modelRoutes.image.modelId)
  const reviews = basic && !plot ? 0 : Number(body.maxCriticRounds) || 0
  const assist = body.visionMode !== 'none'
  const referenceAssist = assist && !(basic && body.referenceImageMode === 'main_model')
  const intro = basic ? '适合需求明确的快速草稿。主模型仍会制定完整可执行方案。' : full ? '适合需要统一配色、层级和视觉语言的复杂图示，增加主模型风格整理阶段。' : '适合需要检查并按需修改的图示。主模型负责规划和最终修改决策。'
  const reference = body.referenceImages?.length || body.retrievalSetting && body.retrievalSetting !== 'none' ? referenceAssist ? '参考案例标题、介绍与实际图片 → 视觉模型观察 → 主模型制定方案。' : '参考案例标题、介绍与实际图片 → 主模型直接读图并规划；缺少可用识图能力时阻止提交。' : '按研究内容与图注规划；当前不使用参考图。'
  const render = plot ? '主模型规划、编写绘图代码 → 绘图服务执行并输出 PNG。' : svg ? vector ? '主模型规划 → Recraft 生成 SVG。' : '主模型规划 → 主模型生成 SVG 代码。' : '主模型规划 → 图像模型生成 PNG。'
  const review = reviews === 0 ? '不执行评审，不代表结果已经检查通过。' : svg ? `先生成 SVG，再逐轮检查当前文件的实际画面与完整代码。最多 ${reviews} 轮，每轮包含检查、主模型优化方案和必要时生成新版；最后一轮修改后结束，不追加最终复审。` : `最多 ${reviews} 轮：${assist ? '视觉模型观察画面 → 主模型根据报告判断' : '主模型直接读图并判断'} → 如需修改，主模型重写完整方案再渲染。最后一轮修改后不会额外付费复审。`
  const recraftNotice = vector ? 'Recraft 风格参考图可能增加风格创建费用；完整方案、方法、图注或图片超过所选接口限制时会明确报错，不会截断或忽略。' : ''
  const referenceStatus = body.referenceGeneration?.status
  const referenceTransport = referenceStatus === 'supported' ? '当前图像路线已声明支持参考图生成，仍需满足尺寸与图片限制。' : `当前图像路线${referenceStatus === 'unsupported' ? '不支持' : '尚未确认支持'}参考图生成，将使用纯文本重绘。`
  const revision = reviews === 0 ? '本次不触发评审后的重新生成；出图后可另行发起精修。' : svg ? vector ? 'Recraft 接收完整上下文；首版实际参考图用作风格参考，可能增加风格创建费用。V3/V4/V4.1 修订传上一版实际渲染图，V2 仅作为风格参考重生成；不保证局部编辑。' : '主模型结合实际画面（或辅助观察报告）与完整 SVG 代码作出决策；修订生成全新版本，不继承旧版通过结论。' : plot ? '修改由主模型重写绘图代码并重新执行。' : `${referenceTransport}重绘时，已确认支持的图像模型接收上一张图和完整新方案。参考图重绘不保证局部像素不变，局部精修另需编辑能力。`
  const cost = `每张候选独立执行。${reviews === 0 ? full ? '本次包含风格整理，不包含评审或评审触发的重绘调用。' : '本次不包含评审或评审触发的重绘调用。' : full ? '风格整理、评审和可能的重绘会增加调用。' : '评审和可能的重绘会增加调用。'}${reviews > 0 && assist ? '每轮辅助视觉通常需观察与判断两次模型调用，重绘另计。' : ''}候选数不是并发数；实际等待取决于模型、队列和重绘次数。`
  if (locale === 'en') return [
    basic ? 'For clear, quick drafts. The main model still writes a complete executable plan.' : full ? 'For complex diagrams that need consistent color, hierarchy, and visual style. Adds main-model style preparation.' : 'For diagrams needing checks and revisions. The main model plans and makes revision decisions.',
    body.referenceImages?.length || body.retrievalSetting && body.retrievalSetting !== 'none' ? referenceAssist ? 'Reference titles, descriptions and actual images → visual observation → main-model planning.' : 'The main model reads reference titles, descriptions and actual images. Submission is blocked without available image understanding.' : 'Plan from the research and caption; no references are selected.',
    ...(vector ? ['Recraft style references may add style-creation fees. Full context and image limits are checked; nothing is silently truncated or omitted.'] : []),
    plot ? 'Main model plans and writes code → plot worker produces PNG.' : svg ? vector ? 'Main-model plan → Recraft produces SVG.' : 'Main-model plan → main model writes SVG code.' : 'Main-model plan → image model produces PNG.',
    ...(full ? ['The main model prepares style after planning and before rendering.'] : []),
    reviews === 0 ? 'No review is performed; this does not mean the result passed a check.' : svg ? `Generate SVG first, then inspect its actual raster and complete code. Each of up to ${reviews} rounds includes inspection, a complete revision plan and regeneration when needed. The process ends after the last revision without adding a final review.` : `Up to ${reviews} rounds: ${assist ? 'vision model observes → main model evaluates its report' : 'main model reads and evaluates the image'} → if needed, a complete revised plan and rerender. No extra paid check follows the last revision.`,
    reviews === 0 ? 'No review-triggered regeneration runs. Refinement can be started separately after generation.' : svg ? vector ? 'Recraft receives complete context and actual style references, which may add style-creation fees. V3/V4/V4.1 revisions use the previous raster; V2 uses it only as a style reference. This does not guarantee local editing.' : 'The main model owns the visual and code decision; revisions never inherit an earlier pass.' : plot ? 'Revisions rewrite the plot code and rerun it.' : `${referenceStatus === 'supported' ? 'The current route declares reference-generation support, subject to image limits.' : 'Reference generation is unsupported or unconfirmed for this route; regeneration uses text only.'} Supported routes receive the previous image and a complete new plan. This does not guarantee unchanged local pixels; local refinement requires editing support.`,
    `Each candidate runs independently. ${reviews === 0 ? full ? 'Style preparation is included; no review or review-triggered rendering calls.' : 'No review or review-triggered rendering calls.' : full ? 'Style preparation, reviews, and revisions add calls.' : 'Reviews and revisions add calls.'}${reviews > 0 && assist ? ' An assisted round normally has two model calls for observation and decision; rendering is additional.' : ''} Candidate count is not concurrency. Waiting depends on the models, queue, and revisions.`,
  ]
  return [intro, reference, ...(recraftNotice ? [recraftNotice] : []), render, ...(full ? ['规划后由主模型补充风格，再进入渲染。'] : []), review, revision, cost]
}

export default function WorkflowOptions({value, onChange, body}) {
  const {t, locale} = useAppLocale()
  const prefix = useId()
  const [open, setOpen] = useState('')
  const [pinned, setPinned] = useState('')
  return <fieldset className="workflow-options" onKeyDown={event => {if(event.key === 'Escape') {setOpen('');setPinned('');event.stopPropagation()}}}>
    <legend>{t('生成流程')}</legend>
    <div className="workflow-option-list">
      {MODES.map(([id, label, short]) => <div key={id} className={`workflow-option ${value === id ? 'selected' : ''}`}>
        <label className="workflow-choice"><input type="radio" name={prefix} value={id} checked={value === id} onChange={() => onChange(id)} /><span><strong>{t(label)}</strong><small>{t(short)}</small></span></label>
        <div className="workflow-help" onMouseEnter={() => setOpen(id)} onMouseLeave={() => {if(pinned !== id)setOpen('')}} onBlur={event => {if(!event.currentTarget.contains(event.relatedTarget) && pinned !== id)setOpen('')}}>
          <button type="button" className="workflow-help-button" aria-label={t('{name}说明', {name:t(label)})} aria-expanded={open === id} aria-controls={`${prefix}-${id}`} onFocus={() => setOpen(id)} onClick={() => {const next = pinned === id ? '' : id;setPinned(next);setOpen(next)}}><CircleHelp size={16}/></button>
          {open === id && <div id={`${prefix}-${id}`} className="workflow-explanation" role="region" aria-label={t('{name}说明', {name:t(label)})}>
            <strong>{t(label)}</strong>{workflowExplanation(id, body, locale).map((line,index) => <p key={index}>{t(line)}</p>)}
          </div>}
        </div>
      </div>)}
    </div>
  </fieldset>
}
