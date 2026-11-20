# GitPulse 分层 UI 架构 - 快速开始指南

## 什么是分层 UI 架构？

GitPulse 现在使用分层 UI 架构，自动根据运行环境（iOS、Android、Windows、macOS 或 Linux）以及屏幕大小选择加载对应的用户界面。

- **移动端**: 单栏布局，优化触摸交互，大按钮和输入框
- **桌面端**: 双栏布局，完整功能展示，专业设计

## 核心概念

### 1. 平台检测
应用会自动检测当前运行的平台：
```typescript
// 操作系统
iOS, Android, Windows, macOS, Linux

// 设备类型
mobile (屏幕宽度 <= 768px) 或 desktop

// 屏幕大小
small (< 480px), medium (480-1024px), large (> 1024px)
```

### 2. 自动视图选择
应用根据平台自动选择合适的视图：
```
用户打开应用
  ↓
检测平台类型
  ├─ 移动设备 → 加载 MobileLoginView
  └─ 桌面设备 → 加载 DesktopLoginView
```

### 3. 响应式适配
当用户调整窗口大小时，应用会自动适应：
- 窗口变小 (≤ 768px) → 切换到移动端布局
- 窗口变大 (> 768px) → 切换到桌面端布局

## 在代码中使用

### 获取平台信息

```typescript
import { usePlatform, useIsMobile, useIsDesktop } from '@/hooks/usePlatform'

function MyComponent() {
  // 获取完整平台信息
  const platformInfo = usePlatform()
  
  // 获取单个信息
  const isMobile = useIsMobile()
  const isDesktop = useIsDesktop()
  const screenSize = useScreenSize()
  
  // 获取操作系统信息
  const isIOS = useIsIOS()
  const isAndroid = useIsAndroid()
  const isWindows = useIsWindows()
  const isMacOS = useIsMacOS()
  const isLinux = useIsLinux()
  
  return (
    <div>
      Platform: {platformInfo.platform}
      OS: {platformInfo.os}
      Screen Size: {platformInfo.screenSize}
    </div>
  )
}
```

### 创建自适应组件

```typescript
// src/views/mypage/AdaptiveMyPage.tsx
import { usePlatform } from '@/hooks/usePlatform'
import { MobileMyPageView } from './mobile/MobileMyPageView'
import { DesktopMyPageView } from './desktop/DesktopMyPageView'

export function AdaptiveMyPage() {
  const platformInfo = usePlatform()
  
  return platformInfo.platform === 'mobile' ? (
    <MobileMyPageView />
  ) : (
    <DesktopMyPageView />
  )
}
```

## 文件组织结构

创建一个新的自适应页面时，遵循以下结构：

```
src/views/
└── mypage/
    ├── AdaptiveMyPage.tsx           ← 自适应包装器
    ├── mobile/
    │   └── MobileMyPageView.tsx     ← 移动端实现
    └── desktop/
        └── DesktopMyPageView.tsx    ← 桌面端实现

src/styles/views/
├── MyPageMobile.css                 ← 移动端样式
└── MyPageDesktop.css                ← 桌面端样式
```

## 创建新页面的步骤

### 步骤 1: 创建自适应包装器

```typescript
// src/views/mypage/AdaptiveMyPage.tsx
import { usePlatform } from '@/hooks/usePlatform'
import { MobileMyPageView } from './mobile/MobileMyPageView'
import { DesktopMyPageView } from './desktop/DesktopMyPageView'

interface AdaptiveMyPageProps {
  // 定义你的 props
}

export function AdaptiveMyPage(props: AdaptiveMyPageProps) {
  const platformInfo = usePlatform()
  
  return platformInfo.platform === 'mobile' ? (
    <MobileMyPageView {...props} />
  ) : (
    <DesktopMyPageView {...props} />
  )
}
```

### 步骤 2: 创建移动端视图

```typescript
// src/views/mypage/mobile/MobileMyPageView.tsx
import '../../../styles/views/MyPageMobile.css'

interface MobileMyPageViewProps {
  // 定义你的 props
}

export function MobileMyPageView(props: MobileMyPageViewProps) {
  return (
    <div className="mobile-mypage-view">
      {/* 移动端 UI */}
    </div>
  )
}
```

### 步骤 3: 创建桌面端视图

```typescript
// src/views/mypage/desktop/DesktopMyPageView.tsx
import '../../../styles/views/MyPageDesktop.css'

interface DesktopMyPageViewProps {
  // 定义你的 props
}

export function DesktopMyPageView(props: DesktopMyPageViewProps) {
  return (
    <div className="desktop-mypage-view">
      {/* 桌面端 UI */}
    </div>
  )
}
```

### 步骤 4: 创建移动端样式

