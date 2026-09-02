# 三输入栏 AI 优化设计

## 目标

为 Web 生成页的“论文方法内容”“目标图注”“负向提示词”分别增加“优化输入”。一次操作只调用当前生效的 `main` route 及其 Provider Key 一次；不建立持久化 Connection，不调用 image/vision route，不保存输入、候选或 Key。

## 产品行为

- 论文方法内容与目标图注必须已有非空文本；负向提示词可以从空白开始，但三栏不能同时为空。
- 优化目标栏之外的两栏仅作为只读上下文。统计图与其他信息图使用同一规则，不做特殊分支。
- 点击按钮即代表发起一次文本调用；页面不展示模型名称或费用。缺少当前主模型或对应 Key 时不调用，而是打开生成设置并聚焦缺失项。
- 使用模态对比弹窗：桌面双栏、移动端上下排列，分别展示原文和带差异标记的候选稿。
- 候选成功后可重新优化、取消或采用。重新优化是新的单次调用；取消、关闭与失败均不修改输入。
- 采用只更新目标栏，并提供一次“恢复优化前内容”。手工编辑或应用模板使旧恢复失效；再次采用以新快照替换旧快照。

## 公开契约与执行边界

`modelRegistry` 顶层新增 `inputOptimizationContractVersion: 1`。Web 仅在该版本存在时显示入口。

请求：

```json
{
  "action": "optimizeInputs",
  "target": "methodContent",
  "inputs": {
    "methodContent": "...",
    "caption": "...",
    "negativePrompt": "..."
  },
  "mainRoute": {
    "accessProvider": "bailian",
    "modelId": "qwen3.8-max"
  },
  "apiKey": "..."
}
```

成功响应：

```json
{
  "code": 0,
  "target": "methodContent",
  "optimizedText": "..."
}
```

共享客户端只发送一个 main route 和一个 Key。Gateway 严格白名单转发并执行维护门禁，使用 50 秒 action 专属超时。Core 使用 45 秒 Provider 超时，最多执行一次 Provider HTTP 请求，禁止网络重试、模型回退和图片输入。

Core 复用现有输入上限：方法 12,000、图注 1,000、负向提示词 1,000 字符。保守学术润色保持原语言、禁止新增科研事实，并保护可确定识别的数字及单位、百分比、LaTeX、引用、URL/DOI。空白、无变化、超长或破坏保护 token 的候选失败关闭。

## 安全与失败

- Key 只存在于单次请求闭包，不落库、不进入任务记录或日志。
- 稳定区分请求无效、main route 无效、Key 缺失、Provider 超时、Provider 失败、候选无效/无变化。
- 公开错误不回显 Key、Provider 原始响应、内部地址或凭据相关细节。
- 旧后端未声明能力时隐藏入口；部署顺序为 Core/Gateway 先于 Pages。

## 验收

TDD 覆盖共享 DTO、Gateway 白名单/维护/超时/脱敏、Core 路由和单次调用、三类提示词与科研 token 保护，以及 Web 能力门禁、缺配置引导、弹窗、差异、采用、重新优化、取消和单步恢复。发布后只做非计费健康/API/UI 验收；真实成功 smoke 需要新的明确付费授权。
