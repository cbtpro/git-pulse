# GitPulse 架构设计文档

## 概述

GitPulse 是一个跨平台的 GitHub 管理工具，采用分层架构设计，支持灵活的 API 切换和未来的扩展。

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│          Presentation Layer (Tauri UI)              │
│  - React Components                                 │
│  - State Management (Context API / Zustand)         │
│  - Routing (React Router)                           │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│          Business Logic Layer                       │
│  - Hooks (useAuth, useProfile, etc.)                │
│  - Services (Auth, API Management)                  │
│  - Custom Utilities                                 │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│          Abstraction Layer                          │
│  - GitHubApiClient Interface                        │
│  - API Factory Pattern                              │
│  - Adapter Pattern for Multiple Implementations     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│          Data Access Layer                          │
│  ├─ Direct GitHub API                              │
│  ├─ Backend Proxy (Future)                         │
│  └─ Mock Data (Testing)                            │
└─────────────────────────────────────────────────────┘
```

## 分层说明

### 1. Presentation Layer (展示层)

**职责**: 渲染 UI，处理用户交互

**组成部分**:
- React 组件 (`components/`)
- 页面组件 (`pages/`)
- 状态管理 (Context API / Zustand)
- 路由管理 (React Router)

**示例**:
```
components/
├── Profile/
│   ├── ProfileHeader.tsx      # 用户信息头部
│   ├── RepositoryList.tsx     # 仓库列表
│   └── StatisticCard.tsx      # 统计卡片
└── Auth/
    ├── LoginForm.tsx
    └── TokenInput.tsx
```

### 2. Business Logic Layer (业务逻辑层)

**职责**: 实现应用的核心业务逻辑

**组成部分**:
- Custom Hooks (`hooks/`)
- 服务类 (`services/`)
- 工具函数 (`utils/`)

**示例**:
```
hooks/
├── useAuth.ts         # 认证逻辑
├── useProfile.ts      # 个人资料逻辑
└── useApi.ts          # API 调用管理

services/
├── auth/
│   └── TokenManager.ts
└── api/
    └── 见下层
```

### 3. Abstraction Layer (抽象层)

**职责**: 定义统一的 API 接口，支持多种实现

**核心设计模式**:
- **接口定义**: `GitHubApiClient` 接口
- **工厂模式**: `ApiFactory` 用于创建实例
- **适配器模式**: 支持多个具体实现

**优势**:
- 解耦应用与具体 API 实现
- 易于测试（可以使用 Mock 实现）
- 支持灵活的实现切换
- 便于添加新的 API 源

**示例**:
```typescript
// 接口定义
interface GitHubApiClient {
  getUser(username: string): Promise<User>;
  getUserRepos(username: string): Promise<Repository[]>;
  // ...
}

// 多个实现
class DirectGitHubApi implements GitHubApiClient { ... }
class BackendProxyApi implements GitHubApiClient { ... }

// 工厂
const api = ApiFactory.getInstance('direct');
```

### 4. Data Access Layer (数据访问层)

**职责**: 与外部 API 或数据源通信

**支持的数据源**:
1. **Direct GitHub API**: 直接调用 GitHub REST API
2. **Backend Proxy**: 通过自有后端代理 (未来)
3. **Mock Data**: 用于测试和演示

## API 切换机制

### 切换 API 实现

```typescript
// 方式 1: 应用启动时配置
import ApiFactory from '@services/api';

ApiFactory.setImplementation('direct', {
  token: process.env.REACT_APP_GITHUB_TOKEN,
});

// 方式 2: 运行时切换
ApiFactory.setImplementation('backend', {
  baseUrl: 'http://localhost:3000/api',
});

// 方式 3: 获取当前实例
const api = ApiFactory.getInstance();
```

### 添加新的 API 实现

```typescript
// 1. 创建实现类
class MyCustomApi implements GitHubApiClient {
  async getUser(username: string): Promise<User> {
    // 自定义逻辑
  }
  // ... 其他方法
}

// 2. 在工厂中注册
static createClient(type: ApiImplementationType): GitHubApiClient {
  switch (type) {
    case 'custom':
      return new MyCustomApi();
    // ...
  }
}

// 3. 使用
ApiFactory.setImplementation('custom');
```

## 认证流程

### 支持的认证方式

```
┌─────────────────────────────────────────┐
│      用户认证流程选择                    │
└─────────────┬───────────────────────────┘
              │
      ┌───────┴───────┬───────────┐
      ▼               ▼           ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Token    │  │ OAuth    │  │ Username │
