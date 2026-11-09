# 百炼 57 个删除 ID 的地区核查 · R4

仅对照只读基线 main `c7b6a2fc` 的 `apps/web/src/lib/staticModelCatalog.js` 与 `config/bailian-workspace.json`。57 项均显式 `regions: ["cn-beijing"]`，均不在工作空间专属合同 `models` 中；不能把合同的地区总表自动套到每个模型。总表有北京、新加坡、弗吉尼亚、法兰克福、东京，工作空间型号另按各自 `regions` 验证。

任务提供的[中文退役页](https://help.aliyun.com/zh/model-studio/model-depreciation)列出 2026-10-10 六项通告（118177/118434/118344/118345/118331/118332）；[国际退役页](https://www.alibabacloud.com/help/en/model-studio/model-depreciation)也有当日批次（1841/2009/1938/1934 等），但逐型号 JS 列表尚未核实。本轮不把中文通告推断为全球退役。因这 57 项在图研只配置北京，全部保留删除；恢复国际地区 0 项，needs international-notice confirmation 0 项。

| API ID | 基线型号地区 | 工作空间合同地区 | 本轮结论 |
| --- | --- | --- | --- |
| `MiniMax-M2.1` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `MiniMax/MiniMax-M2.1` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `Moonshot-Kimi-K2-Instruct` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `deepseek-r1` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `deepseek-r1-0528` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `deepseek-r1-distill-qwen-14b` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `deepseek-r1-distill-qwen-32b` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `deepseek-r1-distill-qwen-7b` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `deepseek-v3` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `deepseek-v3.1` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `deepseek-v3.2` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `deepseek-v3.2-exp` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `deepseek-v4-flash` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `glm-4.5` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `glm-4.5-air` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `glm-4.7` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `kimi-k2-thinking` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qvq-max` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qvq-plus` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-image-edit` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-image-edit-max` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-image-edit-max-2026-01-16` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-image-edit-plus` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-image-edit-plus-2025-10-30` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-image-edit-plus-2025-12-15` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-image-max` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-image-max-2025-12-30` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-image-plus` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-image-plus-2026-01-09` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-long-2025-01-25` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-long-latest` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-omni-turbo` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-vl-max` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen-vl-plus` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen2.5-omni-7b` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-14b` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-235b-a22b` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-235b-a22b-instruct-2507` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-235b-a22b-thinking-2507` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-30b-a3b` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-30b-a3b-instruct-2507` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-30b-a3b-thinking-2507` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-32b` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-8b` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-coder-30b-a3b-instruct` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-coder-480b-a35b-instruct` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-coder-plus` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-coder-plus-2025-07-22` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-coder-plus-2025-09-23` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-next-80b-a3b-instruct` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-next-80b-a3b-thinking` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-omni-flash` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-omni-flash-2025-09-15` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-omni-flash-2025-12-01` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3-vl-flash` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwen3.6-max-preview` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
| `qwq-plus` | cn-beijing | 未纳入工作空间型号表 | 保留删除（仅北京） |
