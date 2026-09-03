import { CLIENT_VERSION } from '../../utils/config'
import { loadModelRegistry, subscribeModelRegistry, type ModelRegistryState } from '../../utils/model-registry-store'

const LINKS: Record<string, { label: string; url: string }> = {
  site: { label: '网站端', url: 'https://www.paperbanana.asia/#guide-settings' },
  github: { label: 'GitHub 仓库', url: 'https://github.com/yrjmdqmmx/Tuyan-clients' },
  paper: { label: 'PaperBanana 论文', url: 'https://huggingface.co/papers/2601.23265' },
}

const CHAPTERS = [
  { id: 'quick', title: '三步开始生成', summary: '选模板与设置 → 写方法与图注 → 提交并查看演化', open: true },
  { id: 'settings', title: '完整生成设置', summary: '普通/专业、三角色模型、格式、比例、清晰度与评审', open: false },
  { id: 'models', title: '模型目录与渠道', summary: '服务端 registry 是提交真相，目录不可用时失败关闭', open: false },
  { id: 'references', title: '参考图库与上传', summary: '306 个案例、跨页选择，以及上传和检索互斥', open: false },
  { id: 'refine', title: '独立精修', summary: 'objectKey 优先、直接编辑与分析后重绘', open: false },
  { id: 'records', title: '任务记录与错误', summary: '来源端、路由、输入、阶段、资产与重试建议', open: false },
  { id: 'privacy', title: '账户与隐私', summary: 'BYOK 仅在页面内存；退出与永久删除账号', open: false },
]

const SETTING_CARDS = [
  ['配置模式', '普通模式使用单一 API 渠道的服务端默认三角色；专业模式可为主模型、图像模型和识别模型分别选择渠道。'],
  ['API 渠道', '先选实际调用的接入渠道，再在渠道下按模型厂商选择具体模型。密钥属于渠道，不属于模型厂商。'],
  ['主模型', '负责规划、SVG、统计图、自动检索和部分评审；只有任务真实可达主模型时才要求对应渠道密钥。'],
  ['图像生成模型', '负责 PNG 渲染与精修。比例、清晰度、输出格式和编辑模式完全以 registry 声明为准。'],
  ['参考图识别模型', '上传参考图且主模型不直读时负责图像理解；未走到该角色时不会要求它的渠道密钥。'],
  ['生成流程', '规划器 + 评审器适合日常质量；完整流程更细致；基础生成最快但跳过部分评审。'],
  ['检索设置', '不检索、自动、随机或手动选择图库案例。上传参考图后检索强制关闭。'],
  ['画面比例', '自动 + 十种规范比例。灰掉或不出现的比例表示当前模型没有声明支持，系统不会静默改成 16:9。'],
  ['导出格式', 'PNG 适合直接预览与精修；SVG 由主模型生成，适合论文排版与无损缩放。'],
  ['输出清晰度', '生成读取 resolutions；独立精修读取 refineResolutions，两者互不推断。'],
  ['候选数量', '一次生成 1–3 张独立候选，数量越多耗时与计费越高。'],
  ['评审轮数', '0–2 轮“评审 → 重渲染”；轮数越多通常更细致，也会增加时间与费用。'],
  ['负向提示词', '单独描述不希望出现的内容，最多 1000 字；它会独立落盘，不拼进研究方法。'],
]

Component({
  data: {
    qrSrc: '/images/contact-qr.jpg', clientVersion: CLIENT_VERSION, showFeedbackPanel: false, scrollAnchor: '',
    chapters: CHAPTERS, settingCards: SETTING_CARDS.map(([name, description]) => ({ name, description })),
    registryVersion: '正在读取', providerLabels: '等待服务端目录', defaultRoutes: '等待服务端目录', registryError: '',
  },
  lifetimes: {
    attached() { ;(this as any).unsubscribeRegistry = subscribeModelRegistry((state) => this.applyRegistry(state)); void loadModelRegistry() },
    detached() { const unsubscribe = (this as any).unsubscribeRegistry as (() => void) | undefined; if (unsubscribe) unsubscribe() },
  },
  methods: {
    applyRegistry(state: ModelRegistryState) {
      if (!state.registry) { this.setData({ registryVersion: '目录不可用', providerLabels: '生成与精修已禁用', defaultRoutes: '不可用', registryError: state.error }); return }
      const provider = state.registry.providers.bailian
      this.setData({ registryVersion: state.registry.registryVersion, providerLabels: 'Google Gemini API · OpenAI · 阿里百炼 · 火山方舟 · OpenRouter', defaultRoutes: `${provider.defaults.main} / ${provider.defaults.image} / ${provider.defaults.vision}`, registryError: '' })
    },
    toggleChapter(event: WechatMiniprogram.TouchEvent) { const index = Number(event.currentTarget.dataset.index); if (!Number.isInteger(index)) return; const chapters = this.data.chapters.map((chapter, chapterIndex) => chapterIndex === index ? { ...chapter, open: !chapter.open } : chapter); this.setData({ chapters }) },
    goGenerate() { wx.switchTab({ url: '/pages/index/index' }) },
    scrollToContact() { this.setData({ scrollAnchor: '' }); wx.nextTick(() => this.setData({ scrollAnchor: 'contact-section' })) },
    copyLink(event: WechatMiniprogram.TouchEvent) { const link = LINKS[String(event.currentTarget.dataset.key || '')]; if (link) wx.setClipboardData({ data: link.url, success() { wx.showToast({ title: `${link.label}链接已复制`, icon: 'none' }) } }) },
    openFeedbackPanel() { this.setData({ showFeedbackPanel: true }) }, closeFeedbackPanel() { this.setData({ showFeedbackPanel: false }) },
    onShareAppMessage() { return { title: '图研Tuyan · 使用教程', path: '/pages/guide/guide' } },
  },
})
