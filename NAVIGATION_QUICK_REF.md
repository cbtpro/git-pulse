# GitPulse 导航系统 - 快速参考

## 导航项目 (NavigationPage 类型)

| ID | 标签 | 名称 | 移动端 | 桌面端 | 状态 |
|---|---|---|---|---|---|
| `home` | 🏠 | 主页 | ✅ | ✅ | ✅ 实现 |
| `inbox` | 📬 | 收件箱 | ✅ | ✅ | 🔄 占位 |
| `explore` | 🔍 | 探索 | ✅ | ✅ | 🔄 占位 |
| `profile` | 👤 | 我的 | ✅ | ✅ | ✅ 实现 |
| (mobile) | 🚪 | 退出 | ✅ | ✅ | ✅ 实现 |

## 文件位置

### 导航组件
```
src/components/navigation/
├── MobileBottomNav.tsx      ← 移动端底部导航
├── MobileBottomNav.css      ← 移动端导航样式
├── DesktopSidebar.tsx       ← 桌面端侧边栏
└── DesktopSidebar.css       ← 桌面端侧边栏样式
```

### 应用布局
```
src/components/layout/
├── AppLayout.tsx            ← 主布局（包含导航+内容）
└── AppLayout.css            ← 布局样式
```

### 类型定义
```
src/types/navigation.ts      ← NavigationPage、NAVIGATION_ITEMS 等
```

### 页面组件
```
src/pages/
├── HomePage.tsx             ← 主页
├── InboxPage.tsx            ← 收件箱（占位）
├── ExplorePage.tsx          ← 探索（占位）
└── ProfilePage.tsx          ← 我的
```

## 导入和使用

### 导入导航类型
```typescript
import { NavigationPage, NAVIGATION_ITEMS } from '@/types/navigation'
```

### 导入导航组件
```typescript
// 完整布局（推荐）
import { AppLayout } from '@/components/layout/AppLayout'

// 单独导航组件（高级）
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav'
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar'
```

### 使用 AppLayout
```typescript
import { AppLayout } from '@/components/layout/AppLayout'

export function App() {
  return (
    <AppLayout
      token={token}
      username={username}
      onLogout={handleLogout}
    />
  )
}
```

## 页面切换逻辑

### 在 AppLayout 中
```typescript
const handleNavigate = (page: NavigationPage) => {
  setCurrentPage(page)  // 更新当前页面
}

// 渲染页面
const renderContent = () => {
  switch (currentPage) {
    case 'home':
      return <HomePage />
    case 'inbox':
      return <InboxPage />
    case 'explore':
      return <ExplorePage />
    case 'profile':
      return <ProfilePage />
  }
}
```

## 移动端导航 (MobileBottomNav)

### Props 接口
```typescript
interface MobileBottomNavProps {
  currentPage: NavigationPage      // 当前页面
  onNavigate: (page: NavigationPage) => void  // 页面切换回调
  onLogout: () => void             // 登出回调
}
```

### 使用示例
```typescript
<MobileBottomNav
  currentPage={currentPage}
  onNavigate={handleNavigate}
  onLogout={handleLogout}
/>
```

### 特点
- 固定底部，高度 70px
- 5 个导航项 + 1 个退出按钮
- 活跃状态：蓝色高亮 + 图标放大
- 触摸反馈：按下时缩小 95%
- 徽章支持：显示数字提示

## 桌面端导航 (DesktopSidebar)

### Props 接口
```typescript
interface DesktopSidebarProps {
  currentPage: NavigationPage      // 当前页面
  onNavigate: (page: NavigationPage) => void  // 页面切换回调
  onLogout: () => void             // 登出回调
  username?: string                // 用户名（可选）
}
```

### 使用示例
```typescript
<DesktopSidebar
  currentPage={currentPage}
  onNavigate={handleNavigate}
  onLogout={handleLogout}
  username={username}
/>
```

### 特点
- 固定左侧，宽度 260px，高度 100vh
- 顶部 Git Pulse Logo
- 中间导航列表
- 底部用户信息卡片
- 活跃项目：蓝色左竖条 + 蓝色背景
- 悬停效果：背景色变化 + 向右移动

## 响应式断点

### 自动切换规则
```typescript
// usePlatform() 返回的结果
platformInfo.platform === 'mobile'  // 屏幕宽度 <= 768px
platformInfo.platform === 'desktop' // 屏幕宽度 > 768px
```

