# GitHub API 文档完整指南

## 📚 文档概览

本文档集包含了 GitHub REST API 的完整参考资料，包括 170+ 个公开 API 端点，支持 GitPulse 项目的所有功能开发需求。

---

## 📁 文件结构

### 1. **GITHUB_API.md** ⭐ 主文档
- **行数**: 2686 行
- **大小**: 57 KB
- **内容**: 完整详细的 API 参考文档

**包含内容**:
- ✅ 完整的 170+ 个 API 端点详细说明
- ✅ 所有参数和返回值的完整文档
- ✅ 请求/响应示例
- ✅ 权限范围说明（20+ 种权限）
- ✅ 速率限制和最佳实践
- ✅ HTTP 状态码参考
- ✅ 常见错误处理指南
- ✅ 官方资源链接

**按功能分类**:
1. 认证与授权 (4 个 API)
2. 用户相关 (24 个 API)
3. 仓库相关 (40 个 API)
4. 分支和标签 (15 个 API)
5. 提交 (10 个 API)
6. Pull Request (24 个 API)
7. Issue (12 个 API)
8. 标签和里程碑 (10 个 API)
9. 评论 (2 个 API)
10. Reviews 和 Reactions (6 个 API)
11. 搜索 (4 个 API)
12. Webhooks 和事件 (4 个 API)
13. 团队和协作 (15 个 API)

---

### 2. **GITHUB_API_INDEX.md** 📇 快速索引
- **行数**: 344 行
- **大小**: 18 KB
- **内容**: 快速查阅索引表

**包含内容**:
- ✅ 所有 170+ 个 API 的速查表
- ✅ 按分类的表格格式
- ✅ 快速导航链接
- ✅ 常用 API 组合示例
- ✅ 相关资源链接

---

## 🚀 使用指南

### 场景 1: 我需要实现用户认证
👉 查看 `GITHUB_API.md` → **认证与授权** 部分
- API #1-4: OAuth 流程、Token 交换、验证用户

### 场景 2: 我需要获取用户信息和仓库
👉 查看 `GITHUB_API_INDEX.md` → **👤 用户相关 API** 表格
- API #5: 获取指定用户信息
- API #12-13: 获取用户仓库

### 场景 3: 我需要实现 Issue 和 PR 管理
👉 查看 `GITHUB_API.md` → **Issue API** 和 **Pull Request API** 部分
- 创建、更新、评论、关闭等完整操作

### 场景 4: 我需要实现搜索功能
👉 查看 `GITHUB_API_INDEX.md` → **🔎 搜索 API** 部分
- API #148-151: 仓库、代码、Issue、用户搜索

### 场景 5: 我需要快速查找某个 API
👉 使用 `GITHUB_API_INDEX.md` 中的表格查找
- 表格包含完整的端点 URL 和方法

---

## 📊 API 覆盖范围统计

| 分类 | 端点数 | 认证 | 无认证 |
|-----|-------|------|--------|
| 认证与授权 | 4 | 2 | 2 |
| 用户相关 | 24 | 12 | 12 |
| 仓库相关 | 40 | 24 | 16 |
| 分支和标签 | 15 | 7 | 8 |
| 提交 | 10 | 3 | 7 |
| Pull Request | 24 | 15 | 9 |
| Issue | 12 | 6 | 6 |
| 标签和里程碑 | 10 | 5 | 5 |
| 评论 | 2 | 0 | 2 |
| Reviews 和 Reactions | 6 | 4 | 2 |
| 搜索 | 4 | 0 | 4 |
| Webhooks 和事件 | 4 | 2 | 2 |
| 团队和协作 | 15 | 15 | 0 |
| **总计** | **170+** | **95** | **75** |

---

## 🔐 认证方式对比

| 方式 | 场景 | 限制 | 推荐用途 |
|------|------|------|--------|
| **无认证** | 仅查询公开数据 | 60 请求/小时 | 公开页面、浏览功能 |
| **Token 认证** | 应用后端 | 5000 请求/小时 | 个人应用、API 集成 |
| **OAuth** | 用户授权应用 | 5000 请求/小时 | GitPulse 用户登录 |
| **GitHub App** | 仓库集成 | 10,000 请求/小时 | 高级集成、自动化 |

---