```css
/* src/styles/views/MyPageMobile.css */

.mobile-mypage-view {
  /* 移动端特定样式 */
  padding: 1rem;
  background: white;
}

.mobile-button {
  /* 移动端按钮更大 */
  padding: 1rem 1.5rem;
  font-size: 1.1rem;
  width: 100%;
}

/* 响应式设计 */
@media (max-width: 600px) {
  .mobile-mypage-view {
    padding: 0.5rem;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .mobile-mypage-view {
    background: #0d1117;
    color: #c9d1d9;
  }
}
```

### 步骤 5: 创建桌面端样式

```css
/* src/styles/views/MyPageDesktop.css */

.desktop-mypage-view {
  /* 桌面端特定样式 */
  display: flex;
  gap: 2rem;
  padding: 2rem;
  background: white;
}

.desktop-sidebar {
  /* 侧边栏 */
  width: 250px;
  flex-shrink: 0;
}

.desktop-content {
  /* 主内容区 */
  flex: 1;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .desktop-mypage-view {
    background: #0d1117;
    color: #c9d1d9;
  }
}

/* 响应式缩小到移动大小 */
@media (max-width: 768px) {
  .desktop-mypage-view {
    flex-direction: column;
  }
  
  .desktop-sidebar {
    width: 100%;
  }
}
```

### 步骤 6: 在应用中使用

```typescript
// src/App.tsx
import { AdaptiveMyPage } from '@/views/mypage/AdaptiveMyPage'

export function App() {
  // ... 其他代码
  
  return (
    <div>
      {/* 使用自适应组件 */}
      <AdaptiveMyPage />
    </div>
  )
}
```

## 移动端 UI 设计原则

✅ **应该做**:
- 使用大按钮和输入框（至少 44x44px）便于点击
- 单栏布局减少滚动
- 简化功能，突出核心流程
- 大字体（至少 16px）便于阅读
- 足够的间距（1rem = 16px）
- 触摸友好的交互

❌ **不应该做**:
- 过小的点击目标
- 复杂的多栏布局
- 过小的字体
- 过于紧凑的设计
- 需要精确定位的交互

## 桌面端 UI 设计原则

✅ **应该做**:
- 多栏布局充分利用屏幕空间
- 完整的功能展示和信息
- 更多的视觉层次
- 鼠标/键盘导向的交互
- 侧边栏或顶部导航
- 高效的操作流程

❌ **不应该做**:
- 单栏布局浪费屏幕空间
- 隐藏重要功能
- 过于简单的设计
- 移动端特定的交互（如滑动汉堡菜单）

## 常见问题

### Q: 我可以在两个平台上使用相同的代码吗？
**A**: 可以，但不推荐。为了最好的用户体验，应该为每个平台优化 UI。

### Q: 如何测试移动端和桌面端的 UI？
**A**: 
- 在浏览器中使用开发者工具的设备模拟
- 调整浏览器窗口大小（≤768px 切换到移动端）
- 在实际设备上测试（iOS、Android 等）

### Q: 如何添加平台特定的功能？
**A**: 使用 usePlatform Hook 在组件中进行条件渲染：
```typescript
const isIOS = useIsIOS()
if (isIOS) {
  // iOS 特定功能
}
```

### Q: 我需要修改 PlatformDetector 吗？
**A**: 通常不需要。PlatformDetector 已经可以检测所有常见的平台和设备类型。如果需要自定义逻辑，可以在 usePlatform 中扩展。

## 调试技巧

### 检查当前平台信息
```typescript
import { PlatformDetector } from '@/utils/PlatformDetector'

const detector = PlatformDetector.getInstance()
console.log(detector.getPlatformInfo())
```

### 在控制台中测试
```typescript
// 在浏览器控制台中运行：
window.__TAURI__ // 检查是否在 Tauri 应用中
navigator.userAgent // 检查 UserAgent
window.innerWidth // 检查窗口宽度
```

### 强制切换平台
在开发环程中，可以通过修改 PlatformDetector 来测试不同平台。

## 文档参考

- **详细架构文档**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **完成总结**: [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md)
- **任务验证**: [TASK_VERIFICATION.md](./TASK_VERIFICATION.md)

## 常用 Hooks 参考

```typescript
import {
  usePlatform,              // 获取完整平台信息
  useIsMobile,              // 是否为移动设备
  useIsDesktop,             // 是否为桌面设备
  useScreenSize,            // 屏幕大小 (small/medium/large)
  useIsIOS,                 // 是否为 iOS
  useIsAndroid,             // 是否为 Android
  useIsWindows,             // 是否为 Windows
  useIsMacOS,               // 是否为 macOS
  useIsLinux,               // 是否为 Linux
  useIsTauriApp,            // 是否在 Tauri 应用中运行
} from '@/hooks/usePlatform'
```

## 下一步

现在你已经了解了分层 UI 架构，可以：

1. ✅ 阅读详细的 [ARCHITECTURE.md](./ARCHITECTURE.md) 了解更多信息
2. ✅ 为其他页面（HomePage、ProfilePage）创建分平台视图
3. ✅ 添加深色模式支持
4. ✅ 创建平台特定的导航
5. ✅ 优化性能和用户体验

---

**Happy coding! 🚀**
