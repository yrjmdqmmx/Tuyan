# UI QA evidence — deterministic Debug matrix

This folder is QA evidence only. It is not part of the App Store submission set.

## Matrix and devices

| Device | Runtime | Pixel evidence | Matrix result |
| --- | --- | --- | --- |
| iPhone 17 Pro Max | iOS Simulator 26.5 (23F77) | 1320 × 2868 — `iphone17pro-max-dark-axxxl-reduce-motion-settings.png` | Passed |
| iPad Pro 13-inch (M5) | iOS Simulator 26.5 (23F77) | 2064 × 2752 — `ipad13-dark-axxxl-reduce-motion-settings.png` | Passed |

Both captures were made from a freshly installed Debug build with exactly these launch arguments:

```text
-pb-ui-testing YES
-pb-ui-disable-network YES
-pb-ui-disable-animations YES
-pb-preview-live-registry YES
-pb-preview-reference-library YES
-pb-preview-current-result YES
-pb-preview-signed-in YES
-pb-initial-tab settings
-pb-ui-preview-dark YES
-pb-ui-preview-accessibility-size AX-XXL
-pb-ui-preview-reduce-motion YES
```

`-pb-ui-preview-reduce-motion YES` is a DEBUG-only Root transaction override; it is not a claim that the Simulator system Reduce Motion setting was changed. The preview account is the explicit placeholder `ui-preview@paperbanana.invalid`; no production key, personal email, or paid request is used.

## Commands and results

```text
xcodebuild test -quiet -project apps/ios/paperbanana.xcodeproj -scheme PaperBanana \
  -destination 'id=D2312D58-D4C6-4D3C-A893-B75AA254EACB' \
  -only-testing:PaperBananaUITests/PaperBananaUITests/testDarkAccessibilityXXLReduceMotionMatrixKeepsPrimaryFlowsOperable
```

Result: iPhone 17 Pro Max, 1/1 passed in 77.4 s. The XCUI case launches in dark + AX XXL + reduced-motion preview, taps all five stable tab identifiers, verifies Generate settings, the Refine empty surface, and each legal-link entry, then saves an XCUI screenshot attachment.

The same launch contract was installed and manually launched on both devices for the PNG evidence. Visual inspection confirms safe areas and tab controls remain reachable; AX XXL text wraps rather than horizontally overflowing or ellipsizing.

## Known simulator note and device acceptance focus

On iPad's native sidebar-adaptable tab presentation, an individual exposed sidebar label node measures 36 pt, while the enclosing system row is the operable target. The UI test therefore verifies the stable tab identifiers and activation on iPad rather than misreporting the label glyph node as the tap surface.

Before any App Review, verify on the user's actual TestFlight device: all five tabs, Generate settings and advanced/standard routes, dirty-template confirmation, reference gallery selection, local upload, generation/result/refine/records loop, privacy/delete/legal links, dark/light and Dynamic Type, and a budget-limited generation smoke. This simulator matrix does not replace that acceptance gate.
