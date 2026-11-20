# Apple 平台快速开始

以下命令在仓库根目录执行。依赖安装见 [本地开发](../../docs/DEVELOPMENT.md)。

```bash
pnpm install --frozen-lockfile
pnpm run doctor macos
pnpm dev:macos
```

iOS 需完整 Xcode、Simulator runtime、XcodeGen 和对应 Rust 目标：

```bash
brew install xcodegen
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
pnpm init:ios
pnpm run doctor ios
pnpm dev:ios
```

以上目标适用于 Apple Silicon；Intel 模拟器使用 `x86_64-apple-ios`。已有运行中的模拟器会优先选用。前端由启动脚本自动启动或复用，不需重复运行 Vite。

```bash
pnpm build:macos
pnpm build:ios:simulator --debug
pnpm build:ios --debug
```

最后一个命令生成未签名真机包，不能直接安装。签名、外置 Xcode、端口冲突及缺少 scheme 的处理见 [iOS 完整指南](../../docs/iOS_DEVELOPMENT.md) 和 [macOS 指南](../../docs/macOS_DEVELOPMENT.md)。
