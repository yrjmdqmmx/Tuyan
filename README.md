# 图研 Tuyan

图研Tuyan 是面向科研人员的开源学术图示工作台。本仓库的用户客户端只保留 Web 与微信小程序，同时继续维护认证、任务、图像生成、Benchmark 和共享契约所需的后端与公共包。

生产站点：[paperbanana.asia](https://www.paperbanana.asia/)
GitHub：[yrjmdqmmx/Tuyan-clients](https://github.com/yrjmdqmmx/Tuyan-clients)

## 开源声明 / Open Source Statement

图研Tuyan 基于开源项目 [PaperBanana](https://github.com/dwzhu-pku/PaperBanana) 持续开发。感谢上游作者与社区的工作；本项目采用 Apache License 2.0 发布，并由本仓库维护者独立维护，不是上游官方发行版。

Tuyan is independently maintained on top of the open-source [PaperBanana](https://github.com/dwzhu-pku/PaperBanana) project. We appreciate the upstream authors and community, release this project under Apache License 2.0, and do not present it as an official upstream distribution.

## 仓库结构

用户客户端：

- `apps/web/`：React + Vite Web 工作台与公开排行榜。
- `apps/miniprogram/`：微信小程序客户端。

后端与运行服务：

- `apps/auth-gateway/`：Better Auth 登录网关与 API 转发。
- `apps/paperbanana-api/`：Node 核心 API。
- `apps/laf-functions/`：Sealaf 云函数源码与兼容实现。
- `apps/plot-worker/`：统计图渲染 Worker。
- `apps/benchmark-worker/`：Benchmark 执行 Worker。

共享包：

- `packages/api/`：Web 共享 API client。
- `packages/benchmark-core/`：Benchmark 契约与评分逻辑。
- `packages/business/`：复用业务逻辑。
- `packages/design-tokens/`：设计变量。
- `packages/types/`：共享 TypeScript 类型。
- `packages/ui-core/`：共享 React UI。

## 本地开发

要求：Node.js `>=20`、pnpm `10.28.2`。

```bash
pnpm install
```

### Web

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @paperbanana/web dev
```

默认访问 `http://localhost:5173`。`.env.local` 只用于本地开发，不要提交；所有 `VITE_*` 变量都会进入前端构建，不能存放密钥、Token 或数据库连接串。

Web 检查与构建：

```bash
pnpm --filter @paperbanana/web test
pnpm --filter @paperbanana/web build
```

### 微信小程序

用微信开发者工具打开 `apps/miniprogram/`。代码检查与生成 JavaScript：

```bash
pnpm --filter @paperbanana/miniprogram check
pnpm --filter @paperbanana/miniprogram build
node --test apps/miniprogram/tests/*.test.cjs
```

微信公众平台需要配置合法域名：request 使用 `https://yifbnnzrwmxn.sealoshzh.site` 与 `https://objectstorageapi.hzh.sealos.run`，downloadFile 使用 `https://objectstorageapi.hzh.sealos.run`。

## CI 与部署

- `.github/workflows/ci.yml` 验证 Web、小程序、共享包、后端和 Worker。
- `.github/workflows/deploy-pages.yml` 发布 Web 与公开排行榜。
- 后端发布与运维工作流保持独立，不因客户端产品线收缩而改变 API 或数据库。
- 历史 `clientPlatform` 值继续在服务端与保留客户端中只读兼容，旧任务不会因客户端目录删除而丢失来源信息。

## 贡献约定

1. 从仓库根目录运行 pnpm 命令，避免在子目录混用 npm 或 yarn。
2. Web 与小程序专属代码放在对应 `apps/*` 目录，共享逻辑放在 `packages/*`。
3. 修改后端、共享 API 字段、模型目录或环境变量前，先阅读并更新 [SYNC.md](./SYNC.md)。
4. 不提交 `.env.local`、`node_modules/`、`dist/`、`build/` 等本地生成文件。
5. 修改依赖后同步更新并检查 `pnpm-lock.yaml`。

## License

本项目代码采用 [Apache License 2.0](./LICENSE)。第三方组件、模型和资源仍适用各自的许可条款。
