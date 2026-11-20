# Linux 本地开发

CI 使用 Ubuntu 22.04 x64 和 Ubuntu 24.04 ARM64。完成 [通用安装](DEVELOPMENT.md)，安装 Rust stable，然后安装构建依赖：

```bash
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf libssl-dev libdbus-1-dev libxdo-dev

# x64；ARM64 改为 aarch64-unknown-linux-gnu
rustup target add x86_64-unknown-linux-gnu
pnpm run doctor linux
pnpm dev:linux
pnpm build:linux
```

其他发行版按 [Tauri 系统依赖](https://v2.tauri.app/start/prerequisites/#linux) 安装等价开发包。启动图形应用需要有效的图形会话；SSH/headless 环境可进行编译，但不能据此判断窗口、输入法或系统安全存储可用。

默认生成 `.deb`、`.rpm`、`.AppImage`，输出在 `packages/app/src-tauri/target/<目标>/release/bundle`。脚本按主机架构选择 x64 / ARM64；跨架构构建还需要对应 linker 和系统库，通常直接使用目标架构机器或 Actions runner。

构建 AppImage 时若环境不支持 FUSE，可与 CI 一样设置 `APPIMAGE_EXTRACT_AND_RUN=1` 再构建。开发运行的账号密钥使用 Secret Service，需要用户会话 DBus 与已解锁的兼容密钥环（例如 GNOME Keyring）；仅安装 `libdbus-1-dev` 不会创建运行时密钥环。
