# 他山科研生态

用户在 2026-10-20 确认：入口命名为「他山科研生态」，紧接「排行榜」；三个项目统一呈现，不分在线工具与 Agent 插件；VizNoir、Semiotic、DataViz 均须在图研内实际使用，包含服务器适配。

## 界面与使用

沿用已有任务工作台的白色内容区、浅灰导航、绿色主操作、Lucide 线性图标。展开、收起、移动侧栏均提供同序入口。生态页面显示三个同级工具，选择后在同一页面操作，提供返回全部工具、来源链接、输入校验、执行状态、预览和下载。保持原创作任务、草稿、账号和模型配置。

- Semiotic：CSV/JSON 表格输入，选择折线、散点、柱状或桑基图及字段，真实渲染 SVG；页面支持缩放与数据查看，导出 SVG。
- VizNoir：内置明确标为示例的科学数据，或用户上传单文件 VTK/VTU/VTP/STL；选择字段、色标、视角，实际调用 VizNoir 渲染 PNG。首版不冒充支持多文件 OpenFOAM、仿真求解或实时三维编辑。
- DataViz：CSV/JSON 表格输入和经过审核的可视化模板，真实使用 DataViz 与 Panel 生成可交互的 HTML。允许数据、字段和有限参数，不接受用户 Python、脚本、URL 或任意模板。

首版的数据与结果仅保留当前页面，支持下载；切换账号或离开页面清理。示例不写入创作历史，不调用付费模型。错误必须明确呈现，不以示例替代失败的真实任务。

## 服务边界

浏览器 → 现有认证 Gateway 的 `/api/ecosystem` → 新增独立 ecosystem-worker。Worker 为 Python HTTP 服务，Semiotic 由受控 Node 子进程渲染，另外两项由 Python 包执行。API 使用 JSON，二进制和 HTML 统一 base64 返回，不公开用户文件路径或持久结果 URL。

请求：`POST /api/ecosystem/render`，`{tool, data?, file?, options?}`。

- tool：`semiotic | viznoir | dataviz`。
- data：有界的对象行数组；最多 5,000 行、40 列，单元格仅字符串/有限数字/null。
- file：`{name,base64}`，最多 5 MiB，严格扩展名和格式核验；上传路径由服务端创建。
- options：每个工具独立有限字段与枚举；未知工具、代码、文件路径和 URL 不执行。
- 成功：`{tool,format,base64,filename,engineVersion,summary}`，format 为 svg/png/html。
- 失败：有界可读错误与合适 HTTP 状态，不返回堆栈和内部环境。

Gateway 沿用当前 session、可信 Origin、`X-Workspace-Account`、维护状态，设置 no-store，限制账号请求频率与并发。不改现有模型调用链。Worker 接受内部 Bearer token，令牌不传浏览器；渲染子进程具有超时、输出大小、并发限制和独立临时目录，工作完成清理。部署为独立非 root、资源受限、无业务密钥的容器。HTML 以允许脚本但无 same-origin 的沙箱 iframe 展示，内联依赖并限制网络；禁止任意 Python 的公开编辑器。

## 验收与发布

验证三个真实引擎、用户自定义数据、坏文件/非法字段/超限输入、未登录/跨账号/外源请求、超时清理、并发限制；浏览器验证桌面和移动布局、导航顺序、三项操作与导出、原草稿保留。

从线上 d8bc9a90732069233ed81ac9209de62fbfa9a9d1 的独立工作树开发。另一工作树的移动端未提交修改不覆盖。生产操作遵循当前 AGENTS 和杭州发布协议，先形成可审阅、已验证的变更再确定发布步骤；不自动重做此前真实付费验收。
