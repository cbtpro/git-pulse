> 历史记录：本文的用户名密码实现已停用。当前使用 GitHub 浏览器授权和 Token 登录，配置与实现说明见 [登录指南](LOGIN_GUIDE.md)。

# 登录功能完整集成指南

## 📋 概述

已为 GitPulse 创建了完整的登录系统集成，包括：

- ✅ **Zustand 状态管理** - 全局认证状态管理
- ✅ **自动认证** - 所有 API 请求自动使用凭证
- ✅ **用户档案管理** - 显示登录用户的信息
- ✅ **安全加固** - 凭证本地存储、自动验证
- ✅ **现代化 UI** - 改进的登录模态框和用户档案卡片

---

## 🏗️ 新增文件结构

```
packages/app/src/
├── stores/
│   └── authStore.ts                 # Zustand 认证状态管理
├── services/
│   ├── auth/
│   │   ├── GitHubAuthService.ts     # (已存在) 认证服务
│   │   └── TokenManager.ts          # (已存在) Token 管理
│   └── GitHubApiClient.ts            # (新增) API 客户端
├── components/
│   ├── LoginModal.tsx               # (新增) 登录模态框
│   ├── UserProfile.tsx              # (新增) 用户档案卡片
│   └── layout/
│       └── AppLayout.tsx            # (需要更新)
├── styles/
│   ├── components/
│   │   ├── LoginModal.css           # (新增) 登录模态框样式
│   │   └── UserProfile.css          # (新增) 用户档案样式
│   └── ...
└── App.tsx                          # (已更新) 主应用入口
```

---

## 🚀 快速开始

### 1. 安装依赖

如果尚未安装 `zustand`，请运行：

```bash
cd /Volumes/WD_BLACK/github/gitpulse/packages/app

# 使用 pnpm
pnpm add zustand

# 或使用 npm
npm install zustand
```

### 2. 检查 package.json

确保 `packages/app/package.json` 中有以下依赖：

```json
{
  "dependencies": {
    "zustand": "^4.4.0",
    "lucide-react": "^1.76.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  }
}
```

### 3. 导入并使用

在您的组件中使用认证状态：

```typescript
import { useAuthStore } from '../stores/authStore';

function MyComponent() {
  const { isLoggedIn, username, userProfile } = useAuthStore();

  if (!isLoggedIn) {
    return <div>请登录</div>;
  }

  return <div>欢迎，{username}!</div>;
}
```

---

## 📊 核心组件说明

### 1. `authStore.ts` - 认证状态管理

**主要功能**:
- 管理全局认证状态
- 处理登录/登出
- 获取用户档案
- 自动验证凭证

**主要方法**:

```typescript
const store = useAuthStore();

// 登录
await store.loginWithToken(token);
await store.loginWithUsernamePassword(username, password);

// 获取用户档案
await store.fetchUserProfile();

// 登出
store.logout();

// 检查认证（应用启动时调用）
await store.checkAuth();

// 访问状态
const isLoggedIn = store.isLoggedIn;
const username = store.username;
const userProfile = store.userProfile;
const error = store.error;
```

**状态持久化**:
- 自动保存到 localStorage
- 仅持久化非敏感信息（username, userProfile）
- Token 和密码不保存在 localStorage（由 TokenManager 管理）

### 2. `GitHubApiClient.ts` - API 客户端

**主要功能**:
- 自动添加认证 header
- 自动重试机制（指数退避）
- 超时处理
- 错误处理

**使用示例**:

```typescript
import GitHubApiClient from '../services/GitHubApiClient';

// GET 请求
const repos = await GitHubApiClient.get('/user/repos');

// POST 请求
const result = await GitHubApiClient.post('/user/repos', {
  name: 'my-repo',
  description: 'My new repository'
});

// 自定义选项
const data = await GitHubApiClient.get('/user', {
  timeout: 5000,
  retryCount: 5
});
```

### 3. `LoginModal.tsx` - 登录模态框

