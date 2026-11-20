# GitPulse 应用功能指南

## 应用架构概览

GitPulse 现已完全重构，支持三个主要页面：

### 1. **登录页面** (`LoginPage.tsx`)
- 用户输入 GitHub Personal Access Token
- Token 验证和保存
- 安全性提示
- 功能特性展示

### 2. **首页** (`HomePage.tsx`) 
- 未登录时的主页面
- 两个标签页：
  - **热门仓库**: 显示过去 7 天创建的最热门仓库
  - **顶级开发者**: 显示粉丝最多的 GitHub 开发者
- 右上角用户菜单和登出按钮
- 可点击用户名导航到个人资料页

### 3. **个人资料页面** (`ProfilePage.tsx`)
- 显示当前登录用户的详细信息
- 用户头像、用户名、简介
- 粉丝、正在关注、公开仓库统计
- 公司、位置、博客、Twitter 等信息
- 快速链接到 GitHub 主页和仓库列表

## 核心功能说明

### 登录流程
1. 用户打开应用，显示登录页面
2. 输入 GitHub Personal Access Token
3. 应用验证 Token 有效性
4. Token 和用户名保存到本地 localStorage
5. 自动导航到首页

### 首页功能
#### 热门仓库标签页
- 通过 GitHub Search API 获取最近 7 天创建的热门仓库
- 显示仓库信息：
  - 仓库名和完整路径
  - 仓库描述
  - Star 数量
  - 编程语言
  - 最后更新时间
  - 拥有者头像和用户名
- 卡片可点击跳转到 GitHub 仓库页面

#### 顶级开发者标签页
- 通过 GitHub Search API 获取粉丝最多的开发者
- 显示开发者信息：
  - 头像
  - 用户名
  - 个人简介
  - 粉丝数
  - 公开仓库数
- 可点击用户名跳转到 GitHub 开发者主页

### 个人资料页面
- 点击首页右上角用户名进入
- 显示完整的用户信息：
  - 用户头像
  - 名字和用户名
  - 个人简介
  - 粉丝/正在关注/公开仓库数
  - 公司、位置、博客、Twitter 等详细信息
  - 注册时间
- 快速操作按钮：
  - 访问 GitHub 主页
  - 查看所有仓库
- 返回按钮回到首页

## 路由系统

应用使用简单的状态管理进行页面切换：
```
login -> home -> profile
  ↓                 ↓
  └─── logout ─────┘
```

## 存储和认证

### localStorage 使用
- `github_token`: 存储 GitHub Personal Access Token
- `github_username`: 存储当前登录用户的用户名

### Token 验证
- 登录时通过 GitHub API `/user` 端点验证 Token
- 失效 Token 返回 401 错误
- 网络错误或其他错误返回相应的错误提示

## API 使用

应用直接调用 GitHub REST API v3：

### 端点列表
- `GET /user` - 获取当前登录用户信息
- `GET /search/repositories` - 搜索热门仓库
- `GET /search/users` - 搜索顶级开发者
- `GET /users/{username}` - 获取特定用户详细信息

### 认证方式
所有 API 请求都使用 Token 认证：
```
Authorization: token <GITHUB_TOKEN>
```

## UI/UX 特性

### 响应式设计
- 在移动设备、平板和桌面端适配
- 网格布局自动调整列数
- 移动端堆叠为单列

### 深色模式支持
- 自动检测系统深色模式偏好
- 使用 CSS 变量实现主题切换
- 所有组件都支持深色模式

### 交互反馈
- 加载状态提示
- 错误信息显示和重试按钮
- 悬停效果和平滑过渡
- 禁用状态管理（如加载中）

## 开发指南

### 添加新页面
1. 在 `src/pages/` 创建新的 `.tsx` 文件
2. 创建对应的样式文件在 `src/styles/`
3. 在 `App.tsx` 中添加新的页面类型和路由
4. 导入并集成新页面

### 修改 API 调用
- 编辑具体页面的 `fetch` 调用
- Token 通过 props 传入，从 `App.tsx` 获取
- 确保所有请求都包含认证头

### 样式定制
- 使用 CSS 变量修改全局主题
- 在 `LoginPage.css` 中定义的变量被全局使用
- 遵循现有的响应式设计模式

## 文件结构

```
packages/app/src/
├── App.tsx                          # 主应用组件（路由管理）
├── App.css                          # 全局样式
├── main.tsx                         # 应用入口
├── index.css                        # 基础样式
├── index.html                       # HTML 模板
│
├── pages/
│   ├── LoginPage.tsx               # 登录页面
│   ├── HomePage.tsx                # 首页（热门仓库和开发者）
│   └── ProfilePage.tsx             # 个人资料页面
│
├── styles/
│   ├── LoginPage.css               # 登录页面样式
│   ├── HomePage.css                # 首页样式
│   └── ProfilePage.css             # 个人资料页面样式
│
├── services/
│   ├── api/                        # API 相关
│   └── auth/
│       └── TokenManager.ts         # Token 管理
│
├── types/                          # TypeScript 类型定义
└── components/                     # 可复用组件（待扩展）
```

## 下一步计划

1. **性能优化**
   - 实现数据缓存机制
   - 分页加载
   - 虚拟滚动

2. **功能扩展**
   - 仓库搜索功能
   - 开发者关注/取消关注
   - 仓库 Star/Unstar
   - 通知面板
   - 贡献统计图表

3. **用户体验**
   - 离线模式支持
   - 收藏/书签功能
   - 自定义主题
   - 快捷键支持

4. **平台特性**
   - iOS 推送通知
   - Android 权限管理
   - 桌面托盘集成
   - 快捷菜单

## 常见问题

### Q: 我应该用什么权限的 Token？
A: 建议使用 `repo` 权限的 Token，这样可以访问公开和私有仓库。可以在 https://github.com/settings/tokens 生成 Token。

### Q: Token 会被上传到服务器吗？
A: 不会。Token 只存储在本地 localStorage 中，所有 API 请求都直接发送到 GitHub，不经过任何中间服务器。

### Q: 为什么有些数据加载很慢？
A: GitHub API 有速率限制（每小时 60 次请求无认证，每小时 5000 次请求有认证）。如果频繁使用，可能触发限制。

### Q: 支持哪些平台？
A: 使用 Tauri 构建，目前支持：
- Windows (10+)
- macOS (10.13+)
- Linux (Debian/Ubuntu, Fedora, Arch)
- iOS (beta)
- Android (beta)
