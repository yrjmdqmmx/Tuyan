# 通用 API 三阶段优化与思考参数接入（本地待发布）

核查日期：2026-09-27。发布基线 `6b99a6f58e09b8e843c7442a9db177fc28f1f9ad`；2026-09-27 重新 fetch 后 `origin/main` 与此一致。沿用隔离工作树 `tuyan-v381-20260927` 的 `1f2d41a`（第一阶段）与 `67f1cd6`（Web「视觉模型」命名）；两者不在远端分支中。没有修改 Desktop 旧检出、独立小程序工作树或微信项目副本。

**v3.8.1 已发布；本文实现属于下一版本，未推送、未部署。** 发布状态依据主分支的[发布记录](../../releases/2026-09-27-tuyan-v3.8.1.md)与来源证据，本轮未重新登录服务器。所有新增请求验证使用模拟上游，没有真实模型调用、账户权益验证、充值或微信发布。

## 研究报告纠正与实现选择

报告是对已发布基线的研究，不是第一阶段之后的代码状态。协议保留自填地址、字段按能力展示、状态分离和尺寸 chips 已在第一阶段完成，本轮保留并回归。报告内 `turn…` 引用不能解析为来源；下方列出重新查阅的官方页面。

- 没有新增产品模式或一套渠道。连接模板只是现有字段预填；命名连接只保存连接事实。
- 「应用到当前页面」会暗示延迟应用，因此仍用「返回生成设置」；表单即时修改角色草稿，外层明确保存。已有思考偏好机制单独自动保存，现在在参数旁明示这一点。
- 不用简单的“值等于官方 URL”判断字段所有权；用户主动填入相同 URL 仍属于用户编辑值。
- 不将用户限制称为费用预算。限额约束字节、像素、数量、格式和完整请求体，不估算费用。
- 无须整体升级到 Route v2：保留 Route v1 的有效限制，增加独立有版本的可选 `limitPolicy` 与目录 `metadata`；思考仍使用已有 `ThinkingConfiguration v1`。配置文件采用独立 schema v2，不等于后端 Route v2。
- 目录字段不自动覆盖手动能力或静态审计。展示来源、字段与日期，只有明确点击「采用目录已知能力到当前角色并复核」才形成手动草稿；还需确认。图片编辑、数量、字节、像素、尺寸值不从模态或 token 长度推导。
- 不采用自由 JSON、cURL 解析、通用温度/top_p 等额外控件；它们不属于本次参数契约。保持 HTTPS/443/DNS/公网检查、编码膨胀与产物检查和 unknown 不重发。

## 连接、文件与三角色隔离

`universalProfiles.js`、`UniversalConnections.jsx` 提供最多 50 条浏览器命名连接。每条只保存协议、地址、认证方式、目录规则和兼容变体。选择条目后显式应用到当前角色，保留该角色型号/能力/限额；连接事实变化仍走现有 Key 解绑逻辑。条目更新/改名/删除不会改写其他角色或已应用副本。可重新选择条目、编辑当前角色连接详情，再更新条目。

配置文件 `schema: tuyan.universal, version: 2` 包含**当前一个角色**的非敏感草稿、适用思考偏好及连接列表。导入上限 128 KiB、深度 15、数组 256、连接 50；字段白名单重建对象，拒绝密钥、认证头、会话、恢复凭据、wire/snapshot、验证状态及原型字段。支持同 schema v1 和旧 `{version:1,roles}` 浏览器格式迁移。无法解析、不支持版本、非法连接或思考身份/参数无效时不应用任何变化。

文件读取只做本地预览，不访问上游。角色草稿和连接列表分别显式应用/另存，现有条目不会被同名导入覆盖。导入能力声明总是待复核；来源文字不成为可信认证。思考偏好重新按目标角色、精确连接与型号校验。API Key 不导入、不导出、不自动共享。原有连接复制继续分别提供“不含密钥”和“包含当前页密钥”两个明确操作。

## 有界目录元数据

