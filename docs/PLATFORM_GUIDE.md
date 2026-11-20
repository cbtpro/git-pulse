# 平台与构建矩阵

统一入口见 [本地开发](DEVELOPMENT.md)，远程构建见 [GitHub Actions](GITHUB_ACTIONS.md)。以下表示脚本和工作流覆盖范围，不等同于每个平台均已完成真机验证。

| 平台 | 本地主机 | 默认目标 | Actions 主机 | 输出 |
| --- | --- | --- | --- | --- |
| [Web](WEB_DEVELOPMENT.md) | macOS / Windows / Linux | 浏览器 | Ubuntu 24.04 | 静态页面 |
| [macOS](macOS_DEVELOPMENT.md) | macOS | 当前主机 arm64 / x64 | macOS 15，分别构建两架构 | app、dmg |
| [Windows](WINDOWS_DEVELOPMENT.md) | Windows | x86_64-pc-windows-msvc | Windows 2022 | exe、msi |
| [Linux](LINUX_DEVELOPMENT.md) | Linux | 当前主机 arm64 / x64 | Ubuntu 22.04 x64 / 24.04 ARM | deb、rpm、AppImage |
| [iOS 真机](iOS_DEVELOPMENT.md) | macOS + Xcode | aarch64 | macOS 15 | ipa |
| [iOS 模拟器](iOS_DEVELOPMENT.md) | macOS + Xcode | Apple Silicon: aarch64-sim；Intel: x86_64 | macOS 15 ARM | app |
| [Android](ANDROID_DEVELOPMENT.md) | macOS / Windows / Linux | aarch64、armv7、i686、x86_64 | Ubuntu 24.04 | apk、aab |

Node.js 22、pnpm 10.34.9；Tauri CLI、前端依赖以 `pnpm-lock.yaml` 为准，Rust 依赖以 `Cargo.lock` 为准。Android 使用 JDK 21、NDK 27.2.12479018、Build Tools 36.0.0，平台 SDK 按生成工程的 `compileSdk` 安装。

iOS 应用最低支持 **17.4**，真机和模拟器均遵循此要求；主应用与小组件的版本配置见 [iOS 开发文档](iOS_DEVELOPMENT.md)。

桌面通过 Tauri 的 `dev` / `build` 命令运行，没有 `tauri macos dev` 这样的子命令。iOS 和 Android 才使用移动端子命令。`gen/apple` 是 iOS 工程，macOS 桌面不使用该 Xcode 工程。所有平台共用 React 页面和主要 Rust 入口，系统能力采用条件编译。

默认 macOS 使用 ad-hoc 签名，Windows 没有发行者签名，Android release 与 iOS 真机默认未签名。开发运行、构建产物和应用商店发布是不同阶段；分发前按目标平台完成签名及安装验证。
