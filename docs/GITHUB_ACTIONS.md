# GitHub Actions 全平台打包

仓库提供 `.github/workflows/build.yml`，工作流名称为 **Build all platforms**。它先运行应用类型检查、测试和 Web 构建，成功后再打包所选平台。产物保存在该次运行的 Artifacts 中，保留 14 天。推送版本标签后，所有平台构建成功才会自动发布 GitHub Release，并上传按平台打包的 ZIP 与 SHA-256 校验文件；手动构建默认只上传 Artifacts；选择 `all` 并开启 `publish` 时，所有平台构建成功后才创建版本标签并发布 Release，已有标签不会被覆盖。不会上传应用商店。

本地对应的检查、初始化、开发和打包入口见 [本地开发](DEVELOPMENT.md) 与 [平台矩阵](PLATFORM_GUIDE.md)。本地和 CI 的 Android Gradle 配置共用 `scripts/lib/android.mjs`，脚本测试也包含在工作流检查中。

## 触发

- 在 GitHub 仓库的 Actions → Build all platforms → Run workflow 中选择 `all`、`desktop`、`android`、`ios` 或 `web`。
- 推送版本标签，例如 `v0.0.1`，会构建全部平台。标签必须与应用版本一致。
- 将源码、`pnpm-lock.yaml`、`packages/app/src-tauri/Cargo.lock` 和 `.github` 一起提交到仓库。依赖按锁文件安装。

## 平台与产物

| 平台 | 架构 | 产物 |
| --- | --- | --- |
| Windows | x64 | NSIS `.exe`、WiX `.msi` |
| macOS | Apple Silicon、Intel | `.dmg`、保留执行权限的 `.app.tar.gz` |
| Linux | x64、ARM64 | `.deb`、`.rpm`、`.AppImage` |
| Android | arm64、armv7、x86、x86_64 | 包含四种 ABI 的 `.apk` 和 `.aab` |
| iOS 真机 | arm64 | `.ipa` |
| iOS 模拟器 | Apple Silicon | `.app.tar.gz` |
| Web | 浏览器 | 静态站点 `dist` |

每个平台的原生安装包附带 `SHA256SUMS.txt`。Linux ARM64 使用 GitHub 的 `ubuntu-24.04-arm` runner；仓库账户需要能使用该 runner。macOS 产物默认使用 ad-hoc 签名，没有 Developer ID 公证；Windows 默认没有发行者签名。Web 静态产物使用浏览器授权时，还需要部署同源 `/api/github/login/*` 代理；纯静态托管可使用 Token 登录。

## GitHub 登录配置

在 Settings → Secrets and variables → Actions → **Variables** 中添加 `VITE_GITHUB_CLIENT_ID`，填写已创建并开启 Device Flow 的 GitHub OAuth 应用公开 Client ID。它不是 Client Secret。不配置时仍会完成打包，但浏览器授权入口不可用，保留 Token 登录。

## Android 签名

未配置签名时生成 **unsigned** APK/AAB，仅用于后续签名，不是可直接安装的正式包。配置以下四项 **Secrets** 后，会生成 **signed** 产物：

| Secret | 内容 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | JKS/Keystore 文件的 Base64 |
| `ANDROID_STORE_PASSWORD` | Keystore 密码 |
| `ANDROID_KEY_ALIAS` | 密钥别名 |
| `ANDROID_KEY_PASSWORD` | 对应密钥密码 |

必须成组配置，缺少一项会直接报错。密钥只写到 runner 临时目录，并在构建结束后清理。Android 工程由锁定版本的 Tauri CLI 初始化，SDK 版本从主应用及生成的依赖模块配置读取，并转换成实际平台包名。当前同时安装应用所需的 `platforms;android-37.0` 与 Tauri/opener 模块所需的 `platforms;android-36`（模块路径尚未生成时使用锁定版本的基线），NDK 固定为 27.2.12479018。运行时，Android 登录数据使用 Web Crypto 非导出密钥加密保存；桌面和 iOS 使用系统安全存储保护密钥。

## iOS 签名

默认真机产物为 **unsigned IPA**，不能直接安装到普通 iPhone；模拟器产物只用于模拟器。真机签名使用 Tauri 的证书导入流程，需配置：

| 类型 | 名称 | 内容 |
| --- | --- | --- |
| Secret | `IOS_CERTIFICATE` | 包含私钥的 `.p12` 证书 Base64 |
| Secret | `IOS_CERTIFICATE_PASSWORD` | 导出证书时设置的密码 |
| Secret | `IOS_MOBILE_PROVISION` | `.mobileprovision` 描述文件 Base64 |
| Variable | `APPLE_DEVELOPMENT_TEAM` | Apple 开发团队 ID |
| Variable | `IOS_EXPORT_METHOD` | `debugging`（默认）、`release-testing` 或 `app-store-connect` |

描述文件必须匹配 `com.pe7er.gitpulse`、团队、证书及导出方式。`debugging` 使用开发证书和开发描述文件；App Store 分发使用对应发行证书和描述文件。证书配置不完整会失败，不会自动降级成未签名包。模拟器任务不接收签名证书。

参考：[Tauri GitHub 构建流程](https://v2.tauri.app/distribute/pipelines/github/)、[Android 签名](https://v2.tauri.app/distribute/sign/android/)、[iOS 签名](https://v2.tauri.app/distribute/sign/ios/)。

## 发布版本

统一根目录、两个工作区包、Tauri 和 Cargo 的版本，更新 Cargo 锁文件与 iOS `project.yml` / `Info.plist`，并在 `docs/releases/v版本号.md` 写入发行说明。执行 `pnpm check` 和 `pnpm build:web` 后提交、推送 `main`，再推送同名 `v版本号` 标签。自动发布只针对标签指向的提交；任一平台失败都不会发布缺失平台的正式版本。

首次版本为 `v0.0.1`。GitHub OAuth 的公开 Client ID 通过仓库 Actions Variable 配置，本机 `.env.ios.local` 和所有证书私钥不提交。

也可以先推送版本提交，再手动运行 `all` 并开启 `publish`：工作流只在全部构建成功后为本次提交创建带说明的标签并发布，避免提前打上尚未验证的发行标签。
