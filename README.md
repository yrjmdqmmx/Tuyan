# PaperBanana Clients

PaperBanana Clients 是 PaperBanana 的多端 monorepo。这个仓库用于统一管理 Web、桌面端、移动端、后端网关以及未来可复用的共享代码。

当前 Web 端已经从 `PaperBanana-web/web-client` 迁移到 `apps/web`，生产站点 `paperbanana.asia` 由本仓库的 GitHub Actions 发布。

## 开源声明 / Open Source Statement

PaperBanana Clients 是在开源项目 [PaperBanana](https://github.com/dwzhu-pku/PaperBanana) 基础上持续开发的独立多端项目。我们衷心感谢上游作者与社区的工作，并采用与上游相同的 Apache License 2.0 发布本项目。

我们同样致力于将本项目建设为一个完全开源的学术插图工具，为所有研究人员提供更加便捷、可靠且跨平台的学术可视化体验。我们的目标只是回馈并造福社区；项目维护者目前没有将本项目商业化的计划。该声明表达的是项目愿景，不改变 Apache License 2.0 授予使用者的任何权利。

PaperBanana Clients is an independently maintained, multi-platform project built on the open-source [PaperBanana](https://github.com/dwzhu-pku/PaperBanana) project. We sincerely appreciate the work of the upstream authors and community, and we release this project under the same Apache License 2.0.

We are likewise committed to building a fully open-source academic illustration tool that gives researchers everywhere a more accessible, reliable, and cross-platform scientific visualization experience. Our goal is simply to give back to and benefit the community; the project maintainers currently have no plans to commercialize this project. This statement expresses our project vision and does not limit any rights granted under Apache License 2.0.

## Apps

- `apps/web/`：PaperBanana Web 工作台，基于 React + Vite，已完成迁移。
- `apps/ios/`：PaperBanana 原生 iOS 客户端，基于 SwiftUI，默认连接香港生产 API 网关。
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

当前发布包可在 GitHub Releases 的 [`android-preview-0.1.3`](https://github.com/yrjmdqmmx/Tuyan-clients/releases/tag/android-preview-0.1.3) 中获取。

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

API、身份认证、任务数据库和对象存储主服务位于香港。根据用户选择的模型渠道和服务端路由策略，OpenAI、Gemini、OpenRouter 及策略指定的 provider 流量可能经固定新加坡出口；火山方舟（Ark）为中国区服务，模型、比例和分辨率能力由动态 registry 权威声明。

iOS 将用户自带 API Key 持久保存在设备 Keychain。用户发起请求时，Key 会作为短生命周期字段经香港网关/核心转发给所选 provider；服务端不持久化、记录或回显 Key。项目不集成广告或分析 SDK，也不进行跨 App / 跨网站追踪。详情见线上[隐私政策](https://www.paperbanana.asia/privacy-policy.html)和[服务条款](https://www.paperbanana.asia/terms-of-service.html)。

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

## Upstream

PaperBanana Clients 基于开源项目 [dwzhu-pku/PaperBanana](https://github.com/dwzhu-pku/PaperBanana) 持续开发，是由本仓库维护者独立维护的多端项目，并非上游官方发行版。

PaperBanana Clients is built on the open-source [dwzhu-pku/PaperBanana](https://github.com/dwzhu-pku/PaperBanana) project. It is independently maintained by this repository's maintainers and is not an official upstream distribution.

## License

本项目代码采用与上游相同的 [Apache License 2.0](./LICENSE) 开源协议。项目愿景中的“暂无商业化计划”不构成额外许可限制；第三方组件与资源仍适用其各自的许可条款。

This project's source code is released under the same [Apache License 2.0](./LICENSE) as upstream. The maintainers' current lack of commercialization plans is a statement of project intent, not an additional license restriction; third-party components and assets remain subject to their respective terms.

## Notes

- Web 前端使用 BYOK 模式，用户自行填写模型 API Key；Key 在用户请求期间短暂经服务转发，不持久化、记录或回显。
- 登录和任务记录通过香港生产 auth-gateway / Core 服务提供；模型能力以动态 registry 为准。
- 小程序需要在微信公众平台配置合法域名：request 填 `https://yifbnnzrwmxn.sealoshzh.site` 与 `https://objectstorageapi.hzh.sealos.run`（参考图直传），downloadFile 填 `https://objectstorageapi.hzh.sealos.run`（保存相册 / SVG 下载），DNS 预解析/预连接可填网关域名。