│ 输入     │  │ Flow     │  │ + Token  │
└──────────┘  └──────────┘  └──────────┘
      │               │           │
      └───────┬───────┴───────┬───┘
              ▼               ▼
        ┌──────────────┐  ┌──────────┐
        │ TokenManager │  │ OAuthFlow│
        └──────┬───────┘  └──────────┘
               │
               ▼
        ┌──────────────┐
        │ 验证并保存   │
        │ 更新 API     │
        └──────────────┘
```

### 认证数据流

```typescript
// 1. 用户输入 Token
const token = userInput; // 获取用户输入

// 2. 保存到本地存储
TokenManager.saveToken(token);
TokenManager.saveUsername(username);

// 3. 更新 API 客户端
const api = new DirectGitHubApi({ token });

// 4. 验证认证信息
const isValid = await api.verifyAuth();

// 5. 保存到应用状态
if (isValid) {
  setAuthState({ user, token, isAuthenticated: true });
}
```

## 类型系统

所有类型定义集中在 `src/types/github.ts`，遵循 GitHub REST API v3 的响应格式。

### 核心类型

```typescript
interface User { ... }           // GitHub 用户
interface Repository { ... }      // 仓库
interface PullRequest { ... }     // Pull Request
interface Issue { ... }           // Issue
interface Event { ... }           // 用户事件
interface ApiResponse<T> { ... }  // API 响应包装
```

## 状态管理建议

### 推荐方案：Context API + Hooks

```typescript
// 1. 创建 Context
const AppContext = createContext<AppContextType | null>(null);

// 2. 创建 Provider 组件
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <AppContext.Provider value={{ user, repos, loading }}>
      {children}
    </AppContext.Provider>
  );
}

// 3. 创建 Hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// 4. 在组件中使用
function MyComponent() {
  const { user, loading } = useApp();
  return <div>{loading ? 'Loading...' : user?.login}</div>;
}
```

### 备选方案：Zustand

```typescript
import create from 'zustand';

interface AppStore {
  user: User | null;
  repos: Repository[];
  loading: boolean;
  setUser: (user: User | null) => void;
  setRepos: (repos: Repository[]) => void;
}

const useAppStore = create<AppStore>((set) => ({
  user: null,
  repos: [],
  loading: false,
  setUser: (user) => set({ user }),
  setRepos: (repos) => set({ repos }),
}));
```

## 错误处理

### 统一的错误处理机制

```typescript
class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public originalError?: Error
  ) {
    super(message);
  }
}

// 在 API 调用中使用
try {
  const user = await api.getUser(username);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      // 未授权，清除 Token
      TokenManager.clearToken();
    } else if (error.status === 404) {
      // 用户不存在
      showNotification('用户不存在');
    }
  }
}
```

## 性能优化

### 1. 缓存策略

```typescript
class CachedApiClient implements GitHubApiClient {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 5 * 60 * 1000; // 5分钟

  async getUser(username: string): Promise<User> {
    const cacheKey = `user:${username}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const data = await this.fetchUser(username);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }
}
```

### 2. 分页加载

```typescript
// 实现虚拟滚动以处理大量数据
// 使用 react-window 或 react-virtualized
```

### 3. 代码分割

```typescript
// 使用 React.lazy 进行代码分割
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
```

## 测试策略

### 单元测试示例

```typescript
// api/implementations/__tests__/DirectGitHubApi.test.ts
describe('DirectGitHubApi', () => {
  let api: DirectGitHubApi;

  beforeEach(() => {
    api = new DirectGitHubApi({ token: 'test-token' });
  });

  test('should get user by username', async () => {
    const user = await api.getUser('octocat');
    expect(user.login).toBe('octocat');
  });
});
```

## 部署流程

在仓库根目录使用 `pnpm build:web`、`pnpm build:desktop`、`pnpm build:ios`、`pnpm build:android`。平台依赖、产物和签名以 [本地开发](DEVELOPMENT.md) 及 [Actions 打包](GITHUB_ACTIONS.md) 为准。iOS / Android 使用各自的 Tauri 子命令，不能作为桌面 `--target` 参数。

## 文件命名约定

| 类型 | 格式 | 示例 |
|------|------|------|
| React 组件 | PascalCase.tsx | ProfileHeader.tsx |
| 页面 | PascalCase.tsx | ProfilePage.tsx |
| Hooks | camelCase.ts | useAuth.ts |
| 服务 | PascalCase.ts | TokenManager.ts |
| 工具 | camelCase.ts | formatDate.ts |
| 类型 | PascalCase.ts | github.ts |

## 总结

这种分层架构设计的优势：
- ✅ **可维护性**: 清晰的分层，职责分离
- ✅ **可测试性**: 易于编写单元测试和集成测试
- ✅ **可扩展性**: 支持灵活添加新的 API 实现
- ✅ **灵活性**: 支持在开发时快速切换 API 源
- ✅ **跨平台**: 相同的业务逻辑在多个平台运行