`universalCatalogRows` 保留旧 `{id}` 响应兼容；可选 `metadata.version=1` 仅由精确地址/协议/auth 匹配产生。源记录包含 kind/provider/baseUrl/protocol/auth/modelId/fetchedAt/checkedAt/url，所有字段共享该记录；来源 URL 定义每个事实的原始字段。事实只解析布尔、正整数及有界字符串列表，不读取上游自由 JSON 或指令。异常字段隔离并报告 `metadata_invalid`，不丢弃该行有效 ID；分页/行数/字节/超时上限沿用原安全实现。

| 服务 | 明确采用的字段 | 仍未知/未推导 |
|---|---|---|
| Anthropic `/v1/models` | `capabilities.image_input.supported`、thinking 支持及 types、effort 支持档位、`max_input_tokens`、`max_tokens` | 图片数量/字节/像素、编辑、尺寸；schema 示例 token=0 不是有效上限 |
| Gemini `/v1beta/models` | `inputTokenLimit`、`outputTokenLimit`、`supportedGenerationMethods`、`thinking` | generateContent/thinking 不能证明图片输入或输出，也不能证明某个思考参数的范围 |
| OpenRouter `/api/v1/models` | architecture 输入/输出模态、context_length、top_provider.max_completion_tokens、白名单 supported_parameters、reasoning 努力档位/mandatory/supports_max_tokens | 不继承原厂参数契约或原厂限额；不从图片输入+输出推导直接编辑 |
| 未知兼容地址 | 准确 ID | 同名型号、相似 JSON 均不获得官方能力；用户按自身文档声明 |
| OpenAI `/v1/models` | ID；已有精确静态审计仍可复用 | 目录没有提供本实现所需图片限制/思考范围，不能编造 metadata |

Web 仅展示与当前连接+ID 匹配、读取时间不超过 30 天且不在未来的目录证据；过期/不匹配不会被采用。持久化的来源线索仅说明用户曾主动采用，不能替代重新读取与复核。目录能力和思考控件分离：即使目录报告 thinking=true，只有既有精确参数规则才能形成可执行控件。

## 限额迁移与降级

可选 `custom.limitPolicy={version:1,service:{input?,output?},user:{input?,output?}}`。缺字段/null 表示该层未知或不额外限制；数值必须是安全整数，MIME 来自平台白名单。

- v1 旧 `inputLimits/outputLimits` 原数值迁移到 user 层，service 保持空，不提升为官方证据。损坏的历史层回退到保留的 v1 数值，并取消能力确认以便编辑。
- `effectiveUniversalLimits` 对数值取平台/已知服务/用户的最小值；格式取交集，空交集拒绝。未知服务不等于无限制，仍执行平台和用户额度，也不获得能力。
- Web 在提交时使用共享归一化，输出物化的 `inputLimits/outputLimits`；旧后端即使忽略 `limitPolicy`，仍执行相同有效限制。新后端自己重算，不信任客户端提高硬上限。
- 图片输入限制按 vision/editing 实际能力显示；纯文本保留必需旧字段但只展示请求限制。输出字段只在生成/编辑能力存在时展示。原始 outputSizes 不变。
- 已有静态审计的输入预算是图研采用的预算，不全部等于供应商最大值。界面明确其来源，不将其填成完整官方 service 层。

## 思考参数与任务恢复

没有新建另一套参数体系。`selectionThinkingProfile` 将严格匹配的通用连接解析到既有 profile；`compileThinkingSelection` / `validateThinkingOptions` / `applyThinkingSnapshot` 继续承担范围、互斥、固定模式、操作与请求映射。ThinkingSelection 增加可选 `connection={baseUrl,auth,compatibility}`；型号、协议、角色及连接一起构成偏好身份。普通渠道旧偏好键保持原样。

