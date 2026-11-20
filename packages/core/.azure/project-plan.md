# GitPulse - GitHub 管理工具项目规划

## 项目概述

**项目名称**: GitPulse  
**描述**: 一个跨平台的 GitHub 管理工具，用于浏览和管理 GitHub 个人资料、仓库和活动  
**技术栈**: Tauri + React + TypeScript  
**目标平台**: iOS (首选), Android, Windows, Mac, Linux  
**预计开始**: 2026-11-19

---

## 核心功能需求

### 1. GitHub Profile 页面（MVP - 最小可行产品）

#### 1.1 用户信息展示
- [x] 用户头像
- [x] 用户昵称（@username）
- [x] 用户简介/Bio
- [x] 位置、公司、网址等基本信息
- [x] GitHub 资料链接

#### 1.2 用户统计信息
- [x] 仓库数量
- [x] Stars 总数
- [x] Followers / Following 数量
- [x] 公开贡献数

#### 1.3 用户仓库列表
- [x] 显示用户的公开仓库
- [x] 仓库卡片：名称、描述、语言、Stars、Forks
- [x] 按 Stars/Updated 排序
- [x] 分页加载

#### 1.4 置顶仓库 (Pinned Repos)
- [x] 显示用户置顶的仓库（如果有）
- [x] 优先展示

#### 1.5 Followers / Following 列表
- [x] 显示用户的 Followers
- [x] 显示用户正在关注的用户
- [x] 用户卡片：头像、昵称、简介

#### 1.6 贡献活动图
- [x] GitHub 风格的贡献热力图
- [x] 显示过去 1 年的贡献

#### 1.7 最近活动流 (Activity Feed)
- [x] 显示用户最近的 Git 活动
- [x] 包括：Commits, PRs, Issues, Stars 等
- [x] 时间排序

---

## 认证与授权方案

支持多种认证方式，确保灵活性：

### 方案 1: 手动输入 GitHub Token
- 用户手动生成 Personal Access Token
- 粘贴到应用中
- 适合快速体验和调试

### 方案 2: OAuth Desktop Flow
- Tauri 应用内浏览器打开 GitHub OAuth 授权页面
- 用户授权后自动获取 Token
- 更友好的用户体验

### 方案 3: 用户名 + Token 组合
- 输入用户名和 Token
- 用于 API 调用的 Basic Auth

**设计原则**: 代码架构需要设计成认证模块可以轻松替换，支持添加新的认证方式而无需修改核心代码。

---

## 技术架构设计

### 分层架构

```
┌─────────────────────────────────────────┐
│          Tauri UI (React + TS)          │
│  - Profile 页面组件                      │
│  - 用户认证 UI                           │
│  - 状态管理 (Context API / Redux)        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      API Abstraction Layer              │
│  - GitHubApiClient (Interface)          │
│  - 支持多个实现:                        │
│    - DirectGitHubApi (直接调用)         │
│    - BackendProxyApi (通过后端)         │
│    - MockApi (用于测试)                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   具体实现 (可插拔)                      │
│  - GitHub REST API (直接)                │
│  - GitHub GraphQL API                   │
│  - Backend API (未来扩展)                │
└─────────────────────────────────────────┘
```

### 目录结构

```
gitpulse/
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs              # 应用入口
│   │   ├── auth.rs              # OAuth 处理
│   │   └── lib.rs
│   └── Cargo.toml
├── src/                          # React 前端
│   ├── components/
│   │   ├── Profile/
│   │   │   ├── ProfileHeader.tsx # 用户信息头部
│   │   │   ├── StatisticCard.tsx # 统计信息卡片
│   │   │   ├── RepositoryList.tsx# 仓库列表
│   │   │   ├── PinnedRepos.tsx   # 置顶仓库
│   │   │   ├── FollowersList.tsx # Followers 列表
│   │   │   ├── FollowingList.tsx # Following 列表
│   │   │   ├── ContributionGraph.tsx # 贡献图
│   │   │   └── ActivityFeed.tsx  # 活动流
│   │   ├── Auth/
│   │   │   ├── LoginForm.tsx     # 登录表单
│   │   │   ├── OAuthCallback.tsx # OAuth 回调
│   │   │   └── TokenInput.tsx    # Token 输入
│   │   └── Common/
│   │       ├── Header.tsx
│   │       ├── Loading.tsx
│   │       └── ErrorBoundary.tsx
│   ├── pages/
│   │   ├── ProfilePage.tsx       # Profile 页面
│   │   └── LoginPage.tsx
│   ├── services/
│   │   ├── api/
│   │   │   ├── interfaces/
│   │   │   │   └── GitHubApiClient.ts    # 接口定义
│   │   │   ├── implementations/
│   │   │   │   ├── DirectGitHubApi.ts    # 直接调用 GitHub API
│   │   │   │   ├── BackendProxyApi.ts    # 通过后端代理
│   │   │   │   └── MockApi.ts            # Mock 数据
│   │   │   └── index.ts
│   │   ├── auth/
│   │   │   ├── AuthService.ts    # 认证业务逻辑
│   │   │   ├── TokenManager.ts   # Token 管理
│   │   │   └── OAuthFlow.ts      # OAuth 流程
│   │   └── storage/
│   │       └── LocalStorage.ts   # 本地存储
│   ├── hooks/
│   │   ├── useAuth.ts            # 认证 Hook
│   │   ├── useProfile.ts         # Profile 数据 Hook
│   │   └── useApi.ts             # API 调用 Hook
│   ├── types/
│   │   └── github.ts             # GitHub 类型定义
│   ├── utils/
│   │   ├── http.ts               # HTTP 客户端
│   │   └── formatters.ts         # 数据格式化
│   ├── App.tsx                   # 应用入口
│   └── index.tsx
├── docs/
│   ├── GITHUB_API.md             # GitHub API 文档
│   ├── ARCHITECTURE.md           # 架构文档
│   └── DEVELOPMENT.md            # 开发指南
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tauri.conf.json               # Tauri 配置
```

