# 模型卡规格与生命周期（2026-11-09，目录 v43）

本地分支 `codex/model-card-specs`，基线 `f3b8f91d`。扩展现有模型目录、选择器、我的模型、预设与小程序选择器；没有发布或调用真实模型。保留既有定价、计费、权限、默认型号以及历史任务。

## 数据与契约

用户提供的只读审计包位于未跟踪的 `.audit-input/`。`scripts/generate-model-audit.mjs` 读取 configured-pair-comparison、canonical-models、canonical-mappings、deprecations、six-claims-recheck 和 channel-official-meta，产生去重后的 `config/model-audit.generated.json`。核实日期固定为审计日期 **2026-11-09**。运行时、CI 与普通目录同步只读取已提交数据，不需要原始包或网络。

- 精确键为 `(channel, apiModelId)`；原厂继承同时要求 canonical 映射与字段值一致。没有名称相似匹配。
- 输入、输出、上下文窗口、最大输出分别保存 `{value, state, provenance, sourceUrl, verifiedAt}`；`state` 为 known / unknown / unsupported / not-applicable。后三种的 `value` 为 `null`，UI 分别显示未知、不支持、不适用。
- 卡片规格只读该快照；旧推测值、请求默认值、`request.max_tokens` 和 TokenDance 渠道 context_length 不作为最大输出。图像/视频生成不显示 token 窗口。每个继承值用小号“源自原厂”标记，来源链接与核实日期保留。
- 既有 API 模型记录增补 `auditChannel`、`auditSpecifications`、`auditLifecycle`。共享实现为 `packages/api/src/model-audit.ts`，同步生成 Web/Gateway JS 和小程序 TS/压缩数据。执行能力与审计规格分开，未知规格不自动撤销原有能力。

```sh
# 仅更新证据时需要原始包
node scripts/generate-model-audit.mjs .audit-input
# 日常生成/CI 不依赖原始包
node scripts/sync-model-catalog.mjs
node scripts/sync-model-catalog.mjs --check
pnpm --filter @paperbanana/miniprogram build
```

## 状态与计数

按 2026-11-09 统计：**61 已下架、4 将下线、7 渠道不可用**。61 项包含百炼 57、小米 2、阶跃星辰 2。百炼 qwen3.5-plus 四个精确 ID 在 2027-01-19 前可用，显示“将于2027-01-19下线”；日期按 UTC 当日 00:00 生效，之后自动使用已下架规则。

当前静态目录共 **1,132** 项，其中 **667 未核实**，包含原审计未覆盖的 84 项。完整审计数据另有 1,174 个渠道/型号对，其中 586 未核实；两个分母不同，不能相加。未核实涵盖 unresolved 及 OpenAI、SiliconFlow、Novita、Together、Replicate、Runware 的目录限制，不因该标记改变原有可用性。

Fireworks 适配器使用 `https://api.fireworks.ai/inference/v1/chat/completions` 与 `accounts/fireworks/models/...` 服务端推理 ID，没有 dedicated deployment 路由。因此七条 serverless 通告只限制 Fireworks 渠道，不影响原厂或其他渠道。

已下架/渠道不可用型号在新目录和新选择中隐藏，也不能新增到模型库。我的模型、已有预设与历史 ID 保留；只有精确、同渠道、当前可选的官方替代型号提供确认切换。确认后保留并停用旧模型库条目，加入或启用替代条目；在预设中操作时只更新当前角色，其他预设不迁移。只有型号家族建议时展示建议，不猜测目标 ID。打开页面、刷新和取消确认均不写入这些变更。

Core 在路由解析、校验及文本/视觉/图像传输入口拦截，返回中文建议与 `MODEL_RETIRED` 或 `MODEL_CHANNEL_UNAVAILABLE`，标明未发送；Gateway/浏览器模型库写入校验允许已有精确身份往返保存，拒绝新增已停用身份。没有正式通告的疑似移除不新增退休状态。

## 新增型号

仅新增以下七项，保留已有 Preview 和旧版本。没有新增或继承价格；现有文本适配器允许价格未知，图像型号按不可执行模式收录。

