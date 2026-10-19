# 2026-10-19 模型目录 v35 与双域名发布

状态：CI 39191450905 全部成功；15401ee5dc2b2295a79bcb943650c86433183593 已在杭州与 GitHub Pages 发布并完成双域名/模型核验。杭州宿主 healthy 回执完成于 2026-10-19 11:14:32（UTC+8）。

## 基准和授权

- 唯一工作树：/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）；分支 codex/hangzhou-production。Desktop 旧树和小程序均未修改。
- 用户明确授权目录部署、停服禁选核验、真实模型性能对照，以及保留两个域名并同步新版前端。
- 原生产 051cf4bd4a84e2b974159c751341a50b015732bf。目录提交 4c37467b，目录审计补全 33ca3239，性能实现 3c6356ff，测试夹具类型修正 15401ee5。
- 同一分支中另有 Nature 会话独立提交 4e60e85e，其用户已明确授权部署。保持该提交，Nature 专项线上验收由该会话记录；不覆盖或重写其改动。

## 目录范围

静态目录 1099 → 1103，31 个静态渠道及 OpenRouter 动态发现保持。新增 Together reflection/Beam-1.0-501B-A23B、Fireworks accounts/fireworks/models/deepseek-v4p1-flash-1017、千帆 deepseek-v4.1-flash-1017、TokenDance deepseek-v4.1-flash-1017。Fireworks / 千帆含已记录的视觉角色，其余按精确渠道身份保持各自角色。

新增项仍为 catalog / verified:false，思考参数为 unconfirmed、无控件；不把原厂参数继承到渠道，不提高应用请求预算。这次真实 PNG / SVG 性能对照使用原有 Qwen3.8 Flash / Seedream 5.0 Pro，不能据此声称四个新型号均完成真实调用验证。方舟 20 条停服规则保留历史 ID，按 UTC+8 截止时刻禁选，不自动替换用户保存的型号。

## 旧域名原因与处理

www.paperbanana.asia 原本是独立 GitHub Pages 前端，杭州发布只更新 tuyansci.cn，因此旧域名仍显示旧工作台，不是单纯浏览器缓存。已在杭州流水线增加依赖健康部署成功的 Pages 发布任务：相同 Git SHA 构建，保持 www.paperbanana.asia 自己的 https://api.paperbanana.asia API/Auth 与现有回调。旧独立 Pages 工作流保持停用；GitHub Pages CNAME 与 HTTPS 设置保留。

两域名分别写 version.json，revision 必须相同，target 为 Hangzhou / GitHub Pages。旧域名的 ready、workspace、model-library 和 auth 会话路由已只读核实存在，CORS 允许 www.paperbanana.asia；未携带会话的账号接口正常返回 401。上线后仍需浏览器核验新首页和模型库。

## 发布前检查

- 39188578874：首次 Core 1513 项中 7 项因旧目录断言和新模型思考审计缺项失败，未部署。修正完整审计与历史集合边界，保留精确请求和停服测试。
- 39190108373：1523 项 Core 测试通过；新增性能测试夹具缺少可空类型收窄，类型检查失败，未部署。15401ee5 已修正，后续本地类型检查和该测试通过。
- 本地 Web 全量 1013 项通过。Benchmark Worker 类型检查通过；本地 199/200 测试通过，唯一失败是 macOS 中文路径的夹具 URL 二次编码；发布 CI 的 ASCII 路径 Worker 检查已通过。

## 最终发布回执

- CI 39191450905 的 verify、四个镜像、杭州 deploy 和 pages 均 success。Core 1523 项、Web 1013 项、Benchmark Worker 200 项通过；Gateway 173 项通过，另有 1 项既有跳过项。
- 杭州宿主 receipt.source 与 tuyansci.cn/version.json、www.paperbanana.asia/version.json 均为上述完整 SHA。杭州及旧域名 API ready 均正常，Mongo、OSS、模型出口及 Benchmark 依赖 ready；宿主 10 容器健康。部署自身不触发模型调用。
- 两个 API 入口只读查询均返回目录 v35，四个精确渠道型号存在且 selectable；20 条方舟规则全部与当前时刻一致：12 条禁选、8 条未来到期仍可选。
- 两个正常首页（不带 view=legacy）均为新版任务工作区，已登录账号及历史记录正常显示。模型库中的三渠道 DeepSeek 1017 和 Together Beam 保持原有卡片样式、渠道角色及规格入口；TokenDance 1017 自动加入原账号模型库。
- 两域名均实际查看 deepseek-v4-flash-260425：显示火山方舟、2026-09-21 到期原因，添加按钮 disabled，保留历史 ID。没有为核验停服状态发出模型请求。
- 线上目录总数还含动态发现；两次页面读取得到的动态数量可以不同，不能与 1103 条静态目录直接混算。
- 打开的旧式测试页带 ?view=legacy，专用于相同生成表单的性能基线，不能当作正常首页版本证据。

证据目录：/Users/a1-6/.codex/artifacts/tuyan-production-catalog-performance-20261019。关键文件包括 dual-domain-live-receipts.json、live-ready-hangzhou.json、live-catalog-summary.json、paperbanana-live-catalog-summary.json、hangzhou-browser-catalog.json、paperbanana-new-workspace.png、paperbanana-catalog-1017.png、paperbanana-catalog-beam.png、两域名 retired-disabled.png，以及 release-ci-success.log。

性能优化的真实对照见 [分阶段对照记录](2026-10-19-generation-performance-results.md)，不把目录接入视为新模型的真实调用验证。