---

## 技术选型说明

### 前端框架
- **React** + **TypeScript**: 类型安全，组件化开发
- **Vite**: 快速开发工具
- **Tailwind CSS** 或 **Material UI**: UI 组件库
- **Redux Toolkit** (可选): 状态管理

### 后端
- **Tauri**: 使用 Rust 后端处理 OAuth、文件存储等

### API 通信
- **Fetch API** 或 **axios**: HTTP 客户端
- 实现适配器模式，支持多种 API 源

### 跨平台
- **Tauri**: 支持 iOS、Android、Windows、Mac、Linux
- **Capacitor** (备选): 如果 Tauri 对某些平台支持不足

---

## 开发阶段

### 第 1 阶段: 项目初始化和认证 (1-2 周)
- [ ] 初始化 Tauri + React + TypeScript 项目
- [ ] 设计 API 抽象层接口
- [ ] 实现认证服务（Token 输入、OAuth）
- [ ] 设置本地存储

### 第 2 阶段: Profile 页面 MVP (2-3 周)
- [ ] 实现用户信息展示
- [ ] 实现统计信息卡片
- [ ] 实现仓库列表
- [ ] 实现基本的置顶仓库显示

### 第 3 阶段: 高级特性 (2-3 周)
- [ ] 贡献活动图
- [ ] Followers / Following 列表
- [ ] 活动流
- [ ] 分页和无限滚动

### 第 4 阶段: 优化和测试 (1-2 周)
- [ ] 性能优化
- [ ] 错误处理和用户提示
- [ ] 单元测试 / 集成测试

### 第 5 阶段: 跨平台构建 (1-2 周)
- [ ] iOS 构建和测试
- [ ] Android 构建和测试
- [ ] Desktop (Windows/Mac/Linux) 构建

---

## 核心设计原则

### 1. 可插拔的 API 层
创建 `GitHubApiClient` 接口，支持多个实现：
```typescript
interface GitHubApiClient {
  getUser(username: string): Promise<User>;
  getUserRepos(username: string): Promise<Repository[]>;
  // ... 其他方法
}

// 实现 1: 直接调用 GitHub API
class DirectGitHubApi implements GitHubApiClient { ... }

// 实现 2: 通过后端代理
class BackendProxyApi implements GitHubApiClient { ... }

// 在应用初始化时选择实现
const apiClient = new DirectGitHubApi(); // 或 BackendProxyApi
```

### 2. 认证灵活性
支持多种认证方式，统一通过 `AuthService` 管理

### 3. 状态管理清晰
使用 Context API 或 Redux，清晰的数据流

### 4. 错误处理健壮
统一的错误处理和用户提示

---

## 依赖项清单

### 前端
- react, react-dom
- typescript
- vite
- tauri (@tauri-apps/api)
- axios 或 fetch-wrapper
- react-router-dom (用于多页面)
- tailwindcss 或 @mui/material
- zustand 或 redux-toolkit (状态管理)

### 后端 (Tauri)
- tauri (核心框架)
- tokio (异步运行时)
- serde (序列化/反序列化)

### 开发工具
- @tauri-apps/cli
- typescript
- eslint
- prettier

---

## 下一步行动

1. **初始化项目**: 使用 Tauri CLI 创建项目
2. **设置开发环境**: 配置 Node.js, Rust, iOS/Android SDK
3. **创建基础架构**: 实现 API 层、认证服务
4. **开发 Profile 页面**: 从最简单的用户信息开始
5. **测试和迭代**: 在各个平台上测试

---

## 参考资源

- [Tauri 官方文档](https://tauri.app/)
- [GitHub API 文档](https://docs.github.com/en/rest)
- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
