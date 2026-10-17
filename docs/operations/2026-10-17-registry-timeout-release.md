# 模型目录超时修复双站上线（2026-10-17）

用户授权仅发布本次模型列表超时修复，并要求保留开发工作树全部现有改动和未跟踪文件、禁止真实模型调用。本轮已完成新旧网站 Web 与两套 Gateway 发布和浏览器加载/重试验收。

## 来源与范围

- 发布分支 `codex/model-registry-timeout-20261017`，产品修复提交 `4205139d55f0c4ea9a1074723159867dc6a608a2`，基于已上线 4.0 发布记录提交 `e888bfffcef316cb974d10b473a7624483f65638`。
- 13 个源码/测试文件的修复前 SHA-256 均与发布基线一致，再精确提取本次差异；另增加同步说明。没有把开发区其他改动一起发布。
- Gateway 仅对成功的公开 `modelRegistry` 协商 gzip，JSON 内容完整保留；Web 超时取消请求、刷新在上次读取结束后调度、失败保留目录和选择、重试恢复。过期目录只供查看，重新确认前阻止生成和精修。
- Core、数据库、密钥、两套观猹配置、TokenDance 连接、出口及小程序均未变更。Benchmark 执行仍为 `false`。

## 已发布产物

- 两套 Gateway：`ghcr.io/yrjmdqmmx/paperbanana-auth-gateway@sha256:433abb8c85b9f33b1986eda8434231d9c1530c152dbb25beefe06fcb41df2733`。
- 镜像 revision 为上述修复提交；容器镜像内 `app.js` 哈希与发布源码一致：`b1cba8ff38b31d39b3f514c4bc857068eb0c098fdffe27c0cb3a902b9026bbb0`。
- [Gateway 构建](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39006503750)；[Pages 发布](https://github.com/yrjmdqmmx/Tuyan/actions/runs/39006506746)。Pages 从既有 main 工作流入口构建明确指定的 `4205139d`，未发布 main 的旧产品源码。

| 站点 | 静态产物 | 线上 HTML SHA-256 |
| --- | --- | --- |
| https://tuyansci.cn/ | `/opt/tuyan-entry/releases/20261017-4205139-registry-timeout`，`main-DFE8V6sl.js` | `0a9511969ecabd2ca94c0f464cc3ee60e922be040a8f5724709cb5cf3af11b48` |
| https://www.paperbanana.asia/ | Pages 固定修复提交，`main-BwIeryCh.js` | `ed5462cd2562e5817ac650f4a529c6ef4e4e860c3d01cfcc18026f9c504cc434` |

新站 382 个文件上传后逐一校验；双站线上 HTML 与主脚本均与各自构建产物哈希一致。两套 Gateway 持有生产共享锁逐个更新，Core 与其他项目容器 ID、启动时间、镜像保持不变，凭据文件指纹一致，维护标志未启用。

## 验收

- 发布副本本地：152 项 Gateway、32 项共享 API、815 项 Web 测试及构建通过；测试使用离线桩。
- Pages 首轮为 814/815：未修改的 `browser-materials.test.mjs` 在固定等待 10 ms 后仍处于异步初始化，出现 `0 !== 10`。保留原代码，同一提交第二轮完整 815/815 通过，随后 build/deploy 成功。未跳过测试、放宽断言或混入其他修复。自动全仓库 CI 未触发，采用手动 Gateway 构建与含完整 Web 测试的 Pages 流程，暂停的小程序不参与本轮操作。
- 双站 `/health`、`/ready` 均为 200；公开目录保持 32 渠道、目录 v34、期刊规则 v10。现网完整 JSON 为 7,078,847 字节，gzip 约 279,280 字节，减少约 96.1%。
- 隔离 Chrome 浏览器使用真实线上页面，1440px 桌面和 390px 手机均通过。首次读取/后台失败后重试/手机首次失败后重试分别为：新站 1288/992/1027 ms，旧站 1415/1328/1120 ms；仅为本次网络实测，不是延迟保证。
- 失败仅在验收浏览器拦截目录请求并返回 503，未制造生产故障；恢复后点击页面“重新读取模型与渠道能力”，通过真实线上接口恢复完整列表。后台失败期间渠道与模型仍可查看，保存的选择保持不变。
- 页面无运行时错误、控制台异常或框架错误遮罩。浏览器仅放行只读目录/参考库 POST，未发出生成、精修、优化输入或其他模型调用；未重复授权或创建密钥。
- 开发区 4540 个原有文件内容全部保持，Git 状态、索引及 HEAD 与本轮开始完全一致；发布工作树其他原有文件与未跟踪验收资产也保持。

验收证据位于工作区外 `/Users/a1-6/.codex/visualizations/2026/10/17/tuyan-registry-timeout-release/`：`fix-only.patch`、`gateway-deploy.json`、`live-http.json`、`live-browser-cn.json`、`live-browser-legacy.json`、`development-preservation.json`、完整测试与 Actions 日志及截图。仅验证目录加载与重试，不代表各模型实际调用或生成质量验收。

## 本次回滚点

- 香港 `/opt/paperbanana/ops-releases/registry-timeout-4205139d55f0/` 保存 `rollback.env`、`rollback-cn-compose.yaml`、切换前容器/凭据指纹与结果。旧 Gateway 镜像为 `ghcr.io/yrjmdqmmx/paperbanana-auth-gateway@sha256:5eaa047dbebfb14c81bc23d4c3a5f160d12cfb6181d0b33c4e990e78284ae7a5`；在共享锁内恢复这两份配置并只重建两套 `auth-gateway`。
- 杭州旧静态目录 `/opt/tuyan-entry/releases/20261017-45fd373-v400` 保留；切换记录为相邻的 `20261017-4205139-registry-timeout.rollback.json`，可原子恢复 `current`。
- 旧站 Pages 可从既有 main 工作流入口重新发布前一已验证源码 `c2f1036184b6cca0ac9739c1d96e65d773bf1991`。
- Core 仍运行 `a68bb268` 对应镜像和配置，本次回滚不涉及 Core、数据库或存储恢复。
