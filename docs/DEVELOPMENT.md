# 本地开发

所有命令默认在仓库根目录执行。脚本与 [GitHub Actions](GITHUB_ACTIONS.md) 使用相同的包管理器、平台目标及 Android 配置；本地原生构建仍受主机平台限制，具体见 [平台矩阵](PLATFORM_GUIDE.md)。

## 安装与检查

使用 Node.js 22（根目录 `.nvmrc`）和 pnpm 10.34.9（`package.json#packageManager`）。已有 Node.js 后运行：

```bash
npm install -g pnpm@10.34.9
pnpm install --frozen-lockfile
pnpm run doctor web
```

原生应用还需要 Rust stable 和对应平台工具。先按平台指南安装，再检查：

```bash
pnpm run doctor desktop
pnpm run doctor ios
pnpm run doctor android
pnpm run doctor all
```

必须写 `pnpm run doctor`：`pnpm doctor` 是 pnpm 自带命令，不会执行本项目的检查。`all` 检查 Web、当前桌面平台、Android，以及 macOS 上的 iOS；缺少必需项返回非零状态，提示项不阻止启动。检查只读取环境，不自动安装软件或修改系统配置。

## GitHub 登录

在根目录创建 `.env.local`，填入 GitHub OAuth App 的公开 Client ID：

```dotenv
VITE_GITHUB_CLIENT_ID=your_public_client_id
```

OAuth App 必须开启 **Enable Device Flow**。应用通过 GitHub 官网完成授权，不收集 GitHub 密码，也不需要 Client Secret。更改环境变量后重启前端。没有 Client ID 时可在应用中使用 Token 登录。账号凭证由应用加密保存，不能放入任何 `VITE_*` 环境变量；这些变量会进入前端产物。

## 开发、初始化与打包

| 平台 | 初始化 | 启动 | 打包 |
| --- | --- | --- | --- |
| Web | 无 | `pnpm dev:web` | `pnpm build:web` |
| 当前桌面 | 无 | `pnpm dev` | `pnpm build` |
| macOS | 无 | `pnpm dev:macos` | `pnpm build:macos` |
| Windows | 无 | `pnpm dev:windows` | `pnpm build:windows` |
| Linux | 无 | `pnpm dev:linux` | `pnpm build:linux` |
| iOS | `pnpm init:ios` | `pnpm dev:ios` | `pnpm build:ios` |
| iOS 模拟器 | 同上 | `pnpm dev:ios` | `pnpm build:ios:simulator` |
| Android | `pnpm init:android` | `pnpm dev:android` | `pnpm build:android` |

`dev`、`dev:app`、`dev:desktop` 均启动当前主机的桌面应用；`build`、`build:app`、`build:desktop` 只打包当前桌面平台。它们不表示一次构建所有系统。全平台构建使用 Actions 的各平台 runner。

脚本自动检查依赖、选择平台目标，然后调用项目锁定版本的 Tauri CLI。参数会继续传给 Tauri：

```bash
pnpm dev:ios "iPhone 15 Pro Max"
pnpm build:macos --target x86_64-apple-darwin
pnpm build:android --apk --target aarch64 --debug
pnpm build:ios:simulator --debug
pnpm build:windows --dry-run
pnpm build:android --help
```

额外目标需要先 `rustup target add <Rust目标>`。`--dry-run` 仅显示调用计划，不检查或构建；`--help` 查看锁定 CLI 的参数。iOS 真机构建默认 `--no-sign`，模拟器保留 Xcode 本地签名以支持 Keychain 和小组件共享数据；Android release 没有签名变量时输出未签名包。可安装包与发行签名见各平台指南，小组件使用与验证见 [贡献活动桌面小组件](HOME_SCREEN_WIDGETS.md)。

原有包级别命令仍可使用，例如 `pnpm -F @gitpulse/app tauri:ios`、`tauri:android:init`、`tauri:windows:build`。底层 `pnpm -F @gitpulse/app tauri ...` 保留给 Actions 和 Xcode；它绕过本地环境检查及默认参数。

## 前端服务与多端调试

原生启动会自动启动前端，无需提前单独运行 Vite。需要同时调试多个端时，可先在独立终端运行 `pnpm dev:web`，再启动各原生应用。前端固定使用 1420 端口，通过工作区标识确认后复用，不能误复用另一份检出的页面。遇到其他程序占用端口会说明原因，不会结束现有进程。

Vite 开发服务监听网络接口，移动端使用 Tauri 提供的 `TAURI_DEV_HOST`。只在可信本地网络调试；真机与电脑需互相可达。若旧服务只监听 localhost，在其原终端停止并重新运行 `pnpm dev:web`。不要通过删除 `strictPort` 让 Vite 自动换端口，否则会和 Tauri 的 `devUrl` 不一致。

前端改动支持热更新；Rust、能力声明或原生工程配置变更通常需要重新编译。共享源码、端口与构建目录的注意事项见 [同步开发](SYNC_DEVELOPMENT_WORKFLOW.md)。

## 验证

```bash
pnpm check
pnpm build:web
```

`check` 执行应用类型检查、Vitest 测试及本地/CI 脚本测试，与 Actions 的主要检查一致。单独运行：

