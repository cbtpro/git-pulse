# Windows 本地开发

在 Windows PowerShell / Windows Terminal 中完成 [通用安装](DEVELOPMENT.md)，并安装：

- Rust stable 的 MSVC 工具链及 `x86_64-pc-windows-msvc` 目标。
- Visual Studio Build Tools，勾选 **Desktop development with C++**、MSVC 和 Windows SDK。
- Microsoft Edge WebView2 Evergreen Runtime。
- NASM，并将安装目录加入 PATH；这与 Actions 的 Windows 配置一致。

安装后重新打开终端，检查并运行：

```powershell
rustup target add x86_64-pc-windows-msvc
pnpm run doctor windows
pnpm dev:windows
pnpm build:windows
```

默认生成 NSIS `.exe` 和 WiX `.msi`，位置为 `packages/app/src-tauri/target/x86_64-pc-windows-msvc/release/bundle`。只构建一种可用 `pnpm build:windows --bundles nsis`；调试构建加 `--debug`。

脚本使用 Node.js 启动工具，不依赖 Bash 的 `rm`、`export` 或 `.sh`。如果检查提示缺少 MSVC，确认安装了 C++ 工作负载；找不到 NASM 时确认新的终端已继承 PATH。WebView2 按用户安装可能只给提示，仍需实际启动验证。

Windows 原生包需要在 Windows 构建；从 macOS/Linux 交付 Windows 包请使用 [Actions](GITHUB_ACTIONS.md)。默认安装器没有发行者签名，正式分发需按 [Tauri Windows 签名](https://v2.tauri.app/distribute/sign/windows/) 配置证书。账号密钥使用 Windows 系统凭据存储。
