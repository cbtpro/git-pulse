# GitPulse 分层 UI 架构

## 概述

GitPulse 实现了一个跨平台的分层 UI 架构，使应用能够在不同的平台（iOS、Android、Windows、macOS、Linux）上运行，同时为移动端和桌面端提供优化的用户界面。

## 核心组件

### 1. 平台检测 (PlatformDetector)

**文件**: `src/utils/PlatformDetector.ts`

负责检测应用运行的平台类型和相关信息。

**功能**:
- 检测操作系统（iOS、Android、Windows、macOS、Linux）
- 检测是否运行在 Tauri 框架中
- 检测屏幕大小和设备类型（mobile/desktop）
- 获取完整的平台信息对象

**核心方法**:
- `getPlatformInfo()` - 获取平台信息对象
- `isMobileDevice()` - 判断是否为移动设备
- `detectOS()` - 检测操作系统
- `getInstance()` - 获取单例实例

**屏幕大小分类**:
- 'small': < 480px
- 'medium': 480-1024px
- 'large': > 1024px

**移动/桌面判断规则**:
- 屏幕宽度 <= 768px: 移动设备
- UserAgent 包含移动设备关键字: 移动设备
- iOS/Android 设备: 移动设备
- 否则: 桌面设备

### 2. 响应式 Hooks (usePlatform)

**文件**: `src/hooks/usePlatform.ts`

提供 React Hooks 用于组件中访问平台信息。

**可用的 Hooks**:

```typescript
// 获取完整平台信息
const platformInfo = usePlatform()
// 返回: { platform: 'mobile' | 'desktop', os: 'iOS' | 'Android' | ..., screenSize: 'small' | 'medium' | 'large' }

// 判断是否为移动设备
const isMobile = useIsMobile()
// 返回: boolean

// 判断是否为桌面设备
const isDesktop = useIsDesktop()
// 返回: boolean

// 获取屏幕大小类别
const screenSize = useScreenSize()
// 返回: 'small' | 'medium' | 'large'

// 获取特定操作系统判断
const isIOS = useIsIOS()
const isAndroid = useIsAndroid()
const isWindows = useIsWindows()
const isMacOS = useIsMacOS()
const isLinux = useIsLinux()
// 返回: boolean

// 判断是否在 Tauri 应用中运行
const isTauriApp = useIsTauriApp()
// 返回: boolean
```

**实现特点**:
- 在组件挂载时获取平台信息
- 监听 resize 事件实现响应式
- 使用防抖避免频繁更新
- 自动清理事件监听器

### 3. 视图管理系统 (ViewManager)

**文件**: `src/views/ViewManager.tsx`

工厂模式实现的视图管理系统，支持动态加载和切换平台特定的组件。

**功能**:
- 注册移动端和桌面端组件对
- 根据平台类型动态获取对应的组件
- 创建自适应组件包装器

**使用示例**:
```typescript
import { viewManager } from '@/views/ViewManager'
import { MobileLoginView } from './login/mobile/MobileLoginView'
import { DesktopLoginView } from './login/desktop/DesktopLoginView'

// 注册视图
viewManager.registerView('login', MobileLoginView, DesktopLoginView)

// 获取对应平台的组件
const LoginComponent = viewManager.getView('login', 'mobile')
```

### 4. 自适应登录页面

**文件**:
- `src/views/login/AdaptiveLoginPage.tsx` - 自适应包装器
- `src/views/login/mobile/MobileLoginView.tsx` - 移动端实现
- `src/views/login/desktop/DesktopLoginView.tsx` - 桌面端实现
- `src/styles/views/LoginPageMobile.css` - 移动端样式
- `src/styles/views/LoginPageDesktop.css` - 桌面端样式

**设计特点**:

**移动端登录视图**:
- 单栏布局，优化触摸交互
- 大按钮和输入框，便于手指操作
- 功能列表缩减，专注于核心认证流程
- 响应式字体和间距
- 支持登录模式切换（Token/用户名密码）

**桌面端登录视图**:
- 双栏布局（左侧表单 + 右侧特性说明）
- 完整的功能展示
- 更加紧凑的设计
- 支持更复杂的交互
- 完整的功能描述和特性说明

**认证支持**:
- GitHub Token 认证
- 用户名和密码认证
- 令牌管理和存储
- 自动登录状态恢复

## 架构流程

```
应用启动 (App.tsx)
    ↓
检查登录状态
    ├─ 未登录 → AdaptiveLoginPage
    │            ↓
    │        检测平台类型 (usePlatform)
    │            ├─ 移动端 → MobileLoginView
    │            └─ 桌面端 → DesktopLoginView
    │
    └─ 已登录 → HomePage
```

## 文件组织结构

