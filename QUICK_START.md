# 🚀 GitPulse Monorepo 快速参考

## 项目信息

- **名称**: GitPulse
- **类型**: Tauri + React + TypeScript + pnpm Monorepo
- **版本**: 0.2.0
- **位置**: `/Volumes/WD_BLACK/github/gitpulse`
- **更新**: 2026-11-19

---

## 📦 包结构

```
packages/
├── core/      ← 核心库 (@gitpulse/core)
│   ├── API 层、认证、类型定义
│   └── 36+ GitHub API 类型
│
└── app/       ← Tauri 应用 (@gitpulse/app)
    ├── React UI、Tauri Rust 后端
    └── 支持 macOS、iOS、Windows、Linux、Android
```

---

## ⚡ 常用命令速查表

| 命令 | 功能 | 范围 |
|------|------|------|
| `pnpm install` | 安装所有依赖 | 全部 |
| `pnpm dev` | 启动所有开发服务器 | 全部 |
| `pnpm dev:core` | 只启动核心库 | core |
| `pnpm dev:app` | 只启动应用 | app |
| `pnpm build` | 构建所有包 | 全部 |
| `pnpm build:core` | 构建核心库 | core |
| `pnpm build:app` | 构建应用 | app |
| `pnpm type-check` | 类型检查 | 全部 |
| `pnpm lint` | 代码审查 | 全部 |
| `pnpm clean` | 清除构建文件 | 全部 |
| `pnpm -F @gitpulse/core add <pkg>` | 添加依赖到 core | core |
| `pnpm -F @gitpulse/app add <pkg>` | 添加依赖到 app | app |

---

## 🎯 快速开发流程

### 1️⃣ 修改核心库 (API/类型)

```bash
# 编辑文件
# packages/core/src/services/api/DirectGitHubApi.ts
# packages/core/src/types/github.ts

# 验证
pnpm type-check

# 应用自动获得新的类型
# packages/app/src/App.tsx (TypeScript 会自动检测)
```

### 2️⃣ 修改应用 (UI/交互)

```bash
# 编辑文件
# packages/app/src/App.tsx
# packages/app/src/components/*

# 应用自动重新加载 (HMR)
# 访问 http://localhost:5173
```

### 3️⃣ 添加新的 API 端点

```bash
# 1. 添加类型
# packages/core/src/types/github.ts
#   export interface NewAPI { ... }

# 2. 实现 API
# packages/core/src/services/api/implementations/DirectGitHubApi.ts
#   async getNewAPI(...) { ... }

# 3. 更新接口
# packages/core/src/services/api/interfaces/GitHubApiClient.ts
#   getNewAPI(...): Promise<NewAPI>;

# 4. 应用中使用
# packages/app/src/App.tsx
#   const result = await api.getNewAPI(...);

# 5. 验证
pnpm type-check
```

---

## 📚 重要文件

### 根目录
- `README.md` - 项目概览
- `MONOREPO_GUIDE.md` - 详细指南
- `QUICK_START.md` - 本文件
- `package.json` - Monorepo 配置
- `pnpm-workspace.yaml` - 工作区配置

### Core 包 (`packages/core/`)
- `src/services/api/index.ts` - API 工厂
- `src/services/api/interfaces/GitHubApiClient.ts` - API 接口
- `src/services/api/implementations/DirectGitHubApi.ts` - GitHub API 实现
- `src/services/api/implementations/BackendProxyApi.ts` - 代理实现
- `src/services/auth/TokenManager.ts` - Token 管理
- `src/types/github.ts` - GitHub 类型定义
- `src/index.ts` - 包导出
- `docs/GITHUB_API.md` - API 文档
- `docs/ARCHITECTURE.md` - 架构设计

### App 包 (`packages/app/`)
- `src/App.tsx` - 主应用组件
- `src/main.tsx` - React 入口
- `src-tauri/src/main.rs` - Rust 后端入口
- `src-tauri/tauri.conf.json` - Tauri 配置
- `vite.config.ts` - Vite 构建配置
- `tsconfig.json` - TypeScript 配置

---

## 🔧 Platform 特定命令

### iOS 开发
```bash
cd packages/app

# 在 iOS 模拟器中开发
pnpm run tauri:ios

# 构建 iOS 应用
pnpm run tauri:ios:build
```

### macOS 开发
```bash
cd packages/app

# 在 macOS 中开发
pnpm run tauri:macos

# 构建 macOS DMG
pnpm run tauri:macos:build
```

### Web 预览
```bash
cd packages/app

# 预览生产版本
pnpm preview

# 访问 http://localhost:4173
```

---

## 💡 常见问题

