# 本地验收 — 2026-09-28

工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v381-20260927`，分支 `codex/universal-api-ux-phase1`。基线 `6ff4018`；交付前远端 `main` 再次只读核实仍为 `6b99a6f58e09b8e843c7442a9db177fc28f1f9ad`。未推送、部署或付费调用。

## 自动验证

- Core：完整模拟回归最终结果见下方结果汇总；包括 route/目录/SSRF、协议适配、三角色混用、生成/精修、恢复、持久化、账户/OSS/网关既有回归。
- Web：**577 项通过**，使用仓库 `pnpm test`（tsx + DOM setup），生产构建通过。构建仍有既有主包大于 500 kB 警告，未以本轮能力适配声称性能提升。
- 小程序共享源码：TypeScript check/build 通过，**121 项通过**。只同步本仓库生成物，未覆盖独立工作树，未原生/真机验收或微信发布。
- 目录/思考生成检查：**1,040 个静态型号、1,160 个思考 profile，无生成漂移**。新云接口在通用模板/精确 allowlist 配置，不虚增静态厂商目录总数。
- SG egress：96 项行为测试通过；新增 Bedrock 域名要求导致原 exact-host 契约断言需要同步，更新后 15 项契约测试通过，另单独复跑实际生成 ACL allow/deny 行为通过。共 111 项范围通过，全部临时本地 fixture，无生产配置应用。
- Core TypeScript、Core 构建、Web 构建、`git diff --check` 通过。测试初期的错误由修复后的回归覆盖，不把未使用正确 loader 的 Web 运行算作验收结果。

## 新增有意义的断言

| 范围 | 覆盖 |
| --- | --- |
| Responses | OpenAI/xAI/Azure 字段差异；生成/编辑；多图输入；默认省略；显式质量/格式；混合文字、最后图像选择、未知工具/拒绝/无图/部分失败/格式异常及最大调用数 |
| Azure / Bedrock | 部署名与工具部署分离；api-key/Entra；Images preview query 与 multipart；Converse 原生图片/文字及思考预算；InvokeModel 两型号请求体、重绘强度、区域/型号拒绝；其他 URL query 不放行 |
| 思考 | OpenAI 图像调用模型 effort，Azure 主/视觉/图像的协议映射，Bedrock budget 与输出限制；默认省略；连接/工具/部署变化拒绝旧参数，按身份恢复偏好 |
| 恢复 | 排队确认前加密快照、服务实例重建、双重恢复锁、原任务参数与云扩展；生成后失败恢复复用 planner；精修冻结原图+辅助图；已完成产物复用；未知请求不重发 |
| 到期 | 当前页/加密 envelope 保存 expiry，浏览器和无密钥文件不保存；规划跨越到期后图像请求数为 0；更新 Key 与 expiry 后恢复同一任务，不重复 planner |
| 异步 | fal/Replicate/BFL submitting 在 POST 前持久化、失去提交响应不再次提交；原 ID 继续查询；单次超时/HTTP 408/429/5xx/退避；取消与明确失败；fal COMPLETED+error 终止；过期下载只重查原任务；BFL 独立恢复上下文 |
| 设置 | TokenDance 首次默认/Universal 排首；旧配置、三角色、模板、草稿、协议切换、Key 隔离/显式复制；文件无密钥往返/导入复核；旧后端协商保护 |

## 实际浏览器交互

预览：<http://127.0.0.1:5182/>，模拟后端 `127.0.0.1:8797`。不访问真实上游、不做 DNS 安全探测，不提供账号/生成/发布操作。界面“检查配置与地址”的地址结果为 fixture；真实传输防护通过 Core 模拟回归验证，不能把 UI fixture 成功当成真实地址检查。

Playwright Chromium，1440×1000、390×844、320×844；没有控制台错误，检查的弹框/字段容器无横向溢出。实际操作包括：三角色分别配置 Azure 部署、Bedrock 视觉和 OpenAI 图像工具；图像思考参数；xAI 隐藏不支持字段；SD3.5 强度；到期时间；模拟配置检查；保存/刷新排除 Key/expiry；关闭重开草稿；Tab 焦点圈定、Escape 回到角色卡片。沿用既有滚动容器与返回逻辑；浏览器检查不代表实体手机软键盘或原生微信。

证据目录（本地，不提交仓库）：`/Users/a1-6/.codex/artifacts/tuyan-cloud-tools-20260928/`

- `browser-cloud.mjs` / `browser-cloud-result.json`：操作脚本、各步检查、实际 action 清单；只出现 modelRegistry/referenceLibrary/universalApiCheck，没有付费 action。最后一次重复运行同样通过。
- `desktop-openai-tool.png`、`desktop-azure.png`、`desktop-bedrock-expiry.png`。
- 连续流程截图：`mobile-390-openai.png` → `mobile-390-xai.png` → `mobile-390-bedrock.png`；320px 同名对应文件。
- 未选用调试过程的 `cloud-failure.png` 作为最终验收图。

## 证据等级与未验证项

- **目录已收录**：原静态目录保持；新增模板/手选名单为精确审计 ID。Azure 真实部署目录和 Bedrock 账户目录未读取。OpenAI/xAI 目录可见不代表实际工具授权。
- **配置可用**：本地界面、保存/导入/恢复与模拟结构校验通过。Azure 仍需真实资源/部署，临时凭据需要真实到期时间。
- **代码已适配**：表中协议/型号/操作的最终请求与响应、生成/精修/恢复链已接通。
- **模拟调用通过**：上述本地断言证明字段与状态处理，不证明网络、组织权益或计费成功。
- **真实账户调用已验证：否**。没有执行真实付费推理。生产 SG 的 Bedrock ACL 尚未安装；Azure 精确资源主机待用户实际资源确定后另行授权配置。

## 最终结果汇总

Core **1089 项通过，0 失败/跳过**；包括最后加入的长规划期间令牌到期/安全续期恢复、Azure 三角色思考映射，以及 BFL 独立持久执行上下文。最终 check/build 通过。Web 577、小程序 121 和 SG 111 项范围通过。证据是本地模拟，不是发布或真实账户验收。
