# Android 本地开发

支持 macOS、Windows、Linux 主机。完成 [通用安装](DEVELOPMENT.md)，安装 Android Studio、SDK Command-line Tools、Platform Tools、JDK 21 和 Rust stable。

## SDK 与 Rust

SDK Manager 中安装 NDK **27.2.12479018**、Build Tools **36.0.0**。平台 SDK 需要同时满足主应用与依赖模块：当前主应用使用 API 37.0，`tauri-android` 和 `tauri-plugin-opener` 使用 API 36，两者都要安装。平台 SDK 与 Build Tools 是不同的组件。

macOS / Linux 示例（替换 JDK 路径）：

```bash
export JAVA_HOME="/path/to/jdk-21"
export ANDROID_HOME="$HOME/Library/Android/sdk" # Linux 通常为 $HOME/Android/Sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
sdkmanager "platform-tools" "ndk;27.2.12479018" "build-tools;36.0.0"
sdkmanager --licenses
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
pnpm init:android
```

Windows PowerShell 示例：

```powershell
$env:JAVA_HOME = "C:\path\to\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
sdkmanager.bat "platform-tools" "ndk;27.2.12479018" "build-tools;36.0.0"
sdkmanager.bat --licenses
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
pnpm init:android
```

`init:android` 结束后会输出主应用和依赖模块所需的平台 SDK 安装命令。锁文件对应 CLI 当前生成 `compileSdk = 37` 时，执行 `sdkmanager "platforms;android-36" "platforms;android-37.0"`（Windows 为 `sdkmanager.bat`），再运行 `pnpm run doctor android`。将来升级 CLI 后以生成文件和脚本提示为准。

`compileSdk = 37` 对应的基础平台包名是 `platforms;android-37.0`。检查脚本会读取 `source.properties` 或 `package.xml` 中的 API 版本，并确认 `android.jar` 存在，兼容 `37` / `37.0`；不会只凭目录名判断，也不会把 `37.1` 或下载残留当成完整的 37.0 平台。

如果已经安装仍提示缺少，先查看 `pnpm run doctor android` 输出的 **当前 SDK 路径**，确认与 Android Studio SDK Manager 的 Android SDK Location 一致。可在安装命令中加 `--sdk_root="实际SDK路径"`，避免安装到另一份 SDK。不要重命名平台目录或修改 SDK 的版本信息来绕过检查。安装命令参数见 [Android SDK 工具文档](https://developer.android.com/tools/sdkmanager)。

脚本会补充本次子进程的 SDK、NDK 和工具 PATH，默认 SDK 位置为系统常见安装目录；安装到其他磁盘时设置 `ANDROID_HOME`，自定义 NDK 位置用 `NDK_HOME`。为了与 CI 一致，保留默认 NDK 版本。生成配置由 `scripts/lib/android.mjs` 维护，本地和 CI 共用，重复运行不会重复追加配置。

## 找不到 android.jar 或 parseDebugLocalResources 失败

如果 `:tauri-android`、`:tauri-plugin-opener` 报 `PlatformAttrTransform` 无法读取 `platforms/android-36/android.jar`，主应用的 API 37.0 不能替代这些模块的 API 36。

先运行 `pnpm run doctor android`，检查输出中每组模块的 SDK 要求。脚本会读取 `tauri.settings.gradle` 引用的模块配置；全新工程尚未生成模块路径时，使用当前锁定 Tauri 版本所需的 API 36 作为检查与 CI 安装基线。

平台目录下应直接存在 `android.jar`、`source.properties` 等文件。只剩 `package.xml` 不表示安装完整；`android-36/android-36/android.jar` 这样的多层目录也不能被 Gradle 使用。确认 SDK 路径一致后，通过 SDK Manager 修复该平台，或在核对版本并备份冲突文件后修正多余的目录层级。不要通过更改插件的 `compileSdk` 或复制其他 API 的 `android.jar` 绕过错误。

## 模拟器与真机

在 Android Studio Device Manager 创建并启动适合主机架构的模拟器；真机开启 USB 调试并确认电脑授权。

```bash
adb devices
pnpm dev:android
```

由 Tauri 选择设备并启动应用。第一次启动会下载 Gradle 和 Maven 依赖，需要可访问对应网络。真机需要能访问开发电脑的前端服务；遇到网络错误先检查 1420 端口和防火墙。

## GitHub 登录一直停在连接中

点击“使用 GitHub 登录”后，应先出现授权码，再通过“打开 GitHub 授权页面”进入系统浏览器。授权请求由 Rust 发起，不能用 WebView 的跨域请求替代。

`reqwest 0.13` 使用系统证书验证器。Android 必须在请求前初始化 JVM 上下文，并打包配套的 Kotlin 组件；缺少初始化时，日志会出现 `Expect rustls-platform-verifier to be initialized`，后台任务退出，页面无法收到授权码。

项目在 `src-tauri/src/android_tls.rs` 完成初始化，`src-tauri/android/rustls.gradle.kts` 从 `Cargo.lock` 读取配套组件版本，`rustls.pro` 防止 release 构建裁剪 JNI 调用的类。本地开发、打包和 CI 都会自动接入这些配置，重新运行 `pnpm init:android` 后也会恢复。首次构建需要能访问 `raw.githubusercontent.com` 下载该组件。接入要求见 [证书验证器官方 Android 文档](https://github.com/rustls/rustls-platform-verifier#android)。

更新这部分代码后需要重新构建、安装原生应用，仅刷新页面不生效。网络请求最多等待 20 秒，前端另有 25 秒的原生通信超时保护，失败后可重试；关闭登录窗口会取消当前等待。

## 打包与签名

```bash
# 与 Actions 相同：四种 ABI，同时输出 APK 与 AAB，默认 release 未签名
pnpm build:android

# 本地调试包，只构建 ARM64 APK（使用 Android 调试签名）
pnpm build:android --apk --target aarch64 --debug
```

输出位于 `packages/app/src-tauri/gen/android/app/build/outputs` 下的 `apk` / `bundle`。AAB 用于商店分发，不能直接安装；release 未签名 APK 也不能直接安装。需要安装调试包可使用 `adb install -r <APK实际路径>`。

本地 release 签名需同时提供四个环境变量：

| 变量 | 内容 |
| --- | --- |
| `ANDROID_KEYSTORE_PATH` | 本机 keystore 的绝对路径 |
| `ANDROID_STORE_PASSWORD` | Keystore 密码 |
| `ANDROID_KEY_ALIAS` | 密钥别名 |
| `ANDROID_KEY_PASSWORD` | 密钥密码 |

脚本只引用环境变量，不把密码写进 Gradle；缺少部分变量或文件不存在会停止。CI 使用 `ANDROID_KEYSTORE_BASE64` 解码临时文件，与本地路径变量不同，见 [Actions 签名](GITHUB_ACTIONS.md#android-签名)。签名材料不要提交到仓库。

Android 当前使用 Web Crypto 非导出密钥加密本地账号数据；它与桌面/iOS 的系统安全存储实现不同。清除应用数据会清除本地账号与设置。
## 贡献活动桌面小组件

应用包含 2D/3D 两种原生小组件，添加方式、同步规则及验证范围见 [桌面小组件](HOME_SCREEN_WIDGETS.md)。本地初始化和 CI 会自动接入 `src-tauri/widgets/android/`，重新生成 Android 工程后无需手动复制源码。