## 📌 最常用的 API 组合

### 🔑 认证流程（3 个 API）
```
1. GET /login/oauth/authorize - 发起授权
2. POST /login/oauth/access_token - 获取 Token
3. GET /user - 验证 Token 有效性
```

### 👤 用户档案页面（4 个 API）
```
1. GET /user - 获取当前用户信息
2. GET /user/repos - 获取用户仓库
3. GET /users/:username/followers - 获取粉丝
4. GET /users/:username/following - 获取关注
```

### 📦 仓库浏览页面（5 个 API）
```
1. GET /repos/:owner/:repo - 获取仓库信息
2. GET /repos/:owner/:repo/issues - 获取 Issues
3. GET /repos/:owner/:repo/pulls - 获取 PRs
4. GET /repos/:owner/:repo/contributors - 获取贡献者
5. GET /repos/:owner/:repo/languages - 获取语言统计
```

### 🐛 Issue 管理工作流（6 个 API）
```
1. GET /repos/:owner/:repo/issues - 列出 Issues
2. POST /repos/:owner/:repo/issues - 创建 Issue
3. PATCH /repos/:owner/:repo/issues/:number - 更新 Issue
4. POST /repos/:owner/:repo/issues/:number/comments - 添加评论
5. POST /repos/:owner/:repo/issues/:number/reactions - 添加反应
6. DELETE /repos/:owner/:repo/issues/:number/lock - 解锁讨论
```

### 🔀 Pull Request 工作流（7 个 API）
```
1. GET /repos/:owner/:repo/pulls - 列出 PRs
2. POST /repos/:owner/:repo/pulls - 创建 PR
3. GET /repos/:owner/:repo/pulls/:number/files - 查看修改
4. POST /repos/:owner/:repo/pulls/:number/reviews - 创建 Review
5. POST /repos/:owner/:repo/pulls/:number/comments - 添加代码评论
6. PUT /repos/:owner/:repo/pulls/:number/merge - 合并 PR
7. GET /repos/:owner/:repo/pulls/:number/commits - 查看提交
```

### 🔎 搜索和发现（4 个 API）
```
1. GET /search/repositories - 搜索仓库
2. GET /search/users - 搜索用户
3. GET /search/code - 搜索代码
4. GET /events - 获取最新事件
```

---

## 🛠️ 工作示例

### 示例 1: 用户登录流程

```javascript
// 1. 重定向到 GitHub 授权页面
const authUrl = new URL('https://github.com/login/oauth/authorize');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', 'http://localhost:3000/callback');
authUrl.searchParams.set('scope', 'user,repo');
authUrl.searchParams.set('state', generateRandomState());
window.location = authUrl.toString();

// 2. 获取授权码后，交换 Access Token
const response = await fetch('https://github.com/login/oauth/access_token', {
  method: 'POST',
  headers: { 'Accept': 'application/json' },
  body: JSON.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: authCode,
    redirect_uri: 'http://localhost:3000/callback'
  })
});
const { access_token } = await response.json();

// 3. 使用 Token 验证用户身份
const userResponse = await fetch('https://api.github.com/user', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const user = await userResponse.json();
```

### 示例 2: 获取用户档案信息

```javascript
const token = 'your_access_token';
const headers = { 'Authorization': `Bearer ${token}` };

// 获取用户基本信息
const user = await fetch('https://api.github.com/user', { headers }).then(r => r.json());

// 获取用户仓库（包括私有仓库）
const repos = await fetch('https://api.github.com/user/repos?per_page=100', { headers })
  .then(r => r.json());

// 获取用户 Starred 仓库
const starred = await fetch('https://api.github.com/user/starred?per_page=100', { headers })
  .then(r => r.json());

// 获取用户关注列表
const following = await fetch('https://api.github.com/user/following?per_page=100', { headers })
  .then(r => r.json());

// 获取粉丝列表
const followers = await fetch('https://api.github.com/user/followers?per_page=100', { headers })
  .then(r => r.json());
```

### 示例 3: 创建和管理 Issue