```bash
pnpm -F @gitpulse/app type-check
pnpm -F @gitpulse/app test
pnpm test:scripts
```

自动测试使用虚拟凭证与模拟响应，不需要真实 GitHub Token。原生运行还应人工检查浏览器授权、账号切换、系统安全存储、安全区、外链跳转，以及屏幕阅读器和软键盘行为。Web 测试通过不能替代各系统上的安装验证。

启动 `pnpm dev:web` 后，可在另一个终端执行浏览器回归测试：

```bash
pnpm test:auth:recovery
pnpm test:page-state
pnpm test:mobile:viewport
```

默认使用 macOS 的 Chrome；其他环境可通过 `CHROME_PATH` 指定可执行文件，通过 `GITPULSE_TEST_URL` 指定前端地址。授权测试使用模拟响应，覆盖加密进度恢复、页面重建与返回前台时的临时网络失败；设备模拟不代表真实 GitHub 账号授权已通过。

路由状态保存在当前会话的内存中，最多保留最近 12 个页面，覆盖输入、筛选、分页、加载结果及滚动位置。切换账号或退出登录会清空页面缓存；刷新应用后重新加载页面。后台切换不会主动取消授权；明确取消、GitHub 拒绝授权或未完成的验证码到期时会清理待授权进度。

### 启动恢复与个人资料

启动时先读取加密账号库中的已验证个人资料，立即显示工作台，再后台请求 `/user` 更新身份信息。离线、超时或限流不会清除已保存的账号；明确返回 `401` 时移除失效账号并清空其页面。切换账号、退出或开始新的授权会取消旧的后台校验，避免迟到响应覆盖新账号。首次登录及没有个人资料的旧格式账号仍需完成身份校验。所有业务请求继续携带当前账号凭证，不以本地资料替代服务端鉴权。

页面通过 `React.lazy` 按路由加载，每个保留页面有独立的 `Suspense` 边界；打开首页时无需解析仓库详情、Markdown 和设置页面。测试正式构建的恢复速度：

```bash
pnpm build:web
pnpm preview:web --host 127.0.0.1 --port 1421 --strictPort
# 另一个终端
pnpm test:startup
```

该测试使用虚拟账号登录后重新加载，在 `/user` 一直未返回、CPU 降速 4 倍的情况下验证个人卡片能先显示，并检查离线恢复、徽章、组织、头像比例和窄屏布局。它使用 Chromium 的移动设备模拟，记录的耗时不是 iOS 或 Android 原生冷启动基准。截图保存在忽略目录 `review-artifacts/startup`。

个人卡片的身份徽章来自 [GitHub GraphQL User](https://docs.github.com/en/graphql/reference/users) 的官方身份标记，仅显示接口确认拥有的徽章；Pull Shark、YOLO 等成就通过卡片里的 GitHub 成就入口查看。组织来自[公开组织成员列表](https://docs.github.com/en/rest/orgs/orgs#list-organizations-for-a-user)，不额外申请私有组织权限；两个区域独立加载、失败可分别重试，不阻塞个人卡片和页面内容。

## 产物与清理

应用图标使用站立木乃伊猫原稿，执行 `pnpm icons:generate` 可重新生成所有平台尺寸及 PNG、ICO、ICNS、WebP 导出。移动工程会自动同步图标，细节见[应用图标](APP_ICONS.md)。

| 平台 | 默认输出位置（相对仓库） |
| --- | --- |
| Web | `packages/app/dist` |
| 桌面 | `packages/app/src-tauri/target/<Rust目标>/release/bundle` |
| iOS | `packages/app/src-tauri/gen/apple/build` |
| Android | `packages/app/src-tauri/gen/android/app/build/outputs` |

桌面 `--debug` 使用 `debug/bundle`；移动端目录下按配置与平台继续分层。`pnpm clean` 只清理前端构建目录和工作区缓存，保留依赖、账号数据、签名文件及原生构建目录。确需清理 Rust 编译缓存时，在 `packages/app/src-tauri` 执行 `cargo clean`，下次构建会较慢。

## 代码位置

- `packages/app/src`：React/Arco 页面、Lucide 图标、搜索与 GitHub 服务、加密账号存储。
- `packages/app/src/i18n`：简体中文、繁体中文、英文、日语；新增界面文案需同步维护。
- `packages/app/src-tauri/src`：原生入口、安全存储、OAuth 请求与 iOS 安全区处理。
- `packages/app/src-tauri/gen/apple`：iOS 工程，`project.yml` 为 XcodeGen 来源；保留已有自定义配置。
- `packages/app/src-tauri/gen/android`：由 `pnpm init:android` 生成。
- `scripts/dev`：本地平台启动、检查、清理；`scripts/ci`：打包检查、签名准备、产物收集。
- `scripts/lib/android.mjs`：本地与 Actions 共用的 NDK、Build Tools、签名配置生成逻辑。

平台指南：[Web](WEB_DEVELOPMENT.md)、[macOS](macOS_DEVELOPMENT.md)、[Windows](WINDOWS_DEVELOPMENT.md)、[Linux](LINUX_DEVELOPMENT.md)、[iOS](iOS_DEVELOPMENT.md)、[Android](ANDROID_DEVELOPMENT.md)。
