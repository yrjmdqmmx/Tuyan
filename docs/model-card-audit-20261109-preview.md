# 第二轮本地截图夹具（仅开发预览）

此片段只用于独立的本地预览 origin，不进入生产代码路径、不含密钥、不发送模型请求。模型库 7 条，其中 2 条已移除、5 张卡片；另有两份普通预设任务草稿。请使用无其他业务草稿的浏览器配置文件。不要点击生成或优化。

## 启动

在普通终端运行两个进程；受限沙箱无法监听端口时须在沙箱外由审阅人启动：

```sh
pnpm --filter @paperbanana/paperbanana-api exec node --import tsx --input-type=module -e 'import {createRefineRuntime} from "../../test-support/refine-runtime.mjs"; const r = await createRefineRuntime({port:8791}); console.log(r.baseUrl)'
```

```sh
VITE_AUTH_BASE= VITE_AUTH_REQUIRED=false VITE_AUTH_ENABLED=false VITE_API_BASE=http://127.0.0.1:8791 pnpm --filter @paperbanana/web dev --host 127.0.0.1 --port 5173 --strictPort
```

后端为现有内存数据库 / 模拟提供商；无需登录、无需 API Key。模拟目录中 TokenDance 返回空列表，OpenRouter/fal/Runware/Novita 等远程读取失败，均不访问真实网络。

## 精确夹具

先打开 `http://127.0.0.1:5173/brand/tuyan-logo-transparent.png`（同源图片页，避免已挂载应用覆盖写入），在浏览器控制台粘贴以下完整片段。它保存模型库和 legacy 草稿到 localStorage，并通过现有缓存 API 写入该本地 guest 的 IndexedDB 快照；当前工作台优先读 IndexedDB，单写 legacy localStorage 无法覆盖已存在快照。

```js
const { API_BASE_DEFAULT: base, AUTH_BASE_DEFAULT: authBase } = await import('/src/config.js');
if (location.hostname !== '127.0.0.1' || base !== 'http://127.0.0.1:8791') throw Error('仅限 R2 本地预览');
const pairs = [
  ['xiaomi', 'mimo-v2.5'],
  ['fireworks', 'accounts/fireworks/models/glm-5p2'],
  ['bailian', 'qwen3.5-plus'],
  ['antling', 'Ling-3.1-flash'],
  ['antling', 'Ling-3.2-flash'],
  ['openai', 'gpt-6.1-sol'],
  ['antling', 'Ling-3.0-tiny'],
];
const library = {
  revision: 0,
  connections: [...new Set(pairs.map(([provider]) => provider))].map(provider => ({ id: provider, provider, label: `R2 ${provider}`, scope: 'browser', region: 'global', disabled: false })),
  models: pairs.map(([connectionId, modelId], i) => ({ id: `m${i}`, connectionId, modelId, disabled: false })),
};
localStorage.setItem(`tuyan.workspace-models.v1:${base}:guest`, JSON.stringify(library));
const { newWorkspace, newTask } = await import('/src/workspace/workspaceState.js');
const { createWorkspaceCache } = await import('/src/workspace/workspaceSync.js');
const state = newWorkspace('audit-r2-removed');
state.tasks.push(newTask('audit-r2-scheduled', 'svg'));
state.tasks.forEach((task, i) => {
  task.title = i ? 'R2：将下线确认' : 'R2：已移除的预设';
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

## 截图路径

- 模型管理 → **我的模型**：顶部显示两条独立的空槽提示；小米提示 `mimo-v2.6-flash`，Fireworks 提示 `accounts/fireworks/models/glm-5p3`。没有这两个旧型号的卡片或切换按钮。该页计数 5；localStorage 内 `models.length` 仍是 7。
- 我的模型 → 接入渠道 **阿里云百炼** → 厂商 **阿里巴巴** → `qwen3.5-plus`：角色行小徽标“将下线”；悬停底部“下线公告”查看日期、替代 API ID、核实日期及来源。卡片替代建议放在 tooltip，避免底部多按钮挤出卡片；触屏点击来源打开现有对话框。
- 我的模型 → **蚂蚁百灵** / **蚂蚁集团**：搜索 `Ling-3.1-flash` 或 `Ling-3.2-flash`。3.1 输入只有文本已知，其余图标带灰问号；3.2 为文本/图像/视频已知，音频未知。`Ling-3.0-tiny` 展示上下文和最大输出“未知”。搜索仅作用于当前渠道和厂商。
- 我的模型 → **OpenAI** / **OpenAI** → 搜索 `gpt-6.1-sol`：输入和输出各一条灰色“模态未知”，没有八个问号图标。
- **模型目录**查看这些型号时先选对应渠道与厂商，再搜索同一精确 ID；旧型号在任何渠道的同名模型中可能仍存在，本轮删除按渠道精确匹配。
- **已移除的预设字段**：打开 `http://127.0.0.1:5173/` → 侧栏“草稿” → **R2：已移除的预设** → 输入框工具栏 **模型配置**。普通预设下的“主模型”触发按钮显示“原型号已不可用，请重新选择，可改选 mimo-v2.6-flash”；点击可重新选择。打开、关闭、刷新都不改旧引用。不要点击“应用此连接的默认组合”，那是另一个显式修改操作。
- **将下线确认弹框**：侧栏“草稿” → **R2：将下线确认** → **模型配置** → 主模型下面的 **切换到 qwen3.8-flash**。弹框含“取消”和“确认切换”，桌面右对齐，移动端底部弹层并排。取消不写数据；确认仅切换该草稿当前角色，并保留/停用旧模型库条目，其他草稿保持原样。无密钥仍可审阅此配置操作。
- 桌面用 1280px 或更宽截图；移动端用 390px。移动侧栏若折叠，先打开左上角导航。

## 恢复夹具

重复上述图片页控制台片段即可恢复本地 7 条库记录及两份草稿。片段只改该预览 origin 的 guest 快照，不读取凭据，不登录账号，不接触线上数据。`scripts/count-model-catalog.mjs` 和 Gateway 往返测试使用相同的 7 个渠道/ID 对。
