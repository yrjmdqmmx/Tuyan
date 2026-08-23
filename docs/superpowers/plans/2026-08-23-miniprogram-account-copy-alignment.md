# 小程序账户设置文案与对齐修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正账户设置弹层的退出按钮居中与修改密码可见文案，同时保持 8–128 位底层安全校验。

**Architecture:** 在现有 `account-settings` 组件内做最小模板和样式变更，不调整组件状态或接口。现有 Node 契约测试同时约束可见文案和底层 maxlength，防止隐藏最大值时误删安全限制。

**Tech Stack:** 微信小程序 WXML/WXSS、Node.js `node:test`、TypeScript

---

### Task 1: 修正账户设置可见文案与退出按钮对齐

**Files:**
- Modify: `apps/miniprogram/tests/account-settings-security.test.cjs`
- Modify: `apps/miniprogram/miniprogram/components/account-settings/account-settings.wxml`
- Modify: `apps/miniprogram/miniprogram/components/account-settings/account-settings.wxss`

- [ ] **Step 1: 写失败测试**

在现有账户安全契约测试中断言：WXML 包含“输入当前密码并设置新密码。修改成功后，其他设备需要重新登录。”和两个新 placeholder；可见模板不含 `128 位`；`maxlength="128"` 仍存在；`.logout-button` 使用 flex 双轴居中。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `node --test tests/account-settings-security.test.cjs`

Expected: FAIL，失败原因是旧文案仍展示 `8–128 位`，退出按钮尚无 flex 居中规则。

- [ ] **Step 3: 写最小实现**

将说明改为“输入当前密码并设置新密码。修改成功后，其他设备需要重新登录。”，placeholder 改为“输入当前密码”和“设置新密码（至少 8 位）”，aria-label 隐藏最大值但保留最小要求；为 `.logout-button` 增加 `display:flex; align-items:center; justify-content:center;`。

- [ ] **Step 4: 验证 GREEN 和回归**

Run: `node --test tests/account-settings-security.test.cjs && node --test tests/*.test.cjs && npm run check && npm run build && git diff --check`

Expected: 全部测试、检查和构建通过。

- [ ] **Step 5: 同步与视觉验收**

对上传副本做单文件 checksum dry-run，只同步三个受控文件；确认 `project.private.config.json`、`.claude/settings.local.json`、`sealos-signin.png` 未变化。在微信开发者工具 430px 和 320px 宽度检查按钮居中、文案换行和输入框无溢出，然后覆盖上传 3.0.1。

- [ ] **Step 6: 提交**

Run: `git add apps/miniprogram/tests/account-settings-security.test.cjs apps/miniprogram/miniprogram/components/account-settings/account-settings.wxml apps/miniprogram/miniprogram/components/account-settings/account-settings.wxss docs/superpowers/plans/2026-08-23-miniprogram-account-copy-alignment.md && git commit -m "fix(miniprogram): polish account security copy"`
