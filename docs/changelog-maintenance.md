# Web 更新日志维护

正式入口为 `/changelog`。桌面导航顺序是「工作台 → 排行榜 → 更新日志」；手机入口位于「更多」。页面复用排行榜的 `SitePageShell`、会话 Provider、账户和反馈动作，不发起第二套登录状态请求。

## 唯一数据源与收录范围

`apps/web/src/data/changelog.json` 是正式页面的唯一内容源，按日期倒序排列；页面按日期分组，自动支持搜索和条目锚点。`schemaVersion=1`。不要复制一份内容到组件、Markdown 页面或后端。

首次整理收录 **2026-09-07 至 2026-09-22 的 17 条主要 Web 更新**，不是所有历史版本的穷举，也不代表当前小程序已发布这些能力。日期沿用可追溯发布记录的日历日期，不把提交日、PR 合并日、文档补记日或供应商发布日期当作产品发布日期。未在此范围内找到可确认发布材料的历史继续待整理，不造日期或版本号。

当前记录的来源：

| 记录 ID | 发布证据 / 内容来源 |
| --- | --- |
| refine-catalog-v23 | `releases/2026-09-22-refine-v23.md`；PR #226；Pages 35684170270 与配套发布 35683970466 |
| catalog-leaderboard-language | PR #224（合并 SHA `0d8b0b4500eb9ca6d8b1b5180450276c7f78b2fb`）；Pages 35603884753、配套发布 35601906465 |
| mobile-navigation-pareto | PR #221 / #222 / #223；Pages 35561997844，固定 SHA `4a601b932a09a3f59f717a7100f1b8b51e0e0b44` |
| settings-catalog | `releases/2026-09-20-settings-catalog.md` |
| universal-api | `releases/2026-09-20-universal-api.md` |
| tokendance-catalog-isolation | `releases/2026-09-19-tokendance-catalog-isolation.md`，只采用首轮已确认上线行为 |
| riverflow-withdrawal | `releases/2026-09-17-riverflow-v2-pro-withdrawal.md` |
| scientific-rereview | `releases/2026-09-17-scientific-v2-rereview.md` |
| benchmark-model-costs | `releases/2026-09-17-replicate-five-models.md` |
| reference-budget | `releases/2026-09-16-reference-budget.md` |
| watcha-login | `releases/2026-09-10-watcha-oauth.md` |
| reference-upload | `releases/2026-09-10-reference-upload.md` |
| tokendance-account | `releases/2026-09-09-tokendance.md` |
| gpt-image-25 | `releases/2026-09-09-image25.md` |
| refine-upload | `releases/2026-09-08-refine-upload.md`，Web 与上传修复的不同发布版本分别有证据 |
| email-confirmation | `releases/2026-09-08-email-confirmation.md` |
| account-lifecycle | `releases/2026-09-07-account-lifecycle-v3.md`，仅提炼产品行为，不复制账号恢复现场细节 |

2026-09-22 只读核查了 9 月 21 日的两个 Pages 工作流：均为 `completed / success`，`headSha` 与表中版本一致，完成日期均为 9 月 21 日；v21 配套发布工作流也为 success。其余条目根据仓库已归档的发布验收记录整理。本次整理未重新验证生产功能或任何模型推理，自动数据校验也不能代替上线证据审阅。

当前本地 v24、尚未发布的导航调整、论文画布等不进入正式数据，也不要以隐藏字段或 `draft` 条目打进客户端包。小程序源码同步、上传、审核、正式发布是不同状态，本页目前只收录 Web 行为。

## 新增一条记录

1. 先核对实际发布日期、范围和最终结果。代码合并、CI 通过、截图或本地验收均不能单独证明上线。保留公开发布工作流或已有生产核验记录，并补充准确 PR 来源。
2. 从 [条目模板](changelog-entry.template.json) 复制结构。未发布内容留在文档草稿；确认发布后再加入正式 JSON，并将 `status` 改为 `released`。一次功能可有多条来源；不同端状态不要合并成已上线。
3. 使用唯一、稳定、全小写的 `id`，它会成为 `/changelog#id` 链接。标题说明用户得到的改进，`summary` 为一句概述，`changes` 仅用「新增 / 改进 / 修复 / 调整」。历史更正修改原条目并保留来源，不新增假发布日期。
4. 日期倒序放置（同日保持手工编辑顺序），更新 `coverage.from / through / description`。公开来源仅允许本仓库 PR、发布 Actions 或固定提交的发布记录，禁止可变 `main` 文档链接和私有资料链接。
5. 公开文字不得含内网地址、账号、邮箱、机器路径、密钥或运维实施细节。提供方目录接入、账号权益、真实推理和账单仍分别陈述，不暗示全部已验证。
6. 运行下面的内容与交互检查，并用桌面和手机看一次页面。页面和历史数据按现有 Web 流程发布；此维护说明和本次实现不授权任何部署。

```sh
cd apps/web
node --test src/changelog.test.js
node --import tsx --import ./tests/dom-setup.mjs --test src/components/ChangelogRoot.test.js src/components/LeaderboardRoot.test.js tests/leaderboard-ui-contract.test.mjs tests/mobile-workbench.test.mjs
pnpm build
```

全量 `pnpm --filter @paperbanana/web test` 会自动包含这些检查。内容校验覆盖日期、唯一锚点、倒序、覆盖范围、正式状态、来源类别和安全公开地址；检出 draft、只有 PR 没有发布依据、私有地址等常见错误。证据内容真实性仍须维护者核对。

## 本地交互检查

直接打开和刷新 `/changelog`、`/changelog/`、`/changelog/index.html`；构建包含独立静态 HTML，兼容部署 base path。检查桌面导航顺序与当前高亮，手机初始页无更新日志快捷项，打开「更多」后可见入口。搜索功能词和日期、清空、空结果恢复、展开来源及链接、条目锚点、反馈/账号入口均应可用。不要为验收提交反馈、创建账号或发起真实生成。
