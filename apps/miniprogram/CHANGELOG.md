# 更新日志

## 图研Tuyan 1.0.0（2026-08-21）

- 微信端品牌升级为“图研Tuyan”，PaperBanana 技术标识、AppID、API 与本地数据键保持不变。
- 切换香港生产 API；Auth Gateway 精确支持微信来源。
- 新增 registry 驱动的五渠道模型目录、跨渠道路由、模型搜索、权益/生命周期/验证状态和失败关闭。
- 新增六套精选模板、十种比例、负向提示词、原子设置抽屉和较宽的分层工作台。
- 参考图库升级为 306 条服务端分页、搜索、双分面、diagram/plot 和跨页选择。
- 任务记录补齐来源端、路由、负向提示词、比例、阶段、错误和 objectKey。
- 新增独立“精修”一级入口，生成/精修能力字段独立消费。
- 新增账户隐私说明与永久删除流程；API Key 保持仅内存。
- 教程按线上 v9 设置指南重构为微信原生折叠章节。

## miniprogram-v0.2.0（2026-06-10）

微信小程序端大版本更新：功能全量对齐网站端 + 多页重构 + 健壮性整修。

### 架构重构
- 单页（index.ts 约 1950 行）拆为底部 tabBar 三页：**生成 / 记录 / 教程**，外加任务详情独立页
- 新增 4 个自定义组件：auth-panel（登录）、feedback-panel（反馈）、reference-library（参考图库）、stage-timeline（生成演化时间线）
- 纯逻辑下沉 `utils/`：config / api / session / constants / jobs / payload / media / reference-files / reference-mode
- node 单测体系（`tests/*.test.cjs`，6 个文件）：常量对齐、payload 语义、参考图模式、防御解析、签名 URL 稳定化

### 对齐网站端（清空 SYNC.md 小程序欠账）
- **输出清晰度 1K/2K/4K**：按 provider/图像模型过滤，2K/4K 出图后后端自动「精修放大」（已实测：2K 任务出现第 5 阶段"精修放大（2K）"）
- **百炼模型常量**同步官方真实模型（qwen3.7-max / wan2.7-image-pro / qwen3.7-plus 等）；参考图处理方式按 `mainModelCanReadImages` 固定派生，移除"自动选择"
- **检索设置**（不使用/自动/随机/手动）+ **手动参考图库**选卡（≤10）；上传参考图后检索自动锁定并提示
- **plot 任务**：数据统计图类别 → `taskName:'plot'`（独立渲染服务）
- **生成演化时间线**：规划/渲染/评审/精修放大各阶段与中间图、检索参考列表
- **使用教程页**（参数详解 + FAQ）+ **联系作者二维码**（长按识别）+ 关于

### UI / 交互
- 品牌墨绿主题（#315f51，与 web --sage 一致）：主按钮 / 模式开关 / tabBar 选中色 / 反馈悬浮球
- 反馈悬浮球可**按住拖动**（movable-view）；登录与反馈改为居中模态弹层
- 头部精简（后端异常才显示警示条）；快速上手案例双列紧凑
- 阶段中间图新增**保存图片**按钮；SVG 资产「下载文件」：下载到本地后弹微信文件分享（真机），模拟器自动退回复制链接
- SVG 模式下隐藏对其无效的「输出清晰度」「图像模型」选项

### 健壮性（多智能体审查确认后修复）
- 轮询竞态：提交先停旧轮询 + `loadJob` 校验 jobId，旧任务在途响应不再污染新任务/误停轮询
- tabBar 页隐藏时不轮询；登录态时序守卫（session epoch）；记录页跨账号在途响应丢弃
- `hydrateRecordJobs` 并发池（≤5，规避 wx.request 10 并发上限）
- 桶签名 URL 稳定化：消除轮询期间阶段图/结果图每 3s 闪烁
- data:URL 落盘去重 + 启动清理（USER_DATA_PATH 上限保护）；wxfile:// 路径直通
- 防御 JSON 解析（`coerceJsonResponse`）；相册权限被拒后 openSetting 引导
- `wx.getWindowInfo` 替代弃用的 getSystemInfoSync

### 端到端实测
- 登录 / 参考图上传（PUT 签名直传）/ createJob / 轮询 / stages / 出图全链路与部署后端契约一致
- 1K 任务 4 阶段直出；2K 任务 5 阶段含自动精修放大，百炼实际跑通未回退

### 域名白名单（上线前提）
- request：`https://yifbnnzrwmxn.sealoshzh.site` + `https://objectstorageapi.hzh.sealos.run`
- downloadFile：`https://objectstorageapi.hzh.sealos.run`（保存相册 / SVG 下载用）

## miniprogram-v0.1.0

初版：单页生成 + 任务记录、邮箱登录、四服务商 BYOK、参考图上传、本机最近任务。
