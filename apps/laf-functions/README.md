# PaperBanana Laf Functions (Rollback Only)

这里仅归档已暂停的 Laf 云函数回滚源码。当前生产后端是香港 Node 运行时；本目录不是常规发布入口，自动 Laf 源码发布保持禁用。

## Functions

- `paperbanana-api.ts`: 生成任务、任务查询、管理员任务列表、模型调用、图片保存。

## Archived Laf Runtime

- 回滚应用名: `paperbanana-web`
- 回滚云函数名: `paperbanana-api`
- 状态: 已暂停，不是当前生产主路径。
- 数据集合: `paperbanana_jobs`
- 存储 bucket: 通过 `PAPERBANANA_BUCKET` 环境变量指定；只在获批的应急回滚中核对。

## Emergency Rollback via the Laf Console Only

Laf 回滚仅能在 Laf 控制台手动执行，且必须先获得明确的回滚批准。

1. 在暂停的 `paperbanana-web` 应用中打开 custom dependency 面板，直接核对已配置的精确版本是 `jpeg-js@0.4.4` 与 `sharp@0.35.3`。
2. 另外确认 Laf 的 Node、OS 与 CPU 架构能加载 `sharp@0.35.3` 的原生依赖，并用真实 WebP fixture 完成 WebP→PNG smoke；任一项无法从控制台或实际运行权威确认时停止回滚，不能以 workflow 输入、口头确认或仓库 `package.json` 代替。
3. 在 Laf 控制台打开 `paperbanana-api`，核对回滚所需环境变量和其他 custom dependencies。
4. 复核本目录的 `paperbanana-api.ts`，再手动粘贴到 Laf 编辑器并手动发布。
5. 按回滚运维清单验证 health 和代表性受保护流程。

## Verification-only GitHub Actions Workflow

仓库提供了手动触发的 workflow:

```text
.github/workflows/deploy-laf-functions.yml
```

该 workflow 是 **verification-only**：只检查仓库中回滚源码和 Node 绑定版本，不登录 Laf、不使用 Laf 凭据、不编辑或发布云函数。它无法读取 Laf custom dependency 的权威元数据，因此不能代替上述 Laf 控制台手动核对。在有经过身份验证的机器可读元数据检查之前，自动 Laf 发布保持禁用。

## Release Checklist

- `ADMIN_TOKEN` 已配置。
- `PAPERBANANA_BUCKET` 对应的 bucket 已存在。
- `paperbanana_jobs` 集合可写。
- 仅在获批的应急回滚中恢复函数 HTTP 调用。
- 回滚后 `OPTIONS` 预检请求正常返回。
- 回滚后调用 `health` 动作确认 `{ runtime: "laf" }`。
- Laf custom dependency 已安装 `@resvg/resvg-wasm`，用于服务端栅格化 SVG 参考图。
- Laf custom dependency 已在控制台权威元数据中确认为精确版本 `jpeg-js@0.4.4`，用于 Ark Seedream JPEG 解码。
- Laf custom dependency 已在控制台权威元数据中确认为精确版本 `sharp@0.35.3`，且实际运行环境已通过真实 WebP→PNG smoke；用于 OpenRouter WebP 有界解码。

## Notes

- 用户填写的模型 API Key 只在单次任务执行闭包中使用，不写入数据库。
- `modelRegistry` v8 是多端模型列表和精修能力的权威；图片条目的 `capabilities.refineResolutions` 仅用 `1K|2K|4K` 表示真实精修执行上限，与生成 `resolutions` 分离。客户端不得从 provider、模型名或生成分辨率猜测精修能力。`direct-edit` 必须传入源图，`analyze-redraw` 则是明示的分析后重绘；`refineImage.imageSize` 仅接受 `1K|2K|4K`，不在所选模型 `refineResolutions` 内时会在入队和持久化前返回 `REFINE_RESOLUTION_UNSUPPORTED`。OpenRouter 逐项付费验证的 34 个默认输出为 PNG/JPEG/WebP 的模型统一声明最终 PNG，JPEG/WebP 在持久化前有界转换为 PNG。
- 不要把真实 `ADMIN_TOKEN` 或其他密钥提交到仓库。
- `@lafjs/cloud` 由 Laf 运行时提供；`@resvg/resvg-wasm`、精确版本 `jpeg-js@0.4.4` 与 `sharp@0.35.3` 由 Laf custom dependency 提供，本目录和 verification-only workflow 都不安装或配置这些依赖。
