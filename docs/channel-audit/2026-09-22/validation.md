# 本地验证记录

日期 2026-09-22。所有推理、存储和账号均为本地测试替身，不是供应商验收。公开文档访问不触发模型推理；未使用生产密钥、未充值/部署。

## 自动化

| 检查 | 结果及边界 |
|---|---|
| Core 完整测试 | 860 / 860 通过，含现有精修/任务快照/权限边界/恢复/费用回归 |
| 最后修改的定向 Core 验证 | 202 / 202 通过：逐型号请求、独立 AJV schema 校验、最小/最大多图、mask 组合、退役时间边界、适配器和选择器合同 |
| 实际 Core 分发枚举 | 全量扩展渠道的型号 × 角色 × 尺寸/比例 × 生图/精修经过真实 backend dispatch 到模拟 transport；覆盖两万余组合，无对外推理 |
| Web 完整测试 | 466 / 466 通过；不可用型号隐藏、旧配置保留、恢复后可选、尺寸/比例不兼容显式修正 |
| 小程序 | TS 检查、JS 编译、121 / 121 测试通过；目录包体预算通过，解包哈希及全部字段一致，未放宽预算 |
| 构建 | Web、Core 构建通过；保留现有大 chunk 提示，不代表运行性能/生产部署验收 |
| 生成一致性 | model-catalog、model-version-report、reference-upload 的 --check 均通过；943 个全项目静态型号 |
| 非目标渠道保护 | 逐 JSON 对比变更前基线：非三渠道的 provider 目录和图片 route 未改变；既有尺寸 profile 未修改/删除 |

测试入口：`apps/paperbanana-api/tests/full-channel-catalog.test.ts`、`image-channel-adapters.test.ts`、`legacy-composition.test.ts`；Web `catalog-isolation.test.mjs`、`multi-provider-app.test.mjs`、`featured-app-integration.test.mjs`；小程序 `model-registry.test.cjs` 和目录压缩/包体检查。测试按用户新要求更新，不再期待暂停型号出现在“暂不可用”候选列表，也不再期待精修自动更换尺寸。

## Chrome 浏览器验收

本地 `http://127.0.0.1:5173` + `test-support/refine-runtime.mjs --tokendance` 的 8791 模拟 Core。账号 `local@example.invalid`，输入为已存在的 120×80 PNG 测试图；结果是固定色块，不能用于评价科研绘图质量。mock transport 对未知外部地址直接抛错，不会回落到真实付费服务。

| 场景 | 观察结果 |
|---|---|
| 主模型分流 | TokenHub 的 Kimi K3 可选；仅改变主模型，图像路线仍保留；Runware 主模型可看到 GPT-5.5/5.4 系列及多个研发厂商 |
| 视觉分流 | MiMo 主模型 4 项、识图 3 项；V2.5 Pro 未出现在识图选择器。V2.5 显示未来下线日 |
| 退役型号排除 | TokenHub 搜索 `hy-image-v3.0` 返回 0；`hy-image-v3`、3.5 Preview、WAND 按独立 ID 可见。暂停已有选择的保留与恢复由 DOM 集成测试覆盖 |
| 上传/用途/说明 | Runware GPT-Image-2.5 Flare 上传原图、辅助图；选择配色用途并填写说明，原图与辅助图预览各自存在 |
| 模型切换 | 换成 FLUX.1 Fill Pro，辅助图、指令、旧尺寸保留；显示 0 个辅助名额、不兼容尺寸并禁用提交 |
| 删除/遮罩 | 删除辅助图后提示必需遮罩；点击原图绘制区域、清除、重画均生效；清除后禁止提交，显式选择原生尺寸/自动比例后可提交 |
| 失败/恢复 | 对 Runware 注入“提交确认丢失”，页面显示失败与原任务恢复入口；关闭注入后点击恢复，在任务记录看到同一项完成及结果图。断点/只查 UUID/计费 POST 不重发由 transport 测试断言 |
| WAND 异步多图 | 从上一模拟结果作为新原图，选择 WAND Lite，显示总 3 张/辅助最多 2；原生旧尺寸继续保留为不可用，显式改为 1K；上传辅助图后模拟提交，异步轮询完成且原指令/辅助图说明保留 |

桌面截图和 DOM 观察在本任务工具记录中；更早 8 个 SKU 的桌面/窄屏上传、BRIA 结构化及恢复验收材料仍在 `/Users/a1-6/.codex/artifacts/tuyan-refine-channels-20260922/qa/`。本次新增 175 项没有逐个在浏览器发起推理，采用逐型号接口合同测试加上述浏览器代表路径；真实平台验证为 0。

曾在开发热更新期间重生成目录导致本地页面重载；恢复结果通过任务记录确认，不将该次页面重载当成“刷新保留未提交草稿”验收。生产刷新草稿持久化不属于本次已验证结论。

## 证据与未完成

测试日志保存在 `/tmp/tuyan-directory-audit-20260922/`；该目录可能被系统清理，摘要及 SHA-256 存入 [evidence.json](evidence.json)。官方每项 schema 的 SHA-256、URL 和核查日保存在 `config/channel-audit/runware-directory.json` 与表格中。

未验证：真实 Key 权限、余额/后付费、各区模型授权与限流、实际模型版本回显、账单、付费质量。未实施：TokenHub 新加坡、MiMo UltraSpeed、专用分层/扩边/风格/擦除工具及小程序原生高级精修 UI。没有自动部署、push、微信上传、审核或发布。
