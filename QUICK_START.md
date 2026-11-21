# 快速开始

当前有效工作区为 `@gitpulse/app`；旧 core 包及提示性构建命令已停用。

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm dev:web
```

使用 Node.js 22 和 pnpm 10.34.9。原生应用启动、平台依赖、OAuth 配置、签名及真机安装请按 [本地开发](docs/DEVELOPMENT.md) 操作。模块边界见 [工作区指南](MONOREPO_GUIDE.md)。

```bash
pnpm dev:desktop
pnpm dev:ios
pnpm dev:android
pnpm build:web
```

只运行当前需要的平台。`pnpm build` 打包当前桌面系统；全平台打包通过 [GitHub Actions](docs/GITHUB_ACTIONS.md) 运行，不在本机跨系统构建。