### CSS 媒体查询
```css
/* 移动端 */
@media (max-width: 768px) {
  /* 显示移动端导航 */
  .mobile-bottom-nav { display: flex; }
  /* 隐藏桌面端导航 */
  .desktop-sidebar { display: none; }
}

/* 桌面端 */
@media (min-width: 769px) {
  /* 显示桌面端导航 */
  .desktop-sidebar { display: flex; }
  /* 隐藏移动端导航 */
  .mobile-bottom-nav { display: none; }
}
```

## 颜色和图标

### 活跃颜色
- 移动端: `#0366d6` (GitHub 蓝)
- 桌面端: `#0366d6` (GitHub 蓝)

### 默认颜色
- 移动端: `#586069` (GitHub 灰)
- 桌面端: `#24292e` (GitHub 深灰)

### 图标（Emoji）
```
🏠 主页
📬 收件箱
🔍 探索
👤 我的
🚪 退出
📱 App Logo
```

## 徽章系统

### NavigationItem 接口
```typescript
interface NavigationItem {
  id: NavigationPage
  label: string
  icon: string
  badge?: number  // 可选，显示红色圆形徽章
}
```

### 使用示例
```typescript
const NAVIGATION_ITEMS = [
  { id: 'inbox', label: '收件箱', icon: '📬', badge: 5 }
]

// 在 UI 中显示 badge: "5"
{item.badge && <span className="nav-badge">{item.badge}</span>}
```

## 添加新导航项

### 1. 更新类型定义
```typescript
// src/types/navigation.ts
export type NavigationPage = 'home' | 'inbox' | 'explore' | 'profile' | 'new'

export const NAVIGATION_ITEMS: NavigationItem[] = [
  // ... 现有项
  { id: 'new', label: '新页面', icon: '📄' }
]
```

### 2. 创建页面组件
```typescript
// src/pages/NewPage.tsx
export function NewPage() {
  return <div>新页面内容</div>
}
```

### 3. 在 AppLayout 中渲染
```typescript
// src/components/layout/AppLayout.tsx
case 'new':
  return <NewPage token={token} />
```

## 常见问题

### Q: 如何修改导航项的顺序？
A: 编辑 `src/types/navigation.ts` 中的 `NAVIGATION_ITEMS` 数组顺序。

### Q: 如何添加新的导航项？
A: 参考上面的"添加新导航项"步骤。

### Q: 如何隐藏某个导航项？
A: 从 `NAVIGATION_ITEMS` 中移除该项，或添加条件判断。

### Q: 如何修改导航项的图标？
A: 编辑 `NAVIGATION_ITEMS` 中对应项的 `icon` 字段。

### Q: 徽章如何显示数字？
A: 在 `NAVIGATION_ITEMS` 中添加 `badge` 字段：
```typescript
{ id: 'inbox', label: '收件箱', icon: '📬', badge: 3 }
```

### Q: 如何自定义导航样式？
A: 编辑 `MobileBottomNav.css` 或 `DesktopSidebar.css`。

### Q: 移动端导航怎么自动隐藏内容？
A: 移动端内容添加 `padding-bottom: 70px` 预留空间。

## 调试技巧

### 检查当前平台
```typescript
import { usePlatform } from '@/hooks/usePlatform'

function DebugComponent() {
  const platformInfo = usePlatform()
  console.log('Platform:', platformInfo.platform)  // 'mobile' | 'desktop'
  console.log('OS:', platformInfo.os)              // 'iOS' | 'Android' | ...
  console.log('Screen Size:', platformInfo.screenSize)  // 'small' | 'medium' | 'large'
}
```

### 在浏览器中测试响应式
1. 打开开发者工具 (F12)
2. 点击设备工具栏图标
3. 调整视口宽度
4. 观察导航自动切换

### 强制切换平台
在浏览器控制台运行：
```javascript
// 修改 window.innerWidth 来测试不同屏幕大小
window.innerWidth  // 检查当前宽度
```

## 相关资源

| 资源 | 说明 |
|------|------|
| NAVIGATION_SYSTEM.md | 详细的导航系统文档 |
| LATEST_UPDATES.md | 最新更新说明 |
| src/types/navigation.ts | 类型定义和常量 |
| src/components/layout/AppLayout.tsx | 应用主布局 |

---

**最后更新**: 2024-11-19
**版本**: 1.0.0
