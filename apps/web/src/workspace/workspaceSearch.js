import { ECOSYSTEM_TOOLS } from '../ecosystem/catalog.js';
import { PATHS, taskHasContent } from './workspaceState.js';

// Navigation only. Never put execution, creation, import, or save callbacks here.
// ResourceLinks uses the same page list so navigation and search cannot drift.
export const RESOURCE_ENTRIES = [
  { id:'guide', name:'使用教程', group:'功能', description:'了解绘图、材料、模型和结果操作', aliases:['帮助','指南','新手入门','教程','help'], keywords:['怎么用','说明','操作流程'] },
  { id:'agents', name:'智能体接入', group:'工具', description:'查看 MCP 与技能的接入说明', aliases:['MCP','Agent','AI 接入','Skills','技能'], keywords:['接口','自动化','Claude','Codex','ChatGPT'] },
  { id:'feedback', name:'意见反馈', group:'功能', description:'打开问题与建议反馈表', aliases:['反馈','报错','bug','建议'], keywords:['故障','问题','改进'] },
  { id:'contact', name:'联系作者', group:'功能', description:'查看作者联系方式', aliases:['联系我们','作者','客服'], keywords:['合作','联系'] },
  { id:'mini-program', name:'微信小程序', group:'功能', description:'查看图研小程序入口', aliases:['小程序','微信','WeChat'], keywords:['手机','扫码'] },
  { id:'changelog', name:'更新日志', group:'功能', description:'查看版本变化与更新说明', aliases:['版本记录','更新记录','changelog'], keywords:['发布','版本','新功能'] },
].map(entry => ({ ...entry, target:{page:entry.name} }));

export const SEARCH_ENTRIES = [
  { id:'png', name:'图像创作', group:'功能', description:'进入当前任务的图像创作页面', aliases:['生成图像','画图','AI 绘图','PNG','生图'], keywords:['科研绘图','文生图','位图'], target:{path:'png'} },
  { id:'svg', name:'矢量绘图', group:'工具', description:'进入当前任务的矢量绘图与手工编辑页面', aliases:['SVG','矢量图','SVG 编辑器','手工编辑'], keywords:['矢量编辑','画布','图形编辑'], target:{path:'svg'} },
  { id:'models', name:'模型管理', group:'功能', description:'浏览模型目录与渠道能力', aliases:['模型库','模型目录','大模型','model'], keywords:['厂商','渠道','AI'], target:{page:'models'} },
  { id:'saved-models', name:'我的模型', group:'功能', description:'查看已添加的模型', aliases:['已添加模型','已保存模型'], keywords:['模型库','启用','停用'], target:{page:'models',view:'library'} },
  { id:'connections', name:'渠道连接', group:'工具', description:'查看模型连接与 API 密钥配置入口', aliases:['API Key','API 密钥','密钥','渠道配置','连接管理'], keywords:['供应商','服务商','授权','TokenDance'], target:{page:'models',view:'connections'} },
  { id:'custom-api', name:'自定义 API 与导入', group:'工具', description:'打开自定义 API 配置与导入界面', aliases:['自定义 API','API 导入','自定义接口','兼容接口'], keywords:['Base URL','JSON','导入配置','协议'], target:{page:'models',view:'api'} },
  { id:'leaderboard', name:'排行榜', group:'功能', description:'查看模型排行与评估', aliases:['榜单','排名','评测','benchmark','leaderboard'], keywords:['模型对比','评分','评估'] , target:{page:'排行榜'} },
  { id:'account', name:'账户设置', group:'功能', description:'查看个人资料、绘制活动、语言与存储设置', aliases:['账号设置','个人中心','个人资料','设置','profile'], keywords:['头像','昵称','邮箱','绘制活动','热力图','同步','备份','语言','隐私','钱包','TokenDance'], target:{page:'账户设置'} },
  { id:'model-config', name:'模型配置', group:'工具', description:'查看当前任务的模型分工与选项', aliases:['选择模型','切换模型','主模型','绘图模型','视觉理解'], keywords:['思考','推理','模型设置'], target:{panel:'models'} },
  { id:'drawing-settings', name:'绘图设置', group:'工具', description:'查看当前任务的内容规范、画面和生成选项', aliases:['参数设置','画面设置','生成设置'], keywords:['比例','尺寸','分辨率','清晰度','候选','评审','参考图','图库检索','普通','专业'], target:{panel:'settings'} },
  { id:'journals', name:'期刊规则', group:'工具', description:'定位到绘图设置中的期刊选择入口', aliases:['期刊规范','期刊库','投稿规范','journal'], keywords:['Nature','Science','投稿','版面','字体','线宽','DPI'], target:{panel:'settings',section:'journal'} },
  { id:'figure-types', name:'信息图类别', group:'工具', description:'定位到绘图设置中的科研图型入口', aliases:['图型','图类','图表类型','信息图','figure type'], keywords:['流程图','机制图','示意图','统计图','科研图型'], target:{panel:'settings',section:'figure-type'} },
  { id:'optimize', name:'优化输入', group:'工具', description:'定位到输入区的优化按钮，点击按钮后才执行', aliases:['优化提示词','提示词优化','润色需求','prompt'], keywords:['改写','绘图要求','描述优化'], target:{composer:'optimize'} },
  { id:'attachments', name:'添加附件', group:'工具', description:'定位到输入区的文件添加入口', aliases:['上传文件','上传材料','附件','上传 PDF','上传 PPT'], keywords:['论文','原材料','参考图片','原图','文档','PPTX'], target:{composer:'attachments'} },
  { id:'research-ecosystem', name:'他山科研生态', group:'功能', description:'浏览他山收录的科研可视化工具', aliases:['他山','科研生态','科研工具','Tashan'], keywords:['数据可视化','图表','三维','数据探索'], target:{page:'他山科研生态'} },
  ...ECOSYSTEM_TOOLS.map(tool => ({id:`ecosystem-${tool.id}`, name:tool.name, group:'工具', description:`${tool.engine} · ${tool.description}`, aliases:tool.aliases, keywords:tool.keywords, target:{page:'他山科研生态',tool:tool.id}})),
  ...RESOURCE_ENTRIES,
  { id:'admin', name:'站长页', group:'功能', description:'打开站长管理后台', aliases:['管理后台','站长后台','admin'], keywords:['运营','管理'], admin:true, target:{page:'站长页'} },
  { id:'community-review', name:'社区评估题审核', group:'功能', description:'打开社区评估题审核页面', aliases:['评估题审核','社区审核'], keywords:['评测','审核'], admin:true, target:{page:'社区评估题审核'} },
];

