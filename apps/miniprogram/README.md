# 图研Tuyan 微信小程序

图研Tuyan 是 PaperBanana 多端产品的微信原生 TypeScript 客户端。微信端使用“图研Tuyan”品牌；AppID、包名、API、数据库、对象键、Cookie 键和本地任务键继续沿用 PaperBanana 技术标识。

## 3.1.0 当前能力

- 分层工作台：六套精选模板、当前设置摘要、原子设置抽屉和宽幅移动端布局。
- 服务端 `modelRegistry` 是21 个 API 渠道、模型角色、权益、验证状态、比例、清晰度和精修能力的唯一提交依据；目录不可用时禁止新建、精修和 Ark 验证。
- 普通模式使用单渠道服务端默认三角色；专业模式支持跨渠道 `modelRoutes`，模型选择器按“API 渠道 → 模型厂商 → 具体模型”分组并支持数百项搜索。
- 方法 12,000 字、图注 1,000 字、独立负向提示词 1,000 字；请求固定发送 `clientPlatform: "miniprogram"`。
- 自动 + 45 种候选比例（按具体型号启用）；生成和精修分别读取 `aspectRatios/resolutions` 与 `refineAspectRatios/refineResolutions`。
- 参考图库使用 `scope=bench`、每页 12 条，支持关键词、视觉类别、研究领域、diagram/plot、详情与跨页最多 10 项选择。
- 上传参考图使用 prepare → PUT → finalize，失败时 abort；上传与图库检索互斥。
- 四个一级入口：生成 / 记录 / 精修 / 教程。任务记录保留来源端、显式路由、负向提示词、比例、阶段、业务错误和 `objectKey`。
- 独立精修支持校验后的原图 `sourceImageUpload`，历史结果优先使用 `sourceImageObjectKey`；`direct-edit` 只要求 image 路由，`analyze-redraw` 要求 vision + image。
- 账户设置包含退出、隐私说明和永久删除；删除成功后清理 Cookie、草稿、任务缓存和内存密钥。
- API Key 只保存在当前页面内存，不写 Storage、日志或任务记录。

## 3.1.0 本地交付说明

新增四项输入优化（预览、采用、恢复原文）、原图精修上传与结果操作、邮箱验证状态观察、账号生命周期提示和任务隔离。生成/精修设置按各自能力提供合法比例与清晰度，MiniMax 密钥按区域隔离。真实计费调用不包含在本次本地验收中。

本地检查：`npm test`、`npm run check`、`npm run build`。`tests/release-metadata-3.0.1.test.cjs` 同时验证当前 3.1.0 元数据和保留的 3.0.1 历史功能记录。

本机旧缓存若没有不可变账号 ID，会原样保留但不再展示；登录后从账号任务记录取得本人任务。同步只复制仓库受控文件，保留 `project.private.config.json`、本机授权文件、额外文件和登录态。源码完成、本地副本同步、微信上传、审核、正式发布必须分别核实。

## 生产接口与微信域名

客户端固定请求：

```text
https://api.paperbanana.asia/paperbanana-api
https://api.paperbanana.asia/api/auth/*
https://api.paperbanana.asia/api/account/status
https://api.paperbanana.asia/api/account/delete
```

微信后台必须配置并保持“校验合法域名”开启：

```text
request:
https://api.paperbanana.asia
https://paperbanana-prod-hk-20260814.oss-cn-hongkong.aliyuncs.com

downloadFile:
https://paperbanana-prod-hk-20260814.oss-cn-hongkong.aliyuncs.com
```

通信域名必须使用 HTTPS、精确子域并满足微信备案要求。平台无法保存新域名时停止发布，不回退旧 Sealos 代理。

Auth Gateway 已精确允许 `https://servicewechat.com` 与 `https://developers.weixin.qq.com`，相似域名仍拒绝。AppID 保持 `wxfb85c471df3d9022`。

## 开发与验证

```bash
pnpm install --frozen-lockfile
pnpm --filter @paperbanana/miniprogram check
pnpm --filter @paperbanana/miniprogram build
node --test apps/miniprogram/tests/*.test.cjs
```

微信开发者工具使用基础库 3.16.0。预览或上传前，在“设置 → 安全设置”开启服务端口，并确认开发者工具登录态。`project.private.config.json`、本机用户文件和登录状态不进 Git，也不得用目录覆盖同步。

## 3.0.1 上传备注

```text
图研Tuyan 3.0.1：与 Web/iOS 同步标准账号安全，新增邮箱验证/重发、忘记密码、登录后修改密码和稳定的冷却/错误反馈；保留既有任务、模型设置和账号删除。本备注仅供开发者工具上传，不代表体验版、平台审核或发布。
```

## 1.0.0 上传备注

```text
图研Tuyan 1.0.0：新增六套学术模板、服务端模型目录与跨渠道模型选择、十种比例、负向提示词、306 条参考图库分页筛选、任务 objectKey 回显、独立精修、账户删除和香港生产 API。
```

体验版付费冒烟由用户使用自己的 BYOK 完成：选择明确支持的非默认比例、填写负向提示词、生成 1 张 PNG，核对来源端/比例/负向提示词/PNG/objectKey 后，再完成一次支持档位的精修。

## 目录

```text
miniprogram/
├── components/  # 模板、设置抽屉、模型选择、图库、账号等
├── pages/       # index / records / refine / guide / job-detail
└── utils/       # registry、routing、ratio、payload、errors、refine 等纯逻辑
tests/           # Node 契约与回归测试
```

参考：[微信网络规范](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html) · [开发者工具 CLI](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html)
