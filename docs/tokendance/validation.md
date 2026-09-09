# TokenDance 本地验证记录

日期：2026-09-09。代码位于独立分支 codex/tokendance-integration-20260909，基于 origin/main 27aa954d168e7e0ed05d6b2251965161f8d66e30。16:33（北京时间）重新 fetch 后主线未变。原桌面工作区及上轮发布 worktree 保留，没有合并无关 #183 改动。

## 状态

|门槛|结果|
|---|---|
|资料与目录|完整读取索引、全文、68 个独立文档，逐一核对 93 个详情；67 份与全文规范化一致，docs-updates 差异已补读|
|本地实现|完成 canonical、Node Core、Gateway、Web、小程序源码/JS、共享契约、CI 和出口规则源码|
|本地数据库|真实隔离 MongoDB 8.0.16-noble 通过；其上游授权、模型、支付为测试桩|
|真实用户 OAuth|未执行，没有通过用户授权取得真实调用 Key|
|真实模型与图片质量|未执行，无付费模型调用；所有型号 verified:false|
|真实充值/到账|未执行，无真实支付或扣款|
|产品方价目|已读取产品后台展示的契约；未配置独立管理 Key，未调用真实管理价目接口|
|生产部署|未执行；未 push、运行线上 CI、部署 Core/Gateway/Web 或更新新加坡代理|
|微信平台|源码、类型、编译和测试完成；开发者工具/真机、上传及平台发布未执行|

浏览器测试只访问本地 127.0.0.1:5173 → 8791 的真实 Web/Gateway/Core 组合，以本地虚构账号运行。研究资料时访问官方页面和公开目录，不提取浏览器凭据。

## 型号与请求覆盖

93 个型号有唯一决策，62 个接入：60 主模型、60 输入优化、27 参考图识别/视觉评审、2 图像生成、2 直接精修，角色重叠。31 个未接入为 18 视频、6 音频、2 向量、3 搜索/阅读、2 专用 OCR。逐个 ID、模态、协议、角色与理由见 [完整表](model-coverage.md)。

2026-09-09 16:57:36 北京时间重新读取公开 models API，仍为 93 个，新增、下架、协议和描述/上下文变化均为零。公开 API 差异结果存档于 [live-model-drift.json](live-model-drift.json)。此检查不证明所有详情页之后未变化，亦不证明用户账号拥有每个供应商的调用权限。

真实 Legacy 适配器通过本地传输桩发送 91 条覆盖调用：60 个文本型号、27 个视觉型号、两个 Seedream 型号分别生成与编辑四条。逐条验证模型 ID、支持角色、协议路径、应用归因和服务器注入用户 Key；客户端伪造 TokenDance Key 未被使用。完成两个 Seedream 的 552 个生成/编辑清晰度与比例组合检查（含 auto），拒绝不合法的 Lite 1024x1024、Pro 4K 和过量参考图。

## 自动化与构建

环境：macOS，Node 24.15.0，pnpm 10.28.2。

