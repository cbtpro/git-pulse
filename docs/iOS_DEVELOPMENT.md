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

## 测试包打包与真机安装

这套流程用于把当前代码交给测试人员在已登记的 iPhone 上测试。使用 **Release 构建 + 开发签名导出**，页面资源随应用内置，不需要电脑运行 Vite；GitHub 查询和授权仍需要网络。`--export-method debugging` 指定签名导出方式，不代表 Debug 编译模式。不要加 `--debug` 来测量正式构建的首屏性能。

以下命令在 macOS 的同一个终端、仓库根目录依次执行；任一步失败先处理错误，再继续。真机与团队配置沿用上面的 `.env.ios.local`。首次配置时在 Xcode 中选中这台真机并完成自动签名，确保描述文件包含该设备。

### 1. 确认设备和待打包代码

```bash
pnpm run doctor ios
pnpm check
git status --short
git log -1 --oneline
xcrun devicectl list devices
```

确认待测改动已保存，记录提交号；存在未提交改动时，不能仅靠提交号定位这个包的源码。使用列表中的 `Identifier` 明确选择真机，避免同时连接模拟器或多台手机时装错设备：

```bash
GITPULSE_TEST_DEVICE='替换为目标真机的 Identifier'
GITPULSE_TEST_VERSION="$(node -p "require('./packages/app/package.json').version")"
GITPULSE_TEST_DIR="$PWD/artifacts/ios/${GITPULSE_TEST_VERSION}-$(git rev-parse --short HEAD)-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$GITPULSE_TEST_DIR"
git rev-parse HEAD > "$GITPULSE_TEST_DIR/source-commit.txt"
git status --short > "$GITPULSE_TEST_DIR/source-status.txt"
```

`artifacts/` 已被 Git 忽略。使用版本、提交号和时间区分测试包，避免下一次打包覆盖已交付的版本；需要放到桌面时可自行调整 `GITPULSE_TEST_DIR`。

### 2. 构建独立运行的签名测试包

```bash
set -o pipefail
pnpm build:ios --signed --export-method debugging 2>&1 | tee "$GITPULSE_TEST_DIR/build.log"
```

该命令自动构建前端和 ARM64 原生应用，无需额外启动 `pnpm dev:web` 或 `pnpm dev:ios`。确认构建成功后归档实际导出的 IPA：

```bash
cp packages/app/src-tauri/gen/apple/build/arm64/GitPulse.ipa "$GITPULSE_TEST_DIR/GitPulse.ipa"
(
  cd "$GITPULSE_TEST_DIR" || exit 1
  shasum -a 256 GitPulse.ipa > SHA256SUMS.txt
)
ditto -x -k "$GITPULSE_TEST_DIR/GitPulse.ipa" "$GITPULSE_TEST_DIR/unpacked"
GITPULSE_TEST_APP="$GITPULSE_TEST_DIR/unpacked/Payload/GitPulse.app"
codesign --verify --deep --strict "$GITPULSE_TEST_APP"
```

以构建输出中 `Finished ... iOS Bundle` 后的路径为准；升级工具后输出位置可能变化。`devicectl` 安装的是 `.app`，因此从**本次 IPA** 解包，避免误装旧构建或模拟器目录中的 `.app`。不需要修改或重新签名解包后的内容。

检查包内实际版本、系统要求和描述文件：

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$GITPULSE_TEST_APP/Info.plist"
/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$GITPULSE_TEST_APP/Info.plist"
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$GITPULSE_TEST_APP/Info.plist"
/usr/libexec/PlistBuddy -c 'Print :MinimumOSVersion' "$GITPULSE_TEST_APP/Info.plist"
security cms -D -i "$GITPULSE_TEST_APP/embedded.mobileprovision" > "$GITPULSE_TEST_DIR/provisioning.plist"
/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "$GITPULSE_TEST_DIR/provisioning.plist"
/usr/libexec/PlistBuddy -c 'Print :ProvisionedDevices' "$GITPULSE_TEST_DIR/provisioning.plist"
/usr/libexec/PlistBuddy -c 'Print :ExpirationDate' "$GITPULSE_TEST_DIR/provisioning.plist"
codesign -d --extract-certificates="$GITPULSE_TEST_DIR/signer" "$GITPULSE_TEST_APP"
openssl x509 -inform DER -in "$GITPULSE_TEST_DIR/signer0" -noout -enddate
```

当前应用标识为 `com.pe7er.gitpulse`，描述文件中的 `application-identifier` 应匹配签名团队前缀及该标识。`ProvisionedDevices` 需包含目标手机的 **UDID**，可在 Xcode 的 Devices and Simulators 中核对；它与上面 `devicectl` 列表中的 CoreDevice `Identifier` 不是同一个值。有效期以本次证书和描述文件为准，任一到期或被撤销都可能使应用无法继续使用。

同时记录是否包含 `Payload/GitPulse.app/PlugIns/GitPulseWidgetsExtension.appex`。`GITPULSE_IOS_WIDGETS=auto` 在本机识别为 Personal Team 的真机构建中会关闭小组件；交付说明必须写明该包的小组件状态。需要验证小组件时，按前文配置支持 App Groups 的团队和描述文件后重新构建。

### 3. 覆盖安装、启动并确认运行

先解锁手机，完成电脑信任和开发者模式确认。沿用同一应用标识和兼容签名覆盖安装，保留现有账号与应用数据；不要为更新测试包先卸载应用。

```bash
xcrun devicectl device install app \
  --device "$GITPULSE_TEST_DEVICE" "$GITPULSE_TEST_APP" \
  --timeout 120 --json-output "$GITPULSE_TEST_DIR/install.json"

