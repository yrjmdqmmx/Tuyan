# 杭州业务的双区域受控出口（2026-10-18）

此配置叠加在已迁杭州的业务之上，不重启香港冻结的业务或数据库。用户已授权按零模型费用实测结果切换渠道线路。

- 杭州→香港：新增独立 WireGuard，杭州 pbhk0=10.78.0.2/32，香港 pbhz0=10.78.0.1/32；香港 UDP 51821 仅准许杭州公网来源。原杭州/香港→新加坡的接口及密钥不变。
- 香港 Squid 仅监听 10.78.0.1:3128；来源只接受 10.78.0.2，目的仅 CONNECT/443 和 hongkong-squid.conf 内精确 API 主机。拒绝地址字面量与私网目标；不解密 TLS、不缓存、不记录认证头/请求体。
- 新加坡维持 10.77.0.2:3128，允许原香港来源及杭州 10.77.0.5。DNS 改为 223.5.5.5 / 223.6.6.6，避免 Fireworks 解析至高延迟网关。没有固定供应商 IP；VPC DNS 仍不可达。源码 installer 同步 DNS 与杭州来源，但旧部署流程仍停用，不能直接重装旧拓扑。
- 香港 squid.service drop-in：Requires/After=wg-quick@pbhz0.service；RestrictAddressFamilies=AF_INET AF_UNIX。两端新 WireGuard 和香港 Squid 均随系统启动；无定时生成或计费测试。

Core 新增成对配置 PAPERBANANA_HK_PROXY_URL=http://10.78.0.1:3128 与 PAPERBANANA_PROVIDER_HK_HOSTS，必须为 sg-required 模式及代码审核过的精确主机清单。省略这对变量即沿用 SG 原策略，空值或非法主机导致启动失败。PAPERBANANA_PROVIDER_DIRECT_HOSTS 增加 api.fireworks.ai 可选项；仍仅精确 HTTPS/443 生效。

当前配置香港 16 个主机：OpenRouter、xAI、Novita、Stability、Together、Ideogram、Runware API、Mistral、BFL 默认/美/欧、fal 目录/队列、Recraft、Replicate、MiniMax 国际。OpenAI、Anthropic、Gemini、Bedrock、未配置香港的既有海外主机仍走 SG；国内入口及 Fireworks 直连杭州。没有改变型号/版本/提示词/参数/上游选择。任一已选线路失败都不自动换线或重放请求。

模型账户权限、推理首 token、流式稳定性、大图传输与输出质量未在本次零推理测试中验收。401/403/404/405 只描述无凭据 GET 的响应。

回退时先在杭州维护窗口确认无活动任务，删除两个 HK 配置变量，并从 direct hosts 中移除 api.fireworks.ai（保留原 TD/Ark），恢复上一 Core 镜像及配套 env；不要把变量置空。业务切回 SG 后方可停香港代理、新 WG 接口、删除新增云防火墙规则。SG DNS 可独立恢复 root-only 配置备份并 graceful reload。保留原 WG 和其他项目的网络/容器。详见本轮操作记录。
