# 三输入栏 AI 优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Web 生成页增加三个独立、真实、失败关闭的输入优化入口。

**Architecture:** Web 通过共享 API 向 Gateway 发送目标栏、三栏快照、当前 main route 和单个 Key。Gateway 严格转发到 Core；Core 验证注册表和输入后，经现有文本 Provider 适配器发起一次无重试请求并同步返回候选。候选和撤销状态仅存在浏览器内存。

**Tech Stack:** React 19、Node.js、TypeScript、Express、现有 Laf 兼容 Core、Node test runner、Testing Library、Vite。

---

### Task 1: 固定共享请求契约

- [ ] 在 `packages/api/src/jobs.test.js` 写 RED：只发送一个 main route/key，旧后端明确拒绝。
- [ ] 运行定向测试并确认因缺少 `optimizeInputsRequest` 失败。
- [ ] 在 `packages/api/src/jobs.js` 实现最小请求函数并导出。
- [ ] 运行共享 API 测试转 GREEN，提交共享契约。

### Task 2: Gateway 真实转发边界

- [ ] 写 RED：严格 DTO、维护模式、单 Key 脱敏和 50 秒专属后端超时。
- [ ] 运行 Gateway 定向测试确认失败原因正确。
- [ ] 扩展 backend client 的每调用超时覆盖，加入 action 白名单和归一化。
- [ ] 运行 Gateway 全套测试转 GREEN，提交 Gateway 改动。

### Task 3: Core 单次优化

- [ ] 写 RED：能力版本、三目标校验、只读上下文、科研 token 保护和五 Provider 单次调用。
- [ ] 证明成功、网络异常与超时场景的 `runtimeFetch` 均不超过一次。
- [ ] 实现 `optimizeInputs`、专用提示词、45 秒 abort、候选校验和稳定错误分类。
- [ ] 运行 Core 全套测试与类型检查转 GREEN，提交 Core 契约。

### Task 4: Web 交互

- [ ] 写 RED：能力门禁、缺主模型/Key 引导、三入口空值规则和防重复调用。
- [ ] 写 RED：双栏/移动堆叠差异弹窗、重新优化、取消、采用与单步恢复。
- [ ] 实现有界 diff helper、可访问弹窗和 App 状态接线。
- [ ] 运行 Web 全套测试与构建转 GREEN，提交 Web 改动。

### Task 5: 完整验证与发布

- [ ] 更新 `SYNC.md` 完成勾选，运行受影响包全量测试、Core 类型检查、生产构建和秘密扫描。
- [ ] 运行本地桌面与 390px 浏览器验收并检查控制台。
- [ ] 创建 PR，等待完整 CI，通过 review 后合并并记录 merge SHA。
- [ ] 发布 merge SHA 的 Core/Gateway 不可变镜像；保留其他现网 digest 与 Bench 模式，部署香港并验证健康/就绪/能力/缺 Key失败关闭。
- [ ] 部署同一 SHA 的 Pages，完成桌面与移动生产 UI 验收；不运行真实 Provider smoke。
