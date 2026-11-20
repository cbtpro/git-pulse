# macOS 本地开发

完成 [通用安装](DEVELOPMENT.md)，安装 Rust stable 和完整 Xcode，确认 `xcode-select -p` 指向当前 Xcode。

```bash
# Apple Silicon
rustup target add aarch64-apple-darwin
pnpm run doctor macos
pnpm dev:macos
pnpm build:macos
```

Intel Mac 使用 `x86_64-apple-darwin`，脚本按主机架构自动选择默认构建目标。需要在 Apple Silicon 上生成 Intel 版本时：

```bash
rustup target add x86_64-apple-darwin
pnpm build:macos --target x86_64-apple-darwin
```

默认生成 app 和 dmg，位置为 `packages/app/src-tauri/target/<目标>/release/bundle`。`--debug` 使用调试配置；仅要 app 可传 `--bundles app`。macOS 桌面直接使用 `tauri dev/build`，不需要 `init:ios` 或生成 Xcode 工程。

本地与 Actions 默认 `APPLE_SIGNING_IDENTITY=-`，即 ad-hoc 签名，方便本机验证，不等同于 Developer ID 签名与公证。正式分发按 [Tauri macOS 签名](https://v2.tauri.app/distribute/sign/macos/) 配置证书与公证。可通过环境变量覆盖签名标识，脚本不会覆盖已提供的值。

账号加密密钥使用系统钥匙串。登录、切换账号、退出和重新启动后的恢复需要在原生应用验证；Web 使用不同的存储实现，不能替代钥匙串验证。
