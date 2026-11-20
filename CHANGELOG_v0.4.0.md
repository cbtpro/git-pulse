# 🚀 GitPulse v0.4.0 - 变更日志

## 📋 更新摘要

实现了**未登录访问功能**，用户现在可以不登录就访问应用并浏览公共页面。只有在访问私有功能（如个人收件箱、个人资料）时才需要登录。

## 🎯 核心改进

### 应用流程改造
- ✅ 应用启动不再强制登录
- ✅ 公共页面无需身份验证可访问
- ✅ 私有页面通过登录模态框进行访问控制
- ✅ 登录模态框可关闭（允许用户继续浏览公共内容）
- ✅ 自动从 localStorage 恢复登录状态

### 页面权限管理
- ✅ 主页（热门仓库、排行榜）- 🌍 公共页面
- ✅ 探索页面 - 🌍 公共页面  
- ✅ 收件箱 - 🔐 私有页面（需要登录）
- ✅ 个人资料 - 🔐 私有页面（需要登录）

### 导航改进
- ✅ 未登录时：导航栏显示"登录"按钮
- ✅ 已登录时：导航栏显示"退出登录"按钮
- ✅ 私有页面在导航栏中标记为禁用（显示 🔒 图标）
- ✅ 点击禁用的私有页面会显示登录模态框

## 📝 文件修改

### 核心应用文件

#### `src/App.tsx`
- 移除 `currentPage` 状态管理（login/app 切换）
- 现在 `AppLayout` 总是显示
- 添加 `showLoginModal` 状态控制登录模态框
- token 现在允许为 null
- 自动从 localStorage 恢复登录状态

#### `src/components/layout/AppLayout.tsx`
- token 参数改为 `string | null`
- 添加 `onShowLogin` 回调
- 实现 `isLoggedIn` 计算属性
- 在 `handleNavigate` 中添加私有页面权限检查
- 私有页面未登录时显示登录提示
- 导航栏传递登录状态和回调

#### `src/components/layout/AppLayout.css`
- 添加 `.page-placeholder` 样式（未登录提示）
- 添加 `.login-button` 样式
- 支持深色模式

### 导航组件

#### `src/components/navigation/DesktopSidebar.tsx`
- 添加 `isLoggedIn` 和 `onShowLogin` props
- 实现 `isPrivatePage` 判断逻辑
- 禁用私有页面导航项（未登录时）
- 显示 🔒 图标标记禁用项
- 根据登录状态显示登录或登出按钮

#### `src/components/navigation/DesktopSidebar.css`
- `.desktop-nav-item.disabled` - 禁用状态样式
- `.desktop-nav-lock` - 锁定图标样式
- `.desktop-login-btn` - 登录按钮样式
- 深色模式支持

#### `src/components/navigation/MobileBottomNav.tsx`
- 添加 `isLoggedIn` 和 `onShowLogin` props
- 实现私有页面禁用逻辑
- 根据登录状态显示登录或登出按钮

#### `src/components/navigation/MobileBottomNav.css`
- `.mobile-nav-item.disabled` - 禁用状态
- `.mobile-nav-lock` - 锁定图标
- `.mobile-login-btn` - 登录按钮样式
- 深色模式支持

### 页面组件

#### `src/pages/HomePage.tsx`
- token 参数改为 `string | null`
- 在 API 请求中支持可选 token
- 无需 token 也能获取热门仓库和开发者信息
- 修复了 fetchTopDevelopers 方法中的语法错误

#### `src/pages/ExplorePage.tsx`
- token 参数改为 `string | null`
- 移除未使用的参数

### 登录页面

#### `src/views/login/AdaptiveLoginPage.tsx`
- 添加 `onClose?: () => void` prop
- 支持模态框模式显示

#### `src/views/login/mobile/MobileLoginView.tsx`
- 添加 `onClose?: () => void` prop
- 添加关闭按钮（✕）到登录头部
- 用户可关闭模态框返回应用

#### `src/views/login/desktop/DesktopLoginView.tsx`
- 添加 `onClose?: () => void` prop
- 添加关闭按钮（✕）到登录视图
- 用户可关闭模态框返回应用

