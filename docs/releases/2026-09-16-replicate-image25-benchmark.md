# Replicate GPT Image 2.5 正式扩榜（2026-09-16）

Sunburst 与 Flare 通过 Replicate 各完成固定 6 生成 + 3 编辑，18/18 成功，每题一次提交。两批分别双独立匿名审评，并完成必要的第三方 xhigh 仲裁；公开分数及逐题评语与审评提交逐条一致。

| 型号 | 最终排名 / 43 | 总分 / 10 | 双审人数 | 仲裁题数 | Replicate 实扣 USD |
|---|---:|---:|---:|---:|---:|
| GPT Image 2.5 Sunburst | 9 | 8.854960 | 2 | 1 | 2.25 |
| GPT Image 2.5 Flare | 14 | 8.150397 | 2 | 3 | 2.25 |

Replicate 登录态账单展开行确认各 9 张 × 0.250000 USD，总计 **4.50 USD**，均通过账户账单核实。账户余额与完整账单仅保存于本次任务的私有报告。逐题费用以账单数量和单价核对至唯一 prediction ID，未将预算、计时 metrics 或 Codex 订阅用量当成 API 实扣。

## 发布证据

- Sunburst：`bench-scientific-v2-release-d45374dae4e2e571b33d`，hash `d45374dae4e2e571b33dee48cd900947f8ef7fbda7bb0445b9655ce52c36eeaa`；保留此前 41 个模型全部非排名字段。
- Flare：`bench-scientific-v2-release-5129b6df946178963069`，hash `5129b6df946178963069c24461f16524598be561939aaae636f1c5ab19fd242c`；保留此前 42 个模型全部非排名字段。
- 每次发布重算固定九题分母、十维等权 raw mean 与 competition 排名；18 个正式调用的输出原始字节均与 provider receipt 匹配。
- 所有输出实际为 2048 × 1152；请求记录为 provider-default / auto，未伪装为强制 2K。
- Replicate prediction API 的 version 返回 `hidden`，原值保留；目录 latest_version 快照不能替代实际预测版本。

## 代码、部署与验证

- 执行器 PR [#198](https://github.com/yrjmdqmmx/Tuyan/pull/198) 已合并；两模型生成与 manifest 均为 `4d6be3d2fddc7de447a0c7ee51ec7009257a5b8c`；Sunburst 发布也为该 SHA，Flare 在已完成生成、双审后跨部署完成发布，其 publication SHA 为 `2295cc15d9937c0cb0b3c9adebd911aca06b42c0`。
- 原生成 Core image digest：`sha256:9870fec1a5d7debd5263cb2e481798044be2608d72fddbb8d4fea080469e61f2`。
- 原生成 Worker image digest：`sha256:3743f0f8492c604b734299279deb455e2df9001be3e612eac5d50ba71cf4a29f`。
- Web 方法页 PR [#199](https://github.com/yrjmdqmmx/Tuyan/pull/199) 支持三 / 四渠道方法数据，显示 Replicate 单次提交与 40 CNY 批次保护上限。正常 Pages workflow [35094979302](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35094979302) 发布确切代码 SHA `4b12841cd63199a532fb55d34534cbbbdba365cc`；付费测试使用 4d6be3d；主线随后由其他任务的 PR #200 推进到 2295cc1，后续控制 workflow 绑定新主线，其后生产也部署到 2295cc1。既有完成批次发布协议保留生成版本 4d6be3d，并单独记录 Flare 的发布版本 2295cc1。
- 本地 Core 67、Worker 193、API 492、运维 92 项通过；Web 方法页与排行榜初次相关 80 项通过；吸收新主线后扩大到 135 项，全部通过。相关 PR 的完整 CI 通过。
- Chrome 验收排行榜 43 模型、两型号详情及生成高清图 / 编辑前后图、公开审评理由，方法页显示四渠道和 Replicate 单次提交规则。
- 并行任务的主线合并和生产部署分别触发一次版本检查失败（运行 35098941056 / 35099296861），均未调用模型或发布榜单。重新预检确切运行镜像，使用已有完成批次跨部署发布契约；没有放宽版本、哈希或签名校验。
- 常驻 Worker 始终 disabled，并发 1；无自动批量后台调用。

完整私有运营证据、逐题费用 CSV 和面向用户的费用报告保存在本次任务的受限本地产物目录；签名链接、API token、原始 provider 响应未提交仓库。

[结构化验证证据](2026-09-16-replicate-image25-evidence.json) · [正式排行榜](https://www.paperbanana.asia/leaderboard/) · [正式接入说明](../scientific-v2-replicate.md)

并行任务的 Web 发布覆盖了首次方法页补丁，随后在完整保留新主线改动的基础上重新发布：`5f83d6707521886fcc02bae0afcd0de9341b8c71`，Pages workflow [35100161887](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35100161887)。最终浏览器验收使用此版本。
