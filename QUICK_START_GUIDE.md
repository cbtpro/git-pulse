# GitPulse 快速开始指南

## 🚀 启动应用

### 前置要求
- Node.js 18+
- pnpm 8+
- Rust (Tauri 要求)
- 一个有效的 GitHub Personal Access Token

### 生成 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 给 Token 命名 (例如: "GitPulse")
4. 选择权限:
   - `repo`: 访问公开和私有仓库
   - `read:user`: 读取用户信息
5. 点击 "Generate token"
6. **复制 Token** (刷新页面后将无法再次查看)

### 启动开发服务器

```bash
# 进入项目目录
cd /Volumes/WD_BLACK/github/gitpulse

# 安装依赖
pnpm install

# 启动应用
pnpm dev
```

应用将在几秒后启动，窗口标题为 "Git Pulse"。

## 📖 功能演示

### 1. 登录 (Login Screen)

**步骤:**
1. 应用启动时自动显示登录页面
2. 粘贴你的 GitHub Token 到输入框
3. 点击 "登录" 按钮或按 Enter
4. 应用验证 Token 并显示首页

**预期结果:**
- ✅ Token 有效时: 自动导航到首页
- ❌ Token 无效时: 显示红色错误提示 "Token 无效或已过期"
- ⚠️ 网络错误时: 显示 "验证失败，请检查网络连接"

### 2. 首页 - 热门仓库 (Trending Repositories)

**步骤:**
1. 登录后自动进入首页
2. "⭐ 热门仓库" 标签页默认选中
3. 页面加载最近 7 天创建的热门 GitHub 仓库
4. 点击任何仓库卡片可跳转到 GitHub

**展示的信息:**
- 🏷️ 仓库所有者头像
- 📛 仓库完整名称 (owner/repo)
- 📝 仓库描述
- ⭐ Star 数量 (格式化显示，例如: 1.5K)
- 📚 编程语言
- 🕐 最后更新时间

**交互:**
- 悬停卡片时会升起并显示阴影
- 点击仓库链接跳转到 GitHub 仓库页面
- 点击所有者名字跳转到所有者主页

### 3. 首页 - 顶级开发者 (Top Developers)

**步骤:**
1. 在首页点击 "👨‍💻 顶级开发者" 标签页
2. 页面加载粉丝最多的 GitHub 开发者
3. 点击开发者卡片可跳转到其 GitHub 主页

**展示的信息:**
- 👤 开发者头像
- 👨‍💻 开发者用户名
- 📝 开发者简介 (如有)
- 👥 粉丝数量
- 📦 公开仓库数量

**交互:**
- 卡片居中显示
- 悬停时升起并显示阴影
- 点击用户名跳转到 GitHub 个人主页

### 4. 个人资料页 (User Profile)

**步骤:**
1. 在首页右上角点击用户名 (例如: "👤 octocat")
2. 进入个人资料详情页面
3. 可以查看完整的用户信息

**展示的信息:**
- 👤 大头像
- 👨 昵称和用户名
- 📝 个人简介
- 📊 统计信息:
  - 👥 粉丝数
  - 👤 正在关注
  - 📦 公开仓库数
- 🏢 公司 (如有)
- 📍 位置 (如有)
- 🌐 博客链接 (如有)
- 𝕏 Twitter 账号 (如有)
- 📅 加入时间

**快速操作:**
- "访问 GitHub 主页": 打开 GitHub 个人资料页
- "查看所有仓库": 打开仓库列表页面

**导航:**
- 点击 "← 返回" 返回首页
- 点击 "登出" 退出登录，返回登录页

### 5. 登出 (Logout)

**步骤:**
1. 在首页右上角点击 "登出" 按钮
   - 或在个人资料页点击 "登出" 按钮
2. Token 被清除，返回登录页面
3. 可以使用另一个 Token 重新登录

**预期结果:**
- ✅ 页面重置到登录状态
- ✅ localStorage 中的 Token 和用户名被清除
- ✅ 可以立即使用另一个 Token 登录

## 🎨 主题 - 深色模式

应用会自动检测你的系统深色模式偏好：

**在 macOS 上启用深色模式:**
1. 系统偏好设置 > 外观
2. 选择 "深色"
3. 刷新应用 (CMD + R)
4. 应用自动转换为深色主题