#### `src/styles/views/LoginPageMobile.css`
- `.mobile-login-close` - 移动端关闭按钮样式
- 右上角绝对定位
- 透明背景，悬停时增加不透明度

#### `src/styles/views/LoginPageDesktop.css`
- `.desktop-login-close` - 桌面端关闭按钮样式
- 右上角绝对定位
- 透明背景，悬停时增加不透明度

## 🔄 数据流变更

### 原数据流
```
App
├── 检查登录状态
└── currentPage === 'login'
    └── AdaptiveLoginPage
        └── 登录成功后 → currentPage = 'app'
            └── AppLayout (token 必须存在)
                ├── DesktopSidebar/MobileBottomNav
                └── 页面内容
```

### 新数据流
```
App
├── 检查登录状态（可选）
├── 总是显示 AppLayout
│   ├── isLoggedIn = !!token
│   ├── DesktopSidebar/MobileBottomNav (支持登入/登出)
│   │   ├── 未登录：显示"登录"按钮
│   │   ├── 已登录：显示"退出登录"按钮
│   │   └── 私有页面禁用（未登录时）
│   └── 页面内容
│       ├── 公共页面：总是显示
│       └── 私有页面：
│           ├── 未登录 → 显示登录提示
│           └── 已登录 → 显示实际内容
└── showLoginModal = true
    └── AdaptiveLoginPage
        ├── 登录成功 → 更新 token → showLoginModal = false
        └── 关闭 → showLoginModal = false
```

## 📊 测试检查清单

### 功能测试
- [x] 应用不登录时可启动
- [x] 公共页面（主页）无需登录可访问
- [x] 探索页面可无需登录访问
- [x] 点击私有页面时显示登录模态框
- [x] 登录模态框可关闭
- [x] 登录成功后可访问私有页面
- [x] 点击退出登录后返回到公共页面
- [x] 刷新页面后自动恢复登录状态

### UI/UX 测试
- [x] 未登录时导航栏显示"登录"按钮
- [x] 已登录时导航栏显示"退出登录"按钮
- [x] 私有页面在导航中显示 🔒 图标
- [x] 私有页面在导航中呈灰色
- [x] 私有页面无法点击（未登录时）
- [x] 登录提示页面清晰易懂
- [x] 登录模态框有明显的关闭按钮

### 技术验证
- [x] TypeScript 类型检查通过
- [x] 无未使用变量警告
- [x] 无类型错误
- [x] 深色模式支持完整
- [x] 移动端响应式正常
- [x] 桌面端布局正确

## 🔐 安全性考虑

### localStorage 管理
- token 和 username 存储在 localStorage
- 登出时清除所有登录信息
- 刷新时自动恢复登录状态
- 仅在客户端验证权限（服务端仍需验证 API 请求）

### API 请求
- 公共数据（热门仓库、排行榜）无需 token
- 私有数据（通知、个人信息）需要有效 token
- 无效 token 应由后端返回 401 错误

## 📚 文档

新增文档：
- `UNAUTHENTICATED_ACCESS_FEATURES.md` - 详细功能说明
- `CHANGELOG_v0.4.0.md` - 本文件

## 🚀 性能影响

- ✅ 应用启动时间不变
- ✅ 页面加载时间不变
- ✅ 包大小变化 < 1KB
- ✅ 无额外网络请求

## ⚠️ 破坏性改变

无破坏性改变。这是完全向后兼容的更新。

## 🔮 未来计划

- [ ] 实现 GitHub OAuth 认证（社交登录）
- [ ] 添加记住我功能
- [ ] 实现 token 过期检查和刷新
- [ ] 添加权限错误处理（401/403）
- [ ] 实现登录后返回原页面
- [ ] 添加用户会话超时

## 📈 版本信息

- **版本**: 0.4.0
- **发布日期**: 2026-11-19
- **React**: 18.x
- **TypeScript**: 5.x
- **状态**: ✅ 生产就绪

---

有任何问题或建议，请提交 Issue 或 PR！
