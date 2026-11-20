# @gitpulse/app

GitPulse 的 React 18 / TypeScript / Arco Design 前端与 Tauri 2 原生应用。覆盖 Web、macOS、Windows、Linux、iOS 和 Android 的开发与打包入口，平台工具及验证边界见 [平台矩阵](../../docs/PLATFORM_GUIDE.md)。

## 启动

在仓库根目录运行：

```bash
pnpm install --frozen-lockfile
pnpm run doctor desktop
pnpm dev
```

只开发网页用 `pnpm dev:web`。其他入口、OAuth 配置、前端服务复用和故障处理以 [本地开发指南](../../docs/DEVELOPMENT.md) 为准。`pnpm -F @gitpulse/app tauri:ios` 等已有包级别别名继续可用。

## 功能与代码

- `src/pages`：首页、单类型搜索、收件箱、我的、账号与外观。
- `src/components/search`：顶部聚合搜索、语法高亮、键盘选择和最近搜索。
- `src/components/profile`：贡献图、Profile、pins 定制、GitHub Pages 搜索与分页。
- `src/services/github`：带当前账号鉴权的请求、限流处理与查询服务。
- `src/services/auth`、`src/stores`：浏览器设备授权、多账号与本地加密存储；凭证不注入构建产物。
- `src/i18n`：简体中文、繁体中文、英文、日语。
- `src-tauri/src`：系统安全存储、原生 OAuth 请求与 iOS 安全区。
- `src-tauri/gen/apple`：iOS Xcode 工程；macOS 桌面不使用它。
- `tests`：请求、交互、授权、存储与设置测试，使用模拟凭证。

## 检查与构建

```bash
pnpm check
pnpm build:web
pnpm build:desktop
```

原生包只构建当前平台；全平台远程构建见 [GitHub Actions](../../docs/GITHUB_ACTIONS.md)。调试构建使用 `--debug`，通常比 release 更大，不代表可直接用于发行。
