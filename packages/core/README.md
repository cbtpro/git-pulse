# @gitpulse/core

GitPulse 核心库 - 提供 GitHub API 层和类型定义

## 📦 功能

- **GitHub API 客户端** - 统一的 GitHub API 接口抽象
- **API 实现** - 直接 GitHub API 和后端代理实现
- **认证管理** - Token 保存、读取和清除
- **完整的 TypeScript 类型** - 36+ GitHub API 端点的类型定义

## 🚀 使用

### 导入 API 客户端

```typescript
import { ApiFactory } from '@gitpulse/core';

// 获取 API 客户端实例
const api = ApiFactory.getClient();

// 获取用户信息
const user = await api.getUser('username');
```

### 导入类型定义

```typescript
import type { User, Repository, PullRequest } from '@gitpulse/core';
```

### 管理认证 Token

```typescript
import { TokenManager } from '@gitpulse/core';

// 保存 Token
TokenManager.setToken('your-github-token');

// 读取 Token
const token = TokenManager.getToken();

// 清除 Token
TokenManager.clearToken();
```

## 📚 导出

### API

- `GitHubApiClient` - API 客户端接口
- `DirectGitHubApi` - 直接 GitHub API 实现
- `BackendProxyApi` - 后端代理实现
- `ApiFactory` - API 工厂（推荐使用）

### 认证

- `TokenManager` - Token 管理工具

### 类型

- `User` - GitHub 用户
- `Repository` - 仓库
- `PullRequest` - Pull Request
- `Issue` - Issue
- `Commit` - Commit
- 以及 36+ 其他 API 类型

## 🏗️ 架构

核心库采用工厂模式实现 API 客户端的灵活切换：

```
┌─────────────────────────────────────┐
│   GitHubApiClient (Interface)       │
└─────────────────────────────────────┘
              ▲
              │
     ┌────────┴────────┐
     │                 │
┌──────────────┐  ┌──────────────┐
│ DirectAPI    │  │ BackendAPI   │
│ (GitHub)     │  │ (Proxy)      │
└──────────────┘  └──────────────┘
     ▲                 ▲
     └────────┬────────┘
          ApiFactory
```

## 🔧 配置

### 设置 API 实现

```typescript
// 使用直接 GitHub API (默认)
ApiFactory.setImplementation('direct');

// 使用后端代理
ApiFactory.setImplementation('backend');

// 使用 Mock 数据 (测试)
ApiFactory.setImplementation('mock');
```

## 🧪 测试

```bash
# 类型检查
pnpm type-check

# 代码审查
pnpm lint
```

## 📄 许可

MIT License

---

**作者**: GitPulse Team  
**版本**: 0.1.0  
**更新**: 2026-11-19
