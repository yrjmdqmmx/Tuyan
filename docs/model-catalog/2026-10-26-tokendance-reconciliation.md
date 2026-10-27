# 2026-10-26 观猹 TokenDance 目录纠正（v39）

本次按用户反馈复查观猹完整公开目录，未重跑其他 31 个渠道的全量周更。官方 DeepSeek 页面 **8 个条目 = 6 个模型 + Fetch/Search 两个工具**。图研此前的 9 张模型卡片混入了 3 个历史型号；这是目录维护及回退过滤遗漏，现已本地修正。

## 官方证据和全量核对

- [公开目录接口](https://tokendance.space/gateway/v1/models)：匿名 GET 成功，112 个唯一精确 ID；原始响应保存于 `2026-10-26-tokendance-public-models.json`，逐项分类与变更见 `2026-10-26-tokendance-reconciliation.json`。
- [DeepSeek 官方渠道页面](https://tokendance.space/models?author_id=01KMDPW3BJZA1CDS3E1TRF9N9J&output_modality=text)：浏览器实际显示 8 个条目，与接口一致。
- [渠道更新日志](https://tokendance.space/docs/changelog.md)：8/24 公告列 V3 0324 / OCR2 于 8/28 完整下线；V3.2 是具体服务商端点调整。9/10 公告涉及 9/14 DeepSeek 原厂端点调整，不能误判 Flash/Pro Preview、0731、0813 所有聚合端点都停服。目录缺失、端点停用与完整退役分别记录。

| 应显示的 DeepSeek 模型 ID | 当前目录 context_length |
| --- | ---: |
| `deepseek-v4.1-flash-1017` | 1,000,000 |
| `deepseek-v4.1-flash` | 1,000,000 |
| `deepseek-v4-flash-0731` | 1,048,576 |
| `deepseek-v4-pro-0813` | 1,000,000 |
| `deepseek-v4-flash` | 1,048,576 |
| `deepseek-v4-pro` | 1,048,576 |

`deepseek-fetch` / `deepseek-search` 分别声明 `deepseek:web-fetch` / `deepseek:web-search`，不计入模型卡片或模型数量。表中为目录层数值，不是最大输出，不替代逐端点实际服务规格。

112 条逐项归类：**66 条已适配且可展示，2 条仍列出但已有到期禁选证据的 MiMo 2.5，30 条此前已排除的工具/专用模型/未支持模态，14 条新发现待审条目**。本地观猹卡片由 72 → 66，DeepSeek 9 → 6，阿里巴巴 13 → 10。静态历史注册总数仍 1125、31 组默认选择不变。

## 本轮实际修改

- 从当前卡片、筛选数量与搜索结果隐藏 6 个渠道缺失 ID：`deepseek-chat-v3-0324`、`deepseek-v3.2`、`deepseek-v4-flash-vision-exp`、`qwen3-30b-a3b-instruct-2507`、`qwen3-max`、`qwen3.6-max-preview`。已不在角色列表中的 `deepseek-ocr-2` 同时补记缺失来源。所有历史记录与旧任务 ID 保留。
- `config/tokendance/catalog.json` 新增有日期/来源的 `catalogPresence` 证据；更新现存条目的公开名称、说明、协议集和目录 context_length。`seed-evolving` 顶层目录从 256000 → 1000000，仅更新目录快照，不提高推理预算或替换尚未确认的端点限制。
- `drift-review.json` 对齐 6 个精确缺失 ID 与原角色/协议，不把缺失等同官方退役，不把读取失败作为缺失证据。
- Core 将完整成功目录的在列/缺失状态传给 Web；失败/空目录/格式异常不建立新的缺失结论，已有审核证据仍生效。之后成功目录重新列出某个未退役的旧 ID 时可恢复该精确身份，不换型、不迁移默认。
- TokenDance 在线合并（包括账户目录路径）只补充已审核角色/协议的注册条目；搜索工具、专用 OCR、音视频及新发现型号不再被当成普通模型卡片自动追加。新条目仅进入待审记录。
- 同步 `packages/api/src/tokendance-models.ts`、Core 生成块和 Web 静态目录，版本 v38 → v39。小程序始终使用 `--skip-miniprogram` 跳过。

## 待确认或待适配

14 个新 ID 均在机器报告中保留原协议和原因：DeepSeek Fetch/Search；ateve/bocha JEV；Qwen Image 2.1 Pro/Turbo；Seedream 5.0 Flash；Qwen3.5 OCR；Qwen3.7 Text Rerank；Qwen Audio 3.0/3.1 ASR（含 Message）；YC Song 3.5/4.0。

公开目录没有输入/输出模态字段，不能根据 ID、名称或 Chat 协议猜测通用多模态能力。本轮没有宣称 112 个条目的输入/输出、全部参数、地区、价格都已重新验收；现有卡片仍按既有来源层级展示，未知信息保留“待确认”。新增图像型号仍需精确请求/返回/参考图合同核对。

## 验证和交付边界

- 68 项相关离线测试通过：Core 31（含真实 Core 目录 + Web 过滤消费回归）、Web 25、目录漂移 12；最后字段命名调整后重跑 3 项目录纠正测试通过。
- Core `tsc --noEmit`、生成物 `--check --skip-miniprogram` 通过。漂移检查状态为 `review`：14 个新条目待审，新增缺失/协议丢失/上下文缩减等 critical 数为 0。
- Chrome 实际查看本地 `127.0.0.1:5190/?workspacePreview=1`：观猹 66、DeepSeek 6，页面仅有上述 6 张 DeepSeek 卡片，没有两个工具或 3 张旧卡片。预览读取本次公开快照，所有生成、账号写入和真实模型请求继续禁止。
- 起点文件哈希和脏改动保留；生成物只做增量同步。小程序无写入/同步/构建/测试，Desktop 旧副本未修改。
- **本地目录已更新，目录/筛选契约离线验证通过；真实模型调用、账号可用性、质量及生产发布未验证。** 本轮未提交、推送、创建 PR 或部署。

## 后续维护规则

每轮先抓取完整精确 ID 集，与历史审核集对照，逐项区分已适配模型、工具、专用模型及新协议；官网“文本”分类计数包含工具，不能照搬为模型数。完整成功目录中的审核缺失须同时更新 `catalogPresence` 与漂移记录，覆盖离线回退。单次读取失败不改在列状态；端点退役不扩散到其他端点或渠道；原厂能力不替代聚合渠道规格。不得删除历史 ID 或用新增发现自动扩大适配范围。