xcrun devicectl device process launch \
  --device "$GITPULSE_TEST_DEVICE" --terminate-existing com.pe7er.gitpulse \
  --timeout 30 --json-output "$GITPULSE_TEST_DIR/launch.json"

xcrun devicectl device info apps \
  --device "$GITPULSE_TEST_DEVICE" --bundle-id com.pe7er.gitpulse \
  --timeout 20 --json-output "$GITPULSE_TEST_DIR/installed-app.json"

xcrun devicectl device info processes \
  --device "$GITPULSE_TEST_DEVICE" \
  --filter "executable.lastPathComponent == 'GitPulse'" \
  --timeout 20 --json-output "$GITPULSE_TEST_DIR/processes.json"
```

`--terminate-existing` 会关闭旧进程再打开新版，执行前保存正在编辑的内容。核对安装后的版本、构建号与包内一致，并在启动后再次检查进程仍存在。进程查询使用 `executable.lastPathComponent`；`executable` 是 URL 类型，直接写 `executable CONTAINS 'GitPulse'` 会导致过滤错误。

普通启动不加 `--console`，终端退出后应用可以继续供测试人员操作。需要抓日志时再使用该选项；此时发给 `devicectl` 的可捕获终止信号会转发给应用，停止日志命令可能同时结束应用。

### 4. 交付与真机检查

交付目录至少保留 IPA、`SHA256SUMS.txt`、源码提交及工作区状态、构建日志、安装与启动记录，并附测试说明：版本和构建号、目标设备与系统版本、构建方式、小组件是否包含、本轮修改、已验证项和待验证项。签名私钥、证书密码、GitHub Token 不属于交付内容。

建议按以下顺序在真机检查：

1. 完全关闭后重开，检查已有账号及首屏恢复；弱网时已保存的个人卡片应先显示。
2. 在 GitHub 网页完成授权后返回，确认授权进度保留并继续登录；再验证账号切换与退出。
3. 打开“我的”，检查徽章、组织、贡献图及启用的可选内容；切换账号后确认资料跟随更新。
4. 切换路由再返回，检查输入、筛选、分页和滚动位置；检查安全区、键盘、外链、语言及深浅色。
5. 停止电脑上的前端开发服务后重新打开应用，确认页面仍能显示。若要测试小组件，先确认该包确实包含扩展。

自动测试、模拟 OAuth 和浏览器设备模拟不能替代真实账号授权与真机交互。安装和进程检查通过也只代表应用成功启动，需要分别记录上述功能的测试结果。

该开发签名包用于描述文件已登记的设备，不等于 TestFlight 或 App Store 分发。交给另一台 iPhone 安装前，需为该设备更新签名配置并重新导出；正式分发另见 [Actions 签名说明](GITHUB_ACTIONS.md#ios-签名)。

已验证记录：2026-11-21，`0.0.1` / `25f70b8` 使用 Xcode 26.0.1 完成 Release 构建、签名检查，并在 iPhone 15 Pro Max（iOS 18.7.8）覆盖安装、启动及检查持续运行。该次包不含小组件，真实 GitHub 授权交由测试人员复验；这不代表之后每个提交均已完成真机验证。

## 故障定位

- **Port 1420 is already in use**：使用新的启动脚本；匹配工作区的服务会被复用。旧服务没有工作区标识时，在原终端确认归属后停止，再运行 `pnpm dev:web`。脚本不会杀进程。
- **does not contain a scheme named gitpulse_iOS**：执行 `pnpm init:ios`，然后重试。可用 `xcodebuild -list -project packages/app/src-tauri/gen/apple/gitpulse.xcodeproj` 检查。
- **找不到运行目标**：检查 `xcrun simctl list devices available`，在 Xcode 安装该 runtime；已打开模拟器不代表选中了同一个设备。
- **缺少 Rust 目标**：根据 Apple Silicon / Intel 安装正确的模拟器目标，真机目标固定 `aarch64-apple-ios`。
- **requires a development team**：已选中真机但没有开发团队。填写 `.env.ios.local` 中的 `APPLE_DEVELOPMENT_TEAM`，确认 Xcode 已登录该团队的 Apple 账号并存在有效开发证书，再运行同一命令。配置只在本机生效，重新生成 Xcode 工程后启动脚本仍会传入团队。真机运行必须签名；纯编译验证才使用未签名构建。
- **GitPulseWidgetsExtension requires a development team**：重新运行 `pnpm -F @gitpulse/app tauri:ios`，脚本会为全部 target 生成本机签名设置。Personal Team 保持 `GITPULSE_IOS_WIDGETS=auto`；不要只在 Xcode 给扩展填 Team 后继续申请该团队不支持的 App Groups。
- **设备不可用、锁屏或安装超时**：重新运行 `xcrun devicectl list devices`，确认所选 Identifier 对应当前真机；解锁并检查信任与 Developer Mode，必要时改用 USB 连接后重试。
- **安装提示签名或描述文件不匹配**：检查包内描述文件的设备 UDID、应用标识、证书和到期时间。更新团队配置后重新导出 IPA；不要用模拟器产物或未签名构建替换，也不要先卸载已有应用来绕过签名问题。
- **测试包仍依赖 1420 服务**：确认安装的是本轮 `build:ios --signed --export-method debugging` 导出的包，而不是 `dev:ios` 的开发运行版本。

修改原生安全区实现、权限或 Swift/Rust 代码后需要重新编译；仅刷新 Web 页面无法验证这些改动。
