# 他山科研生态 Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the isolated rendering worker and separate specification/code review. The coordinator owns gateway, web integration and deployment verification.

**Goal:** 在排行榜下新增统一「他山科研生态」入口，使三项工具在图研内实际运行。

**Architecture:** 认证网关代理独立渲染服务，三个引擎共用有界 JSON 请求和 base64 结果契约。前端以既有工作台样式提供文件/数据输入、有限参数、结果预览与导出。

**Tech Stack:** React 19 / Vite、Express 4、Python 3.12、VizNoir 0.10.1、DataViz MCP 0.3.1、Semiotic（锁定实测版本）、Docker。

## Task 1 — 独立引擎服务

Files: `apps/ecosystem-worker/{app.py,schemas.py,render_job.py,viznoir_renderer.py,dataviz_renderer.py,requirements.txt,Dockerfile,README.md}`, `apps/ecosystem-worker/node/{package.json,package-lock.json,render.mjs}`, `apps/ecosystem-worker/tests/`。

- [ ] 定义 spec 中 `{tool,data,file,options}` 与 `{tool,format,base64,filename,engineVersion,summary}`，鉴权在解析执行前完成。以 `Authorization: Bearer <ECOSYSTEM_WORKER_TOKEN>` 保护 `/render`，`/health` 仅返回状态与引擎版本。
- [ ] 使用真实依赖实现三个引擎；CSV 在前端解析为对象行；后端再次严格验证数据与选项。示例 VizNoir 数据由确定性公式生成并标记 synthetic。
- [ ] 子进程超时、输出上限、信号退出、临时目录清理、共享并发边界及结构化错误。未知键不流入 Python/JS 参数。
- [ ] 在隔离 venv 内安装锁定依赖；运行 `python -m pytest apps/ecosystem-worker/tests`。三个引擎必须各有真实成功样例，输入变化应改变结果。
- [ ] 用独立 reviewers 先核查范围，再审查质量；修复具体发现并复验。

## Task 2 — Gateway

Files: `apps/auth-gateway/src/ecosystem.js`, `src/app.js`, `src/config.js`, `tests/ecosystem.test.js`。

- [ ] 注册 `/api/ecosystem` 在默认 1 MiB JSON parser 前。Origin/session/account/maintenance 检查沿用 workspace 路由模式。
- [ ] 服务 URL 和 token 从 `ECOSYSTEM_WORKER_URL`、`ECOSYSTEM_WORKER_TOKEN` 获取；缺少配置明确 503。配置固定部署地址，客户端不能提供目标 URL。
- [ ] 请求上限 8 MiB、单账号 1 并发、短窗口限频、有界读取及 90 秒调用超时；退出取消。认证材料仅用于内部调用，返回结果不含凭据。
- [ ] 验证无会话 401、错误 Origin 403、账号头错 409、未配置 503、服务错误与超限；正常响应不写历史、不调用 Core 模型。

## Task 3 — Web

Files: `apps/web/src/ecosystem/{ResearchEcosystem.jsx,ecosystem.css,client.js,data.js}`, `src/workspace/{TaskSidebar.jsx,TaskSidebarRail.jsx,TaskWorkspace.jsx,WorkspacePages.jsx}`, `tests/ecosystem.test.mjs`。

- [ ] 两种侧栏入口按 `排行榜 → 他山科研生态 → 资源与帮助` 排列；移动端点击关闭抽屉。
- [ ] 统一列表与三个工作面板；文件大小/CSV/JSON 解析、有界表格预览、字段选择、提交和明确错误。登录使用既有 account.onSignIn。
- [ ] 请求使用已有 API_BASE_DEFAULT 的 origin 和 credentials/include，附当前账号头。结果只属于触发请求的账号/工具，清除过期结果，页面离开取消。
- [ ] SVG/PNG 以图片预览；HTML 用 `sandbox="allow-scripts"`，不授予 same-origin；工具输出可下载且不执行顶层 HTML。
- [ ] 原工作区导航/草稿相关用例、数据解析/请求隔离用例、生产构建；浏览器验证三个真实结果与手机尺寸。

## Task 4 — 部署适配与交付

Files: `deploy/hangzhou/ecosystem/`, `SYNC.md`, `docs/operations/2026-10-20-tashan-ecosystem.md`。

- [ ] 独立容器的 read-only root、临时目录、非 root、内存/CPU/pids 限制、内部网络和 token；不重建数据库，不触及 OpenAcad/模型出口。
- [ ] 记录新增网关契约和小程序继续暂停，记录版本/许可证、真实测试结果和未通过项。
- [ ] 发布前核对最新生产基线并保留并发变更；遵守维护锁、活动任务检查、不可变镜像、备份、健康与回滚要求。
- [ ] 生产若仍需单独授权，在完整变更与验证可审阅后提出具体发布动作，不把本地通过标作线上完成。
