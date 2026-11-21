# 工作区开发指南

GitPulse 使用 pnpm workspaces，当前唯一有效包为 `packages/app`。原 `@gitpulse/core` 没有实际调用者，与现有鉴权实现分叉，已停用；旧 API 和明文 Token 实现已移除。目录内文档只保留历史迁移入口，不是公共 SDK。

## 安装与依赖

在根目录执行 `pnpm install --frozen-lockfile`。使用 Node.js 22、pnpm 10.34.9 和唯一的 `pnpm-lock.yaml`。新增应用依赖运行 `pnpm -F @gitpulse/app add <包名>`，开发依赖添加 `-D`；不要在子目录生成其他锁文件。

## 当前模块边界

| 位置 | 职责 |
| --- | --- |
| `packages/app/src/pages`、`components` | 页面、交互、页面实例保留 |
| `packages/app/src/services/github` | 唯一 GitHub REST/GraphQL 请求与业务服务 |
| `packages/app/src/services/auth` | 多账号授权、加密会话、离线存储 |
| `packages/app/src/types` | 应用共享类型 |
| `packages/app/src-tauri` | 系统存储、原生 OAuth/下载、系统导航与小组件桥接 |
| `scripts/dev`、`scripts/ci` | 本地平台检查、构建与发布编排 |

新请求复用 `GitHubService.ts` 的鉴权、限流与缓存策略。未来只有第二个实际消费者出现时才提取平台无关契约，凭证存储和当前账号状态通过适配器注入，不能恢复第二套 Token 管理器。

## 检查与开发

```bash
pnpm dev:web
pnpm check
pnpm build:web
pnpm dev:desktop
```

`pnpm check` 递归检查所有有效包的 TypeScript、ESLint、测试，并执行平台脚本测试。ESLint 使用 TypeScript 解析器和推荐规则；仅为显式动态载荷、带副作用的三元表达式以及循环退出控制保留局部语言策略。新增工作区应提供对应检查脚本。

日常 PR/push 由 `.github/workflows/check.yml` 检查；全平台发行由 `build.yml` 打包。详细命令见 [本地开发](docs/DEVELOPMENT.md)，平台与签名见 [Actions](docs/GITHUB_ACTIONS.md)。测试只使用虚拟凭证。平台文档统一维护在根 `docs`，历史迁移报告不作为当前实施依据。
