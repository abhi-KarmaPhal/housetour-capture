// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "HouseTourCapture",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "HouseTourCapture",
            targets: ["HouseTourCapture"]
        ),
    ],
    targets: [
        .target(
            name: "HouseTourCapture",
            path: "HouseTourCapture"
        ),
    ]
)
