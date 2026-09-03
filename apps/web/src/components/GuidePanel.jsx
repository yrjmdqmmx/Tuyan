import { ArrowRight, BookOpen, Github, KeyRound, LayoutTemplate, ShieldCheck, Sparkles } from 'lucide-react'

const DIRECTORY = [
  ['guide-templates', '从模板开始'],
  ['guide-library', '模板与参考图库'],
  ['guide-settings', '生成设置参数详解'],
  ['guide-models', '主 / 图 / 识模型与 BYOK'],
  ['guide-output', '比例、提示词与输出'],
  ['guide-workflow', '生成、记录与精修'],
  ['guide-trust', '错误、隐私与开源'],
]

function GuideSection({ id, title, children }) {
  return <section id={id} className="guide-section" tabIndex={-1}><h3>{title}</h3>{children}</section>
}

function ParameterGuide({ title, children }) {
  return <article className="guide-parameter"><h4>{title}</h4><p>{children}</p></article>
}

function GuidePreset({ title, summary, children }) {
  return <article className="guide-preset"><span>{summary}</span><h4>{title}</h4><p>{children}</p></article>
}

export default function GuidePanel({
  onStart,
  onContact,
  registryVersion = '等待服务端目录',
  routeSummary = {},
  providerLabels = [],
}) {
  const providers = providerLabels.length ? providerLabels.join('、') : '以服务端当前可用渠道为准'
  return (
    <section className="guide-panel quick-guide">
      <header className="guide-head">
        <BookOpen size={23} />
        <div>
          <h2>60 秒快速开始</h2>
          <p>先套用一份研究模板，再确认模型与输出设置，最后生成候选图。所有关键入口都在一页内完成。</p>
        </div>
      </header>

      <div className="guide-cta">
        <button type="button" className="guide-cta-primary" onClick={onStart}><Sparkles size={16} />开始生成<ArrowRight size={15} /></button>
        <a className="guide-cta-ghost" href="#guide-models"><KeyRound size={16} />了解模型与 BYOK</a>
      </div>

      <div className="guide-layout">
        <nav className="guide-directory" aria-label="教程目录">
          {DIRECTORY.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>

        <article className="guide-content">
          <GuideSection id="guide-templates" title="从模板开始">
            <p>在“生成候选图”页点击“浏览模板”，从六个固定研究场景中选择一项。首次示例内容不算修改，可直接替换；你手动改过方法、图注或负向提示词后，系统会在覆盖三项内容前再次确认。</p>
            <div className="guide-callout"><LayoutTemplate size={18} /><span>套用只是起点：请把研究对象、模块名称、因果关系和评价指标改成你的真实内容。</span></div>
          </GuideSection>

          <GuideSection id="guide-library" title="模板与参考图库">
            <p>精选模板图片来自图研Tuyan 参考库的 306 条分页研究语料。完整图库支持搜索、分类、详情预览和最多 10 项手选；模板请求只按精确参考 ID 读取。图片暂时不可用时，结构预览仍会保留模板文本和套用能力。</p>
            <p>本地上传参考图与图库检索是两种风格锚点：使用检索时先不要上传；上传图片后，后端也会以你的图片为唯一视觉来源。</p>
          </GuideSection>

          <GuideSection id="guide-settings" title="生成设置参数详解">
            <p>生成页的高对比设置卡用于快速核对当前模型、比例与输出；点击“打开完整设置”可以调整下列参数。先用默认值完成首张草稿，再根据结果逐项增加复杂度，通常比一开始全部拉满更省时间和费用。</p>

            <div className="guide-parameter-grid">
              <ParameterGuide title="使用模式"><strong>普通模式</strong>适合第一次使用：同一渠道自动配好主、图、识三类模型，只需选择格式、清晰度和比例。<strong>专业模式</strong>适合需要独立选模型、检索参考、增加候选图或评审轮数的任务。</ParameterGuide>
              <ParameterGuide title="API 接入渠道与密钥">先选择 OpenRouter、Gemini、OpenAI、阿里百炼或火山方舟，再填写该渠道的 BYOK 密钥。只需填写当前任务实际会调用的渠道；密钥仅保存在页面内存，不会写入数据库。</ParameterGuide>
              <ParameterGuide title="主模型">负责理解论文方法、规划图中模块和文字内容，并执行文字层面的评审。复杂方法或长文本优先选择规划能力更强的模型；生成 SVG 时也由主模型直接输出矢量内容。</ParameterGuide>
              <ParameterGuide title="图像生成模型">负责 PNG 的绘制、重渲染与支持时的直接精修，决定画面风格、比例和可用清晰度。先看模型卡的格式、比例、分辨率和权益状态，不要只按模型名称选择。</ParameterGuide>
              <ParameterGuide title="参考图识别模型">负责读取上传图片或图库参考，并在启用评审时检查结果图的结构与语义。没有参考图且不需要视觉评审时调用会更少；复杂机制图或强参考风格更依赖其识图能力。</ParameterGuide>
              <ParameterGuide title="导出格式"><strong>PNG</strong>适合包含真实质感、复杂配色或需要直接投稿的插图，由图像模型生成并统一为 PNG。<strong>SVG</strong>适合流程图和架构图，便于后续矢量编辑，由主模型直接生成且本次不要求图像模型 Key。</ParameterGuide>
              <ParameterGuide title="输出清晰度"><strong>1K</strong>用于快速草稿和低成本试错；<strong>2K</strong>适合论文正文、汇报与大多数正式图片；<strong>4K</strong>用于最终导出、海报或细节密集图。分辨率越高通常等待越久、文件越大，也可能增加费用；只会开放模型明确支持的档位。</ParameterGuide>
              <ParameterGuide title="画面比例"><strong>自动</strong>让模型按内容决定；1:1 适合概念总览，4:3 / 3:2 适合论文常规图，16:9 适合横向流程和演示，3:4 / 2:3 / 9:16 适合纵向通路，21:9、1:4、4:1 适合超长链路。禁用项表示当前图像模型不支持。</ParameterGuide>
              <ParameterGuide title="生成流程"><strong>基础生成</strong>调用最少、速度最快，适合提示词已经很明确的草稿；<strong>规划器 + 评审器</strong>是推荐默认值，会先规划再检查并按需修正；<strong>完整流程</strong>执行更多生成阶段，适合复杂高要求图，但耗时和调用费用最高。</ParameterGuide>
              <ParameterGuide title="检索设置"><strong>不使用检索</strong>完全按你的输入生成；<strong>自动检索</strong>寻找相关案例；<strong>随机参考</strong>用于探索不同构图；<strong>手动参考</strong>最可控、最容易复现。上传参考图后检索会关闭，以上传图片作为唯一视觉来源。</ParameterGuide>
              <ParameterGuide title="候选图数量">专业模式可一次生成 <strong>1–3 张</strong>。1 张适合低成本迭代；2 张便于比较构图；3 张适合方向尚未确定时探索。候选图越多，图像生成和后续可能发生的评审费用越高。</ParameterGuide>
              <ParameterGuide title="评审轮数">专业模式可设置 <strong>0–2 轮</strong>。0 轮最快但不做结果图视觉复核；1 轮是质量与费用的常用平衡；2 轮适合文字、箭头和结构较复杂的正式图。每增加一轮都会增加识图、判断及可能的重渲染时间与费用。</ParameterGuide>
            </div>

            <h4 className="guide-subtitle">常用配置怎么选</h4>
            <div className="guide-presets">
              <GuidePreset title="快速草稿" summary="速度优先">普通模式 · 1K · 自动或 16:9。先确认整体方向和信息层级，满意后再提高清晰度。</GuidePreset>
              <GuidePreset title="论文正式图" summary="质量与费用平衡">专业模式 · 规划器 + 评审器 · 自动或手动检索 · 2K · 1–2 张候选 · 1 轮评审。</GuidePreset>
              <GuidePreset title="复杂机制图" summary="完整性优先">专业模式 · 完整流程 · 手动参考 · 2K · 2–3 张候选 · 2 轮评审，并用负向提示词限制箭头冲突和文字拥挤。</GuidePreset>
            </div>
          </GuideSection>

          <GuideSection id="guide-models" title="主 / 图 / 识模型与 BYOK">
            <div className="guide-runtime" aria-label="当前运行时模型信息">
              <span>目录版本 <strong>{registryVersion}</strong></span>
              <span>当前渠道 <strong>{providers}</strong></span>
              <span>主模型 <strong>{routeSummary.main || '等待选择'}</strong></span>
              <span>图像模型 <strong>{routeSummary.image || '等待选择'}</strong></span>
              <span>识图模型 <strong>{routeSummary.vision || '等待选择'}</strong></span>
            </div>
            <p>主模型负责规划与文字评审，图像模型负责生成或直接编辑，识图模型负责理解参考图与视觉评审。目录由服务端权威注册表校验；模型不支持某个角色、格式、分辨率或比例时会显示精确禁用原因，不从模型名称猜测能力。</p>
            <p><KeyRound size={15} aria-hidden="true" /> BYOK 密钥只保存在当前页面内存，发送到你明确选择的模型渠道，本站不会持久化 API Key；退出或注销会清空本地私密状态。</p>
          </GuideSection>

          <GuideSection id="guide-output" title="比例、提示词与输出">
            <p>固定比例按统一顺序提供：<strong>1:1、3:2、2:3、4:3、3:4、16:9、9:16、21:9、1:4、4:1</strong>，另有“自动”。每个模型只启用注册表明确支持的项目；切换模型后，不再支持的固定比例会收敛为“自动”。</p>
            <p>负向提示词最多 1,000 字，用来排除拥挤文字、模糊箭头或不合适的装饰。清晰度按模型分别开放 1K / 2K / 4K；PNG 图像结果会在服务端完成格式识别与统一归一，SVG 则走安全的矢量文本生成路径。</p>
          </GuideSection>

          <GuideSection id="guide-workflow" title="生成、记录与精修">
            <ol className="guide-flow">
              <li><strong>生成：</strong>规划研究结构，渲染候选图，再按设置执行视觉评审与迭代。</li>
              <li><strong>记录：</strong>查看来源端、输入、参考、阶段和结果；失败任务也保留可诊断上下文。</li>
              <li><strong>精修：</strong>从本人任务选择结果图，按图像模型声明的精修比例和分辨率直接编辑或分析后重绘。</li>
            </ol>
          </GuideSection>

          <GuideSection id="guide-trust" title="错误、隐私与开源">
            <p>目录、能力或凭据未满足时，界面会在付费调用前给出原因并引导到对应设置；不会用不兼容模型静默替换。若任务中断，可在任务记录查看错误并重试。</p>
            <p><ShieldCheck size={15} aria-hidden="true" /> 方法、图注、参考图和结果按隐私政策处理；API Key 不落库。<Github size={15} aria-hidden="true" /> 图研Tuyan 客户端以开源方式维护，欢迎通过 GitHub 查看实现与提交问题。</p>
            {onContact ? <button type="button" className="guide-link" onClick={onContact}>仍有问题？联系作者</button> : null}
          </GuideSection>
        </article>
      </div>
    </section>
  )
}
