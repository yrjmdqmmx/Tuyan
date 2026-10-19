# SVG / PNG 生成耗时分析

日期：2026-10-19。用户要求仅分析。本轮未改生成提示词、材料读取、阶段依赖、模型参数、重试或出口线路，也未新增付费调用。

## 判断与证据边界

还有优化空间，但现有证据不能给出可靠的提速百分比。SVG 与 PNG 的主要等待位置不同；新增目录型号也不代表它们更快。最值得优先验证的是重复上下文和过长的中间方案输出，先补细粒度计时，再做同配置对照。

来源是杭州生产 Mongo 中两条已经完成的验收任务，仅投影读取状态、阶段时间、文本长度和调用元数据；没有重新运行任务或读取凭据。[本次只读时间元数据摘录](/Users/a1-6/.codex/artifacts/tuyan-hangzhou-catalog-v35-20261019/performance-timing-metadata.json)。配置与视觉验收见 [上一轮正式记录](/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）/docs/operations/2026-10-18-workspace-fixes.md)。

| 项目 | PNG | SVG |
|---|---:|---:|
| 任务 ID | `1792335733690-r04gzl4k` | `1792336166499-awwpfau5` |
| 总时间（创建至完成） | 339.859 秒 | 542.046 秒 |
| 排队时间 | 0.049 秒 | 0.087 秒 |
| 启动至规划开始：材料/检索/准备，未单独拆分 | 103.405 秒 | 57.275 秒 |
| 规划（明确阶段计时） | 40.465 秒 | 107.861 秒 |
| 风格（明确阶段计时） | 70.494 秒 | 123.125 秒 |
| 风格完成至首图留存：含生成、局部处理、存储 | 21.220 秒 | 196.173 秒 |
| 首图留存至评审记录完成 | 104.135 秒 | 57.428 秒 |
| 规划 + 风格占总时间 | 32.6% | 42.6% |
| 规划 / 风格记录字符数 | 3734 / 5753 | 4915 / 7054 |
| 调用次数（既有验收） | 7 次 Qwen + 1 次 Seedream | 5 次 Qwen |
| 实际成图 | 1360×765 PNG | 1600×900 SVG |

表中“首图留存”以 render 阶段时间为准；SVG 源文件阶段比 render 早 9 毫秒。各区间间仍有毫秒级记录开销，因此不强求表格逐项相加等于总时间。所有相邻时间差都只是流程区间，不能当作纯模型推理耗时。

PNG 的末段可进一步分为：首图至原页对照记录约 41.078 秒（材料复核及准备），再至最终评审约 63.057 秒。这一条 PNG 的绘图所在区间仅约 21 秒，不能把它总共约 340 秒的等待都归因于 Seedream。SVG 的约 196 秒区间包含源码模型、渲染和保存，当前不能单独断言模型或网络占了多少。

这只是两个单候选、四节点验收样本：PNG 带 PDF，SVG 无材料附件，分辨率亦不同。它们不是可泛化的性能基准，不能用 340 对 542 秒直接比较模型或格式效率。

## 代码中可确定的成本

1. **请求上下文重复。** `buildVisualDescription` 把 `plannerUserPrompt / stylistUserPrompt` 与 `workflowContext` 拼接，前者含方法、标题、参考内容及规划，后者再包含相同语义字段。后者的 `originalRequest` 和 `methodology` 在一般任务中本身也相同。风格调用重复携带完整规划。对于存在 `generationContext`、编辑目标或优化后输入的任务，原始需求和当前执行输入可能不同，不能简单删除其中一份；应只去除确实相同的重复内容，保留各自语义。
2. **中间输出较长且逐阶段串行传递。** 风格阶段要求返回完整方案，即使无修改也不能只回标记。现有 600 词指导是软约束，且明确允许为完整证据扩展；本次仍产生 5753 / 7054 字符的风格记录。规划 → 风格 → 生成有真实依赖，不能直接 Promise.all。压缩解释性散文、合并重复规则值得验证，删标签、数值或评审证据不可取。
3. **材料已复用，但仍重新验证来源。** `readTaskMaterials` 传 `reusePrevious:true`；材料代理按先前用到的 read/render 操作取得当前证据，再由模型检查。因此“完全没有缓存，每轮从零读全文”的前提不成立。进一步缓存只能针对稳定对象及相同操作，并继续验证当前任务权限、哈希、有效期和原页证据；不能以旧摘要代替当前来源。
4. **存在少量独立本地工作。** SVG 已渲染后的源文件和 PNG 存储现为先后执行，可研究有界并发；但必须等待全部完成、保持哈希对应、账号删除保护及失败清理。没有存储独立计时前，不能声称它能节省分钟。
5. **现有计时不足。** `recordStage` 在调用者不传起止时间时，两者都取记录时刻，多处出现 durationMs=0；这表示没有覆盖操作耗时。providerCalls 保存路由、模型和请求标识，当前查询的记录没有逐调用 TTFT、token 数及处理耗时。

关键位置：

- [规划和风格请求拼装](/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）/apps/paperbanana-api/runtime/handler.ts:7217)
- [共享任务上下文](/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）/packages/api/src/workflow-prompts.ts:10)
- [SVG 生成、渲染和留存](/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）/apps/paperbanana-api/runtime/handler.ts:6814)
- [材料证据复用与重新验证](/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）/apps/paperbanana-api/src/material-agent.ts:46)
- [对象保存及账号生命周期保护](/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）/apps/paperbanana-api/runtime/handler.ts:9480)
- [阶段计时缺省行为](/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）/apps/paperbanana-api/runtime/handler.ts:9566)

## 建议的后续顺序（均未实施）

| 优先级 | 动作 | 预期作用及验证要求 |
|---|---|---|
| 1 | 给材料、检索、规划、风格、源码/绘图、评审、渲染、OSS 分别计时；记录首 token、结束和供应商已返回的 usage | 先确定模型等待、首响应与本地处理的比例；只保存耗时/计数，不额外记录论文或完整提示词 |
| 2 | 对规划/风格输入做精确去重，保留全部不同的原始输入、来源、约束和评审合同 | 减少重复输入；先用离线 payload 对照验证字段完整性，再获授权做同配置实测；不能仅凭输入缩短推断耗时同比下降 |
| 3 | 简化中间方案表达，风格只承担必要美化；先保持全部现有阶段 | 可能减少输出 token 和后续重复输入；必须对复杂图、多面板、数值标签、原材料及完整评审做质量对照 |
| 4 | 基于稳定哈希复用材料本地解析、并行独立渲染/存储准备 | 降低本地与存储开销；保留所有权限、版本、删除和失败恢复规则，先确认此段实际占比 |
| 5 | 单独评估渠道支持的思考控制，或显式提供其他模型选择 | 可能影响等待和费用，也可能影响质量；当前新增型号没有速度证据，不自动改默认模型或传未确认参数 |

不建议通过缩短超时、超时自动重发/换线、取消原材料核查、跳过成图评审来制造“变快”。流式首响应可以改善进度可见性，但不会自动缩短总生成时间；调整多候选并发也不能直接解决这里的单候选等待。

可行的下一次实测应固定材料、图类型、请求模型/渠道、分辨率、候选数、检索与评审轮数，记录阶段分位数和失败/修复率，先预定小额调用上限。本轮没有执行这一步。
