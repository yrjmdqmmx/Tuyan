# 第三轮本地截图夹具（仅开发预览）

此片段只用于独立的本地预览 origin，不进入生产代码路径、不含密钥、不发送模型请求。模型库 13 条，其中 3 条已移除、10 张卡片；另有两份普通预设任务草稿。请使用无其他业务草稿的浏览器配置文件。不要点击生成或优化。

## R14 启动与 TokenDance 模式

仓库根目录运行。后端三选一；省略环境变量时默认为 `snapshot`：

```sh
# 119 条公开目录快照；65 张可见且可选的 TokenDance 卡
TUYAN_PREVIEW_TOKENDANCE_CATALOG=snapshot pnpm --dir apps/paperbanana-api exec node --import tsx ../../test-support/refine-runtime.mjs
# 空目录：72 张非到期卡保留、置灰，显示“暂时无法确认”，禁止选择
TUYAN_PREVIEW_TOKENDANCE_CATALOG=empty pnpm --dir apps/paperbanana-api exec node --import tsx ../../test-support/refine-runtime.mjs
# 目录超时：与空目录相同，不把历史缺席状态当成本次确认
TUYAN_PREVIEW_TOKENDANCE_CATALOG=timeout pnpm --dir apps/paperbanana-api exec node --import tsx ../../test-support/refine-runtime.mjs
```

另开终端启动 Web，然后打开 `http://127.0.0.1:5173/?view=models` → 模型目录 → 观猹 TokenDance：

```sh
node test-support/model-card-preview-web.mjs
```

此 Web 启动器固定本地 API `http://127.0.0.1:8791`、关闭登录，使用 Vite `envFile:false`，不读 `.env`。后端为内存数据库和模拟提供商，不读取真实凭据，不访问真实模型。模式开关仅在 `test-support` 中；切换后端模式后刷新目录即可，已有连接、模型及角色选择不自动删除或替换。`snapshot` 和计数脚本共用 `config/channel-audit/tokendance-catalog-snapshot-20261109.json`：操作方于 2026-11-09 约 19:43 UTC+8 无认证 GET 公共目录，119 条；只保留 id/name/created/context_length/supported_protocols。两张有独立到期证据的 MiMo 2.5 卡继续按原生命周期隐藏。

2026-11-09 本沙箱实测两个启动命令分别在 `127.0.0.1:8791` / `127.0.0.1:5173` 报 `listen EPERM`。Browser 插件缺失、`pnpm --dir apps/web exec playwright --version` 报 command not found；1280/390 实屏截图仍需在可监听的本地终端运行。自动化已验证真实 Core 结果驱动 Web DOM、编译小程序状态、灰色样式和禁止选择，不能替代浏览器或微信原生验收。

## 精确夹具

先打开 `http://127.0.0.1:5173/brand/tuyan-logo-transparent.png`（同源图片页，避免已挂载应用覆盖写入），在浏览器控制台粘贴以下完整片段。它保存模型库和 legacy 草稿到 localStorage，并通过现有缓存 API 写入该本地 guest 的 IndexedDB 快照；当前工作台优先读 IndexedDB，单写 legacy localStorage 无法覆盖已存在快照。

```js
const { API_BASE_DEFAULT: base, AUTH_BASE_DEFAULT: authBase } = await import('/src/config.js');
if (location.hostname !== '127.0.0.1' || base !== 'http://127.0.0.1:8791') throw Error('仅限 R4 本地预览');
// Shared with the count script and Gateway round-trip test.
const { default: pairs } = await import('/tests/fixtures/model-card-preview.json');
const library = {
  revision: 0,
  connections: [...new Set(pairs.map(([provider]) => provider))].map(provider => ({ id: provider, provider, label: `R4 ${provider}`, scope: 'browser', region: 'global', disabled: false })),
  models: pairs.map(([connectionId, modelId], i) => ({ id: `m${i}`, connectionId, modelId, disabled: false })),
};
localStorage.setItem(`tuyan.workspace-models.v1:${base}:guest`, JSON.stringify(library));
const { newWorkspace, newTask } = await import('/src/workspace/workspaceState.js');
const { createWorkspaceCache } = await import('/src/workspace/workspaceSync.js');
const state = newWorkspace('audit-r4-removed');
state.tasks.push(newTask('audit-r4-scheduled', 'svg'));
state.tasks.forEach((task, i) => {
  task.title = i ? 'R4：将下线确认' : 'R4：已移除的预设';
  task.automaticTitle = false; task.path = 'svg';
  const entry = library.models[i ? 2 : 0];
  const draft = task.branches.svg.draft;
  draft.text = '本地模型卡截图，不执行生成。';
  draft.settings.simple.models = { main: { libraryModelId: entry.id, connectionId: entry.connectionId, accessProvider: entry.connectionId, modelId: entry.modelId } };
});
localStorage.setItem('tuyan.workspace-ui-preview.v1', JSON.stringify({ state }));
const key = `workspace-v1:${authBase || location.origin}:guest`, cache = createWorkspaceCache();
const prior = await cache.read(key);
await cache.write(key, prior?.cacheRevision || 0, { state, base: null, revision: 0, importedGuest: false });
sessionStorage.removeItem(`${key}:tab`);
location.href = '/?view=models';
```

## 截图路径（桌面 1280 / 移动 390）

基线为 main `c7b6a2fc`；`00d04cee` 的第三轮行为合并后仍保留。R4 夹具另含 `Ling-3.0-flash-VL`，共 13 条库记录、10 张卡、3 条移除引用。