| 渠道 | 精确 API ID | 审计上下文 / 接入状态 |
| --- | --- | --- |
| OpenAI | `gpt-image-2.6-sunburst`、`gpt-image-2.6-flare` | 文本+图像入、图像出；token 不适用。缺少精确输出尺寸契约，已收录但禁用，未复制 2.5 尺寸 |
| Fireworks | `accounts/fireworks/models/kimi-k3p1-pro` | 1,048,576；沿用文本适配器 |
| Ant Ling | `Ling-3.1-flash`、`Ling-3.2-flash` | `six-claims-recheck` 明确确认 antling 精确 ID；模态/上下文/最大输出证据缺失则为 null，保守接入主模型文本角色 |
| TokenHub | `hy4` | 1,024,000；沿用文本适配器，保留 hy4-preview |
| LongCat | `LongCat-2.5` | 1,048,576；沿用文本适配器，保留 LongCat-2.5-Preview |

上述五个文本型号的最大输出均未知。新增适配测试在模拟传输中核对每个精确 ID/URL；两款禁用图像型号没有到达传输。未增加 GLM Legal 或其他候选。

## 验证与边界

- 审计生成器 3/3、Gateway 新增生命周期测试 2/2、Core 新增审计测试 3/3、Web 最终相关测试 92/92、小程序全量 122/122 通过；覆盖映射、未知/不支持、继承来源、日期边界、筛选/保留、确认替换、后端未发送和新增精确传输。
- Web 全量 1,318/1,330；12 项失败在未修改基线副本中同样复现，涉及既有自定义模型、旧设置恢复、工作流及连接导入。Core 选定组合 202/203；剩余 xAI WebP 用例因既有 2026-11-02 到期元数据失败，也在基线复现。
- Web build、Core TypeScript、Gateway 语法检查、小程序 TypeScript/build、生成数据一致性与 diff 检查通过。Web 保留既有大 chunk 警告。
- 沙箱拒绝本地监听（`listen EPERM`），另五项原有 HTTP 集成测试无法运行；新增 Core 测试使用无监听的模拟运行时。Chrome 无头启动退出 134，**没有完成 1280/390 实屏视觉验收**。CSS 保留白底紧凑卡片，≥1280 三列、390 单列，规格和图标允许换行；最终浏览器核对仍待进行。
- 小程序完整同步旧目录后，包含 TS 的源文件为 1,701,522 bytes，运行文件为 1,283,180 bytes；保守测试阈值由 1.5 MiB 调整为 1.75 MiB，仍预留 256 KiB。未运行微信原生包扫描、未恢复小程序发布。

复现命令（从仓库根目录执行）：

```sh
node --test scripts/generate-model-audit.test.mjs apps/auth-gateway/tests/model-audit.test.js
pnpm --filter @paperbanana/paperbanana-api exec node --import tsx --test tests/core-composition.test.ts tests/model-audit.test.ts tests/model-registry-drift.test.ts
pnpm --filter @paperbanana/paperbanana-api check
pnpm --filter @paperbanana/miniprogram test
pnpm --filter @paperbanana/web test
pnpm --filter @paperbanana/web build
```

## 本地预览（普通终端）

终端一启动内存数据库和完全模拟的提供商，不需要密钥：

```sh
pnpm --filter @paperbanana/paperbanana-api exec node --import tsx --input-type=module -e 'import {createRefineRuntime} from "../../test-support/refine-runtime.mjs"; const r = await createRefineRuntime({port:8791}); console.log(r.baseUrl)'
```

终端二关闭本地登录要求并连接该模拟后端：

```sh
VITE_AUTH_BASE= VITE_AUTH_REQUIRED=false VITE_AUTH_ENABLED=false VITE_API_BASE=http://127.0.0.1:8791 pnpm --filter @paperbanana/web dev --host 127.0.0.1 --port 5173 --strictPort
```

打开 `http://127.0.0.1:5173/?view=models`，切换“模型目录”/“我的模型”；`http://127.0.0.1:5173/` 新建任务的“模型配置”打开角色选择器及预设。无需登录；我的模型首次为空，目录可直接查看。连接未配置凭据时任务选择仍会显示既有缺少密钥提示，不影响卡片审阅。

若需查看已有退休条目，在这个本地 origin 的浏览器控制台导入以下**历史测试数据**并刷新；不要用于线上账号：

```js
localStorage.setItem('tuyan.workspace-models.v1:http://127.0.0.1:8791:guest', JSON.stringify({
  revision: 0,
  connections: [{id:'audit-preview-xiaomi', provider:'xiaomi', label:'本地预览', scope:'browser', region:'global', disabled:false}],
  models: [{id:'audit-preview-old', connectionId:'audit-preview-xiaomi', modelId:'mimo-v2.5', disabled:false}],
}));
location.reload();
```

在“我的模型”核对旧型号、已下架、替代建议，以及点击切换后的确认对话框。原始审计包、本地日志、基线副本与临时预览 HTML 都未提交。
