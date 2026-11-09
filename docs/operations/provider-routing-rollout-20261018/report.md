# 按实测发布香港 / 新加坡分渠道线路

2026-10-18 北京时间 12:49 已在杭州 Core 生效。用户已明确授权按实测配置渠道并修复 Fireworks 慢代理；本轮没有调用模型、没有使用模型 API Key、没有创建云付费资源。仅实施网络 GET / DNS / TLS / CONNECT 验证。**模型调用数 0，模型费用 0；既有服务器和网络费用不属于此结论。**

## 已生效分配

- **杭州直连**：TokenDance、阿里百炼、火山方舟、Fireworks，以及既有国内主机（DeepSeek、Kimi、智谱、硅基流动、阶跃、千帆、TokenHub、讯飞、商汤、蚂蚁、LongCat、小米、MiniMax 中国入口等）。
- **杭州经香港**：13 个渠道、16 个精确 API 主机，见下表。MiniMax 国际与国内入口分别选路。BFL 默认 / US / EU 地址各自保留，只改变出站位置。
- **杭州经新加坡**：OpenAI、Anthropic、Gemini、三个已批准 Bedrock runtime 主机，以及未另行配置香港的既有海外目标。Azure 仍要求具体账户资源主机授权；本轮没有开通未知资源。
- 同一渠道同一 API 主机下各模型共用线路。没有改模型 ID、版本、角色、参数、提示词、认证信息或服务商内部路由；不增加失败后自动换线重放。没有可用密钥的渠道仅预配置网络线路，不代表账户已开通。

正式 WireGuard + Squid 全链路对照：从杭州发出，每个端点每条参与线路 5 次独立 curl GET。香港 80 次、SG 修正 DNS 候选 120 次，共 200 次均完成传输，TLS 验证开启。以下是首字节耗时中位数，单位 ms；**不含推理，不是模型首 token**。SG 对照使用同机同 ACL 的私网 3129 候选代理，验证后正式 3128 已同步 DNS，候选已关闭。

| 端点 | 精确主机 | 香港 | 新加坡（修正 DNS） | 已配置 |
| --- | --- | ---: | ---: | --- |
| bfl | `api.bfl.ai` | 761.1 | 941.3 | 香港 |
| bfl-eu | `api.eu.bfl.ai` | 910.1 | 990.1 | 香港 |
| bfl-us | `api.us.bfl.ai` | 772.3 | 1024.5 | 香港 |
| fal | `api.fal.ai` | 615.1 | 784.0 | 香港 |
| fal-queue | `queue.fal.run` | 776.4 | 990.6 | 香港 |
| ideogram | `api.ideogram.ai` | 422.5 | 534.4 | 香港 |
| minimax | `api.minimax.io` | 464.1 | 1001.2 | 香港 |
| mistral | `api.mistral.ai` | 418.2 | 536.6 | 香港 |
| novita | `api.novita.ai` | 391.9 | 483.2 | 香港 |
| openrouter | `openrouter.ai` | 205.0 | 315.1 | 香港 |
| recraft | `external.api.recraft.ai` | 789.4 | 962.5 | 香港 |
| replicate | `api.replicate.com` | 426.2 | 578.8 | 香港 |
| runware | `api.runware.ai` | 454.9 | 497.8 | 香港 |
| stability | `api.stability.ai` | 487.7 | 606.9 | 香港 |
| together | `api.together.ai` | 439.3 | 517.2 | 香港 |
| xai | `api.x.ai` | 422.0 | 485.5 | 香港 |

新加坡保留目标的同期中位数：OpenAI 528.9、Anthropic 541.6、Gemini 309.7、Bedrock 三个地区约 975–1061 ms。它们的地域适用性与已有策略共同决定保留新加坡，不能只按一个更快的拒绝响应改线路。

## Fireworks 根因与修复

1. SG Squid 原配置强制 DNS 为 `1.1.1.1 223.5.5.5`，覆盖宿主解析器。旧 DNS 返回 `13.57.174.69 / 54.176.5.0` 等高延迟网关；阿里 DNS 返回 `47.131.175.111` 等低延迟网关。实际 CONNECT 连接也曾观察到 `13.57.174.69:443`。
2. 同一 SG 主机、同一 Fireworks GET 路径、同样启用 TLS 验证，固定解析结果对照 3 次：`13.57.174.69` 中位 **561.4 ms**，`47.131.175.111` 中位 **27.3 ms**。这是诊断用固定解析，生产没有固定供应商 IP。
3. 杭州经原 SG 代理的 5 次中位 **849.3 ms**；仅换 DNS 的候选为 **297.8 ms**。正式 Squid 已 graceful reload 为 `223.5.5.5 223.6.6.6`；正式 3128 冒烟为 302.4 ms。
4. 杭州直连另 5 次 curl 中位 **175.4 ms**。首次容器逐渠道巡检有一次 1412.6 ms 尖峰，因此追加真实 Core 容器、相同 undici 客户端交错对照：Fireworks 直连中位 **233.9 ms**，修正后的 SG 中位 **303.3 ms**，5/5 全部返回预期 GET 405，故正式选择直连。DNS 修复仍保留，改善 SG 备选路径。