### Q: 在哪里修改 API?
**A**: `packages/core/src/services/api/`
- 修改 `DirectGitHubApi.ts` - 添加新的 API 调用
- 修改 `GitHubApiClient.ts` - 更新接口定义

### Q: 在哪里修改 UI?
**A**: `packages/app/src/`
- 修改 `App.tsx` - 主应用组件
- 添加 `components/` - 新的 React 组件
- 修改 `App.css` - 样式

### Q: 如何添加新的依赖?
**A**: 
```bash
# 在核心库中
pnpm -F @gitpulse/core add package-name

# 在应用中
pnpm -F @gitpulse/app add package-name
```

### Q: 我修改了核心库，为什么应用看不到变化?
**A**: 
```bash
# 重启开发服务器或刷新浏览器
# Cmd+Shift+R (macOS) 或 Ctrl+Shift+R (Windows/Linux)
```

### Q: 如何在包之间共享类型?
**A**: 在 `packages/core/src/types/github.ts` 中定义，然后在应用中导入：
```typescript
import type { User, Repository } from '@gitpulse/core';
```

---

## 📊 目录结构总览

```
gitpulse/ (项目根目录)
│
├── 📄 package.json              ← Monorepo 配置 (pnpm workspaces)
├── 📄 pnpm-workspace.yaml       ← 工作区配置
├── 📄 pnpm-lock.yaml            ← 依赖锁文件
│
├── 📂 packages/
│   ├── core/                    ← GitHub API 层
│   │   ├── src/
│   │   │   ├── services/        ← API 和认证
│   │   │   ├── types/           ← GitHub 类型
│   │   │   └── index.ts         ← 包导出
│   │   ├── docs/                ← 文档
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── app/                     ← Tauri 应用
│       ├── src/                 ← React 源码
│       ├── src-tauri/           ← Rust 后端
│       ├── public/              ← 静态资源
│       ├── package.json
│       └── README.md
│
├── 📂 docs/                     ← 项目文档
│   ├── GITHUB_API.md
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT.md
│
├── 📄 README.md                 ← 项目概览
├── 📄 MONOREPO_GUIDE.md         ← 详细指南
└── 📄 QUICK_START.md            ← 本文件
```

---

## 🚀 开始开发

```bash
# 1. 进入项目目录
cd /Volumes/WD_BLACK/github/gitpulse

# 2. 安装依赖 (第一次)
pnpm install

# 3. 启动开发
pnpm dev

# 4. 在浏览器中访问
# http://localhost:5173

# 5. 阅读详细指南
cat MONOREPO_GUIDE.md
```

---

## 📖 文档导航

- **新手入门**: 本文件 (QUICK_START.md)
- **详细指南**: [MONOREPO_GUIDE.md](./MONOREPO_GUIDE.md)
- **项目概览**: [README.md](./README.md)
- **API 参考**: [packages/core/docs/GITHUB_API.md](./packages/core/docs/GITHUB_API.md)
- **架构设计**: [packages/core/docs/ARCHITECTURE.md](./packages/core/docs/ARCHITECTURE.md)
- **核心库**: [packages/core/README.md](./packages/core/README.md)
- **应用指南**: [packages/app/README.md](./packages/app/README.md)
- **iOS/macOS**: [packages/app/QUICK_START_iOS_macOS.md](./packages/app/QUICK_START_iOS_macOS.md)

---

## ✨ Monorepo 转换对比

### 转换前
- ❌ 所有代码在 `src/` 中混在一起
- ❌ 难以重用核心库
- ❌ 依赖关系不清晰

### 转换后
- ✅ 核心库 (`@gitpulse/core`) 独立且可重用
- ✅ 应用 (`@gitpulse/app`) 专注于 UI/交互
- ✅ 清晰的依赖关系和分工
- ✅ 支持独立发布和版本管理
- ✅ 更好的 TypeScript 支持和类型安全

---

## 📋 检查清单

启动开发前：

- [ ] Node.js >= 20.0.0 已安装 (`node --version`)
- [ ] pnpm >= 10.0.0 已安装 (`pnpm --version`)
- [ ] 项目已克隆或下载
- [ ] 运行过 `pnpm install`
- [ ] 运行过 `pnpm type-check` (通过)
- [ ] 阅读过 README.md

---

## 🆘 需要帮助?

1. **快速问题**: 查看本文件的"常见问题"部分
2. **详细文档**: 阅读 [MONOREPO_GUIDE.md](./MONOREPO_GUIDE.md)
3. **包特定**: 查看 `packages/*/README.md`
4. **API 参考**: 查看 `packages/core/docs/GITHUB_API.md`

---

**版本**: 0.2.0  
**更新**: 2026-11-19  
**作者**: GitPulse Team
