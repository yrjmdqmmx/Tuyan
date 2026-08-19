# PaperBanana Laf Functions

这里归档 Laf 云开发中的云函数代码。当前线上函数仍在 Laf 控制台运行，本目录只是源码备份和维护入口。

## Functions

- `paperbanana-api.ts`: 生成任务、任务查询、管理员任务列表、模型调用、图片保存。

## Production

- Laf 应用名: `paperbanana-web`
- 云函数名: `paperbanana-api`
- 线上调用地址: `https://sdswgya641.sealoshzh.site/paperbanana-api`
- 数据集合: `paperbanana_jobs`
- 存储 bucket: 通过 `PAPERBANANA_BUCKET` 环境变量指定，生产环境使用 Sealaf 完整桶名。

## Deploy Manually

1. 打开 Laf 云开发控制台。
2. 进入 `paperbanana-web` 应用。
3. 打开云函数 `paperbanana-api`。
4. 将 `paperbanana-api.ts` 内容复制到 Laf 函数编辑器。
5. 配置 `.env.example` 中列出的环境变量。
6. 发布函数。

## Deploy From GitHub Actions

仓库提供了手动触发的 workflow:

```text
.github/workflows/deploy-laf-functions.yml
```

需要先在 GitHub 仓库配置 Secrets:

- `LAF_APPID`: Laf 应用 ID。
- `LAF_PAT`: Laf 个人访问凭证。
- `LAF_SERVER`: Laf API 服务地址，可选；不配置时默认 `https://api.laf.run`。

第一次不要改成 push 自动部署。先在 GitHub Actions 页面手动运行 `Deploy Laf Functions`，确认 `paperbanana-api` 能正常发布并通过 health 检查后，再考虑自动化。

## Release Checklist

- `ADMIN_TOKEN` 已配置。
- `PAPERBANANA_BUCKET` 对应的 bucket 已存在。
- `paperbanana_jobs` 集合可写。
- 函数允许 HTTP 调用。
- `OPTIONS` 预检请求正常返回。
- 发布后先调用 `health` 动作确认 `{ runtime: "laf" }`。
- Laf custom dependency 已安装 `@resvg/resvg-wasm`，用于服务端栅格化 SVG 参考图。

## Notes

- 用户填写的模型 API Key 只在单次任务执行闭包中使用，不写入数据库。
- `modelRegistry` v2 是多端模型列表和精修能力的权威；客户端不得从 provider 或模型名猜测图生图。`direct-edit` 必须传入源图，`analyze-redraw` 则是明示的分析后重绘。
- 不要把真实 `ADMIN_TOKEN` 或其他密钥提交到仓库。
- `@lafjs/cloud` 由 Laf 运行时提供；`@resvg/resvg-wasm` 由 Laf custom dependency 提供，本目录不单独安装依赖。
