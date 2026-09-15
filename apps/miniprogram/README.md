# 图研Tuyan 微信小程序

图研Tuyan 是 PaperBanana 多端产品的微信原生 TypeScript 客户端。微信端使用“图研Tuyan”品牌；AppID、包名、API、数据库、对象键、Cookie 键和本地任务键继续沿用 PaperBanana 技术标识。

## 3.5.5 当前能力

本轮减小代码包：模型目录使用生成时去重、运行时完整还原的本地数据，保留 739 个型号与离线兜底。观猹图标使用从网页端原 SVG 导出的 512px PNG，Logo 和联系二维码保持原文件。`package-budget.test.cjs` 检查目录逐字段摘要、对象独立性，以及主包 1.5MiB / 图片与音频合计 200KiB 预算。

- 账户页顶部不再显示“返回原页面”；通过底部导航切换。各渠道 Key 输入框附申请步骤和官方链接复制入口，MiniMax 随区域切换，观猹使用账户连接说明。

- 生成页缩短模板与参考来源区域，限制说明按需展开；设置按模型、输出、流程和凭据分组，保留原子保存/取消。
- 生成和精修共用比例图形选择器，常用比例优先，其余展开；选项由当前模型与清晰度约束产生。
- 精修依次选择原图、填写指令、调整参数和查看结果；账户集中管理身份绑定、消费授权与钱包。
- 明确保存的模型/输出设置独立持久化，首次默认 Seedream 5.0 Pro / 1K；保留 Lite 等其他有效选择。密钥、账号、一次性 code 与输入正文不进入设置存储。

- 新增观猹身份登录、首次邮箱验证、原账号显式绑定、验证码解绑和无密码账号注销。需要网关小程序接续接口；系统浏览器完成授权后，将一次性接续码粘贴回小程序。

- 独立“账户”底部入口，图研登录与观猹 TokenDance 渠道连接分开管理；支持手动 code 授权、余额、充值记录和原任务恢复。
- v18 目录含 22 个渠道、739 条静态模型。新会话默认观猹与 Seedream 5.0 Pro，既有选择保持；渠道 Key 加密留在服务端，手动 BYOK 仍仅驻内存。
- 上传 v2：单张原图 20MiB、最多 8 张/合计 80MiB、16384px/32MP，SVG 5MiB。精修单张原图；按实际识图/编辑模型检查处理限制，原图不会被前端有损压缩。


- 分层工作台：六套精选模板、当前设置摘要、原子设置抽屉和宽幅移动端布局。
- 服务端 `modelRegistry` 是 22 个 API 渠道、模型角色、权益、验证状态、比例、清晰度和精修能力的唯一提交依据；目录不可用时禁止新建、精修和 Ark 验证。
- 普通模式使用单渠道三角色，默认观猹图片模型为 Seedream 5.0 Pro；同渠道各角色可单独选择模型；专业模式支持跨渠道 `modelRoutes`，模型选择器按“API 接入渠道 → 模型厂商 → 具体模型”逐级选择，单厂商也单独展示；支持路径回显、逐级返回与型号搜索。
- 方法 12,000 字、图注 1,000 字、独立负向提示词 1,000 字；请求固定发送 `clientPlatform: "miniprogram"`。
- 自动 + 45 种候选比例（按具体型号启用）；生成和精修分别读取 `aspectRatios/resolutions` 与 `refineAspectRatios/refineResolutions`。
- 参考图库使用 `scope=bench`、每页 12 条，支持关键词、视觉类别、研究领域、diagram/plot、详情与跨页最多 10 项选择。
- 上传参考图使用 prepare → PUT → finalize，失败时 abort；上传与图库检索互斥。
- 五个一级入口：生成 / 记录 / 精修 / 账户 / 教程。任务记录保留来源端、显式路由、负向提示词、比例、阶段、业务错误和 `objectKey`。
- 独立精修支持校验后的原图 `sourceImageUpload`，历史结果优先使用 `sourceImageObjectKey`；`direct-edit` 只要求 image 路由，`analyze-redraw` 要求 vision + image。
- 账户设置包含退出、隐私说明和永久删除；删除成功后清理 Cookie、草稿、任务缓存和内存密钥。
- 手动 BYOK Key 只保存在当前会话内存，不写 Storage、日志或任务记录。

## 3.5.5 本地交付说明

新增四项输入优化（预览、采用、恢复原文）、原图精修上传与结果操作、邮箱验证状态观察、账号生命周期提示和任务隔离。生成/精修设置按各自能力提供合法比例与清晰度，MiniMax 密钥按区域隔离。真实计费调用不包含在本次本地验收中。

本地检查：`npm test`、`npm run check`、`npm run build`。`tests/release-metadata-3.0.1.test.cjs` 同时验证当前 3.5.5 元数据和保留的 3.0.1 历史功能记录。

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
├── pages/       # index / records / refine / tokendance / guide / job-detail
└── utils/       # registry、routing、ratio、payload、errors、refine 等纯逻辑
tests/           # Node 契约与回归测试
```

参考：[微信网络规范](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html) · [开发者工具 CLI](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html)


模型凭据：主模型、图像生成和参考识图可独立选择渠道与型号；同一渠道共享会话内 Key，MiniMax 各区域独立。角色旁的状态不等于供应商账号实测可用。打开目录只浏览，选定后进入设置草稿，保存才生效。
