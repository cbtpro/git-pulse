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

OAuth 登录申请 `repo read:user read:org notifications`，其中 `read:org` 用于读取当前账号的组织成员身份，包括非公开成员身份。旧授权不会因应用升级自动增加权限；在“账号与外观”的当前账号中点击“更新授权”，使用同一 GitHub 账号完成登录即可更新本地凭证，无需先移除账号。此入口打开登录流程，不会直接修改 GitHub 组织权限；组织策略限制不一定能通过重新登录解决。使用经典 PAT 时需自行授予 `read:org`，再通过 Token 登录更新凭证；细粒度 PAT 和组织访问策略可能限制可见范围。

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

### 打包测试版本并安装真机

交给测试人员的包使用 `build` 命令生成，页面资源随应用内置，无需电脑持续运行前端开发服务。按平台完成签名、明确选择设备，再覆盖安装并核对版本和运行状态：

| 平台 | 测试包构建 | 安装与验证流程 |
| --- | --- | --- |
| iOS 真机 | `pnpm build:ios --signed --export-method debugging` | [签名检查、IPA 解包、真机安装与交付](iOS_DEVELOPMENT.md#测试包打包与真机安装) |
| Android ARM64 | `pnpm build:android --apk --target aarch64 --debug` | [APK 安装、启动与测试包交付](ANDROID_DEVELOPMENT.md#测试包安装到真机) |

iOS 上述命令使用 Release 编译和开发签名导出；Android 示例使用调试签名，正式性能验收应按平台文档改用有签名的 Release 包。每次交付保留源码提交号、版本和构建号、包校验值、设备与系统版本、安装结果及测试说明；原生构建会写入同一份前端输出目录，多平台打包应依次执行。

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
pnpm test:navigation
pnpm test:interactive-back
pnpm test:mobile:viewport
```

默认使用 macOS 的 Chrome；其他环境可通过 `CHROME_PATH` 指定可执行文件，通过 `GITPULSE_TEST_URL` 指定前端地址。授权测试使用模拟响应，覆盖加密进度恢复、页面重建与返回前台时的临时网络失败；设备模拟不代表真实 GitHub 账号授权已通过。

路由状态保存在当前会话的内存中，按完整页面地址（路径、查询参数和片段）最多保留最近 12 个实例，覆盖输入、筛选、分页、加载结果及滚动位置。同一路径的不同搜索条件、页码、仓库目录有各自的实例。每页拥有独立滚动容器，隐藏页保持布局，使用 `visibility`、`inert` 和 `aria-hidden` 隔离交互与无障碍读取；返回时直接激活原来的 DOM，不重新请求数据或通过 `window.scrollTo` 重建位置。缓存访问顺序与 DOM 顺序分离，避免移动节点导致浏览器重置滚动位置。局部分页通过 `usePageScrollToTop` 重置当前页滚动，不能再操作窗口滚动。

切换账号或退出登录会清空页面缓存；刷新应用后重新加载页面。缓存容量之外的旧页再次进入时正常加载。后台切换不会主动取消授权；明确取消、GitHub 拒绝授权或未完成的验证码到期时会清理待授权进度。

### 移动端系统返回

iOS 原生应用使用内容区域的交互式边缘返回。关闭 WKWebView 整页手势后，手指从内容左侧 24 CSS 像素内向右移动即可预览上一条历史记录；顶部栏、安全区和底部导航保持固定。当前页跟随手指移动，上一个已缓存页面在后方小幅移动，两页都使用原来的 DOM、Canvas 和滚动位置。松手时根据距离和速度决定完成或取消；取消不改变历史，完成后仅调用一次路由 `navigate(-1)`。

动画到达终点后保持上一页可见，直到 React 提交对应路由才在 `useLayoutEffect` 中撤掉动画样式并转移焦点，不能在 `popstate` 回调里提前清理，否则会短暂显示旧页。页面节点不复制、不重新挂载，也不通过截图代替预览。背景加载、语言和主题变更仍按各组件原有逻辑更新。

交互仅在可确定真实上一条历史、其页面仍在缓存且已结束初次加载时启用；直接打开、刷新或切换账号后不猜测上一页，同地址重复记录不执行视觉返回。弹窗、聚合搜索、面包屑菜单或文本编辑期间不启动手势；纵向滚动、表单控件和 Canvas 操作不被抢占。多指触摸、切入后台、尺寸变化会取消未完成手势；尊重系统“减少动态效果”。浏览器版沿用浏览器自身的导航行为。

Android 使用 Tauri 的[系统返回接口](https://v2.tauri.app/reference/javascript/api/namespaceapp/#onbackbuttonpress)，同时覆盖返回键和系统返回手势。返回时优先关闭最上层浮层，然后回退页面；没有可回退页面时结束当前应用 Activity。系统软键盘仍由 Android 先处理。这里不额外模拟 Android 的返回预览动画。

页面跳转以 React Router 的浏览器历史为准。内存只记录观察到的最近 96 条历史元数据，用于找到预览目标；`PUSH` 丢弃失效前进分支，`REPLACE` 更新当前位置，未知 `POP` 重置预览记录。原生验证应覆盖：短拖取消、连续完成返回、设置返回个人页、仓库详情返回搜索结果、搜索条件/未提交输入/纵向与代码横向滚动保持、导航固定、弹窗与搜索面板、横竖屏切换、前后台切换、Android 根页面返回和软键盘收起。

`pnpm test:interactive-back` 使用隔离的原生桥接与 GitHub 模拟响应，在 320/390/1024 像素布局发送 Chromium 真实触摸输入，检查取消与连续返回、不同查询的原始实例、滚动/Canvas 保留、固定导航、输入与弹窗拦截、后台中断及减少动态效果。逐帧记录动画与路由交接的可见性、位置和滚动值。`GITPULSE_TEST_BROWSER=webkit pnpm test:interactive-back` 在 WebKit 使用合成触摸执行同一套断言；它验证 WebKit 布局和路由交接，不等同于 iOS 系统触摸验证，仍需模拟器或真机检查。

原生触摸回归使用 XCTest：先在 iPhone 15 Pro Max 模拟器安装并启动最新 GitPulse，使用简体中文界面、默认字号和游客状态；开发包须保持对应前端服务可用。执行 `pnpm test:ios:navigation -- <模拟器 UDID>`，脚本在临时目录生成独立测试工程，不修改应用工程或签名。测试覆盖纵向滚动、短拖取消、完成返回后滚动坐标一致、连续返回，以及底部导航位置一致；报告和返回前后截图保存至 `review-artifacts/ios-navigation/*.xcresult`，可用 Xcode 打开。测试会重新启动模拟器中的应用，不清空账号或修改设置。此用例已在 iOS 17.4 模拟器验证；真机的触感、软键盘和系统边缘冲突仍应单独检查。

### 页面层级与返回

顶部面包屑以“概览”为根节点，上级节点可点击，当前节点使用 `aria-current="page"` 标识。导航语义遵循 [WAI 面包屑模式](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/)。设置、Star 收藏、版本更新和离线工作区统一归属“我的空间”；返回入口放在固定顶部栏，加载中或请求失败时也可使用。

仓库详情按进入时的来源归属搜索、收件箱、概览或个人工作区。来源随当前会话最近 96 条历史记录保存，仓库内切换目录、Issues/PR、Actions 或版本发布时继续保留；浏览器前进/后退恢复对应记录的来源。直接打开、刷新、切换账号或超出记录保留范围后，没有来源时提供“搜索”作为返回入口。主导航选中状态与此归属一致。

面包屑和左侧返回按钮执行“返回上级”，不是任意回退一条浏览历史：文件返回上级目录，Issue/PR 或运行详情返回对应列表，仓库根返回来源页。目录和列表链接保留来源账号及分支，返回来源页恢复其完整查询、已有输入和滚动状态。上行导航替换当前记录，避免“设置 → 我的空间 → 返回”再次进入刚离开的设置页；iOS 滑动、浏览器及 Android 系统返回均使用实际历史顺序。现有 `#/` 链接由应用统一交给路由处理，保留真实历史键；新标签、组合键、下载、外链和通知已读处理保持原有行为。

移动端折叠上级路径，桌面端只折叠过长路径的中间层。展开菜单可以访问所有被折叠的祖先节点，支持键盘进入、Escape 关闭与点击外部关闭；返回后焦点移到主内容且不改变已恢复的滚动位置。`pnpm test:navigation` 覆盖 320/390/1280 像素布局、来源恢复、目录跳转、直接打开、键盘菜单及英文长标题。已安装 Playwright WebKit 的环境还可执行 `GITPULSE_TEST_BROWSER=webkit pnpm test:navigation`，检查 WebKit 的布局与交互；浏览器模拟不替代原生真机验证。

### 应用标识

主应用各平台统一使用 `com.chenbitao.gitpulse`；iOS 小组件使用 `com.chenbitao.gitpulse.widgets`，共享组为 `group.com.chenbitao.gitpulse`。Android 主入口、小组件包名及系统密钥存储的服务名同步使用新前缀。

标识变更会让移动系统将新包视为另一款应用，旧安装及其数据不会自动迁移，也不会被安装新包覆盖或删除。新安装需要重新登录，并重新添加桌面小组件；iOS 真机与 CI 使用的描述文件必须匹配新的主应用、小组件和 App Group 标识。

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

个人卡片的身份徽章来自 [GitHub GraphQL User](https://docs.github.com/en/graphql/reference/users) 的官方身份标记，仅显示接口确认拥有的徽章；Pull Shark、YOLO 等成就通过卡片里的 GitHub 成就入口查看。“我的组织”使用[当前账号的组织成员列表](https://docs.github.com/en/rest/orgs/members#list-organization-memberships-for-the-authenticated-user)，读取 `state=active` 并遍历分页，包含授权允许的非公开成员身份，不把待接受的邀请当成已加入的组织。

访问成员列表返回权限不足时，回退至 `/users/{login}/orgs` 的公开结果，并明确提示授权范围；组织卡片不展示重新授权按钮，授权管理统一放在“账号与外观”。凭证失效、限流或网络错误不会伪装成“没有组织”。空列表仅表示当前授权没有可显示的组织，不代表账号一定未加入组织，也不是需要重新授权的依据。两个区域独立加载，切换账号后取消过时请求，不阻塞个人卡片和页面内容，也不会改变 GitHub 上的成员公开状态。

个人卡片统一资料、统计和身份区域的左右边距。桌面端徽章与组织使用等宽双列、对齐标题及内容起点；移动端纵向排列，以分隔线区分区域。长名称可换行，头像、徽章图标与组织头像不参与压缩。`pnpm test:startup` 同时检查这些对齐关系、320px 窄屏、四种语言、深色主题及旧授权的空状态布局。

“暂无公开身份徽章”表示查询成功，但当前查询的六个身份标记均为 `false`；拥有 GitHub 成就不意味着拥有这些身份徽章。不要将空结果当作鉴权失败，也不要据仓库数或贡献数推断徽章。查询失败时页面显示网络、权限或限流原因，凭证失效或权限不足时可从徽章区域重新登录。

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
