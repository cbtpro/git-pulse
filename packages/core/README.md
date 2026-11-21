# 已停用的 core 包

此目录仅保留历史文档入口，不再是 pnpm 工作区或可导入的包。旧 API/Token 实现没有被应用使用，且与现有鉴权、加密存储和多账号策略分叉，已移除。

当前唯一实现位于 `packages/app/src/services/github`、`packages/app/src/services/auth` 与 `packages/app/src/types`；原生能力位于 `packages/app/src-tauri`。新功能应复用这些入口。

开发与架构边界参见 [工作区指南](../../MONOREPO_GUIDE.md) 和 [开发文档](../../docs/DEVELOPMENT.md)。不要重新引入明文 localStorage Token 管理器。