|验证|结果|复跑入口（仓库根目录）|
|---|---|---|
|Core|477/477|pnpm --filter @paperbanana/paperbanana-api test|
|Gateway|140/140|pnpm --filter @paperbanana/auth-gateway test|
|Web|367/367|pnpm --filter @paperbanana/web test|
|小程序|25/25|node --test apps/miniprogram/tests/*.test.cjs|
|共享 API|29/29|node --test packages/api/src/*.test.js|
|根目录契约|12/12|node --test tests/*.test.mjs|
|Laf 共享源码契约|6/6|node --test apps/laf-functions/tests/*.test.cjs|
|保留客户端平台契约|4/4|node --test tests/client-platform/*.test.mjs|
|Core 出口适配器|11/11，已补 TokenDance 精确主机案例；包含在 Core 总数中|在 apps/paperbanana-api 执行 node --import tsx --test tests/provider-egress.test.ts|
|目录一致性|通过|node scripts/sync-model-catalog.mjs --check|
|类型/语法|Core、小程序、Gateway 通过|对应 pnpm --filter 包名 check|
|构建|Core、Web、小程序通过|对应 pnpm --filter 包名 build|
|真实 Mongo 集成|通过|bash apps/paperbanana-api/tests/integration/run-tokendance.sh|
|新加坡出口契约与行为|111/111|node --test deploy/sg-egress/tests/*.test.mjs|

Web 构建保留大 chunk 提醒，产物正常完成；未将其当成功能失败，也未为本轮接入改动无关打包策略。新加坡 Squid 契约及行为回归 111 项通过，包含 TokenDance 精确主机允许、伪装后缀拒绝和部署资产密钥扫描。

新增专属测试覆盖：S256/verifier 与固定 app_url；异账号/取消/过期/重复交换；交换中断开连接；密文中不出现虚构 Key；用户钱包与 Key 限额；整数金额及支付状态校验；订单创建幂等占位和未知结果；三秒状态轮询并发限制；管理/用户 Key 分离；SSE 分片中文字、部分输出和异常恢复；原 jobId、候选隔离、嵌套步骤、并发续跑；账号切换晚响应；注销屏障；历史记录重启恢复和旧进程队列。

真实 Mongo 测试使用只绑定 loopback 的随机端口、随机数据库和独立 Docker 容器，结束后清理测试数据库及该容器。证据摘要：

~~~json
{"mongo":"real isolated MongoDB","provider":"fixtures only","passed":["one-use exchange","encrypted storage","unique active order","TTL indexes","fresh-client nested-step recovery","concurrent resume CAS","account erasure"],"planned":1,"rendered":2,"paymentPosts":1}
~~~

rendered:2 表示一次被余额错误明确拒绝，一次恢复后的成功调用；planner 只调用一次，支付创建只 POST 一次。新 MongoClient、连接服务和执行上下文从数据库恢复，未依赖原执行器内存。CI 已增加此测试步骤，但本地结果不等于 GitHub CI 通过。

## 浏览器验收

桌面约 1710 像素、390×844 和 320×740 窄屏完成：

- 模拟授权弹窗 → 一次性回调 → 连接状态更新，回调 code 从页面地址清除；普通/专业模式保持渠道、厂商、型号结构。
- 桌面逐个遍历 TokenDance 的 14 个厂商按钮，得到全部 60 个主模型，包含免费 spark-x2.5-4b 和旧版 deepseek-chat-v3-0324。
- Lite 显示 2K/3K/4K，Pro 显示 1K/1.5K/2K；窄屏按渠道 → 厂商 → 型号完成 Pro 1.5K、16:9 精修，结果显示已完成。
- 桌面 ¥10 支付二维码本地生成，移动端显示用户点击的支付宝链接而不显示桌面 QR；模拟官方 paid 后显示“已确认到账”和 ¥10 余额。
- 余额不足中断后保留规划结果；从原页面恢复与刷新后从“任务记录”恢复均完成，使用相同任务 ID。后者为 1788943659667-tn0tgwpc，恢复后的规划阶段仍只有一次，继续完成后续图像评审和重渲染。
- Lite 3K 精修、提示词优化预览和取消保留原输入通过；任务记录刷新后仍可查看结果与实际调用记录。
- 390/320 像素 documentElement.scrollWidth 与 innerWidth 相等，无水平溢出。已恢复浏览器默认视口。

本地运行期间出现一次因开发态热替换新增 hook 而产生的 hook 顺序错误，冷启动后消失；正式构建和 Web 测试通过。测试环境刻意未提供 OpenRouter 目录，页面显示该渠道不可用，与 TokenDance 目录可用状态分开。浏览器显示的图片、余额、支付及 requestId 均为测试桩数据，不作为真实图片质量、收费和到账凭证。

## 尚需独立验证

必要接入/消费条件：稳定生产加密主密钥的安全安装、用于真实流程的用户授权，以及明确的模型/支付测试额度；产品方管理 Key 只影响站长价目。主密钥可以在部署配置时安全生成，不需要用户在聊天中提供密钥内容。

真实供应商需要核对账号权限、供应商自动路由实际返回字段、各型号流式终止及输出质量、Pro/Lite 实际像素/图片格式、Key 失效/额度限制和真实余额错误。完整逐型号真实验证仍未进行；测试桩不会证明这些线上行为。

官方待确认：单个 Key 额度查询、远端撤销、实际分润结算接口；deepseek-chat-v3-0324/deepseek-ocr-2 下线公告与目录冲突；deepseek-v4.1-flash/qwen3.6-plus 描述与模态字段冲突。当前保留已经确认的能力，不扩展未确认角色。

生产、代理、CI 与微信发布按 [实施与部署说明](implementation.md) 独立推进。本地完成不表示线上用户现在已能使用。
