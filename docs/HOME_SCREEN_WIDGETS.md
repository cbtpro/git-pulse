# 贡献活动桌面小组件

iOS 和 Android 各提供两个系统小组件：**贡献活动 · 2D** 和 **贡献活动 · 3D**。2D 显示贡献热力图，3D 显示静态立体柱状图；在系统小组件列表选择样式，可以同时添加。点击小组件打开 GitPulse。

## 添加和更新

- **iOS 17.4 及以上**：长按桌面空白处，添加小组件，搜索 GitPulse，选择 2D/3D 及尺寸。小、中、大尺寸分别显示最近 13 周、26 周、全年；顶部数字始终是全年贡献总数。
- **Android**：进入 GitPulse 的「我的 → 账号与外观 → 桌面贡献小组件」，点击添加 2D 或 3D，并确认系统弹窗。启动器不支持应用内添加时，长按桌面进入系统小组件列表。支持调整尺寸，图表按可用空间显示最近 13 周、26 周或全年，底部标明范围。
- 小组件跟随应用当前账号和语言。打开应用、切换账号、刷新应用内贡献图都会同步；返回前台的自动刷新有 5 分钟间隔。「立即同步」可以手动刷新。
- 退出登录会清除小组件中的账号和贡献数据；切换账号先清空旧账号，再加载新账号。相同账号遇到网络错误时保留上次成功同步的数据，超过一天提示打开应用更新。
- 小组件不独立请求 GitHub。系统定时刷新只读取已有数据，不代表后台拉取了最新贡献；系统决定最终显示更新的时机。

## 数据与实现

共享内容仅包含账号标识、用户名、语言、贡献计数、颜色等级及更新时间，不包含 GitHub Token、密码、仓库名称或仓库内容。Android 保存到应用私有的 `noBackupFilesDir`，不进入系统备份；iOS 使用 App Group 容器，并开启文件保护。应用原有凭据加密存储保持独立。

`src/services/widgets/ContributionWidgetSync.ts` 管理账号代次、取消请求和串行写入，阻止旧账号的延迟响应覆盖新账号。原生桥接 `src-tauri/src/contribution_widgets.rs` 校验字段、大小和状态；iOS 通过 SwiftUI Canvas 绘制，Android 通过 Canvas 位图和 RemoteViews 显示。原生源码位于 `src-tauri/widgets/`，不依赖手动复制到构建目录。

## iOS 开发与签名

```bash
pnpm init:ios
pnpm build:ios:simulator --debug
xcrun simctl install booted packages/app/src-tauri/gen/apple/build/arm64-sim/GitPulse.app
xcrun simctl launch booted com.chenbitao.gitpulse
```

模拟器构建保留 Xcode 的本地签名，不需要发行证书。不要添加 `--no-sign`：完全禁用签名会丢失模拟器 App Groups / Keychain 权限。主应用、小组件扩展和 Podfile 的最低部署版本都为 `17.4`。

真机需要为主应用 `com.chenbitao.gitpulse` 和扩展 `com.chenbitao.gitpulse.widgets` 配置同一开发团队，并在两个描述文件中启用 `group.com.chenbitao.gitpulse`。在 Xcode 的两个 target 中分别检查 Signing & Capabilities。若更换 Bundle ID，也要同步更改 App Group、两个 target 和打包脚本的标识。

本地脚本会为两个 target 统一注入团队。使用 Personal Team 时，默认 `GITPULSE_IOS_WIDGETS=auto` 自动在真机运行中排除小组件及 App Groups，只运行主应用；模拟器继续包含小组件。该变体仅写入忽略提交的本机工程配置，不修改共享 `project.yml`，CI 的完整小组件构建保持不变。付费团队可显式设 `GITPULSE_IOS_WIDGETS=enabled`，详见 [iOS 开发](iOS_DEVELOPMENT.md)。

CI 签名构建需额外提供 `IOS_WIDGET_MOBILE_PROVISION`。脚本校验两个描述文件的应用标识、团队、App Group 和有效期，为扩展安装描述文件并补充导出映射。当前已验证 Android 模拟器和 iOS 17.4 模拟器的小组件，以及 Personal Team 真机主应用的签名、安装与启动；含小组件的真机 App Groups 签名与商店发布尚未验证。

参考：[Apple App Groups](https://developer.apple.com/documentation/xcode/configuring-app-groups)、[WidgetKit TimelineProvider](https://developer.apple.com/documentation/widgetkit/timelineprovider)、[Android 小组件](https://developer.android.com/develop/ui/views/appwidgets/overview)。
