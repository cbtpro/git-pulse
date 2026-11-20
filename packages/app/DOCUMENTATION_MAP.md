# 📚 GitPulse 文档导航地图

## 🎯 快速导航

### 👤 我是新开发者，从哪里开始？
1. **[START_HERE.md](./START_HERE.md)** ← 👈 从这里开始！
   - 项目概述
   - 核心架构
   - 技术栈说明
   - 开发流程

2. **[QUICK_START_iOS_macOS.md](./QUICK_START_iOS_macOS.md)**
   - iOS 快速开始
   - macOS 快速开始
   - 常用命令

3. **[PLATFORM_SUMMARY.md](./PLATFORM_SUMMARY.md)**
   - iOS 平台特性
   - macOS 平台特性
   - Web 平台特性

---

### 🚀 我想立即开始开发

#### iOS 开发
```bash
1. 阅读: QUICK_START_iOS_macOS.md > iOS 部分
2. 执行: cd src-tauri/gen/apple && pod install && cd ../../../
3. 运行: pnpm tauri ios dev
4. 参考: docs/PLATFORM_NOTES.md
```

#### macOS 开发
```bash
1. 阅读: QUICK_START_iOS_macOS.md > macOS 部分
2. 执行: pnpm dev
3. 构建: pnpm build
4. 参考: docs/PLATFORM_NOTES.md
```

#### Web/本地开发
```bash
1. 阅读: START_HERE.md > 技术栈部分
2. 执行: pnpm install && pnpm dev
3. 访问: http://localhost:5173
```

---

### 🔗 我需要集成 GitHub API

1. **[docs/GITHUB_API_REFERENCE.md](./docs/GITHUB_API_REFERENCE.md)**
   - 完整的 GitHub REST API 参考
   - 36 个端点的详细说明
   - 请求和响应示例

2. **[docs/API_ARCHITECTURE.md](./docs/API_ARCHITECTURE.md)**
   - API 层设计模式
   - ApiFactory 工厂模式
   - DirectGitHubApi vs BackendProxyApi

3. **[docs/AUTHENTICATION_GUIDE.md](./docs/AUTHENTICATION_GUIDE.md)**
   - GitHub Token 获取
   - TokenManager 使用
   - 认证流程

---

### 🏗️ 我需要了解项目架构

#### 整体架构
- **[START_HERE.md](./START_HERE.md)** > 项目架构
- **[PLATFORM_SUMMARY.md](./PLATFORM_SUMMARY.md)** > 架构概览
- **[.azure/project-plan.md](./.azure/project-plan.md)** > 详细规划

#### 源代码结构
- **[docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)** > 完整结构说明
- **[docs/API_ARCHITECTURE.md](./docs/API_ARCHITECTURE.md)** > API 层架构

#### 构建和部署
- **[docs/BUILD_DISTRIBUTION.md](./docs/BUILD_DISTRIBUTION.md)** > 构建指南
- **[MIGRATION.md](./MIGRATION.md)** > Tauri 迁移细节

---

### 📝 我需要了解迁移内容

1. **[MIGRATION.md](./MIGRATION.md)**
   - pnpm 包管理器迁移
   - Tauri 2.12.0 升级
   - 配置文件更新
   - 依赖变化

2. **[COMPLETION_REPORT.md](./COMPLETION_REPORT.md)**
   - 迁移完成情况
   - 验证结果
   - 交付清单

---

### 🧪 我需要了解测试

- **[docs/TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md)**
  - 测试策略
  - 测试框架
  - 测试用例

---

### 🔄 我需要了解跨平台开发

- **[docs/SYNC_DEVELOPMENT_WORKFLOW.md](./docs/SYNC_DEVELOPMENT_WORKFLOW.md)**
  - 跨平台开发流程
  - 代码共享策略
  - 平台差异处理

---

### ⚙️ 我需要常用命令速查

- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)**
  - 完整命令列表
  - 开发命令
  - 构建命令
  - 诊断命令

---

### 📊 我需要了解项目状态

- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)**
  - 当前开发状态
  - 完成的功能
  - 计划中的功能
  - 已知问题

---

### 🆘 我遇到了问题

#### 常见问题排查
1. 查看 **[QUICK_START_iOS_macOS.md](./QUICK_START_iOS_macOS.md)** > 故障排除
2. 查看 **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** > 已知问题
3. 运行诊断：`pnpm tauri info`

#### 问题类型速查

