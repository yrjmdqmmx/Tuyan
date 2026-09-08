# 精修上传与指令优化发布

实现 PR：[#178](https://github.com/yrjmdqmmx/Tuyan/pull/178)，Web 实际发布 SHA：`28000e0be7479cc6a5bc84e323443d86bbdc6bf1`。上传验收修复 PR：[#179](https://github.com/yrjmdqmmx/Tuyan/pull/179)，Core / Gateway / Benchmark companion 实际发布 SHA：`cca7061fa27c536431445ef3899344aeebe57f7d`。本记录为发布后的文档提交，不代表再次部署。

本次为 Web、Core、Auth Gateway 发布。为保持镜像来源一致，同步构建 Benchmark companion，评测任务继续关闭；小程序平台发布继续暂缓。

## 改动

- 精修页按原图、指令、参数、提交组织，独立显示源图、处理中和结果。桌面双栏，手机单栏。
- 点击或拖拽上传走真实签名 PUT、finalize 和账号归属校验；支持进度、失败重试、替换和移除。校验实际格式、字节、尺寸、静态图与完整解码，提交后保存任务源图快照。
- 精修指令复用生成页的主模型优化路由、预览、采用、取消、恢复与失败保留机制，明确限定修改范围和保留项。
- 比例选项使用准确的等比矩形，自动项独立图标；默认折叠，按具体模型、编辑操作和清晰度过滤并自动回退。
- 新字段为可选，旧任务结果入口继续兼容，无新增环境变量或数据库迁移。共享契约详见 `SYNC.md`。

## 验证与发布证据

本地 Web 358、Core 455（含上线验收修复）、Gateway 140、共享 API 29 项测试通过；Core 类型检查及 Web/Core 构建通过，模型目录 669 项无漂移。实际 Gateway/Core 集成验证上传源图像素进入编辑适配器，供应商使用测试桩；详细证据见 [本地验收记录](../refine-upload-2026-09-08.md)。

分支 CI、PR CI 及合并 CI 均通过，包含完整测试、类型检查、真实 Mongo 生命周期与迁移检查、镜像构建和部署脚本回归。

首次部署后，真实浏览器上传暴露了恢复身份账号的路径校验缺口：prepare 生成 `references/<owner>/lifecycles/<generation>/<file>`，旧 finalize 校验器只接受无 lifecycle 的路径。该版本的上传验收失败，没有把健康端点通过当作功能验收通过。修复先通过完整 Gateway/Core 流程复现失败，再放行既有合法路径，同时验证旧生命周期 finalize 返回 409、旧源图精修返回 403，以及普通参考图 finalize 兼容性。修复不改变 Web 资源。

| 发布门禁 | 结果 |
| --- | --- |
| 功能合并 CI | [34197350922](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34197350922) 通过 |
| 修复合并 CI | [34198977664](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34198977664) 通过 |
| Web Pages | [34198181074](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34198181074) 成功 |
| 最终香港部署 | [34199774340](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34199774340) 成功 |
| 来源与运行状态 | 三份业务镜像摘要和 revision 匹配，Core / companion 内置 provenance 匹配；5 个服务健康，维护状态解除 |
| 配置 | 原配置除 code SHA 外指纹一致；SG 出口保留，Benchmark 执行关闭且并发为 1；Plot / Mongo 镜像不变 |
| 公开接口 | `/health`、`/ready` 为 HTTP 200；上传能力与 `editInstruction` 优化目标已声明，41 模型公开评测 release/hash 不变 |

Chrome 生产验收使用现有登录态和合成图片：PNG 120×80、JPEG 160×90 分别完成 prepare、真实 OSS PUT、finalize（均 HTTP 200），页面显示“原图已就绪”及服务器校验尺寸。替换、移除均完成，两个 abort 请求成功，移除后回到上传空状态且指令保留。

桌面 1440×1000、手机 390×843 和 320×720 的文档宽度等于视口宽度；手机展开全部 46 项仍无横向溢出。45 种固定比例的矩形宽高比全部匹配文字，包含 1:8、8:1 和小数比例；自动项无固定矩形。收起保留 12 项及当前极端比例。浏览器测试结束后清除合成原图和验收指令，重置视口。

生产优化入口已启用，当前主模型 Key 为空；点击会引导到正确密钥栏并保留原文，没有发出供应商请求。优化稿预览、采用、取消、恢复及失败保留在本地浏览器和实际 Gateway/Core 集成中通过（供应商为测试桩）。**真实供应商精修与优化输出尚未验收，未执行付费推理。** 拖拽通过组件交互测试覆盖，生产浏览器通过真实文件选择器上传。

结构化证据：[2026-09-08-refine-upload-evidence.json](2026-09-08-refine-upload-evidence.json)。

## 回滚

发布前实际运行 SHA 为 `2c82f49d962247353551540b8198dbb7034f69cd`。固定镜像和配置指纹已采集；生产保护目录保留上一版镜像锁及运行配置。回滚沿用现有部署工作流与审批门禁，并将 Web 发布至该 SHA；不回退数据库或重建账号。