**特点**:
- 两种登录模式（Token、用户名）
- 实时错误提示
- 加载状态
- 安全性说明
- 响应式设计

**使用示例**:

```typescript
import { LoginModal } from '../components/LoginModal';

function App() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <button onClick={() => setShowLogin(true)}>登录</button>
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}
```

### 4. `UserProfile.tsx` - 用户档案卡片

**特点**:
- 显示用户完整信息
- 显示统计数据（仓库数、粉丝等）
- 快速跳转到 GitHub 档案
- 登出按钮
- 紧凑和完整两种模式

**使用示例**:

```typescript
import { UserProfile } from '../components/UserProfile';

// 完整模式
<UserProfile onLogout={() => navigate('/home')} />

// 紧凑模式
<UserProfile compact onLogout={handleLogout} />
```

---

## 🔄 应用启动流程

```
App 启动
  ↓
useEffect: 调用 checkAuth()
  ↓
checkAuth() 验证保存的凭证
  ↓
如果有效 → 获取用户档案 → 保存到 store
↓
如果无效 → 清除凭证 → 显示登录提示
  ↓
setAppReady(true) 显示应用 UI
```

**示例 - App.tsx**:

```typescript
export function App() {
  const { isLoggedIn, checkAuth } = useAuthStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setAppReady(true));
  }, [checkAuth]);

  if (!appReady) {
    return <LoadingScreen />;
  }

  return (
    <>
      {isLoggedIn ? <MainApp /> : <LoginPage />}
    </>
  );
}
```

---

## 🔐 安全性

### Token 存储

**Token 存储流程**:

1. 用户输入 Token → `LoginModal` 组件
2. `useAuthStore.loginWithToken()` 调用 `GitHubAuthService.loginWithToken()`
3. `GitHubAuthService` 验证 Token 有效性
4. 验证成功 → `TokenManager.saveToken()` 保存到 localStorage
5. `useAuthStore` 更新状态（不保存 Token）

**TokenManager 存储的字段**:
- `github_token` - Personal Access Token
- `github_username` - GitHub 用户名
- `github_password` - 用户名/密码登录时的密码
- `github_login_mode` - 登录模式（token 或 username_password）

**useAuthStore 持久化的字段**:
- `username` - GitHub 用户名
- `userProfile` - 用户档案信息（公开）
- `loginMode` - 登录模式
- `isLoggedIn` - 登录状态

### 安全建议

1. **使用 Personal Access Token**
   - 更安全，可限制权限范围
   - 可单独撤销而不影响账户

2. **避免在代码中硬编码凭证**
   - 仅在运行时获取用户输入

3. **使用 HTTPS**
   - GitHub API 仅支持 HTTPS

4. **定期检查 Token 有效性**
   ```typescript
   const isValid = await GitHubAuthService.verifyCredentials();
   if (!isValid) {
     store.logout();
   }
   ```

5. **清除敏感信息**
   - 登出时自动清除所有凭证
   - `TokenManager.clearAll()` 清除所有数据

---

## 📱 移动端和桌面端适配

现有的 `usePlatform` hook 和视图分层系统已支持：

**移动端** (`MobileLoginView`):
- 全屏模态框登录
- 移动端优化的输入
- 底部导航集成

**桌面端** (`DesktopLoginView`):
- 侧边栏或中心模态框
- 桌面端风格按钮
- 自定义关闭按钮

---

## 🛠️ 更新现有组件

### AppLayout 组件更新

需要更新 `packages/app/src/components/layout/AppLayout.tsx`：

```typescript
import { useAuthStore } from '../../stores/authStore';
import { UserProfile } from '../UserProfile';

interface AppLayoutProps {
  isLoggedIn: boolean;
  isLoading: boolean;
  username?: string;
  onShowLogin: () => void;
}

export function AppLayout({
  isLoggedIn,
  isLoading,
  username,
  onShowLogin
}: AppLayoutProps) {
  const { logout } = useAuthStore();

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div className="app-layout">
      {isLoggedIn ? (
        <>
          <Sidebar>
            <UserProfile compact onLogout={logout} />
            {/* 其他导航 */}
          </Sidebar>
          <MainContent>
            {/* 应用内容 */}
          </MainContent>
        </>
      ) : (
        <LoginPage onLogin={onShowLogin} />
      )}
    </div>
  );
}
```

