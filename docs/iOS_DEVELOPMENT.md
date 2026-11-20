# iOS 本地开发

需 macOS 和完整 Xcode，先完成 [通用安装](DEVELOPMENT.md)。Xcode → Settings → Platforms / Components 中安装所需 iOS Simulator runtime；只安装 Command Line Tools 不够。

应用最低支持 **iOS 17.4**，真机和模拟器都需要该版本或更高版本的系统。精确版本配置在 `packages/app/src-tauri/gen/apple/project.yml` 的 `options.deploymentTarget.iOS`，并同步到 Xcode 工程和 `Podfile`；本地初始化与 CI 均通过该 YAML 生成工程。

`tauri.conf.json` 的 `bundle.iOS.minimumSystemVersion`、XcodeGen、主应用和小组件扩展的部署版本均为 `17.4`，`Podfile` 保持一致。

主应用包含 2D/3D 贡献活动小组件，添加方法、App Groups 配置和验证范围见 [桌面小组件](HOME_SCREEN_WIDGETS.md)。模拟器构建使用 Xcode 本地签名；不要加 `--no-sign`，否则共享目录和 Keychain 不可用。

## 工具与初始化

```bash
xcode-select -p
xcodebuild -version
brew install xcodegen
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
pnpm init:ios
pnpm run doctor ios
```

上面的模拟器 Rust 目标用于 Apple Silicon；Intel Mac 改用 `x86_64-apple-ios`。如 Xcode 在外置磁盘，用 `sudo xcode-select --switch "<Xcode.app的实际路径>/Contents/Developer"` 选择安装位置，并打开 Xcode 完成首次组件安装与许可流程。

项目已有 `packages/app/src-tauri/gen/apple/project.yml` 时，`init:ios` 使用 XcodeGen 重建工程与共享 scheme，保留 YAML 中的原生定制。只有不存在该文件时才调用 Tauri 的 iOS 初始化。不要为修复 scheme 删除整个 `gen/apple`。

## 模拟器调试

```bash
open -a Simulator
pnpm dev:ios
```

未传任何额外参数时，脚本优先使用 `.env.ios.local` 中的 `GITPULSE_IOS_DEVICE`；未配置时优先使用已经启动且系统不低于 iOS 17.4 的模拟器，再由 Tauri 探测设备（连接真机时可能直接选择真机）。始终可明确指定设备名称：

```bash
pnpm dev:ios "iPhone 17 Pro Max"
```

选择本机实际安装、运行 iOS 17.4 或更高系统的设备名称（例如 iOS 17.4 的 iPhone 15 Pro Max 模拟器）。前端自动启动或复用本工作区的 1420 服务。旧命令 `pnpm -F @gitpulse/app tauri:ios` 继续可用。

## 真机与打包

真机调试需信任电脑、启用设备的 Developer Mode，并在 Xcode 中配置对应 Apple 开发团队。设备与开发服务需可达；可使用 `pnpm dev:ios --open` 进入 Xcode 调试。

项目使用自动签名。本机团队和首选真机配置放在仓库根目录的 `.env.ios.local`（已被 Git 忽略），可从 `.env.ios.local.example` 复制：

```dotenv
APPLE_DEVELOPMENT_TEAM=你的10位TeamID
GITPULSE_IOS_DEVICE="你的iPhone设备名称"
GITPULSE_IOS_WIDGETS=auto
```

Team ID 可在 Xcode → Settings → Apple Accounts 中查看。已有个人团队也可以进行真机开发调试，步骤见 [Apple 真机运行说明](https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device)。不要把开发证书名称括号里的个人标识当成 Team ID。

配置后，`pnpm -F @gitpulse/app tauri:ios` 会选择该真机，并为主应用和小组件统一配置开发团队；终端中显式设置的环境变量优先于本地文件。指定设备参数时会覆盖本机首选设备，例如 `pnpm dev:ios "其他设备名称"`。Xcode 会自动管理开发描述文件；手机首次运行可能需要解锁、信任开发者或确认开发者模式。

启动脚本从共享 `project.yml` 生成忽略提交的 `project.local.json`，每次根据目标与团队恢复完整配置。`GITPULSE_IOS_WIDGETS=auto` 会读取 Xcode 中该团队的 Personal Team 标识：Personal Team 真机运行仅编译主应用，移除小组件依赖及 App Groups 权限；显式指定的模拟器和未签名构建保留小组件。应用在无小组件版本中关闭同步入口，不影响登录、Keychain 或普通页面。可设 `disabled` 手动关闭，或在付费团队及 App Groups 配置齐全时设 `enabled`。Xcode 团队信息不可读取时不会擅自删减功能，可显式选择 `disabled`。

```bash
# 模拟器构建，Apple Silicon 自动选择 aarch64-sim
pnpm build:ios:simulator --debug

# 真机 ARM64，默认未签名；不能直接安装到普通 iPhone
pnpm build:ios --debug

# 已在本机配置证书、描述文件和开发团队时，显式开启签名
pnpm build:ios --signed --export-method debugging
```

启用小组件的真机签名使用钥匙串中的证书、匹配主应用及小组件扩展的两个描述文件和 `APPLE_DEVELOPMENT_TEAM`，两个描述文件需包含相同 App Group。启动脚本同时为两个 target 设置团队；Personal Team 主应用版本无需小组件描述文件。自动证书导入参数与发布方式见 [Actions 签名说明](GITHUB_ACTIONS.md#ios-签名) 和 [Tauri iOS 签名](https://v2.tauri.app/distribute/sign/ios/)。不要在源码或 `.env.local` 的 `VITE_*` 字段存放签名密码。

输出在 `packages/app/src-tauri/gen/apple/build`，真机为 IPA、模拟器为 app。模拟器产物不能用于真机；`--no-sign` 不能与 `--signed` / `--export-method` 同时使用。

## 故障定位

- **Port 1420 is already in use**：使用新的启动脚本；匹配工作区的服务会被复用。旧服务没有工作区标识时，在原终端确认归属后停止，再运行 `pnpm dev:web`。脚本不会杀进程。
- **does not contain a scheme named gitpulse_iOS**：执行 `pnpm init:ios`，然后重试。可用 `xcodebuild -list -project packages/app/src-tauri/gen/apple/gitpulse.xcodeproj` 检查。
- **找不到运行目标**：检查 `xcrun simctl list devices available`，在 Xcode 安装该 runtime；已打开模拟器不代表选中了同一个设备。
- **缺少 Rust 目标**：根据 Apple Silicon / Intel 安装正确的模拟器目标，真机目标固定 `aarch64-apple-ios`。
- **requires a development team**：已选中真机但没有开发团队。填写 `.env.ios.local` 中的 `APPLE_DEVELOPMENT_TEAM`，确认 Xcode 已登录该团队的 Apple 账号并存在有效开发证书，再运行同一命令。配置只在本机生效，重新生成 Xcode 工程后启动脚本仍会传入团队。真机运行必须签名；纯编译验证才使用未签名构建。
- **GitPulseWidgetsExtension requires a development team**：重新运行 `pnpm -F @gitpulse/app tauri:ios`，脚本会为全部 target 生成本机签名设置。Personal Team 保持 `GITPULSE_IOS_WIDGETS=auto`；不要只在 Xcode 给扩展填 Team 后继续申请该团队不支持的 App Groups。

修改原生安全区实现、权限或 Swift/Rust 代码后需要重新编译；仅刷新 Web 页面无法验证这些改动。