**在 Windows 上启用深色模式:**
1. 设置 > 个性化 > 颜色
2. 选择 "深色"
3. 刷新应用 (F5)
4. 应用自动转换为深色主题

## 📱 响应式设计测试

### 在浏览器中测试

#### 桌面模式 (Desktop)
- 分辨率: 1920 x 1080 或更高
- 仓库网格: 3-4 列
- 开发者网格: 3-4 列

#### 平板模式 (Tablet)
- 分辨率: 768 x 1024
- 仓库网格: 2 列
- 开发者网格: 2 列

#### 手机模式 (Mobile)
- 分辨率: 375 x 667
- 仓库网格: 1 列
- 开发者网格: 1 列

**在 DevTools 中切换响应式模式:**
- Chrome/Edge: F12 → Toggle device toolbar (Ctrl+Shift+M / CMD+Shift+M)
- Firefox: F12 → Responsive Design Mode (Ctrl+Shift+M / CMD+Shift+M)
- Safari: 开发菜单 → 进入响应式设计模式

## 🔧 故障排除

### 问题: 登录页面显示空白

**解决:**
1. 检查浏览器控制台是否有错误 (F12 → Console)
2. 确保网络连接正常
3. 清除浏览器缓存
4. 重新启动应用: `pnpm dev`

### 问题: Token 验证失败

**解决:**
1. 验证 Token 是否正确复制 (没有多余空格)
2. 检查 Token 是否已过期
3. 生成新 Token: https://github.com/settings/tokens
4. 确保 Token 有 `repo` 权限

### 问题: API 请求超时

**解决:**
1. 检查网络连接
2. 检查 GitHub 是否可访问
3. 稍后重试 (GitHub 可能在速率限制)
4. 查看浏览器控制台了解详细错误

### 问题: 页面加载缓慢

**解决:**
1. 这是正常的，尤其是第一次加载
2. 获取开发者信息需要多个 API 调用
3. GitHub API 有速率限制
4. 检查网络速度 (F12 → Network)

### 问题: 在深色模式下文字看不清

**解决:**
1. 重新启动应用
2. 检查系统深色模式设置
3. 在浏览器开发工具中检查颜色值
4. 提交 Issue: https://github.com/cbtpro/gitpulse/issues

## 📊 页面加载时间参考

| 页面 | 预期加载时间 | 说明 |
|------|------------|------|
| 登录页 | < 0.5s | 只需加载 HTML/CSS |
| 首页 (热门仓库) | 1-3s | 1 个 API 调用 |
| 首页 (顶级开发者) | 3-5s | 多个 API 调用 |
| 个人资料页 | 1-2s | 1 个 API 调用 |

> 时间可能因网络和 GitHub API 状态而异

## 🌐 API 限制

**GitHub API 速率限制:**
- 无认证: 60 次请求/小时
- 有 Token 认证: **5000 次请求/小时**

**建议:**
- 使用有效的 Token 避免被限制
- 避免在短时间内重复刷新
- 如果经常超限，考虑生成特殊权限的 Token

## 📝 API 调用追踪

**在浏览器控制台查看 API 调用:**
1. 打开 DevTools (F12)
2. 进入 "Network" 标签页
3. 刷新页面 (F5)
4. 查看所有请求到 `api.github.com` 的记录
5. 点击每个请求查看详细信息

## 💡 使用技巧

### 快速搜索和浏览
1. 使用热门仓库了解最新 GitHub 趋势
2. 查看顶级开发者学习编程技巧
3. 点击开发者用户名了解他们的技术栈

### 最佳实践
- ✅ 定期更新 Token (GitHub 建议每 90 天)
- ✅ 不要分享你的 Token
- ✅ 使用最小必要权限的 Token
- ✅ 在公共计算机上登出

### 高级用法
- 研究热门项目的架构
- 学习顶级开发者的编程风格
- 追踪你感兴趣的项目
- 寻找合作和学习机会

## 📚 更多资源

- [GitHub REST API 文档](https://docs.github.com/rest)
- [GitHub 个人访问 Token](https://docs.github.com/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Tauri 文档](https://tauri.app/v1/guides/)
- [React 文档](https://react.dev)

## 🎯 下一步

- 尝试所有功能
- 测试不同的 GitHub Token
- 在不同设备上测试
- 在浅色和深色模式下测试
- 提供反馈和建议

---

**祝你使用愉快！** 🚀