| 通用协议/服务 | 主模型/视觉 | 图像生成/编辑 |
|---|---|---|
| OpenAI 官方 Chat | 精确已有型号的 `reasoning_effort` | 无已核实可调参数，不出现控件 |
| OpenAI 官方 Responses | 精确已有型号的 `reasoning.effort`，部分型号另有 mode | 不支持此通用图片协议 |
| Anthropic Messages | mode/effort/budget 依准确型号。通用默认输出 4096，固定预算最多 4095；不自动增大输出额度 | 无图片输出控件 |
| Gemini GenerateContent | 已审计型号的 `generationConfig.thinkingConfig` 预算/强度 | 只有 profile 明确含 image+该协议才可使用；不从文本 profile 继承 |
| Gemini Interactions | 只有已有精确 profile 对应的角色开放 | Gemini 3.1 Flash Image/Flash Lite Image 的 `generation_config.thinking_level`（minimal/high），生成与编辑按原 profile |
| OpenRouter Chat | 使用 OpenRouter 自身精确型号 profile 与 `reasoning`，不复制原厂 | 仅原 profile 明确支持 openrouter-images+image 时开放；否则保留默认 |
| DashScope 原生多模态 | 无适用的文本思考 profile 时保留默认 | wan2.7-image/pro `parameters.thinking_mode`；仅纯文生图，带图/编辑/序列组合在发送前拦截。精确北京/新加坡旧域名及官方 Workspace 域名规则，连接身份含实际地域地址 |
| 其他同名兼容地址 | 默认省略参数 | 默认省略参数 |

“服务商默认”保持空 options，不发送 mode=false、固定预算等替代默认。旧后端不宣告 `universalThinkingVersion>=1` 时，新前端保留草稿，阻止非默认通用思考提交；空设置向旧后端省去 connection。新后端兼容旧客户端的空设置，但非默认设置必须匹配完整连接身份。未知型号不能使用伪造的通用开关。

后端归一化从已验证角色路由构建身份，只接受 options，不接受客户端 wire。生成、视觉、图片调用从现有 ProviderWorkflow 获取**服务器编译并持久化的原任务快照**，在 adapter 请求体形成后应用。完整编码体再次检查大小。快照携带 profileId、核查日期与官方 URL。任务参数/加密恢复/步骤指纹复用既有链路；默认历史任务和已完成结果不重发，unknown 状态不变。

## 官方核查来源（2026-09-27）

