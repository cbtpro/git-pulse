# 骨架屏快速开始指南

## 什么是骨架屏？

骨架屏是在加载实际内容前显示的占位符，提供更好的用户体验。

```
加载前 (原始)          加载中 (骨架屏)        加载完成
┌──────────┐         ┌──────────┐         ┌──────────┐
│ 加载中... │    →    │ ░░░░░░░░ │    →    │ 实际内容 │
└──────────┘         └──────────┘         └──────────┘
                    (有动画效果)
```

## 使用骨架屏

### 1. 导入组件
```typescript
import { SkeletonLoader } from '../components/SkeletonLoader'
```

### 2. 在加载时显示
```typescript
{loading ? (
  <SkeletonLoader type="repository" count={6} />
) : (
  <ActualContent />
)}
```

## 四种骨架屏类型

| 类型 | 用途 | 示例 |
|------|------|------|
| `repository` | 仓库列表 | 热门仓库、搜索结果 |
| `developer` | 开发者列表 | 顶级开发者 |
| `profile` | 个人资料页 | 用户个人资料 |
| `inbox` | 消息列表 | 收件箱、通知 |

## 代码示例

### 仓库列表
```typescript
{loading ? (
  <SkeletonLoader type="repository" count={6} />
) : (
  <RepositoryList repositories={repos} />
)}
```

### 开发者列表
```typescript
{loading ? (
  <SkeletonLoader type="developer" count={8} />
) : (
  <DeveloperList developers={devs} />
)}
```

### 个人资料
```typescript
{loading ? (
  <SkeletonLoader type="profile" />
) : (
  <ProfileInfo user={userInfo} />
)}
```

## 配置参数

```typescript
interface SkeletonLoaderProps {
  type: 'repository' | 'developer' | 'profile' | 'inbox'
  count?: number  // 默认 6，profile 类型忽略此参数
}
```

## 视觉效果

✨ **Shimmer 动画**
- 光影流动效果
- 2 秒循环播放
- 浅色和暗色主题都支持

## 文件位置

```
packages/app/src/
├── components/
│   └── SkeletonLoader.tsx          # 骨架屏组件
├── styles/
│   └── SkeletonLoader.css          # 骨架屏样式
└── pages/
    ├── HomePage.tsx                # 已集成
    └── ProfilePage.tsx             # 已集成
```

## 性能

- **加载快速**：无额外 JavaScript 执行
- **动画流畅**：纯 CSS 动画
- **包大小**：只增加 ~3KB

## 常见问题

**Q: 如何改变骨架屏数量？**
```typescript
<SkeletonLoader type="repository" count={10} />
```

**Q: 如何自定义样式？**
编辑 `src/styles/SkeletonLoader.css`

**Q: 是否支持暗色主题？**
是的，自动适配系统主题

**Q: 移动端如何显示？**
自动响应式调整，1-2 列布局

## 下一步

- 查看完整文档：`SKELETON_SCREEN_IMPLEMENTATION.md`
- 修改骨架屏数量：修改 `count` 参数
- 自定义样式：编辑 CSS 文件