```
src/
├── utils/
│   └── PlatformDetector.ts          # 平台检测工具
├── hooks/
│   └── usePlatform.ts               # 平台相关 Hooks
├── views/
│   ├── ViewManager.tsx              # 视图管理系统
│   └── login/
│       ├── AdaptiveLoginPage.tsx    # 自适应包装器
│       ├── mobile/
│       │   └── MobileLoginView.tsx  # 移动端登录
│       └── desktop/
│           └── DesktopLoginView.tsx # 桌面端登录
├── styles/
│   └── views/
│       ├── LoginPageMobile.css      # 移动端样式
│       └── LoginPageDesktop.css     # 桌面端样式
├── services/
│   └── auth/
│       ├── GitHubAuthService.ts     # GitHub 认证服务
│       └── TokenManager.ts          # 令牌管理
└── App.tsx                           # 主应用入口
```

## 创建新的自适应页面

遵循以下步骤创建新的平台适配页面：

1. **创建自适应包装器**
```typescript
// src/views/mypage/AdaptiveMyPage.tsx
import { usePlatform } from '@/hooks/usePlatform'
import { MobileMyPageView } from './mobile/MobileMyPageView'
import { DesktopMyPageView } from './desktop/DesktopMyPageView'

export function AdaptiveMyPage(props: MyPageProps) {
  const platformInfo = usePlatform()
  
  return platformInfo.platform === 'mobile' ? (
    <MobileMyPageView {...props} />
  ) : (
    <DesktopMyPageView {...props} />
  )
}
```

2. **创建移动端视图**
```typescript
// src/views/mypage/mobile/MobileMyPageView.tsx
import '@../../../styles/views/MyPageMobile.css'

export function MobileMyPageView(props: MyPageProps) {
  // 移动端实现
  return <div className="mobile-mypage-view">...</div>
}
```

3. **创建桌面端视图**
```typescript
// src/views/mypage/desktop/DesktopMyPageView.tsx
import '@../../../styles/views/MyPageDesktop.css'

export function DesktopMyPageView(props: MyPageProps) {
  // 桌面端实现
  return <div className="desktop-mypage-view">...</div>
}
```

4. **创建样式文件**
```css
/* src/styles/views/MyPageMobile.css */
.mobile-mypage-view {
  /* 移动端样式 */
}

/* src/styles/views/MyPageDesktop.css */
.desktop-mypage-view {
  /* 桌面端样式 */
}
```

5. **在主应用中使用**
```typescript
// src/App.tsx
import { AdaptiveMyPage } from '@/views/mypage/AdaptiveMyPage'

// 在条件渲染中使用
<AdaptiveMyPage {...props} />
```

## 样式组织原则

- 每个页面在 `src/styles/views/` 下创建两个 CSS 文件
- 移动端样式: `{PageName}Mobile.css`
- 桌面端样式: `{PageName}Desktop.css`
- 使用 CSS 类名避免样式冲突
- 在相应的视图组件中导入对应的样式文件

## 响应式设计指南

**移动端优化**:
- 使用相对单位（rem、em）
- 大按钮和输入框便于点击
- 单栏布局减少滚动
- 简化功能，突出核心流程
- 大字体便于阅读

**桌面端优化**:
- 多栏布局充分利用屏幕空间
- 完整的功能展示
- 更多的信息和上下文
- 高效的操作流程
- 完整的功能描述

## 类型安全

- 所有视图组件使用 TypeScript 接口定义 Props
- PlatformDetector 返回类型明确的 PlatformInfo 对象
- 所有 Hooks 有完整的类型定义
- 通过 `npm run type-check` 验证类型安全

## 构建和部署

**类型检查**:
```bash
npm run type-check
```

**开发模式**:
```bash
pnpm dev
```

**生产构建**:
```bash
# 仅构建前端资源
./node_modules/.bin/vite build

# 完整的 Tauri 应用构建
npm run build
```

## 未来扩展

1. **创建 HomePage 和 ProfilePage 的分平台视图**
   - 移动端: 单栏布局，简化导航
   - 桌面端: 多栏布局，完整功能

2. **添加平台特定的导航**
   - 移动端: 底部标签栏或汉堡菜单
   - 桌面端: 侧边栏或顶部导航

3. **优化性能**
   - 代码分割和懒加载
   - 条件加载平台特定的资源
   - 缓存平台检测结果

4. **支持更多定制化**
   - 主题切换（亮色/暗色模式）
   - 字体大小调整
   - 布局定制化

## 技术栈

- **UI 框架**: React 18
- **构建工具**: Vite 5
- **应用框架**: Tauri 2
- **语言**: TypeScript
- **包管理**: pnpm
- **类型检查**: tsc
