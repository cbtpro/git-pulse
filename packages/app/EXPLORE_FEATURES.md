# GitPulse 探索功能实现文档

## 概述

为 GitPulse 首页添加了完整的"探索"功能模块，提供丰富的 GitHub 生态信息和推荐内容。

## 新增功能

### 1. 导航栏扩展
- 添加"🔍 探索"标签页到首页导航
- 现在首页有三个主要标签：热门仓库、顶级开发者、探索

### 2. 探索页面内容

#### 🔥 Trending repositories today（今日热门仓库）
- **功能**：展示今天创建的最热门仓库
- **数据源**：GitHub API - 按星数排序
- **展示数量**：最多 6 个仓库卡片
- **包含信息**：
  - 仓库名称和所有者
  - 仓库描述（限制 2 行）
  - 星数和编程语言
  - 所有者头像
- **快捷链接**：指向官方 GitHub Trending 页面

#### 💡 你可能会喜欢（推荐仓库）
- **功能**：基于热门技术栈推荐优质仓库
- **数据源**：GitHub API - 高星数 JavaScript 项目
- **展示数量**：最多 6 个推荐仓库
- **推荐标准**：
  - 星数 > 5000
  - 编程语言：JavaScript
  - 按星数降序排列
- **用户价值**：发现有价值的开源项目

#### 🏷️ Topics（热门话题）
- **功能**：展示 GitHub 上的热门话题标签
- **包含话题**（10 个）：
  1. machine-learning - 机器学习和人工智能
  2. web-development - Web 开发框架和工具
  3. mobile-development - 移动应用开发
  4. data-science - 数据科学和分析
  5. devops - 开发运维和容器化
  6. cli - 命令行工具和应用
  7. game-development - 游戏开发
  8. blockchain - 区块链技术
  9. cloud-computing - 云计算和分布式系统
  10. database - 数据库系统和存储
- **显示信息**：
  - 话题名称
  - 话题描述
  - 相关仓库数量
- **交互**：点击跳转到 GitHub 话题页面

#### 📅 Events（GitHub 事件）
- **功能**：链接到 GitHub 官方活动页面
- **用途**：发现和参加 GitHub 社区活动
- **设计**：卡片式链接，顶部有蓝色装饰条

#### 💖 Explore GitHub Sponsors（GitHub 赞助）
- **功能**：链接到 GitHub Sponsors 页面
- **用途**：支持开源开发者的赞助计划
- **设计**：卡片式链接，顶部有红色装饰条

## 技术实现

### 组件架构

```typescript
// 新增 Topic 接口
interface Topic {
  name: string
  description: string
  related_count?: number
}

// HomePage 状态扩展
const [trendingToday, setTrendingToday] = useState<Repository[]>([])
const [recommendedRepos, setRecommendedRepos] = useState<Repository[]>([])
const [topics, setTopics] = useState<Topic[]>([])
```

### API 调用

**1. 获取今日热门仓库**
```
GET https://api.github.com/search/repositories?q=created:{today}&sort=stars&order=desc&per_page=10
```

**2. 获取推荐仓库**
```
GET https://api.github.com/search/repositories?q=stars:>5000+language:javascript&sort=stars&order=desc&per_page=8
```

**3. 热门话题**
- 本地数据，不需要 API 调用
- 预定义的热门话题列表

### 样式系统

新增 CSS 类：
- `.explore-content` - 探索内容容器
- `.explore-section` - 探索版块
- `.section-header` - 版块标题
- `.see-all-link` - "查看更多"链接
- `.small-grid` - 小型网格布局
- `.topics-grid` - 话题网格
- `.topic-card` - 话题卡片
- `.explore-cards` - 卡片容器
- `.card-link` - 卡片链接
- `.events-card` / `.sponsors-card` - 特定卡片样式

### 响应式设计

- **桌面端**（> 768px）：
  - Topics 网格：4 列
  - Explore Cards：2 列
  - 小型仓库网格：3-4 列

- **移动端**（≤ 768px）：
  - 所有网格：单列布局
  - 完整的触摸友好交互

### 动画效果

- **卡片悬停**：
  - 阴影增加 (box-shadow)
  - 轻微上升 (translateY: -2px 或 -4px)
  - 边框颜色变化为主题色
  - 过渡时间：0.3s

- **链接悬停**：
  - 箭头平滑移动 (translateX: 4px)
  - 颜色变化
  - 过渡时间：0.2s

## 文件修改

### 修改的文件

1. **src/pages/HomePage.tsx**
   - 添加 Topic 接口
   - 扩展 activeTab 类型为 'trending' | 'developers' | 'explore'
   - 添加 trendingToday、recommendedRepos、topics 状态
   - 添加 fetchTrendingRepositoriesForToday() 函数
   - 添加 fetchRecommendedRepositories() 函数
   - 添加 loadPopularTopics() 函数
   - 添加 loadExploreData() 函数
   - 在导航栏添加"探索"标签
   - 添加探索内容 JSX 结构

2. **src/styles/HomePage.css**
   - 添加探索内容样式
   - 添加 Topics 和 Explore Cards 样式
   - 添加响应式布局规则

## 用户体验流程

1. 用户点击首页"🔍 探索"标签
2. 页面加载骨架屏显示加载状态
3. 同时并发加载：
   - 今日热门仓库
   - 推荐仓库
   - 热门话题列表
4. 数据加载完成后展示所有内容
5. 用户可以：
   - 查看仓库详情
   - 点击话题查看相关项目
   - 访问 Events 和 Sponsors 页面

## 性能优化

- **并发加载**：使用 Promise.all() 并发获取多个数据源
- **缓存**：浏览器缓存 API 响应
- **限制**：
  - 展示数量限制（6-10 个）
  - 分页每页 8-20 条
  - 避免过度的 API 调用

## 兼容性

- ✅ 浅色主题
- ✅ 暗色主题
- ✅ 移动端响应式
- ✅ 无障碍访问 (a11y)
- ✅ 触摸设备友好

## 未来改进方向

1. **个性化推荐**
   - 基于用户关注话题的推荐
   - 基于用户语言偏好的推荐

2. **交互增强**
   - 保存感兴趣的仓库
   - 话题订阅
   - 自定义推荐算法

3. **数据扩展**
   - 加载更多仓库（分页）
   - 显示 GitHub 趋势排行榜
   - 整合 GitHub 新闻 API

4. **性能优化**
   - 虚拟滚动处理大量数据
   - 图片懒加载
   - 预加载下一页内容

## 测试建议

1. **功能测试**
   - 切换到探索标签，验证内容加载
   - 点击仓库链接，确保跳转正确
   - 点击话题链接，验证 GitHub 跳转

2. **性能测试**
   - 测量数据加载时间
   - 检查 API 请求数量
   - 验证内存使用情况

3. **响应式测试**
   - 在各种屏幕尺寸上测试
   - 验证移动端布局
   - 触摸交互测试

4. **主题测试**
   - 浅色主题显示
   - 暗色主题显示
   - 主题切换过渡

## API 配额考虑

- GitHub API 有速率限制（未认证：60req/h，认证：5000req/h）
- 探索功能在加载时会发起最多 2 个 API 请求
- 推荐使用 GitHub token 以获得更高速率限制
