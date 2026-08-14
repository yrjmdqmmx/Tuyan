# PaperBanana Clients

PaperBanana Clients 是 PaperBanana 的多端 monorepo。这个仓库用于统一管理 Web、桌面端、移动端、后端网关以及未来可复用的共享代码。

当前 Web 端已经从 `PaperBanana-web/web-client` 迁移到 `apps/web`，生产站点 `paperbanana.asia` 由本仓库的 GitHub Actions 发布。

## Apps

- `apps/web/`：PaperBanana Web 工作台，基于 React + Vite，已完成迁移。
- `apps/ios/`：PaperBanana 原生 iOS 客户端，基于 SwiftUI，默认连接 Sealos 后端网关。
- `apps/macos/`：PaperBanana 原生 macOS 客户端，基于 SwiftUI，默认连接 Sealos 后端网关。
- `apps/desktop/`：Windows Electron 桌面端，加载线上 PaperBanana Web，并通过 GitHub Releases 发布安装包。
- `apps/windows/`：Windows 原生客户端，基于 WinUI 3 + Windows App SDK + C#。
- `apps/miniprogram/`：微信小程序客户端，可直接用微信开发者工具打开。
- `apps/auth-gateway/`：Sealos 上运行的 Better Auth 登录网关和 Laf 代理。
- `apps/laf-functions/`：Laf 云函数源码归档。
- `apps/android/`：Android 客户端，基于 Expo + React Native，包名 `asia.paperbanana.android`，当前按 32/64 位双 APK 进入正式发布流程。
- `apps/harmony/`：HarmonyOS 原生客户端，基于 ArkTS + ArkUI，包名 `asia.paperbanana.harmony`，默认连接 Sealos 后端网关。

## Packages

- `packages/api/`：共享 API client 封装。
- `packages/business/`：跨端复用的业务逻辑。
- `packages/design-tokens/`：颜色、字号、间距等设计变量。
- `packages/types/`：共享 TypeScript 类型。
- `packages/ui-core/`：共享 React UI 组件。

## Local Web Development

要求：

- Node.js `>=20`
- pnpm `10.28.2`

安装依赖：

```bash
pnpm install
```

配置 Web 环境变量：

```bash
cp apps/web/.env.example apps/web/.env.local
```

`.env.local` 只用于本地开发，不要提交。所有 `VITE_*` 变量都会被打包进前端 JS，不能放密钥、Token、数据库连接串或模型 API Key。

启动 Web：

```bash
pnpm --filter @paperbanana/web dev
```

默认访问：

```text
http://localhost:5173
```

构建 Web：

```bash
pnpm --filter @paperbanana/web build
```

## WeChat Mini Program

小程序工程位于：

```text
apps/miniprogram/
```

用微信开发者工具直接打开这个目录。代码检查和生成 `.js` 文件：

```bash
pnpm --filter @paperbanana/miniprogram check
pnpm --filter @paperbanana/miniprogram build
```

## Android

Android 客户端工程位于：

```text
apps/android/
```

当前 Android 端对齐 Web 工作台的核心能力：四个模型平台、普通模式、专业模式、固定模型选择器、登录注册、任务记录、任务提交、状态轮询和结果图预览。

开发服务：

```bash
pnpm --filter @paperbanana/android start
```

类型检查：

```bash
pnpm --filter @paperbanana/android typecheck
```

用于正式应用市场发布时，推荐上传 32 位和 64 位双包，而不是 32/64 位兼容单包：

- 32 位：`armeabi-v7a`
- 64 位：`arm64-v8a`

当前发布包可在 GitHub Releases 的 [`android-preview-0.1.3`](https://github.com/zdywrnm/PaperBanana-clients/releases/tag/android-preview-0.1.3) 中获取。

## HarmonyOS Native Client

鸿蒙原生客户端工程位于：

```text
apps/harmony/
```

用 DevEco Studio 打开该目录，执行 Sync / Make Project / Run。默认连接 Sealos 上的 auth-gateway：

```text
https://yifbnnzrwmxn.sealoshzh.site
```

## iOS Native Client

iOS 原生客户端工程位于：

```text
apps/ios/
```

用 Xcode 打开 `apps/ios/paperbanana.xcodeproj`，选择 `PaperBanana` scheme 后运行。当前最低系统版本为 iOS 26.0，默认连接阿里云香港生产网关：

```text
https://api.paperbanana.asia
```

命令行构建验证：

```bash
xcodebuild -project apps/ios/paperbanana.xcodeproj -scheme PaperBanana -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' build
xcodebuild -project apps/ios/paperbanana.xcodeproj -scheme PaperBanana -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5),OS=26.5' build
```

## macOS Native Client

macOS 原生客户端工程位于：

```text
apps/macos/
```

本地构建并启动：

```bash
cd apps/macos
./script/build_and_run.sh
```

启动验证：

```bash
./script/build_and_run.sh --verify
```

默认连接 Sealos 上的 auth-gateway：

```text
https://yifbnnzrwmxn.sealoshzh.site
```

## Windows Desktop

当前仓库保留两个 Windows 工程：

```text
apps/desktop/   # Electron 发布壳
apps/windows/   # WinUI 3 原生客户端
```

Electron 本地启动：

```bash
pnpm --filter @paperbanana/desktop dev
```

WinUI 3 原生客户端构建：

```powershell
B:\tools\dotnet\dotnet.exe restore apps/windows/PaperBanana.Windows.csproj
B:\tools\dotnet\dotnet.exe build apps/windows/PaperBanana.Windows.csproj -c Debug
```

WinUI 3 原生客户端运行：

```powershell
B:\tools\dotnet\dotnet.exe run --project apps/windows/PaperBanana.Windows.csproj
```

构建安装包：

```bash
pnpm --filter @paperbanana/desktop build:win
```

构建免安装版：

```bash
pnpm --filter @paperbanana/desktop build:win:portable
```

发布由 GitHub Actions 的 `Release Windows Desktop` workflow 执行，产物会上传到本仓库 GitHub Releases。

## Contributing

1. 从仓库根目录运行 pnpm 命令，避免在子目录混用 npm / yarn。
2. App 专属代码放在 `apps/*`，跨端共享逻辑优先放到 `packages/*`。
3. 不要提交 `.env.local`、`node_modules/`、`dist/`、`build/` 等本地生成文件。
4. 修改依赖后运行 `pnpm install`，并检查 `pnpm-lock.yaml` 是否符合预期。
5. 提交前至少验证相关 app 可以启动或构建，例如：

```bash
pnpm --filter @paperbanana/web build
```

## Notes

- Web 前端使用 BYOK 模式，用户自行填写模型 API Key。
- 登录和任务记录通过 Sealos 上的 auth-gateway / Laf 后端提供。
- 小程序需要在微信公众平台配置合法域名：request 填 `https://yifbnnzrwmxn.sealoshzh.site` 与 `https://objectstorageapi.hzh.sealos.run`（参考图直传），downloadFile 填 `https://objectstorageapi.hzh.sealos.run`（保存相册 / SVG 下载），DNS 预解析/预连接可填网关域名。
