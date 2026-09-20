# 通用 API 首版发布核验

核验日期：2026-09-20。实现 PR [#216](https://github.com/yrjmdqmmx/Tuyan/pull/216)，生产代码版本 `55cb5051dcd921f951fd22d8484b639294afe062`。后续文档提交不改变该运行版本。

## 范围与交互

Web「生成设置 → 使用模式」增加「通用 API」，普通/专业模式继续使用原平台预设。按主模型、识图模型、图像模型配置协议、准确 ID 与地址，复用接入时保留各角色型号。未知能力须显式声明，配置/只读目录/真实推理状态分开。完整官方来源、核验日期、限制及分批计划见 [协议矩阵](../universal-api/protocol-matrix.md)，操作见 [使用说明](../universal-api/README.md)。

首版实际实现 OpenAI Chat、Responses、Images、Anthropic Messages、Gemini GenerateContent、Gemini Interactions、DashScope Multimodal 七协议族的同步子集，以及显式 OpenRouter Chat 图片扩展/Ark Images JSON 编辑变体。没有把兼容服务商数量当作协议数量，也不支持任意工具/异步/流式结果自动续跑。

模型请求按地址绑定密钥、固定已核验公网 DNS、禁止重定向，产物下载不带鉴权；实际阶段校验能力、合并图片预算及编码后体积。目录单条异常隔离，错误只采用受控中文和有限结构化代码。成功步骤加密保存并复用，结果未知停止重发，部分密钥可在原连接下更新。

独立审查发现并修复评审/重绘异常被旧回退逻辑误报成功、Gemini 思考图/工具响应误判，以及大 Base64 正则栈溢出。5/10/20MiB 大图、实际约 7MiB PNG 输入和输出已模拟验证；自定义原生尺寸生成不再触发旧额外升清调用。

## 验证与发布

- 本地：Core 634、Web 405、Gateway 148、小程序 119、共享/来源契约 51、HK/SG 部署 339 项全部通过；类型、构建、小程序 TS/JS 和生成文件漂移检查通过。
- 规格与质量独立审查均通过。PR [CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35501439648)、合并后 [main CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35501740690) 全部通过，包含真实一次性 Mongo 集成和容器构建。
- 镜像：[Core](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35501753988)、[Gateway](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35501756004)、[Worker](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35501757642) 均成功。
- [HK 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35501840089) 使用正常环境审批、固定摘要和主机部署锁，成功。
- [Pages](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35501960459) 固定同一代码 SHA，Web 回归与发布成功。

| 组件 | 实际运行镜像摘要 |
| --- | --- |
| Core | `sha256:1cd5bbdc657444d9ac975e6fb7390429ec6f9328a3b1448bd09194c4cdf31640` |
| Gateway | `sha256:1ad307c929e4663ce8011c6cb371d0ca33aeedde80e87fe78c8edd5035ef0cce` |
| Benchmark Worker | `sha256:e6e93e6465d477446655fe6ec1e15f63c20b5c15bd0d7904b128b0b125c64eb0` |

三镜像的实际 OCI revision 均为 `55cb505`，五个图研容器 healthy，公开 `/ready` 的 auth/backend 均正常；`modelRegistry` 返回 `universalApiContractVersion=1`。Worker 执行器保持 false，Plot/Mongo 镜像不变。发布前已在主机内保存私有备份；配置比较只有 Core/Bench 的 `PAPERBANANA_CODE_SHA` 变化，密钥未变、未下载。

匿名请求 `universalApiCheck` 返回 HTTP 401。授权 Chrome 会话只检查官方 `gpt-4.1` 配置与公网地址，返回“配置与地址校验通过；尚未验证模型权限或真实调用”；没有填写 Key 或点击生成。切回普通模式后原渠道、模型与论文输入保留。临时验收型号已清除，未保存配置。

`https://www.paperbanana.asia/` 的 index.html 和三个直接引用入口资源均 HTTP 200，与 Pages artifact SHA256 4/4 一致：

| 产物 | SHA256 |
| --- | --- |
| index.html | `47d041f2bd677c4ddc794ae4ede8a8baaffd3ecd490dc2e1c72c286bd97bde50` |
| appPaths-Ba0fLi8f.js | `bc24cd9caec4112c896d1eb56605af9790b3362f36b6fe3bd912aebffb27e1c4` |
| main-DYDPGxo0.js | `5df13d37bae3a096c60571772b307c529dcd4266145aba8794be85a83f761c96` |
| main-DTWlikVz.css | `db2601338c4dd81c1d44a4976b4f72a7a7c6b8b828fdfb343f27295a09aa7000` |

## 已知限制与未确认事项

- 本轮付费调用和历史重跑均为 0；各服务真实推理、账号权益、实际费用、长耗时结果及图片质量仍未验证。只读配置通过不能替代这些证据。
- 自定义端点限公网 HTTPS 443；OAuth、SigV4、非标准签名、查询型部署路径、任意厂商参数暂不支持。未知模型仍需用户按服务文档声明能力，不做名称猜测。
- 第二批优先持久化异步任务与模型 schema（Replicate/fal/BFL），以及 OpenRouter 独立 Images 操作；后续再扩展 Stability、云厂商原生认证与流式机制。
- 小程序仅同步历史字段、恢复 action 和提示，新增通用配置/提交在 Web 使用；未上传、提审或发布微信平台。
- 生产 TokenDance 仍有既有隔离型号，但正常型号可核验，不影响新增自定义连接。裸域先前的证书问题本轮未复测或修复，本次使用证书有效的 www 域名验收。