上述现象符合 [Fireworks 官方 DNS 就近选网关说明](https://fireworks.ai/blog/multi-region-deployment)，以及 [Squid 显式 DNS 覆盖系统解析器的定义](https://www.squid-cache.org/Doc/config/dns_nameservers/)。这是本次地址与时段的实测，不代表某个 DNS 在所有渠道永久更快；网关选择也不决定实际模型算力所在位置。

容器追加对照还确认 Replicate 香港 / SG 中位 364.7 / 502.5 ms，Runware 为 409.1 / 505.2 ms。所有追加 30 次 GET 均完成，原逐渠道巡检中的 Replicate 单次长尾没有改变路线结论。

## 生产变更与验证

- 生产源码 `5f15e5e0bb2e2c67f23ebe09000a9a7ec76e70ad`；镜像 `sha256:75cbc12e7969af32be4cd8a6e38d0adf5425623b0c14db5ac118d7dfa0248dfb`；bundle SHA-256 `7a80115dc2299e6d729d8131ff168434e99c36c0e5c2861def6e11b20e1720fe`，运行文件哈希已核对。
- 发布前发现另一会话已更新 Core 到 `f15510ce`，因此合入其排行榜证据读取修复及网关源码/记录后再构建；没有覆盖现网改动。相对当前生产 Core 的运行源码只新增配置与出站选择补丁。原镜像 `sha256:631f11b065a9974c6f6034b4e37546ffc7e17199d2bd81ea2a9edaee775ea85d`。
- 维护门禁期间检查活动任务 0，仅重建 Core。其余 9 个容器 ID 保持；10 容器 healthy、重启次数 0；维护标记已清除。
- 实际 Core 环境加载配置，并使用同提交的出站模块和真实 ProxyAgent 发出 **42 个无凭据 GET**：16 个走 HK、6 个走 SG、20 个直连；所有实际 dispatcher 选择符合断言，传输失败 0。HTTP 200/400/401/403/404/405 都是记录到的无凭据 GET 结果，不被包装成鉴权通过。
- `https://tuyansci.cn/ready`、`https://api.paperbanana.asia/ready`、`https://openacad.xyz/api/health` 均 200。部署 smoke 的本地健康、隔离、匿名 Core 拒绝、Benchmark、Mongo 事务检查通过。Mongo shell 输出缓存目录权限提示，但事务检查成功。
- 本轮配置 / 选路代码和部署记录已以限定路径补丁同步主开发工作区，保留其原有未提交工作和索引；未同步暂停的小程序。
- 合并后 59 项 Core 配置 / 出口 / OSS / 科研证据测试通过，111 项 SG 出口脚本测试通过；类型检查和构建通过。
- 代理测试覆盖未授权 OpenAI（HK）、IPv4 字面量、私网目标、非 443 端口均被 CONNECT 403 拒绝。单元测试覆盖认证头 / 请求体保留、跨来源重定向移除认证、代理错误不回退。

## 网络与运行边界

新增独立隧道：HZ `pbhk0=10.78.0.2/32` → HK `pbhz0=10.78.0.1/32`。香港云规则仅放行杭州 `116.62.146.226/32` 到 UDP 51821，规则 ID `9104c00e797340e6bb4f7a4770c8d349`。现有杭州 / 香港到 SG 的 WG 不变，香港其他项目与冻结业务不重启。

香港 Squid 仅监听 `10.78.0.1:3128`，仅杭州隧道来源，16 主机精确 allowlist、CONNECT 443、无 TLS 解密、无缓存、日志不记认证或正文。SG 仅监听 `10.77.0.2:3128`。新 WG 与香港 Squid 均 active + enabled，服务依赖隧道就绪；临时 SG 3129 已停止、配置已清理。Squid 使用官方 Debian 包，安装未变更全局 apt 源。

既有 SG 定时出口监控未改为多地区监控，本次对 HK 的验证为发布时核验与 systemd 服务保活；本轮没有新增定时测试。旧 HK / SG GitHub Actions 继续停用，不能重新执行历史单来源拓扑 installer。

## 恢复

- 杭州 root-only 备份 `/var/backups/provider-regional-routing-20261018/` 含切换前 Compose env / Core env 和 receipt；恢复时必须保留后续生产变更，先开启维护、确认无活动任务，再还原对应 Core 镜像及配套两个 env 文件，仅重建 Core，健康后撤维护。不可简单回到更旧 e3c2a9d8 而丢失排行榜修复。
- HK 配置缺省时沿用 SG；撤 HK 时删除两个变量，不能置为空。Fireworks 如需回 SG，从 direct hosts 移除该主机。此类变化仍需发布与验证，不在失败时自动执行。
- SG DNS 旧配置保存在 `/var/backups/tuyan-sg-dns-20261018/`，可独立恢复并 graceful reload。
- HK Squid 安装前配置保存在 `/var/backups/tuyan-hk-egress-20261018/`。须先将业务从 HK 路线移走后，才停新 Squid / 新 WG 并移除新增 UDP 规则；保留原 WG 和共享主机其他业务。

## 尚未验证

真实账号地区权限、免费额度、带密钥推理、首 token、持续流式、大请求 / 图片吞吐与输出质量均未验收。N=5 对照用于当前网络选择，不是长期 SLA，也不能保证每个时刻最快；没有宣称全部渠道已有可调用账户。零模型费用约束持续有效。

证据：本目录 JSON / JSONL、测试输出和复现脚本；前轮完整三地审计见 [全渠道线路审计](../provider-route-audit-all-20261018/report.md)。私钥、生产 env 与模型认证信息均未收录。
