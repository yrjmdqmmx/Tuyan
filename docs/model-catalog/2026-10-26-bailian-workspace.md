# 百炼业务空间适配 · 2026-10-26

本报告是用户同意“可以优化”后的本地适配增量，接续同日目录周更 v36；不改变既有周更的历史验收结论。当前目录为 `2026-10-26.v37`，1122 → 1125 个静态型号；原 1122 个 ID、31 组默认配置完整保留。

## 用户可见变化

在 Web「模型管理 → 渠道连接 → 百炼 → 配置」选择「配置新型号业务空间」，填写百炼控制台的业务空间 ID、服务地区，并输入对应地区的 API Key。仅保存配置不会调用模型。地区或业务空间改变时须重新输入密钥；已有任务恢复不能静默改变这些信息。

| 新增精确 API ID | 本版可选地区 | 本版能力 | 官方来源 |
| --- | --- | --- | --- |
| `deepseek-v4.1-flash-1017` | 北京、新加坡、弗吉尼亚、法兰克福、东京 | 文本输入/文本输出 | [DeepSeek API](https://help.aliyun.com/zh/model-studio/deepseek-api)、[各地区限流与型号](https://help.aliyun.com/zh/model-studio/rate-limit) |
| `MiniMax/MiniMax-M3.1-Flash` | 北京 | 文本输入/文本输出 | [MiniMax API](https://help.aliyun.com/zh/model-studio/minimax-api-by-minimax)、[型号与价格](https://help.aliyun.com/zh/model-studio/minimax-m3-1-flash) |
| `xiaomi/mimo-v2.6-pro-ultraspeed` | 北京 | 文本输入/文本输出 | [MiMo API](https://help.aliyun.com/zh/model-studio/mimo)、[型号与价格](https://help.aliyun.com/zh/model-studio/mimo-v2-6-pro-ultraspeed) |

三个型号均需用户在百炼拥有对应地区的业务空间、API Key 和模型服务权限。本轮没有读取账户目录或确认开通状态。需要图片材料理解或图像评审时，必须另配现有视觉型号。官方多模态声明保存在规格记录中，但逐型号 Data URL 合同尚未充分核实，因此没有开放这三个型号的视觉入口。音视频、工具与 Responses 接口也未接入。

## 实现与兼容

- 单一合同 `config/bailian-workspace.json` + `packages/api/src/bailian-workspace.ts` 生成 Web/Gateway 校验与 Core 代码。域名仅由严格 DNS 标签、地区白名单和固定官方后缀构成；拒绝 URL、点、斜杠、超长 ID 与未知地区。
- 连接和执行路由新增可选 `bailian: {workspaceId, region}`。仅三个新 ID 使用新地址，旧型号即使在同一连接中也保持旧地址；历史 ID、禁选记录与默认选择没有迁移。
- Gateway 从已保存连接重建路由并比较请求；账号密钥在业务空间/地区变化后失效，浏览器密钥按业务空间和地区分别存储。秘密不会写入路由或模型库公开 DTO。
- 规划、SVG 生成、PNG/SVG 主模型评审、材料处理和输入优化均传递该配置。Gateway 输入优化的字段筛选已补齐。历史恢复指纹包含原业务空间与地区，改变配置会阻止继续原任务。
- Core 目录提供 `bailianWorkspaceContractVersion: 1`；Web 在缺少配置、地区不适用或后端不支持时禁止提交。新接口保持 `stream:true`，省略采样/思考参数以使用服务默认；只提取最终正文，拒绝截断、空正文及错误响应。无自动重试、换型、旧地址回退或重定向。
- 账户目录读取仍只覆盖北京；显式选择其他地区时不会把密钥悄悄发送到北京。其他地区使用已核对静态目录，账户目录待另行核对。

## 规格和费用边界

MiniMax 服务页明确 1,000,000 Token 上下文，未把它当作最大输出；北京公开原价为输入 1 元、输出 4 元、缓存命中输入 0.1 元/百万 Token。MiMo 为上下文/最大输入 1,048,576、最大输出 131,072 Token，输出上限包含思考；北京原价输入 30 元、输出 60 元、缓存命中输入 0.25 元/百万 Token。上述都是渠道公开规格和原价，未验账户优惠或实际账单。DeepSeek 的更新日志以 1M/384K 表述，本轮未猜测精确 Token 数、套用原厂价格或提高请求额度。

## 本地验证

- 新增 12 项针对性测试全部通过：Core 5、Gateway 3、账号密钥生命周期 1、Web 3。覆盖错误地区/ID、缺失配置、精确请求地址、正文与思考分离、截断/空回答、无重试/回退、旧型号原路由、输入优化、完整 SVG/PNG 模拟流程、密钥失效、历史恢复配置不变、界面保存。
- Web 两组相关测试 30/30、35/35；Gateway 相关组 14/14、应用组 46/46、新增恢复组 3/3（存在跨组重复用例，不合并虚报数量）。
- 扩展 Core 回归 261/262：唯一失败是继承的 `thinking-bailian-qianfan-57.test.ts:70`，仍要求千帆 `qwen3.5-27b`、`ernie-5.1` 为 unconfirmed。直接从本轮起点快照执行查询已返回 supported；测试、thinking.ts、thinking-data.ts 三个文件哈希均未变化。本轮保持它们不动，该旧断言仍待对应维护者处理。
- Core 类型检查、Vite Web 构建、目录生成物检查及版本映射 CSV 一致性检查通过。生成器均使用 `--skip-miniprogram`；Web 构建仍有既有大 chunk 提示。
- 测试安装外部网络阻断护栏；所有模型响应和密钥均为本地夹具。完整流程通过证明本地协议与参数传递，不证明模型输出质量。

## 未验收与保存位置

真实调用、账户开通、海外网络可达性、模型质量、实际账单与生产发布均未验证。小程序继续暂停，未写入、同步、构建或测试。没有提交、推送、PR、部署或生产设置修改。

唯一源码工作树：`/Users/a1-6/.config/superpowers/worktrees/paperbanana-tuyan/tuyan-v400-workflow-20261009`。本轮起点哈希、Git 状态、测试日志、官方 web 读取记录、继承失败证据和局部补丁在 `/Users/a1-6/.codex/artifacts/tuyan-bailian-workspace-20261026`。同目录证据 JSON 与验收 JSON 保存机器可读边界。公开页面的 Python HTTP 抓取失败已记录，实际正文通过 web 工具核对；未将读取失败当作下架。

## 后续状态

2026-10-26用户要求继续接通后，v38已补齐三个型号的图片输入、视觉角色、MiniMax思考强度和卡片信息。上文“仅文本/图片待适配”保留为v37历史结论，当前状态见 [后续报告](2026-10-26-bailian-multimodal.md)。真实调用仍未验证，生产未发布。
