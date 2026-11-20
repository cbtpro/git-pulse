# GitPulse 快速参考

## 🚀 快速开始

### 安装和运行

```bash
# 克隆项目
git clone <project-url>
cd gitpulse

# 安装依赖
npm install

# 启动开发服务器
npm run tauri:dev
```

## 📁 项目结构速览

```
src/
├── types/           # TypeScript 类型定义
├── services/        # 业务逻辑服务
│   ├── api/        # API 层（可插拔）
│   └── auth/       # 认证服务
├── components/      # React 组件
├── pages/          # 页面组件
├── hooks/          # 自定义 Hooks
└── utils/          # 工具函数
```

## 🔌 API 层使用

### 创建 API 客户端

```typescript
import ApiFactory from '@services/api';

// 方式 1: 获取单例实例
const api = ApiFactory.getInstance('direct', { token: 'your-token' });

// 方式 2: 切换实现
ApiFactory.setImplementation('backend', { baseUrl: 'http://localhost:3000' });
const api = ApiFactory.getInstance();

// 使用 API
const user = await api.getUser('octocat');
const repos = await api.getUserRepos('octocat');
```

### 在组件中使用

```typescript
import ApiFactory from '@services/api';
import { useEffect, useState } from 'react';
import { User } from '@types/github';

export function UserProfile({ username }: { username: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = ApiFactory.getInstance();
    
    api.getUser(username)
      .then(setUser)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <img src={user.avatar_url} alt={user.login} />
      <h1>{user.login}</h1>
      <p>{user.bio}</p>
    </div>
  );
}
```

## 🔐 认证管理

### Token 管理

```typescript
import { TokenManager } from '@services/auth/TokenManager';

// 保存 Token
TokenManager.saveToken('github-token-here');
TokenManager.saveUsername('username');

// 获取 Token
const token = TokenManager.getToken();
const username = TokenManager.getUsername();

// 检查认证状态
if (TokenManager.hasToken()) {
  // 用户已认证
}

// 清除认证
TokenManager.clearAll();
```

## 📝 TypeScript 类型

### 常用类型

```typescript
import { User, Repository, PullRequest, Issue, Event } from '@types/github';

// 获取用户信息
const user: User = await api.getUser('octocat');
console.log(user.login, user.followers);

// 获取仓库列表
const repos: Repository[] = await api.getUserRepos('octocat');
repos.forEach(repo => {
  console.log(repo.name, repo.stargazers_count);
});

// 获取用户事件
const events: Event[] = await api.getUserEvents('octocat');
events.forEach(event => {
  console.log(event.type, event.created_at);
});
```

## 🛠️ 常见任务

### 添加新 API 端点

1. 在 `GitHubApiClient` 接口中添加方法签名
2. 在 `DirectGitHubApi` 中实现该方法
3. 也在 `BackendProxyApi` 中实现（作为备选）

```typescript
// 1. 接口中添加
interface GitHubApiClient {
  getMyMethod(param: string): Promise<SomeType>;
}

// 2. 在 DirectGitHubApi 中实现
async getMyMethod(param: string): Promise<SomeType> {
  const response = await this.client.get<SomeType>(`/endpoint/${param}`);
  return response.data;
}

// 3. 在 BackendProxyApi 中实现
async getMyMethod(param: string): Promise<SomeType> {
  const response = await this.client.get<SomeType>(`/endpoint/${param}`);
  return response.data;
}
```

### 添加新组件

```typescript
// src/components/MyComponent.tsx
import { FC } from 'react';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent: FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
};
```

### 创建自定义 Hook

```typescript
// src/hooks/useMyHook.ts
import { useEffect, useState } from 'react';
import ApiFactory from '@services/api';

export function useMyHook(param: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = ApiFactory.getInstance();
    
    api.getMyData(param)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [param]);

  return { data, loading, error };
}
```

## 🧪 测试

### 使用 Mock API

```typescript
// 创建 MockApi 实现
class MockApi implements GitHubApiClient {
  async getUser(): Promise<User> {
    return {
      login: 'mock-user',
      id: 1,
      avatar_url: 'https://...',
      // ... 其他字段
    };
  }
}

// 在测试中使用
ApiFactory.setImplementation('mock');
const api = ApiFactory.getInstance();
const user = await api.getUser('test');
```

## 📊 API 端点参考

### 用户信息

```typescript
// 获取用户信息
const user = await api.getUser(username);

// 获取当前认证用户
const currentUser = await api.getCurrentUser();

// 获取 Followers
const followers = await api.getFollowers(username);

// 获取 Following
const following = await api.getFollowing(username);
```

### 仓库

```typescript
// 获取用户仓库
const repos = await api.getUserRepos(username, {
  page: 1,
  per_page: 30,
  sort: 'updated',
  direction: 'desc'
});

// 获取置顶仓库
const pinned = await api.getPinnedRepositories(username);
```

### 活动

```typescript
// 获取用户事件
const events = await api.getUserEvents(username);

// 获取公开事件
const publicEvents = await api.getUserPublicEvents(username);
```

## 🎨 命名约定

| 内容 | 格式 | 示例 |
|------|------|------|
| React 组件 | PascalCase | `ProfileHeader.tsx` |
| 页面 | PascalCase | `ProfilePage.tsx` |
| Hooks | camelCase | `useProfile.ts` |
| 服务/类 | PascalCase | `TokenManager.ts` |
| 函数 | camelCase | `formatDate.ts` |
| 常量 | UPPER_SNAKE_CASE | `MAX_ITEMS = 100` |
| 接口 | PascalCase + I前缀 | `IUser` (可选) |

## 🔗 重要链接

- **GitHub API 文档**: https://docs.github.com/en/rest
- **Tauri 文档**: https://tauri.app/docs
- **React 文档**: https://react.dev/
- **GitHub Personal Token**: https://github.com/settings/tokens

## 💡 Tips

1. **API 速率限制**: 认证用户 5000 请求/小时，使用本地缓存减轻压力
2. **Token 安全**: 不要在代码中硬编码 Token，使用环境变量
3. **错误处理**: 总是处理 API 调用的错误，包括网络错误和 API 错误
4. **TypeScript**: 启用 `strict: true` 确保类型安全

## 📞 获取帮助

- 查看详细文档: `docs/DEVELOPMENT.md`
- 查看架构设计: `docs/ARCHITECTURE.md`
- 查看 API 参考: `docs/GITHUB_API.md`