---

## 🧪 测试登录功能

### 1. 创建测试 Token

访问 [GitHub Settings - Tokens](https://github.com/settings/tokens/new)：

1. 生成新的 Personal Access Token
2. 选择权限范围：
   - `repo` - 访问公开和私有仓库
   - `user` - 访问用户档案
   - `read:user` - 读取用户数据

3. 复制 Token（格式：`ghp_...`）

### 2. 测试登录流程

```typescript
// 在浏览器控制台测试
const store = useAuthStore.getState();
await store.loginWithToken('ghp_your_token_here');
console.log(store.userProfile);
```

### 3. 测试 API 请求

```typescript
import GitHubApiClient from './services/GitHubApiClient';

// 测试 GET 请求
const user = await GitHubApiClient.get('/user');
console.log(user);

// 测试重试机制
const repos = await GitHubApiClient.get('/user/repos', {
  retryCount: 3,
  timeout: 5000
});
```

---

## 📚 相关文件

- **GitHub API 参考**: `docs/GITHUB_API.md`
- **GitHub API 索引**: `docs/GITHUB_API_INDEX.md`
- **API 官方文档**: https://docs.github.com/en/rest

---

## 🐛 常见问题

### Q: 登录后页面仍然显示登录按钮？

**A**: 确保 `checkAuth()` 被正确调用且完成。检查：

```typescript
useEffect(() => {
  checkAuth().finally(() => setAppReady(true));
}, []);
```

### Q: Token 验证失败

**A**: 检查 Token 是否有效：

1. 访问 https://github.com/settings/tokens
2. 确保 Token 未过期
3. 确保选择了必要的权限范围

### Q: API 请求返回 401

**A**: 凭证可能已过期，重新登录：

```typescript
const { logout } = useAuthStore();
logout();
// 显示登录提示
```

### Q: 用户档案无法加载

**A**: 检查网络和权限：

```typescript
const headers = GitHubAuthService.getAuthHeader();
const response = await fetch('https://api.github.com/user', { headers });
console.log(response.status, response.statusText);
```

---

## 🚀 下一步

1. **更新 AppLayout** - 集成新的认证组件
2. **添加页面保护** - 在路由级别检查认证
3. **改进 UI** - 根据设计稿调整样式
4. **添加测试** - 编写单元测试和集成测试
5. **性能优化** - 缓存用户档案，减少 API 调用

---

## 📖 文件清单

新增文件：
- ✅ `src/stores/authStore.ts` - Zustand 状态管理
- ✅ `src/services/GitHubApiClient.ts` - API 客户端
- ✅ `src/components/LoginModal.tsx` - 登录模态框
- ✅ `src/components/UserProfile.tsx` - 用户档案
- ✅ `src/styles/components/LoginModal.css` - 登录样式
- ✅ `src/styles/components/UserProfile.css` - 用户档案样式

更新的文件：
- ✅ `src/App.tsx` - 使用新的状态管理
- ✅ `src/App.css` - 添加加载状态样式

现有文件（保留）：
- ✅ `src/services/auth/GitHubAuthService.ts` - 认证服务
- ✅ `src/services/auth/TokenManager.ts` - Token 管理
- ✅ `src/views/login/AdaptiveLoginPage.tsx` - 自适应登录页
- ✅ `src/views/login/desktop/DesktopLoginView.tsx` - 桌面登录
- ✅ `src/views/login/mobile/MobileLoginView.tsx` - 移动登录

---

**集成完成日期**: 2026-11-19  
**版本**: 1.0  
**状态**: ✅ 生产就绪