**构建失败**
- → [COMPLETION_REPORT.md](./COMPLETION_REPORT.md) > 编译验证
- → [MIGRATION.md](./MIGRATION.md) > 配置问题

**iOS 问题**
- → [QUICK_START_iOS_macOS.md](./QUICK_START_iOS_macOS.md) > iOS 故障排除
- → [docs/PLATFORM_NOTES.md](./docs/PLATFORM_NOTES.md) > iOS 特性

**macOS 问题**
- → [QUICK_START_iOS_macOS.md](./QUICK_START_iOS_macOS.md) > macOS 故障排除
- → [docs/PLATFORM_NOTES.md](./docs/PLATFORM_NOTES.md) > macOS 特性

**API 问题**
- → [docs/GITHUB_API_REFERENCE.md](./docs/GITHUB_API_REFERENCE.md) > API 参考
- → [docs/API_ARCHITECTURE.md](./docs/API_ARCHITECTURE.md) > API 层

**依赖问题**
- → [MIGRATION.md](./MIGRATION.md) > pnpm 和依赖
- → 运行: `pnpm store prune && pnpm install`

---

## 📚 完整文档清单

### 核心文档（根目录）

| 文档 | 用途 | 阅读对象 |
|------|------|---------|
| **START_HERE.md** | 项目总体介绍 | 👥 新开发者 |
| **QUICK_START_iOS_macOS.md** | iOS/macOS 快速开始 | 📱 移动开发者 |
| **COMPLETION_REPORT.md** | 项目完成报告 | 📊 项目管理者 |
| **MIGRATION.md** | Tauri 迁移细节 | 🔧 技术主管 |
| **PLATFORM_SUMMARY.md** | 平台支持概述 | 🌐 跨平台开发者 |
| **PROJECT_STATUS.md** | 项目状态 | 📈 团队成员 |
| **QUICK_REFERENCE.md** | 命令速查表 | ⚡ 日常开发 |
| **README.md** | 项目概述 | 📄 文档 |
| **NEXT_STEPS.md** | 后续开发步骤 | 🚀 项目规划 |
| **DOCUMENTATION_MAP.md** | 文档导航（本文件） | 🗺️ 文档导航 |

### 技术文档（docs/）

| 文档 | 用途 |
|------|------|
| **API_ARCHITECTURE.md** | API 层架构设计 |
| **GITHUB_API_REFERENCE.md** | GitHub API 完整参考（36 个端点） |
| **PLATFORM_NOTES.md** | 各平台（iOS/macOS/Web）特性说明 |
| **PROJECT_STRUCTURE.md** | 项目目录结构详解 |
| **SYNC_DEVELOPMENT_WORKFLOW.md** | 跨平台同步开发工作流 |
| **TESTING_STRATEGY.md** | 测试策略 |
| **AUTHENTICATION_GUIDE.md** | GitHub 认证实现指南 |
| **BUILD_DISTRIBUTION.md** | 构建和分发指南 |

### 配置文件

| 文件 | 用途 |
|------|------|
| **package.json** | pnpm + npm scripts + 依赖 |
| **tsconfig.json** | TypeScript 配置 |
| **vite.config.ts** | Vite 构建配置 |
| **src-tauri/tauri.conf.json** | Tauri 应用配置 |
| **.env.example** | 环境变量模板 |

### 交付清单

| 文件 | 用途 |
|------|------|
| **PROJECT_DELIVERABLES.txt** | 完整交付清单 |

---

## 🎯 按角色分类

### 👨‍💻 前端开发者

**必读:**
1. START_HERE.md
2. QUICK_START_iOS_macOS.md
3. QUICK_REFERENCE.md

**参考:**
- docs/PROJECT_STRUCTURE.md
- docs/PLATFORM_NOTES.md

### 🍎 iOS 开发者

**必读:**
1. QUICK_START_iOS_macOS.md > iOS 部分
2. docs/PLATFORM_NOTES.md > iOS

**参考:**
- START_HERE.md
- PLATFORM_SUMMARY.md
- QUICK_REFERENCE.md

### 🖥️ macOS 开发者

**必读:**
1. QUICK_START_iOS_macOS.md > macOS 部分
2. docs/PLATFORM_NOTES.md > macOS

**参考:**
- START_HERE.md
- PLATFORM_SUMMARY.md
- QUICK_REFERENCE.md

### 🔌 API 集成开发者

**必读:**
1. docs/GITHUB_API_REFERENCE.md
2. docs/API_ARCHITECTURE.md

**参考:**
- docs/AUTHENTICATION_GUIDE.md
- START_HERE.md

