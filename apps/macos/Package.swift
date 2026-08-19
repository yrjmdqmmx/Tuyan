// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "PaperBananaMac",
  platforms: [
    .macOS(.v14)
  ],
  products: [
    .executable(name: "PaperBananaMac", targets: ["PaperBananaMac"])
  ],
  targets: [
    .executableTarget(
      name: "PaperBananaMac",
      path: "Sources/PaperBananaMac",
      linkerSettings: [
        .linkedFramework("AppKit"),
        .linkedFramework("Security"),
        .linkedFramework("UserNotifications")
      ]
    ),
    .testTarget(
      name: "PaperBananaMacTests",
      dependencies: ["PaperBananaMac"],
      path: "Tests/PaperBananaMacTests"
    )
  ]
)
