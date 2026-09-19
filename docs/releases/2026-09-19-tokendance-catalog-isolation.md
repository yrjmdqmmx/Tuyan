# TokenDance 目录隔离发布核验

核验时间：2026-09-19，以下为 PR #214 首轮生产发布的已确认事实。后续选择器说明补丁只影响 Web，不需要重发 Core 镜像。

## 根因与当前范围

公开目录 HTTP 200 返回 96 条记录，`deepseek-chat-v3-0324.supported_protocols=null`；旧生产 Core 使用整表 `some` 校验，一条异常使整个渠道目录失败。旧 Web 又会在目录缺失时自动切换渠道。

修复后逐条隔离、重复 ID 全部隔离，调用前校验实际 ID 和适配器协议，无法确认协议的型号不发送付费请求。展示缓存与调用校验分离，旧快照只能诊断。用户的渠道、型号和输入保持；中文提示明确原因、影响与处理方法。详见 [设计和故障分类](../tokendance/catalog-isolation-20260919.md)。

当前 96 条上游记录中 95 条字段有效；图研已审核的 62 个型号中，60 个协议核验通过，以下 2 个暂停调用：

| 型号 | 原因 |
| --- | --- |
| deepseek-chat-v3-0324 | supported_protocols 为 null |
| deepseek-v4-flash-vision-exp | 当前上游目录没有该 ID |

`issueCount=2` 包括上游异常记录和已接入型号缺失这两类问题，并非有两条 null 记录。目录核验不等同于真实推理成功、账号权益或余额保证。

## CI 与模拟验证

首轮合并提交 `d75b5d7c7346f24217d5ff851fd5be74d3471955`；[PR #214](https://github.com/yrjmdqmmx/Tuyan/pull/214) 及 [main CI](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35446988372) 全部通过。

- Core 577、Web 399、小程序 119、共享 API 29；Gateway 148、Benchmark Core 67、Benchmark Worker 200、平台 4、根契约 12、Laf 6、HK 部署 228、SG 出口 111，均 0 失败。
- 类型检查、Core / Web 构建、小程序编译及生成文件漂移检查通过。
- 目录针对性测试 23 项覆盖 null、缺失、类型错误、多条/全异常、空目录、协议变更、重复 ID、超时、网络、HTTP 拒绝/限流/5xx、缓存过期、恢复、脱敏与告警升级。真实 Core 使用模拟传输确认异常型号不会调用，成功步骤保留，结果未知不重放。
- Web 验证普通/专业模式、渠道缺失、网络失败、禁用、恢复时输入及选择不变。后续选择器补丁增加搜索原因与窄屏全禁用场景测试；测试数量以该补丁 CI 为准。

## 生产发布

| 项目 | 已验证结果 |
| --- | --- |
| Core 镜像发布 | [35446998607](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35446998607)，成功 |
| Worker 镜像发布 | [35447000452](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35447000452)，成功 |
| HK 固定镜像部署 | [35447222365](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35447222365)，正常环境审批后成功 |
| 首轮 Pages 发布 | [35447224666](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35447224666)，成功 |
| Core / Worker 实际 provenance | 均为 d75b5d7c7346f24217d5ff851fd5be74d3471955 |
| Core digest | sha256:e89f8904cc5611f8dbb1266362dd53580fc331411b4753d13e360a8edc77f19d |
| Worker digest | sha256:c79eec809b48f8c4fc5db7f193e5fc7e87d6a8b5d1b6287fc3f6cee26c67bfc5 |

五个图研容器 healthy，公开 `/ready` 正常。原有 Gateway / Plot Worker / Mongo 镜像保持。配置差异仅 `PAPERBANANA_CODE_SHA`，执行器仍为关闭状态；未改变密钥、数据库或任务记录。旧版本配置及镜像锁在生产主机已有私有备份，未下载凭据。

只读 `modelRegistry(provider=tokendance)` 返回 code=0、62 个型号、60 可选/2 禁用，不再把整个 TokenDance 标记 unavailable。`catalogHealth` 为 partial、stale=false；生产日志记录相同模型/受控原因，连续异常计数达到 6 后 alert=critical，证明持续异常可定位。外部消息通知未配置，当前为访问驱动的日志和 API 告警。

首轮 Pages 产物与线上 `index.html`、三个直接引用的 JS/CSS 入口文件 SHA256 全部一致（4/4，HTTP 200）。Chrome 在 `https://www.paperbanana.asia/` 验证目录提示、默认 TokenDance 模型保留，以及输入文本在“重试目录”后保持原样；未点击生成。选择器搜索异常型号时缺少具体原因在这一轮验收中被发现，已作为独立 Web 补丁补齐。

## 未确认与边界

- 供应商为何返回 null、为何删除另一个型号仍未确认，供应商修复后的真实线上恢复尚未发生；恢复行为以模拟响应验证。
- 本次付费生成和历史任务重跑均为 0；没有验证各账号权益、余额、真实模型输出或历史费用。
- 小程序 TS/JS 已修改并通过测试，但未上传、提审或发布微信平台。
- 裸域 `https://paperbanana.asia/` 在本机 Chrome 仍出现证书域名不匹配；未绕过安全提示，使用证书有效的 www 域名完成验收。这是独立于目录的既有问题。
