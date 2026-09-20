# Universal API Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 用户自有密钥和准确模型 ID 通过实际协议适配器进入现有图研流程，并安全恢复。

**Architecture:** 共享纯函数契约负责 URL、能力、地址绑定和目录行隔离；Node 层负责安全传输与协议编解码；现有 Core 工作流仅增加 custom 路线桥接。Web 独立保存通用配置草稿，既有普通/专业路线不覆盖。

**Tech Stack:** TypeScript、Node 24/undici、Mongo 加密步骤存储、React/Vite、微信 TS/JS 共享契约。

## 1. 协议与纯契约
- [x] `docs/universal-api/protocol-matrix.md` 记录官方来源、核验日期和实际首版范围。
- [x] 新增 `packages/api/src/universal-api.ts`：协议定义、`normalizeUniversalRoute`、`normalizeUniversalBaseUrl`、`universalCredential`、显式模型能力与逐条目录校验。无 Node IO，可被 Web 与 Core 共享。
- [x] `apps/paperbanana-api/tests/universal-api.test.ts` 覆盖以下实际约束：
  ```ts
  assert.equal(normalizeUniversalBaseUrl('https://example.com/v1/', 'openai-chat'), 'https://example.com/v1')
  assert.throws(() => normalizeUniversalBaseUrl('https://example.com/v1/chat/completions', 'openai-chat'))
  assert.throws(() => universalCredential(routeB, credentialBoundToA))
  ```

## 2. 安全传输与适配
- [x] `apps/paperbanana-api/src/universal-transport.ts`：公网 HTTPS、DNS 全记录校验、连接地址固定、禁止重定向、可中止超时、有界读取、无凭据资产下载；已知官方主机复用现有出口。
- [x] `apps/paperbanana-api/src/universal-adapters.ts`：七协议族和两兼容变体，以显式协议/能力编码解码，不推断模型名称；模型 POST 一次，异步/流式未完成结果不得重发。
- [x] `apps/paperbanana-api/tests/universal-transport.test.ts` 注入模拟 DNS/transport，断言 `paidCalls===0` 对本地拒绝、`paidCalls===1` 对未知结果。

## 3. 现有流程桥接
- [x] `apps/laf-functions/paperbanana-api.ts`：可选 custom 路由、准入、实际阶段能力、统一参考图预算、协议适配 hook、只读配置/目录 action。
- [x] `apps/paperbanana-api/src/main.ts` 配置安全 runtime；`provider-workflow.ts` 纳入 custom，加密凭据、成功步骤复用、未知结果不重放。
- [x] `packages/api/src/execution-errors.ts` 接受受控中文协议错误并保留计费边界；生成脚本同步共享代码。
- [x] `apps/auth-gateway/src/app.js` 只开放指定认证 action，并继续过滤用户身份和日志敏感字段。

## 4. Web 与客户端
- [x] `apps/web/src/components/UniversalApiSettings.jsx` 和 `apps/web/src/lib/universalApi.js`：独立草稿、按角色配置/复用、非敏感保存、只读检查、中文状态；地址变化清除密钥绑定。
- [x] `apps/web/src/App.jsx` / `ModelRoutingSettings.jsx` / `modelRouting.js`：与现有流程、摘要、上传预算和任务恢复连通；切回预设保留原选择。
- [x] `apps/miniprogram` / `packages/types` 同步可选契约和恢复提示；不把未实现的原生配置入口描述为可用。
- [x] Web DOM tests 模拟配置、切换、目录异常和提交，断言准确模型 ID/地址绑定与原输入不变。

## 5. 验证与发布
- [x] `node scripts/sync-model-catalog.mjs --check`；Core check/test/build、Web test/build、Mini compile/test、Gateway test 和相关契约检查全部通过。
- [x] SYNC 顶部列共享变更和各端状态；无付费调用。
- [ ] PR 完整 CI 后合并；按现有固定 SHA、镜像 digest、正常环境审批发布 Gateway/Core/配套 Worker 与 Pages。
- [ ] 只读 readiness、实际 provenance、协议目录/配置负向校验、Chrome UI、发布产物哈希核验；记录仍未验证的真实服务与外部平台状态。
