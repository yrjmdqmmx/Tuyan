import { ArrowRight, BookOpen, Github, KeyRound, LayoutTemplate, ShieldCheck, Sparkles } from 'lucide-react'

const DIRECTORY = [
  ['guide-templates', '从模板开始'],
  ['guide-library', '模板与参考图库'],
  ['guide-settings', '普通 / 专业设置'],
  ['guide-models', '主 / 图 / 识模型与 BYOK'],
  ['guide-output', '比例、提示词与输出'],
  ['guide-workflow', '生成、记录与精修'],
  ['guide-trust', '错误、隐私与开源'],
]

function GuideSection({ id, title, children }) {
  return <section id={id} className="guide-section" tabIndex={-1}><h3>{title}</h3>{children}</section>
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
            <p>精选模板图片来自 PaperBananaBench 的 306 条分页研究语料。完整图库支持搜索、分类、详情预览和最多 10 项手选；模板请求只按精确参考 ID 读取。图片暂时不可用时，结构预览仍会保留模板文本和套用能力。</p>
            <p>本地上传参考图与图库检索是两种风格锚点：使用检索时先不要上传；上传图片后，后端也会以你的图片为唯一视觉来源。</p>
          </GuideSection>

          <GuideSection id="guide-settings" title="普通 / 专业设置">
            <p><strong>普通模式</strong>使用同一接入渠道的默认主、图、识三路模型，仍可选择画面比例、清晰度和格式。<strong>专业模式</strong>允许三种角色独立选渠道与模型，并开放检索、候选数量和评审轮数。</p>
            <p>生成页的高对比设置卡会一直显示当前三路模型、比例和输出摘要；“打开完整设置”进入完整抽屉。</p>
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
            <p><ShieldCheck size={15} aria-hidden="true" /> 方法、图注、参考图和结果按隐私政策处理；API Key 不落库。<Github size={15} aria-hidden="true" /> PaperBanana 客户端以开源方式维护，欢迎通过 GitHub 查看实现与提交问题。</p>
            {onContact ? <button type="button" className="guide-link" onClick={onContact}>仍有问题？联系作者</button> : null}
          </GuideSection>
        </article>
      </div>
    </section>
  )
}