- [Anthropic Models API](https://platform.claude.com/docs/en/api/models/list)：可选 ModelInfo 字段及能力结构，不代表账号推理权限。
- [Anthropic Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)：enabled/budget 的最小值与 max_tokens 关系；4.6 弃用提醒、更新型号 adaptive 边界。
- [Gemini Models API](https://ai.google.dev/api/models)：token、方法、thinking 字段。
- [Gemini GenerateContent ThinkingConfig](https://ai.google.dev/api/generate-content#ThinkingConfig)：camelCase 预算/强度；与 Interactions snake_case 区分。
- [Gemini Thinking](https://ai.google.dev/gemini-api/docs/thinking)：当前页面主要演示 Interactions，不能把示例直接复制到 GenerateContent。
- [Gemini 图片生成](https://ai.google.dev/gemini-api/docs/image-generation)：3.1 图片型号 minimal/high 与 `generation_config.thinking_level` 的 REST 示例。
- [OpenRouter Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)、[Reasoning](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)：模态、token 和 reasoning 元数据；页面“支持预算可 alongside effort”与总契约示例“not both”存在差异，沿用现有精确 profile 的保守互斥规则，没有自动放开组合。
- [OpenAI Reasoning](https://developers.openai.com/api/docs/guides/reasoning)：Responses 参数与默认机制；型号档位继续来自既有精确审计，不宣称本轮逐个重审全部 1,160 条 profile。
- [百炼万相 2.7 API](https://help.aliyun.com/zh/model-studio/wan-image-generation-and-editing-api-reference)：同步路径、thinking_mode、编辑限制与北京/新加坡 Workspace 地址；明确旧域名仍可使用。

## 不足与边界

未获得真实账号目录响应或推理权益证据；采用官方响应结构样例与模拟上游。没有实体手机软键盘、Safari 或微信原生 UI 验收。未知兼容服务欠缺其自身参数范围、互斥、请求映射和操作适用证据时，只有对应参数保持默认，不阻塞其他连接。

目录缺少完整图片数量/字节/像素及输出尺寸值时，具体字段保持未知；用户可按服务文档手动确认能力并设置更严格限制。token 目录事实仅展示来源，没有新增假 token/温度/思考自由参数控件。新型号的目录思考元数据暂不自动生成 profile：还缺型号对应的预算上限、输出额度关系、关闭语义、互斥与不同操作支持证据，需要补充现有审计记录后开放。

小程序共享类型/生成物同步，旧任务仍保留字段；独立原生编辑器、连接库/导入导出和新控件需在其工作树合并后实现，欠项记入 SYNC。本轮 Web 390/320px 证据不代表微信完成。

## 最终本地验收

验收日期：2026-09-27。以下结果来自本隔离工作树；不等于真实账号调用、生产部署或微信验收。

| 检查 | 结果 |
|---|---|
| Web 全量单元/组件回归 | 560/560 通过 |
| Node Core 全量回归 | 1053/1053 通过 |
| 小程序本工作树共享兼容回归 | 121/121 通过，TypeScript 构建通过 |
| Web 生产构建 / Node Core 构建及类型检查 | 通过 |
| 目录、思考、版本报告及通用契约生成检查 | 无漂移 |
| Desktop 1440px、390px、320px 浏览器流程 | 通过；无横向溢出、无控制台错误 |
| 真实上游目录 / 真实推理 | 未执行；只使用官方结构样例和本地模拟上游 |

浏览器覆盖首次 TokenDance 默认与通用渠道首位、历史保存刷新、三角色混用、手动型号、全部目录错误状态、协议/地址切换与 Key 清除原因、显式复制、尺寸、高级编辑、连接命名和草稿、导入预览/取消/应用、无密钥导出、思考身份切换恢复、Tab 焦点循环、Escape 返回和滚动恢复。

本轮在最终验收发现并修复了一个偶发问题：键盘刚滚动后立即关闭时，最后一次 scroll 事件可能尚未触发。现在关闭或切换渠道前同步读取真实 DOM 位置；回归包含“未派发 scroll 事件直接关闭”场景。连接名称未保存草稿也按角色保存，关闭再开不丢失。

Core 模拟请求断言覆盖 OpenAI Chat/Responses、Anthropic Messages、Gemini GenerateContent/Interactions、OpenRouter 和 DashScope 的实际最终字段，默认省略、范围/互斥/操作/域名/身份不符均在请求前阻止。加密任务恢复用例确认：图片步骤失败后补凭据恢复，已成功主模型步骤不再调用，原思考快照语义不变。目录异常字段、旧限额及损坏历史配置、同名兼容模型、过期来源、秘密字段拒绝和配置往返有针对性回归。

本地预览：`http://127.0.0.1:5181/`（专用模拟后端 `127.0.0.1:8796`，禁止生成请求）。浏览器测试仅允许本机请求，未使用真实 Key。

本机验收材料目录：`/Users/a1-6/.codex/artifacts/tuyan-universal-complete-20260927/`。最终证据是 `browser-result.json`、`browser-complete-result.json`；目录中的历史 `failure.png` 是修复前的失败留档，不是最终状态。截图：

- `desktop-metadata-thinking.png`：目录来源与现有思考控件。
- `desktop-import-preview.png`：导入前影响范围。
- `desktop-sizes.png`：尺寸选择与高级配置。
- `mobile-390-import.png`、`mobile-320-import.png`：窄屏导入预览。
- `mobile-390-limits.png`、`mobile-320-limits.png`：限额来源。
- `mobile-390-recovery.png`、`mobile-320-recovery.png`：错误恢复与手动输入。

本轮没有用户完成率研究，不宣称成功率或效率提升百分比；没有实体手机软键盘或微信原生交互证据。上述功能全部属于下一版本本地待发布内容，公开 v3.8.1 发布日志保持原样。

## 后续可靠性复查与关闭网页行为（2026-09-27）

本次补充修复仅改 Web 行为与测试，没有修改后台任务状态机或共享契约，不把响应式验收记为小程序原生同步。

- 连接库写入使用同源 Web Lock，按条目合并最新数据，更新/删除比较原条目快照。其他页面新增条目不被覆盖；同一条目冲突明确报错、保留当前角色草稿。监听 storage 事件刷新列表。缺少锁能力的浏览器仍可编辑/读取/导出，但明确阻止不安全的连接库写入。
- 思考保存返回明确成功/失败，界面区分已保存与仅当前页草稿，支持重试；不可用存储不会伪装成功。
- 导入前用逐项可读差异展示地址、型号、能力、限额、尺寸与思考偏好，标明 Key 是否会因绑定变化清除。未携带思考偏好的旧文件会保留目标身份的历史偏好，预览明确说明。连续选择文件时只接受最新一次读取结果。
- 有效限制由现有共享计算结果派生，显示数值与决定它的约束层；不改变运行时上限。
- 任务记录增加“查看任务进度/详情”，只读取原 ID 并恢复页面轮询，不调用 createJob/providerResume，不恢复或重发未知模型请求。

### 当前任务生命周期事实

| 用户操作/故障 | 当前服务行为 | 重新进入后的处理 |
|---|---|---|
| 收到任务 ID 后关闭标签页/浏览器 | 后台任务不依赖页面轮询；继续 queued/running，随后 succeeded 或按真实错误 failed | 同一账号任务记录查看；新入口返回原任务进度/详情 |
| 尚在上传或提交、未收到任务 ID 就关闭 | 不能由页面推断是否已被服务器接收 | 先检查账号任务记录，避免重复提交 |
| 清浏览器数据/换浏览器 | 已提交后台任务不被取消；本地配置和当前页 Key 可能丢失 | 重新登录同一账号；匿名任务不能通过账号历史找回 |
| 服务进程重启 | 启动阶段将旧 queued/running 标记 failed，之后执行记录协调恢复资格 | 有安全快照且 canResume=true 时可明确恢复原任务；不会仅因重新打开网页自动恢复执行 |
| 明确拒绝、余额/凭据/限流等可恢复错误 | failed + 恢复提示（以实际 recovery.canResume 为准） | 处理原因后从已完成步骤继续；已有结果复用 |
| 请求结果未知、费用不明或旧执行版本不兼容 | failed + 需核对；自动重放禁止 | 核对供应商记录，不把打开页面或刷新当作再次生成 |
| 恢复资料过期 | 加密执行/步骤资料设 7 天 TTL；完成后执行凭据删除 | 不保证可继续原任务；期限不等于结果图的保留期限 |

代码依据：`App.jsx` 当前任务 ID 是页面状态，关闭时只停止轮询；`runtime/handler.ts` 准入后后台执行；`src/mongo-adapter.ts` 启动中断状态标记；`src/provider-workflow.ts` 加密快照、执行租约、完成步骤复用及 unknown 阻断。

仍有后台边界：排队任务的准入队列在内存中，`providerWorkflow.run` 在真正开始执行时才建立加密快照。进程突然退出会使尚未建立快照的排队任务变为 failed，不能保证原任务恢复。旧启动错误文案/`retryable` 也过于笼统，不能据其判断收费请求可安全重发；后续应把准入持久化和统一重启恢复判定作为专门后端任务处理。本轮没有把“关闭网页继续后台执行”扩大为“所有服务中断均可恢复”。

补充验收：Web 全量 569/569 通过；后端 Universal/Thinking 23/23 通过，包含停止页面查询后后台完成、重新读同一 ID 不增加模型调用的用例。启动协调另行回归通过。桌面、390px、320px 流程与真实双标签页冲突场景通过（Chrome、本地模拟上游）；实体软键盘/Safari/生产重启及真实模型调用未执行。证据在本机 `/Users/a1-6/.codex/artifacts/tuyan-universal-reliability-20260927/`。