### 🔧 DevOps / 构建工程师

**必读:**
1. MIGRATION.md
2. docs/BUILD_DISTRIBUTION.md
3. QUICK_REFERENCE.md

**参考:**
- PLATFORM_SUMMARY.md
- PROJECT_STATUS.md

### 🎓 项目经理 / 技术主管

**必读:**
1. START_HERE.md
2. COMPLETION_REPORT.md
3. PROJECT_STATUS.md

**参考:**
- PLATFORM_SUMMARY.md
- .azure/project-plan.md

---

## 🔍 按学习路径分类

### 初级 (1-2 天)
1. START_HERE.md - 了解项目
2. QUICK_START_iOS_macOS.md - 快速上手
3. QUICK_REFERENCE.md - 常用命令

### 中级 (1-2 周)
1. docs/PROJECT_STRUCTURE.md - 源代码结构
2. docs/API_ARCHITECTURE.md - API 设计
3. docs/PLATFORM_NOTES.md - 平台差异
4. docs/SYNC_DEVELOPMENT_WORKFLOW.md - 跨平台开发

### 高级 (2-4 周)
1. docs/GITHUB_API_REFERENCE.md - API 深度
2. docs/TESTING_STRATEGY.md - 测试策略
3. docs/BUILD_DISTRIBUTION.md - 构建发布
4. MIGRATION.md - 技术细节

---

## 📱 按平台分类

### iOS 开发
- QUICK_START_iOS_macOS.md > iOS 部分
- docs/PLATFORM_NOTES.md > iOS
- docs/SYNC_DEVELOPMENT_WORKFLOW.md

### macOS 开发
- QUICK_START_iOS_macOS.md > macOS 部分
- docs/PLATFORM_NOTES.md > macOS
- docs/SYNC_DEVELOPMENT_WORKFLOW.md

### Web 开发
- START_HERE.md
- docs/PROJECT_STRUCTURE.md
- QUICK_REFERENCE.md

### 跨平台
- docs/SYNC_DEVELOPMENT_WORKFLOW.md
- docs/API_ARCHITECTURE.md
- PLATFORM_SUMMARY.md

---

## ⚡ 快速查找

### 我想知道...

**如何启动开发？**
→ QUICK_START_iOS_macOS.md > 快速开始

**如何构建应用？**
→ QUICK_REFERENCE.md > 构建命令

**GitHub API 怎么用？**
→ docs/GITHUB_API_REFERENCE.md

**如何处理认证？**
→ docs/AUTHENTICATION_GUIDE.md

**项目结构是什么？**
→ docs/PROJECT_STRUCTURE.md

**怎么跨平台开发？**
→ docs/SYNC_DEVELOPMENT_WORKFLOW.md

**出现问题怎么办？**
→ QUICK_START_iOS_macOS.md > 故障排除

**项目的下一步是什么？**
→ NEXT_STEPS.md

**有什么改进的地方吗？**
→ PROJECT_STATUS.md > 计划中的功能

---

## 🎓 推荐阅读路径

### 路径 1: 快速上手（30 分钟）
1. START_HERE.md（10 分钟）
2. QUICK_START_iOS_macOS.md（15 分钟）
3. QUICK_REFERENCE.md（5 分钟）

### 路径 2: 完整理解（2-3 小时）
1. START_HERE.md（15 分钟）
2. docs/PROJECT_STRUCTURE.md（30 分钟）
3. docs/API_ARCHITECTURE.md（30 分钟）
4. PLATFORM_SUMMARY.md（15 分钟）
5. docs/SYNC_DEVELOPMENT_WORKFLOW.md（30 分钟）
6. QUICK_START_iOS_macOS.md（15 分钟）

### 路径 3: 深度学习（6-8 小时）
- 完整理解路径（上面的所有）
- docs/GITHUB_API_REFERENCE.md（1 小时）
- docs/API_ARCHITECTURE.md（30 分钟）
- docs/TESTING_STRATEGY.md（30 分钟）
- docs/BUILD_DISTRIBUTION.md（30 分钟）
- MIGRATION.md（45 分钟）

---

## 💡 提示

- 🔖 **Markdown 预览**: 在 VS Code 中按 `Cmd+Shift+V` 预览
- 🔍 **全局搜索**: 在项目中使用 `Cmd+Shift+F` 搜索
- 📌 **书签**: 为常用文档添加书签
- 🔗 **链接**: 文档中的链接可以直接点击导航

---

**Happy Reading! 📚**

---

*Last Updated: 2024-11-19*
