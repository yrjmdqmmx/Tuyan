# PaperBanana iOS

PaperBanana iOS 是原生 SwiftUI 客户端，默认连接阿里云香港生产网关：

```text
https://api.paperbanana.asia
```

## Requirements

- Xcode 26.5+
- iOS 26.0+
- Apple Developer Team: `MRDBK9Y6TF`
- Bundle ID: `com.paperbanana.paperbanana`

## Build

```bash
xcodebuild -project paperbanana.xcodeproj \
  -scheme PaperBanana \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' \
  build
```

Run tests:

```bash
xcodebuild -project paperbanana.xcodeproj \
  -scheme PaperBanana \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' \
  test
```

## Gateway Smoke Test

Use this before TestFlight builds when you need to prove the iOS payload contract still matches the live auth-gateway. The script reads credentials from environment variables only; do not paste secrets into source files or shell history.

```bash
export PB_EMAIL="you@example.com"
read -s PB_PASSWORD
export PB_PASSWORD
export PB_BAILIAN_API_KEY="sk-..."
export PB_REFERENCE_IMAGE="/absolute/path/to/reference.png"
node Scripts/e2e-gateway-smoke.mjs
```

The smoke test signs in through Better Auth, sends the trusted Web `Origin`/`Referer`, uploads one reference image, creates a Bailian `createJob`, polls `getJob`, and fails unless the job succeeds with at least one result image.

## Scope

The iOS v1 client aligns with the Web user workbench: model provider selection, BYOK API keys in Keychain, provider-specific API Key application guides, a native tutorial/guide tab, diagram/plot job submission, PNG/SVG output format, image size, reference image upload from Photos or Files, model capability confirmation, retrieval controls, task polling, account auth, task records with model/retrieval/critic metadata, per-image sharing, whole-job ZIP sharing, inline refine requests with target ratio/size controls, Web-matched feedback categories and limits, and a Liquid Glass SwiftUI interface.

Admin tables are intentionally not part of the iOS v1 scope.

## App Store Privacy

`PaperBanana/PrivacyInfo.xcprivacy` is bundled with the app target for App Store Connect privacy checks. It declares:

- No tracking and no tracking domains.
- Collected data used for app functionality: login email/name/user ID, prompt and feedback content, uploaded reference images, and provider API keys supplied by the user.
- Required-reason API usage: `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1`, used for app-scoped settings such as the backend base URL.

Keep this file in sync when adding analytics, third-party SDKs, new persistence APIs, or new data sent to PaperBanana services.

## App Icon

The shipping iOS app icon remains PNG-based in `PaperBanana/Assets.xcassets/AppIcon.appiconset` because Xcode compiles AppIcon assets as raster images for iOS. The editable SVG source is stored separately at `PaperBanana/Assets.xcassets/AppIconSource.imageset/PaperBananaAppIcon.svg`.