先进入 `http://127.0.0.1:5173/?view=models` → **我的模型**。所有路径都只读本地夹具；本轮没有真实提供商调用。

| 验收项 | UI 路径及预期 |
| --- | --- |
| 4 · 过滤隔离 | 我的模型 → 接入渠道 **阿里云百炼** → 厂商 **阿里巴巴**：两张 qwen 卡；顶部没有小米或 Fireworks 移除提示。 |
| 4 · 合并通知 | 我的模型 → **小米 MiMo** → **小米**：只有一个“2 个已保存型号已不可用”通知；点击展开，分别列出 `mimo-v2.5` 与 `mimo-v2.5-pro`，带渠道名和 `MiMo-V2.6-Flash` / `MiMo-V2.6-Pro` 建议；无旧卡片。只有已移除型号的渠道仍可筛选，计数为 0。 |
| 4 · 简短替代名 | 我的模型 → **Fireworks** → **智谱**：一条含 `accounts/fireworks/models/glm-5p2` 的提示，替代名为目录展示名 `GLM 5.3`，不显示冗长的替代 API ID。 |
| 5 · 已移除角色槽 | 打开 `/` → 侧栏“草稿” → **R4：已移除的预设** → 工具栏 **模型配置**：主模型触发按钮为“请选择”；下方只有“原型号 mimo-v2.5 已不可用，可改选 mimo-v2.6-flash”，旁边“改选”。点击进入既有确认弹框；取消不写入，确认仅更新当前角色引用。打开、关闭和刷新不自动替换。 |
| 6 · 完整 ID 与徽标 | 我的模型 → **阿里云百炼 / 阿里巴巴**：`qwen3.5-plus`、`qwen3.5-plus-2026-04-20` 的浅色“将下线”徽标紧邻标题，API ID 行不含此徽标。悬停徽标，或触屏点击，显示 `2027-01-19` 和 `qwen3.8-flash`。 |
| 2 / 6 · Ling 下线卡 | 我的模型 → **蚂蚁百灵 / 蚂蚁集团**：`Ling-2.6-1T`、`Ling-2.6-flash`、`Ring-2.6-1T` 均保留卡片和选择能力；标题旁徽标显示 `2026-11-15 00:00 (UTC+8)`、替代 `Ling-3.1-flash`。 |
| 3 · Ling 规格 | 同一渠道搜索 `Ling-3.1-flash` / `Ling-3.2-flash`：上下文 `≈ 1M tokens`，悬停值为 `1,048,576 tokens`。3.1 仅文本输入已知；3.2 文本/图像/视频已知，音频未知。`Ling-3.0-tiny` 的上下文和最大输出仍为“未知”。底部来源 tooltip 含完整 URL。 |
| R4 C · Ling 视频来源 | 我的模型 → 蚂蚁百灵 → 搜索 `Ling-3.0-flash-VL`：文本/图像/视频已知，音频为灰色问号；输出未列模态也为灰色问号。来源详情含 Chat API、型号页及 image_url / video_url 说明。 |
| R4 A · 既有规格回退 | 模型目录 → 月之暗面 Kimi → `kimi-k3`：文本/图像、1M tokens；来源详情明确“图研既有核实”和既有日期。 |
| R4 I · 多连接区分 | 在模型管理创建两个同名、同渠道的本地连接并各加入同一型号；我的模型显示“连接名 · 连接 ID”，选择器显示连接说明及已核实的思考状态。 |
| 3 · 262K / 最大输出 | **模型目录** → 蚂蚁百灵 → 搜索 `Ling-3.0-flash`：原生窗口 `≈ 262K tokens`、精确值 `262,144 tokens`；模型目录 → 观猹 TokenDance → `deepseek-v4-pro`（snapshot 可选，empty/timeout 可见但置灰）：最大输出 `≈ 393K tokens`、精确值 `393,216 tokens`。K/M 为生产十进制规则，不改为二进制 384K。 |
| 将下线确认 | 草稿 → **R4：将下线确认** → 模型配置 → 主模型下方“切换到 qwen3.8-flash”：取消与确认按钮保留；确认后原型号在我的模型仍保持原启用状态，其他预设不变。 |
| 1 · StepFun 空默认 | 模型管理 → 添加一个无需填写密钥的阶跃连接 → 返回普通预设配置 → 选择该连接 → “应用此连接的默认组合”：绘图槽显示“此连接暂无默认绘图模型”。此动作无需调用模型。 |

**模型目录**也可按相同渠道/厂商/精确 ID 查看卡片。旧型号可能在其他渠道存在，删除和提示按渠道精确匹配。移动侧栏折叠时先打开左上角导航。

四行规格和 API ID 的完整 DOM、标题徽标位置、触屏点击信息、无意外选择均有自动化回归；本沙箱 Chrome 启动退出 134、本地监听 EPERM，无法产出真实 1280/390 截图。请在可运行浏览器的本地终端按表截图，不能把 DOM/CSS 验证视为实屏验收。

## 恢复夹具

重复图片页控制台片段，恢复 13 条库记录及两份草稿；计数为 10 张卡、3 条移除引用。片段只改该预览 origin 的 guest 快照，不读取凭据、不登录账号、不接触线上数据。`apps/web/tests/fixtures/model-card-preview.json` 是计数脚本、Gateway 往返测试和预览的同一份夹具。