const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
const terms = query => String(query).normalize('NFKC').trim().split(/\s+/).map(normalize).filter(Boolean);
const indexes = SEARCH_ENTRIES.map(entry => ({entry, name:normalize(entry.name), aliases:entry.aliases.map(normalize), text:normalize([entry.name,entry.description,...entry.aliases,...entry.keywords].join(' '))}));

export function searchDestinations(query, {isAdmin = false, models = true, settings = true, account = true, pages = true, svg = true, composer = true, optimize = true} = {}) {
  const words = terms(query), exact = normalize(query);
  return indexes.filter(({entry,text}) => (!entry.admin || isAdmin)
    && (entry.target.page === 'models' || entry.target.panel === 'models' ? models : true)
    && (entry.target.panel === 'settings' ? settings : true)
    && (entry.target.page === '账户设置' ? account : true)
    && (entry.target.path === 'svg' ? svg : true)
    && (entry.target.composer ? composer : true)
    && (entry.target.composer === 'optimize' ? optimize : true)
    && (entry.target.page && !['models','账户设置'].includes(entry.target.page) ? pages : true)
    && words.every(word => text.includes(word)))
    .map(item => ({...item, score:!exact ? 0 : item.name === exact ? 4 : item.aliases.includes(exact) ? 3 : item.name.startsWith(exact) ? 2 : item.name.includes(exact) ? 1 : 0}))
    .sort((a,b) => b.score - a.score).map(({entry}) => entry);
}

export function indexSearchTasks(tasks) {
  return tasks.filter(taskHasContent).map(task => ({
    id:task.id, name:task.title, archived:task.archived || task.deleted, updatedAt:task.updatedAt || 0,
    text:normalize([task.title, ...task.runs.map(run => run.input.text), ...Object.values(task.branches).flatMap(branch => [branch.draft.text,...Object.values(branch.refinements).map(draft => draft.text)])].join(' ')),
    description:`${task.deleted ? '旧版移除 · ' : task.archived ? '已归档 · ' : ''}${PATHS[task.path]} · ${task.runs.length} 次执行`, target:{taskId:task.id},
  })).sort((a,b) => b.updatedAt - a.updatedAt);
}

export function searchTasks(index, query, includeArchived = false) {
  const words = terms(query);
  return index.filter(task => (includeArchived || !task.archived) && words.every(word => task.text.includes(word)));
}
