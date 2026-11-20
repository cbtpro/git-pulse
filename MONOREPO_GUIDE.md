# Monorepo 开发指南

GitPulse 使用 pnpm workspaces，`packages/app` 是应用，`packages/core` 是共享 API 接口与类型库。平台工具安装、启动和打包以 [本地开发](docs/DEVELOPMENT.md) 为准。

## 安装与锁文件

在仓库根目录执行 `pnpm install --frozen-lockfile`。根 `package.json` 锁定 pnpm 10.34.9，`.nvmrc` 对齐 CI 的 Node.js 22。使用同一份 `pnpm-lock.yaml`，不在子包生成 npm / Yarn 锁文件。

添加依赖时明确作用范围：

```bash
pnpm -F @gitpulse/app add <运行时依赖>
pnpm -F @gitpulse/app add -D <开发依赖>
pnpm -F @gitpulse/core add <共享库依赖>
```

这些是命令模板，尖括号内容替换为实际包名。更新依赖后保留锁文件改动，并执行相关检查。

## 包边界

| 包 | 职责 | 入口 |
| --- | --- | --- |
| `@gitpulse/app` | React/Arco UI、实际账号授权与加密存储、GitHub 查询服务、Tauri 系统能力 | `packages/app/src`、`src-tauri` |
| `@gitpulse/core` | 通用 GitHub API 接口、类型和兼容实现 | `packages/core/src/index.ts` |

`app` 通过 `workspace:*` 依赖 `core`。共享库 `exports` 直接指向 TypeScript 源文件，应用构建时由 Vite 编译，不需要另启共享库编译服务。当前 `dev:core` / `build:core` 是保留的提示入口，不会产出独立发布包。

不要把 UI、系统密钥管理或当前账号状态放进通用类型库。应用的新请求应使用 `packages/app/src/services/github/GitHubService.ts` 等现有服务，以保持账号鉴权、缓存隔离、限流和错误提示一致。

## 常用命令

```bash
pnpm dev:web
pnpm dev:desktop
pnpm check
pnpm build:web
pnpm build:desktop
pnpm -F @gitpulse/app type-check
pnpm -F @gitpulse/core type-check
```

`pnpm dev` 等同于 `dev:desktop`，不会并行启动所有平台。`pnpm build` 等同于 `build:desktop`，不会跨系统构建；全平台产物由 [Actions](docs/GITHUB_ACTIONS.md) 的矩阵任务产生。

仅修改共享类型也需检查应用的编译结果。前端测试在 `packages/app/tests`；平台脚本测试在 `scripts/dev` 与 `scripts/ci`。测试使用模拟账号，不能把真实 Token 写进测试或日志。

## 文档维护

平台开发指南只维护在根目录 `docs`，包内旧入口保留为链接，避免多份说明失去同步。新增平台参数时同步更新脚本、脚本测试、平台矩阵与 Actions；新增页面文案时同步四种语言。
