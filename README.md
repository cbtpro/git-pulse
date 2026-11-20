# GitPulse

使用 Tauri 2、React 18、TypeScript 和 Arco Design 构建的 GitHub 客户端，采用 pnpm workspace 管理 Web、桌面与移动应用的共享源码。

## 功能

- GitHub 官网授权与 Token 登录，多账号切换，本地账号数据加密保存。
- 顶部聚合搜索与独立搜索页，覆盖仓库、用户、组织、主题、代码、提交、Issues/PR 和 GitHub Pages；支持 GitHub 搜索语法、输入法、键盘选择与最近搜索管理。
- 收件箱筛选、跳转与标记已读。
- 个人资料、Canvas 2D/3D 贡献图、仓库与 Gist pins、本地 pins 定制、GitHub Pages 搜索与分页。
- 简体中文、繁体中文、英文、日语，深浅主题与移动端安全区设置。

开发和打包脚本覆盖 macOS、Windows、Linux、iOS、Android 与 Web；各平台所需主机、架构和验证边界见 [平台矩阵](docs/PLATFORM_GUIDE.md)。

## 快速开始

使用 Node.js 22 和 pnpm 10.34.9，在仓库根目录执行：

```bash
npm install -g pnpm@10.34.9
pnpm install --frozen-lockfile
pnpm run doctor web
pnpm dev:web
```

浏览器打开 `http://localhost:1420`。桌面开发在安装对应系统工具后运行 `pnpm dev`。OAuth 配置在根目录 `.env.local` 设置公开的 `VITE_GITHUB_CLIENT_ID`，并在 GitHub OAuth App 开启 Device Flow。个人 Token 通过应用登录，不写入前端环境变量。

## 各平台入口

| 平台 | 开发 | 构建 | 指南 |
| --- | --- | --- | --- |
| 当前桌面 | `pnpm dev` | `pnpm build` | [本地开发](docs/DEVELOPMENT.md) |
| macOS | `pnpm dev:macos` | `pnpm build:macos` | [macOS](docs/macOS_DEVELOPMENT.md) |
| Windows | `pnpm dev:windows` | `pnpm build:windows` | [Windows](docs/WINDOWS_DEVELOPMENT.md) |
| Linux | `pnpm dev:linux` | `pnpm build:linux` | [Linux](docs/LINUX_DEVELOPMENT.md) |
| iOS | `pnpm dev:ios` | `pnpm build:ios` | [iOS](docs/iOS_DEVELOPMENT.md) |
| Android | `pnpm dev:android` | `pnpm build:android` | [Android](docs/ANDROID_DEVELOPMENT.md) |
| Web | `pnpm dev:web` | `pnpm build:web` | [Web](docs/WEB_DEVELOPMENT.md) |

移动端首次运行需先 `pnpm init:ios` / `pnpm init:android`。iOS 模拟器构建使用 `pnpm build:ios:simulator`。原生启动会自动启动或复用本工作区的前端服务，保留原有包级命令，如 `pnpm -F @gitpulse/app tauri:ios`。

`pnpm build` 只构建当前桌面平台。需要全部系统的安装包时，使用 [GitHub Actions 全平台打包](docs/GITHUB_ACTIONS.md)：手动选择平台或推送版本标签，在该次运行的 Artifacts 下载产物。工作流不会自动发布 Release 或上传商店；签名条件见打包文档。

## 开发检查

```bash
pnpm run doctor all
pnpm check
pnpm build:web
```

`doctor all` 报告当前主机可开发平台的缺失项；Android 等未安装的平台会返回非零状态，可改为只检查所需平台。注意使用 `pnpm run doctor`，以免调用 pnpm 自带的同名命令。

`check` 包含应用类型检查、单元/交互测试与本地、CI 脚本测试。原生系统能力和安装包仍需在目标系统验证。

## 项目结构

```text
gitpulse/
├── packages/
│   ├── app/                 React 前端、Tauri 原生应用、交互测试
│   └── core/                共享 API 接口和类型，直接导出 TypeScript 源码
├── scripts/
│   ├── dev/                 本地环境检查、启动、打包、清理
│   ├── ci/                  CI 签名配置、版本检查、产物收集
│   └── lib/                 平台脚本共享逻辑
├── docs/                    统一的开发与打包说明
├── .github/workflows/       全平台构建工作流
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

应用账号管理使用 `packages/app/src/services/auth` 的加密实现。共享库中的兼容 API 不代表应用当前的持久化方案，新页面通过应用的 GitHub 服务获取当前账号授权。

## 文档

- [本地开发总览](docs/DEVELOPMENT.md)：环境、命令、OAuth、输出目录与常见问题。
- [多端同步调试](docs/SYNC_DEVELOPMENT_WORKFLOW.md)：共用前端、热更新和原生构建。
- [GitHub Actions](docs/GITHUB_ACTIONS.md)：构建矩阵、签名变量与产物下载。
- [Monorepo 指南](MONOREPO_GUIDE.md)：包边界、依赖与共享源码。
- [应用说明](packages/app/README.md)、[Apple 平台快速开始](packages/app/QUICK_START_iOS_macOS.md)。
