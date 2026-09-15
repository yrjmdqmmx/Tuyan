# 小程序 3.3.0：观猹身份登录

## 基线与范围

用户要求同步 Web 新增的观猹身份登录。本分支 `codex/miniprogram-watcha-login-20260910` 从小程序 3.2.0 完整交付 `054d9f538b0963b156f18d13e4968255910fcf4a` 建立，合并 Web/Gateway 主线 `bc6b44495e004b6912cce9da0d847d6ac7e96d5c`（#193 / #194 / #195）。原 3.0.1、3.1.0、3.2.0 源码及本机私有文件保留。

继续沿用交接 lineage `lin-5b571a51515da5ce`，后续交接 parent 为 `20260910-171551-codex-tuyan-mini-program-3.2.0-tokendance-pari-01a07efe-e9af-79c0-8f4b-`。本文件不含凭据，交接快照也不是 Git 对象备份。

## 缺口与设计

| 缺口 | 实现 |
| --- | --- |
| 小程序只有邮箱登录和 TokenDance 渠道授权 | 登录面板增加官方观猹图标入口；账户页新增身份入口，独立页面管理图研身份绑定 |
| 浏览器 OAuth Cookie 不会自动变成小程序会话 | Gateway 新增短期双凭据接续：小程序持有发起 Cookie，系统浏览器显示独立一次性接续码，两者同时满足才兑换图研会话 |
| 首次观猹用户没有图研身份或密码 | 原有邮箱验证码注册，已有邮箱先登录原账号并明确绑定；保持不可变 user ID，禁止隐式按邮箱合并 |
| 绑定、解绑和无密码账号管理缺失 | 复用 `email-code / complete / link / unlink / delete-confirmation`；唯一登录方式不能解绑；密码设置走已有找回密码邮件；注销沿用邮箱匹配、二次确认和生命周期 |
| 小程序异步响应可能在换号/离开后修改 Cookie | 身份操作增加请求有效性检查，在写 Cookie 前拒绝失效响应；慢速 get-session 同样检查 session epoch |

选用复制链接与手动接续码，沿用本项目已有系统浏览器操作习惯。直接复用 Web 弹窗无法跨 Cookie 容器接续；嵌入 web-view 还会引入业务域名资格和不同平台 Cookie 行为。不会把观猹身份令牌用作 TokenDance Key。

## Gateway 契约

- `GET /api/auth/watcha/mini-status`：原身份状态字段加 `miniProgramSupported: true`，小程序据此启用操作。旧网关 404 时保留邮箱登录。
- `POST /api/auth/watcha/mini-start`：`{intent: login|link}`，返回网关固定 `url` 和毫秒 `expiresAt`，设置短期发起 Cookie。
- `GET /api/auth/watcha/mini-launch?state=...`：一次性启动票据换成浏览器绑定的官方 S256 OAuth；沿用已登记回调，无新供应商客户端凭据。
- 原 OAuth 回调对小程序事务返回网关自托管 HTML：无第三方资源、禁止缓存/框架嵌入/引用来源泄漏，显示独立一次性接续码。它不会登录或切换浏览器的图研账号。
- `POST /api/auth/watcha/mini-exchange`：`{code}` 加发起 Cookie，返回 `ok/status=complete|pending`。绑定流校验原会话、不可变用户 ID 与生命周期代次；回访生成图研会话，首次/绑定流进入既有 pending 状态。启动链接本身不足以取走身份。
- `POST /api/auth/watcha/mini-cancel`：废弃当前发起 Cookie 对应的 launch/state/ready/pending。
- 发起及兑换有单独限流；全部事务沿用 `watchaTransactions` TTL 与账号生命周期清理。原 Web `/watcha/start` 继续仅接受浏览器来源；原生管理请求接受配置中微信来源，缺 Origin 时仅接受当前小程序 AppID 的精确 Referer。

无新增环境变量、供应商权限、数据库集合或模型消费 action。Gateway 代码必须部署后，正式小程序接续才可用。2026-09-10 本轮匿名只读检查：正式 `/watcha/status` 为 200/available，`/watcha/mini-status` 为 404；不能把 Web 已上线当作本补充已部署。

## 验证与交付记录

[结构化验证证据](evidence/miniprogram-3.3.0/validation.json)、[同步清单](evidence/miniprogram-3.3.0/local-sync.json) 与注明模拟的原生截图已保存到仓库；详细日志和自动化脚本暂存于 `/Users/a1-6/.codex/tmp/tuyan-miniprogram-watcha-20260910/`；所有原生截图文件名包含 `mocked`。上游观猹、邮件、支付及账号删除在本地测试使用替身，不操作真实用户身份。

- 小程序全量回归 91/91；包含新身份请求、重复提交、接续码不进入视图状态、旧响应 Cookie 保护、A-B-A 账号切换及注销证明；原 3.2.0 测试保留。
- Gateway 原有 148 项回归，以及隔离 Mongo 中原 Web 14 组和新增小程序 7 组流程；覆盖不同浏览器/小程序 Cookie 容器、原 ID 登录、并发兑换、已有邮箱显式绑定、取消/过期、原会话贯穿兑换与最终确认的绑定、生命周期恢复、唯一登录方式与注销证明。
- 类型检查、构建、共享模型源契约及两套生成器漂移检查；全新输出目录构建的 48 组 JS 与源码交付逐文件比较一致。
- 微信开发者工具原生 5 场景通过：首次邮箱注册、原页面输入/模型保留、无密码安全保护、解绑后明确重绑、邮箱证明注销确认；未捕获原生异常。
- 本地上传副本用上一版本的 192 项 manifest 验证无漂移后同步：新增 9、更新 22、删除 0；现在 201 项源码/副本 checksum 一致，9 个本机文件原摘要不变。副本 91/91 测试通过，实际微信开发工具读取 `miniprogram-3.3.0`，身份模块和新页面均已加载。受控文件的旧版备份保存在同步清单列出的仓库外路径。

本次实现提交 `0714e911a8d0ec25d2a70c252a258243eec27199`。旧 worktree 仍干净，HEAD 为 `054d9f538b0963b156f18d13e4968255910fcf4a`；没有推送分支。

源码、本地副本、Gateway 部署、真机授权和微信平台上传/审核/发布分别记账。本轮不进行生产部署、真实邮件/身份变更、供应商消费、微信上传或平台发布。开发者工具的导航句柄可能先于可见页面更新，验收须等待当前路由及可见状态一致。

## 回滚

在新隔离分支处理撤销；3.2.0 原 worktree 不变。本地副本回滚只根据本轮同步清单恢复备份中的旧受控文件，逐项处理本轮新增文件，保留私有配置与登录态。Gateway 回滚到主线原版本后，小程序通过能力检查回退邮箱登录；不要覆盖既有观猹凭据、TokenDance 加密主密钥或正式账号数据。