```javascript
const owner = 'octocat';
const repo = 'Hello-World';
const token = 'your_access_token';
const headers = {
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/vnd.github.v3+json'
};

// 创建 Issue
const issue = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    title: 'Found a bug',
    body: 'I\'m having a problem with this.',
    labels: ['bug'],
    assignees: ['octocat']
  })
}).then(r => r.json());

// 添加评论
await fetch(
  `https://api.github.com/repos/${owner}/${repo}/issues/${issue.number}/comments`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({ body: 'Thanks for reporting this bug!' })
  }
);

// 关闭 Issue
await fetch(
  `https://api.github.com/repos/${owner}/${repo}/issues/${issue.number}`,
  {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ state: 'closed' })
  }
);
```

---

## 🎯 对于不同角色的建议

### 👨‍💼 项目经理
- 重点关注: Issue API, Pull Request API, 团队 API
- 文档部分: `GITHUB_API.md` → Issue API & Pull Request API
- 常用 API: #118-129, #94-117, #160-170

### 👨‍💻 后端开发者
- 重点关注: 认证, 仓库, Issue/PR, 搜索 API
- 文档部分: 完整的 `GITHUB_API.md`
- 常用 API: 所有类别

### 🎨 前端开发者
- 重点关注: 用户, 仓库, 搜索, 权限范围
- 文档部分: `GITHUB_API_INDEX.md` 快速查询
- 常用 API: #5-28, #29-68, #148-151

### 🔧 DevOps/CI-CD 工程师
- 重点关注: Webhooks, 部署, 状态检查, 工作流
- 文档部分: `GITHUB_API.md` → Webhooks & 部署相关
- 常用 API: #60-68, #152-155

### 📊 数据分析师
- 重点关注: 仓库统计, 贡献者, 事件, 搜索
- 文档部分: `GITHUB_API.md` → 仓库统计相关
- 常用 API: #35-40, #148-151, #152-155

---

## 🔗 官方参考资源

- **REST API 官方文档**: https://docs.github.com/en/rest
- **REST API 参考**: https://docs.github.com/en/rest/reference
- **GraphQL API 文档**: https://docs.github.com/en/graphql
- **GitHub Developer 文档**: https://docs.github.com/en/developers
- **API 状态页**: https://www.githubstatus.com/
- **更新日志**: https://developer.github.com/changes/

---

## 💡 最佳实践

### ✅ 认证
- 始终使用 HTTPS
- 安全存储 `client_secret`
- 使用 OAuth 进行用户授权
- 定期检查权限范围

### ✅ 性能
- 使用分页处理大量数据
- 利用 ETag 实现条件请求
- 缓存常用数据
- 监控速率限制

### ✅ 安全
- 验证请求来源（CSRF 保护）
- 验证 Webhook 签名
- 实现错误重试机制
- 记录 API 调用日志

### ✅ 用户体验
- 提供清晰的加载状态
- 实现离线缓存
- 显示速率限制信息
- 友好的错误提示

---

## 📝 维护说明

这份文档集将定期更新以保持同步：

- **检查更新**: 每季度检查官方 API 变化
- **添加示例**: 根据新功能添加用途示例
- **改进说明**: 根据团队反馈改进文档清晰度
- **版本控制**: 在 Git 中跟踪文档变化

---

## 📞 技术支持

如有问题或建议：
1. 查阅官方文档: https://docs.github.com/en/rest
2. 阅读本文档的相关部分
3. 检查错误代码和常见解决方案
4. 参考代码示例实现

---

## 📋 文档清单

- ✅ GITHUB_API.md - 完整 API 参考 (2686 行)
- ✅ GITHUB_API_INDEX.md - 快速索引表 (344 行)
- ✅ README_GITHUB_API.md - 本文档 (当前文件)
- ✅ 170+ 个 API 端点详细说明
- ✅ 20+ 种权限范围说明
- ✅ 完整的示例代码
- ✅ 官方资源链接

---

**文档元数据**
- 创建日期: 2024-11-19
- 最后更新: 2024-11-19
- API 版本: GitHub REST API v3
- 兼容版本: GitPulse v0.2.0+
- 语言: 中文 / English
- 维护者: GitPulse 开发团队

---

**总文档行数**: 3030+ 行
**总文档大小**: 75 KB
**覆盖端点**: 170+ 个
**覆盖权限**: 20+ 种
**覆盖场景**: 50+ 个

**这是一份为 GitPulse 项目的开发者编写的完整 GitHub API 参考文档集。**
