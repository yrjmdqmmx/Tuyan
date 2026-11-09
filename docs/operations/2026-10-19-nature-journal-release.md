# Nature 主刊期刊库 v11 发布记录

日期：2026-10-19（Asia/Shanghai）。本任务经用户授权提交、部署及线上页面验收，不调用真实模型。

## 发布范围与版本

- 工作树：`/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）`；分支 `codex/hangzhou-production`。
- Nature 独立提交：`4e60e85edc5c740d015f2cbe57b9feb6ddb8484b`，14 个文件。
- 实际生产提交：`15401ee5dc2b2295a79bcb943650c86433183593`。同批次包含另一已获授权会话的模型目录、双域名与性能改动，仍保留独立提交；本记录只验收 Nature。
- [发布流水线 39191450905](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39191450905)：verify、4 个镜像、Hangzhou deploy、Pages 全部成功。
- 杭州宿主回执 `status=healthy`，完成时间 `2026-10-19T03:14:32Z`（北京时间 11:14:32），`modelCalls=0`。服务器回执与 CI 下载回执的生产 SHA 相同。
- `https://tuyansci.cn/version.json` 与 `https://www.paperbanana.asia/version.json` 均为该生产提交；target 分别为 Hangzhou、GitHub Pages。
- 本次后续文档提交不改变部署内容，不触发 Markdown-only 发布流程。

## 质量检查

- CI：Core 1,523/1,523、Benchmark 200/200、Web 1,013/1,013；Gateway 173 通过、1 跳过、0 失败。Core / Benchmark 类型检查、Web 构建以及镜像离线检查成功。
- Nature v11 Gateway / Core 模拟全链路在最终 CI 中通过：20 次 synthetic 调用，`realModelCalls=0`。覆盖冻结规则、任务、精修、文件检查 / 导出与历史。
- 本地 Web 全量 1,013 项通过。本地 Benchmark 199/200，唯一失败为测试使用 `URL.pathname` 导致中文工作树路径重复编码；最终 Linux CI 的 200 项全部通过，未为此修改其他模块。
- 先前两次共享批次 CI 分别因 v35 测试/审计缺项及性能测试的类型声明失败，均未切换生产；对应拥有会话修复后才完成本次发布，没有跳过门禁。
- Nature 提交是实际发布提交的祖先；除共享 SYNC 记录外，本次 Nature 文件在两提交间完全相同。

## 线上验收

杭州生产浏览器使用现有登录状态，未提交生成、输入优化、精修或投稿：

- 搜索“主刊”唯一命中 Nature；书架共 18 本。封面、简介、出版社和三个官方入口正常显示。
- “期刊官网”实际打开 Nature 官网（官方重定向至 `https://www.nature.com/`）。投稿入口打开 `https://mts-nature.nature.com/cgi-bin/main.plex` 的官方系统 Cookie 提示页，未登录或投稿。规则来源实际打开 Nature 官方封面指南。
- 14 个规则来源、投稿入口、封面期次页，共 16 个官方链接 HTTP 200。链接可访问不等于投稿获准。
- 3 个阶段 × 5 种用途，共 15 组切换通过；页面显示 `2026-10-19.v11` 与核查日期 `2026-10-19`。
- 初投 / 修改稿不显示制作专用栏宽和字体阈值；正文制作显示 90/180 与 89/183 mm 来源冲突；Extended Data 的宽度、最高 DPI 和格式单独适用。
- 封面在三个阶段均显示“当前不可执行”的生成式 AI 禁令；Graphical Abstract / TOC 的规格及 AI 许可保持待确认。
- 本次页面内容性质为“流程图 / 普通示意图”。未将此验收扩展声称为原始科研图像、真实模型生成或投稿合规验收。
- 取消弹窗后原选择仍为“不指定期刊”；关闭本任务创建的验收和来源标签页，未改变其他会话的任务或标签页。浏览器错误/警告捕获为空。
- 两域名封面均为 95,670 bytes，SHA-256 `2c32d6e92e46f6d456ad2ac3953162033dfaa0250ebb168bbd231599c915c0de`，与受控源文件一致。
- 两套网关 `/ready` 均 HTTP 200 / ok；10 个容器 healthy。MongoDB、Redis 和 3 个 OpenAcad 容器 ID 与部署前一致。

## 保留边界与证据

- 封面采用 2024-10-10、Volume 634 Issue 8033 的官方历史期次识别图，非最新一期；保留 Emily Geyman credit、原图来源及哈希。独立再分发授权仍未确认，不把网页公开访问视为开放许可。
- 官方来源冲突、未确认要求、人工判断项继续显示；选择期刊不代表图片获准投稿。
- 小程序继续暂停；桌面旧仓库及另一开发工作树未修改。其他会话的现有改动保留。
- 本机证据目录：`/Users/a1-6/.codex/visualizations/2026/10/19/01a151da-1fe0-79d1-a2a4-50b9e48c319f/nature-deployment/`。
- 证据包括 `commit-verification.json`、`ci-test-evidence.json`、`ci-receipt/deployment-receipt.json`、`host-before.json`、`host-after.json`、`production-verification.json`、`official-links.json`、`ui-link-evidence.json`、`ui-scope-evidence.json`，以及 `nature-production-overview.png`、`nature-production-source-conflicts.png`、`nature-production-cover-warning.png`。
