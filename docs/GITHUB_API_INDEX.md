# GitHub API 快速索引

**此文件是 `GITHUB_API.md` 的快速查阅索引，包含所有 170+ 个 API 端点的列表。**

---

## 📌 快速导航

| 分类 | 端点数 | 快速链接 |
|-----|-------|--------|
| 认证与授权 | 4 | [查看](#认证与授权) |
| 用户相关 | 24 | [查看](#用户相关-api) |
| 仓库相关 | 40 | [查看](#仓库相关-api) |
| 分支和标签 | 15 | [查看](#分支和标签-api) |
| 提交 | 10 | [查看](#提交-api) |
| Pull Request | 24 | [查看](#pull-request-api) |
| Issue | 12 | [查看](#issue-api) |
| 标签和里程碑 | 10 | [查看](#标签和里程碑-api) |
| 评论 | 2 | [查看](#评论-api) |
| Reviews 和 Reactions | 6 | [查看](#reviews-和-reactions) |
| 搜索 | 4 | [查看](#搜索-api) |
| Webhooks 和事件 | 4 | [查看](#webhooks-和事件) |
| 团队和协作 | 15 | [查看](#团队和协作) |
| **总计** | **170+** | |

---

## 🔐 认证与授权

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 1 | OAuth 授权流程 | `GET https://github.com/login/oauth/authorize` | GET | ❌ |
| 2 | 交换 Access Token | `POST https://github.com/login/oauth/access_token` | POST | ❌ |
| 3 | 获取当前用户信息 | `GET /user` | GET | ✅ |
| 4 | 刷新 OAuth 令牌 | `POST https://github.com/login/oauth/access_token` | POST | ❌ |

---

## 👤 用户相关 API

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 5 | 获取指定用户信息 | `GET /users/:username` | GET | ❌ |
| 6 | 获取用户公开事件 | `GET /users/:username/events` | GET | ❌ |
| 7 | 获取用户 Followers | `GET /users/:username/followers` | GET | ❌ |
| 8 | 获取用户 Following | `GET /users/:username/following` | GET | ❌ |
| 9 | 检查是否关注用户 | `GET /user/following/:username` | GET | ✅ |
| 10 | 关注用户 | `PUT /user/following/:username` | PUT | ✅ |
| 11 | 取消关注用户 | `DELETE /user/following/:username` | DELETE | ✅ |
| 12 | 获取用户仓库 | `GET /users/:username/repos` | GET | ❌ |
| 13 | 获取当前用户仓库 | `GET /user/repos` | GET | ✅ |
| 14 | 获取用户 Gists | `GET /users/:username/gists` | GET | ❌ |
| 15 | 获取用户 Organizations | `GET /users/:username/orgs` | GET | ❌ |
| 16 | 获取用户 Starred 仓库 | `GET /users/:username/starred` | GET | ❌ |
| 17 | 获取当前用户 Starred | `GET /user/starred` | GET | ✅ |
| 18 | 获取用户订阅 | `GET /users/:username/subscriptions` | GET | ❌ |
| 19 | 获取用户档案 | `GET /user` | GET | ✅ |
| 20 | 更新用户档案 | `PATCH /user` | PATCH | ✅ |
| 21 | 获取用户公钥 | `GET /users/:username/keys` | GET | ❌ |
| 22 | 获取当前用户公钥 | `GET /user/keys` | GET | ✅ |
| 23 | 添加 SSH 公钥 | `POST /user/keys` | POST | ✅ |
| 24 | 删除 SSH 公钥 | `DELETE /user/keys/:key_id` | DELETE | ✅ |
| 25 | 获取用户邮箱 | `GET /user/emails` | GET | ✅ |
| 26 | 添加邮箱 | `POST /user/emails` | POST | ✅ |
| 27 | 删除邮箱 | `DELETE /user/emails` | DELETE | ✅ |
| 28 | 设置主邮箱 | `PATCH /user/emails` | PATCH | ✅ |

---

## 📦 仓库相关 API

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 29 | 获取仓库信息 | `GET /repos/:owner/:repo` | GET | ❌ |
| 30 | 获取仓库 README | `GET /repos/:owner/:repo/readme` | GET | ❌ |
| 31 | 获取文件内容 | `GET /repos/:owner/:repo/contents/:path` | GET | ❌ |
| 32 | 创建或更新文件 | `PUT /repos/:owner/:repo/contents/:path` | PUT | ✅ |
| 33 | 删除文件 | `DELETE /repos/:owner/:repo/contents/:path` | DELETE | ✅ |
| 34 | 获取许可证信息 | `GET /repos/:owner/:repo/license` | GET | ❌ |
| 35 | 获取贡献者列表 | `GET /repos/:owner/:repo/contributors` | GET | ❌ |
| 36 | 获取语言统计 | `GET /repos/:owner/:repo/languages` | GET | ❌ |
| 37 | 获取 Commits 统计 | `GET /repos/:owner/:repo/stats/contributors` | GET | ❌ |
| 38 | 获取代码频率 | `GET /repos/:owner/:repo/stats/code_frequency` | GET | ❌ |
| 39 | 获取提交活动 | `GET /repos/:owner/:repo/stats/commit_activity` | GET | ❌ |
| 40 | 获取 Punch Card | `GET /repos/:owner/:repo/stats/punch_card` | GET | ❌ |
| 41 | 获取 Watchers | `GET /repos/:owner/:repo/watchers` | GET | ❌ |
| 42 | 获取 Stargazers | `GET /repos/:owner/:repo/stargazers` | GET | ❌ |
| 43 | 获取 Forks | `GET /repos/:owner/:repo/forks` | GET | ❌ |
| 44 | 创建 Fork | `POST /repos/:owner/:repo/forks` | POST | ✅ |
| 45 | 获取仓库通知 | `GET /repos/:owner/:repo/notifications` | GET | ✅ |
| 46 | 检查是否 Star | `GET /user/starred/:owner/:repo` | GET | ✅ |
| 47 | Star 仓库 | `PUT /user/starred/:owner/:repo` | PUT | ✅ |
| 48 | 取消 Star | `DELETE /user/starred/:owner/:repo` | DELETE | ✅ |
| 49 | 获取 Watching 仓库 | `GET /user/subscriptions` | GET | ✅ |
| 50 | 检查是否 Watch | `GET /user/subscriptions/:owner/:repo` | GET | ✅ |
| 51 | Watch 仓库 | `PUT /user/subscriptions/:owner/:repo` | PUT | ✅ |
| 52 | 取消 Watch | `DELETE /user/subscriptions/:owner/:repo` | DELETE | ✅ |
| 53 | 创建新仓库 | `POST /user/repos` | POST | ✅ |
| 54 | 为组织创建仓库 | `POST /orgs/:org/repos` | POST | ✅ |
| 55 | 更新仓库 | `PATCH /repos/:owner/:repo` | PATCH | ✅ |
| 56 | 删除仓库 | `DELETE /repos/:owner/:repo` | DELETE | ✅ |
| 57 | 转让仓库 | `PATCH /repos/:owner/:repo` | PATCH | ✅ |
| 58 | 获取 Topics | `GET /repos/:owner/:repo/topics` | GET | ❌ |
| 59 | 更新 Topics | `PUT /repos/:owner/:repo/topics` | PUT | ✅ |
| 60 | 获取 Webhooks | `GET /repos/:owner/:repo/hooks` | GET | ✅ |
| 61 | 创建 Webhook | `POST /repos/:owner/:repo/hooks` | POST | ✅ |
| 62 | 获取单个 Webhook | `GET /repos/:owner/:repo/hooks/:hook_id` | GET | ✅ |
| 63 | 更新 Webhook | `PATCH /repos/:owner/:repo/hooks/:hook_id` | PATCH | ✅ |
| 64 | 删除 Webhook | `DELETE /repos/:owner/:repo/hooks/:hook_id` | DELETE | ✅ |
| 65 | 获取部署 | `GET /repos/:owner/:repo/deployments` | GET | ✅ |
| 66 | 创建部署 | `POST /repos/:owner/:repo/deployments` | POST | ✅ |
| 67 | 获取部署状态 | `GET /repos/:owner/:repo/deployments/:deployment_id/statuses` | GET | ✅ |
| 68 | 创建部署状态 | `POST /repos/:owner/:repo/deployments/:deployment_id/statuses` | POST | ✅ |

---

## 🌿 分支和标签 API

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 69 | 获取所有分支 | `GET /repos/:owner/:repo/branches` | GET | ❌ |
| 70 | 获取单个分支 | `GET /repos/:owner/:repo/branches/:branch` | GET | ❌ |
| 71 | 创建分支 | `POST /repos/:owner/:repo/git/refs` | POST | ✅ |
| 72 | 删除分支 | `DELETE /repos/:owner/:repo/git/refs/heads/:branch` | DELETE | ✅ |
| 73 | 重命名分支 | `POST /repos/:owner/:repo/branches/:branch/rename` | POST | ✅ |
| 74 | 获取分支保护规则 | `GET /repos/:owner/:repo/branches/:branch/protection` | GET | ✅ |
| 75 | 创建分支保护 | `PUT /repos/:owner/:repo/branches/:branch/protection` | PUT | ✅ |
| 76 | 删除分支保护 | `DELETE /repos/:owner/:repo/branches/:branch/protection` | DELETE | ✅ |
| 77 | 获取所有标签 | `GET /repos/:owner/:repo/tags` | GET | ❌ |
| 78 | 获取单个标签 | `GET /repos/:owner/:repo/releases/tags/:tag` | GET | ❌ |
| 79 | 获取 Releases | `GET /repos/:owner/:repo/releases` | GET | ❌ |
| 80 | 获取单个 Release | `GET /repos/:owner/:repo/releases/:release_id` | GET | ❌ |
| 81 | 创建 Release | `POST /repos/:owner/:repo/releases` | POST | ✅ |
| 82 | 更新 Release | `PATCH /repos/:owner/:repo/releases/:release_id` | PATCH | ✅ |
| 83 | 删除 Release | `DELETE /repos/:owner/:repo/releases/:release_id` | DELETE | ✅ |

---

## 📝 提交 API

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 84 | 获取提交列表 | `GET /repos/:owner/:repo/commits` | GET | ❌ |
| 85 | 获取单个提交 | `GET /repos/:owner/:repo/commits/:sha` | GET | ❌ |
| 86 | 获取检查 | `GET /repos/:owner/:repo/commits/:sha/check-suites` | GET | ✅ |
| 87 | 获取提交状态 | `GET /repos/:owner/:repo/commits/:sha/status` | GET | ❌ |
| 88 | 获取 Statuses | `GET /repos/:owner/:repo/commits/:sha/statuses` | GET | ❌ |
| 89 | 创建提交状态 | `POST /repos/:owner/:repo/statuses/:sha` | POST | ✅ |
| 90 | 比较两个提交 | `GET /repos/:owner/:repo/compare/:basehead` | GET | ❌ |
| 91 | 获取 Blames | `GET /repos/:owner/:repo/blame/:path` | GET | ❌ |
| 92 | 获取 Git 提交 | `GET /repos/:owner/:repo/git/commits/:commit_sha` | GET | ❌ |
| 93 | 创建提交 | `POST /repos/:owner/:repo/git/commits` | POST | ✅ |

---

## 🔀 Pull Request API

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 94 | 获取 PR 列表 | `GET /repos/:owner/:repo/pulls` | GET | ❌ |
| 95 | 获取单个 PR | `GET /repos/:owner/:repo/pulls/:pull_number` | GET | ❌ |
| 96 | 创建 PR | `POST /repos/:owner/:repo/pulls` | POST | ✅ |
| 97 | 更新 PR | `PATCH /repos/:owner/:repo/pulls/:pull_number` | PATCH | ✅ |
| 98 | 获取 PR 提交 | `GET /repos/:owner/:repo/pulls/:pull_number/commits` | GET | ❌ |
| 99 | 获取 PR 文件 | `GET /repos/:owner/:repo/pulls/:pull_number/files` | GET | ❌ |
| 100 | 检查是否可合并 | `GET /repos/:owner/:repo/pulls/:pull_number/merge` | GET | ✅ |
| 101 | 合并 PR | `PUT /repos/:owner/:repo/pulls/:pull_number/merge` | PUT | ✅ |
| 102 | 解除合并 | `DELETE /repos/:owner/:repo/pulls/:pull_number/merge` | DELETE | ✅ |
| 103 | 获取 PR 评论 | `GET /repos/:owner/:repo/pulls/:pull_number/comments` | GET | ❌ |
| 104 | 添加 PR 评论 | `POST /repos/:owner/:repo/pulls/:pull_number/comments` | POST | ✅ |
| 105 | 获取单个评论 | `GET /repos/:owner/:repo/pulls/comments/:comment_id` | GET | ❌ |
| 106 | 更新 PR 评论 | `PATCH /repos/:owner/:repo/pulls/comments/:comment_id` | PATCH | ✅ |
| 107 | 删除 PR 评论 | `DELETE /repos/:owner/:repo/pulls/comments/:comment_id` | DELETE | ✅ |
| 108 | 获取 Reviews | `GET /repos/:owner/:repo/pulls/:pull_number/reviews` | GET | ❌ |
| 109 | 获取单个 Review | `GET /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id` | GET | ❌ |
| 110 | 创建 Review | `POST /repos/:owner/:repo/pulls/:pull_number/reviews` | POST | ✅ |
| 111 | 更新 Review | `PUT /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id` | PUT | ✅ |
| 112 | 删除 Review | `DELETE /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id` | DELETE | ✅ |
| 113 | 提交 Review | `POST /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id/events` | POST | ✅ |
| 114 | 忽略 Review | `PUT /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id/dismissals` | PUT | ✅ |
| 115 | 获取审核者 | `GET /repos/:owner/:repo/pulls/:pull_number/requested_reviewers` | GET | ❌ |
| 116 | 请求审核 | `POST /repos/:owner/:repo/pulls/:pull_number/requested_reviewers` | POST | ✅ |
| 117 | 移除审核 | `DELETE /repos/:owner/:repo/pulls/:pull_number/requested_reviewers` | DELETE | ✅ |

---

## 🐛 Issue API

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 118 | 获取 Issue 列表 | `GET /repos/:owner/:repo/issues` | GET | ❌ |
| 119 | 获取单个 Issue | `GET /repos/:owner/:repo/issues/:issue_number` | GET | ❌ |
| 120 | 创建 Issue | `POST /repos/:owner/:repo/issues` | POST | ✅ |
| 121 | 更新 Issue | `PATCH /repos/:owner/:repo/issues/:issue_number` | PATCH | ✅ |
| 122 | 锁定 Issue | `PUT /repos/:owner/:repo/issues/:issue_number/lock` | PUT | ✅ |
| 123 | 解锁 Issue | `DELETE /repos/:owner/:repo/issues/:issue_number/lock` | DELETE | ✅ |
| 124 | 获取 Issue 评论 | `GET /repos/:owner/:repo/issues/:issue_number/comments` | GET | ❌ |
| 125 | 添加 Issue 评论 | `POST /repos/:owner/:repo/issues/:issue_number/comments` | POST | ✅ |
| 126 | 获取单个评论 | `GET /repos/:owner/:repo/issues/comments/:comment_id` | GET | ❌ |
| 127 | 更新评论 | `PATCH /repos/:owner/:repo/issues/comments/:comment_id` | PATCH | ✅ |
| 128 | 删除评论 | `DELETE /repos/:owner/:repo/issues/comments/:comment_id` | DELETE | ✅ |
| 129 | 获取 Issue 事件 | `GET /repos/:owner/:repo/issues/:issue_number/events` | GET | ❌ |

---

## 🏷️ 标签和里程碑 API

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 130 | 获取所有标签 | `GET /repos/:owner/:repo/labels` | GET | ❌ |
| 131 | 获取单个标签 | `GET /repos/:owner/:repo/labels/:name` | GET | ❌ |
| 132 | 创建标签 | `POST /repos/:owner/:repo/labels` | POST | ✅ |
| 133 | 更新标签 | `PATCH /repos/:owner/:repo/labels/:name` | PATCH | ✅ |
| 134 | 删除标签 | `DELETE /repos/:owner/:repo/labels/:name` | DELETE | ✅ |
| 135 | 获取里程碑 | `GET /repos/:owner/:repo/milestones` | GET | ❌ |
| 136 | 获取单个里程碑 | `GET /repos/:owner/:repo/milestones/:milestone_number` | GET | ❌ |
| 137 | 创建里程碑 | `POST /repos/:owner/:repo/milestones` | POST | ✅ |
| 138 | 更新里程碑 | `PATCH /repos/:owner/:repo/milestones/:milestone_number` | PATCH | ✅ |
| 139 | 删除里程碑 | `DELETE /repos/:owner/:repo/milestones/:milestone_number` | DELETE | ✅ |

---

## 💬 评论 API

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 140 | 获取仓库评论 | `GET /repos/:owner/:repo/comments` | GET | ❌ |
| 141 | 获取单个评论 | `GET /repos/:owner/:repo/comments/:comment_id` | GET | ❌ |

---

## 👍 Reviews 和 Reactions

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 142 | 获取 Issue Reactions | `GET /repos/:owner/:repo/issues/:issue_number/reactions` | GET | ❌ |
| 143 | 添加 Issue Reaction | `POST /repos/:owner/:repo/issues/:issue_number/reactions` | POST | ✅ |
| 144 | 删除 Reaction | `DELETE /repos/:owner/:repo/issues/:issue_number/reactions/:reaction_id` | DELETE | ✅ |
| 145 | 获取评论 Reactions | `GET /repos/:owner/:repo/issues/comments/:comment_id/reactions` | GET | ❌ |
| 146 | 添加评论 Reaction | `POST /repos/:owner/:repo/issues/comments/:comment_id/reactions` | POST | ✅ |
| 147 | 删除评论 Reaction | `DELETE /repos/:owner/:repo/issues/comments/:comment_id/reactions/:reaction_id` | DELETE | ✅ |

---

## 🔎 搜索 API

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 148 | 搜索仓库 | `GET /search/repositories` | GET | ❌ |
| 149 | 搜索代码 | `GET /search/code` | GET | ❌ |
| 150 | 搜索 Issue | `GET /search/issues` | GET | ❌ |
| 151 | 搜索用户 | `GET /search/users` | GET | ❌ |

---

## 📢 Webhooks 和事件

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 152 | 获取全局事件 | `GET /events` | GET | ❌ |
| 153 | 获取网络事件 | `GET /networks/:owner/:repo/events` | GET | ❌ |
| 154 | 获取接收事件 | `GET /users/:username/received_events` | GET | ❌ |
| 155 | 获取公开事件 | `GET /users/:username/received_events/public` | GET | ❌ |

---

## 👥 团队和协作

| # | 功能 | 端点 | 方法 | 认证 |
|---|------|------|------|------|
| 156 | 获取协作者 | `GET /repos/:owner/:repo/collaborators` | GET | ✅ |
| 157 | 获取权限 | `GET /repos/:owner/:repo/collaborators/:username/permission` | GET | ✅ |
| 158 | 添加协作者 | `PUT /repos/:owner/:repo/collaborators/:username` | PUT | ✅ |
| 159 | 移除协作者 | `DELETE /repos/:owner/:repo/collaborators/:username` | DELETE | ✅ |
| 160 | 获取团队列表 | `GET /orgs/:org/teams` | GET | ✅ |
| 161 | 获取单个团队 | `GET /teams/:team_id` | GET | ✅ |
| 162 | 创建团队 | `POST /orgs/:org/teams` | POST | ✅ |
| 163 | 更新团队 | `PATCH /teams/:team_id` | PATCH | ✅ |
| 164 | 删除团队 | `DELETE /teams/:team_id` | DELETE | ✅ |
| 165 | 获取团队成员 | `GET /teams/:team_id/members` | GET | ✅ |
| 166 | 添加团队成员 | `PUT /teams/:team_id/memberships/:username` | PUT | ✅ |
| 167 | 移除团队成员 | `DELETE /teams/:team_id/memberships/:username` | DELETE | ✅ |
| 168 | 获取团队仓库 | `GET /teams/:team_id/repos` | GET | ✅ |
| 169 | 添加仓库到团队 | `PUT /teams/:team_id/repos/:owner/:repo` | PUT | ✅ |
| 170 | 移除仓库 | `DELETE /teams/:team_id/repos/:owner/:repo` | DELETE | ✅ |

---

## 🎯 常用 API 组合

### 1️⃣ 用户认证和档案查询
```
1. POST /login/oauth/access_token - 获取 token
2. GET /user - 获取当前用户信息
3. GET /user/repos - 获取用户仓库
4. GET /user/starred - 获取 Starred 仓库
```

### 2️⃣ 仓库浏览和管理
```
1. GET /repos/:owner/:repo - 获取仓库信息
2. GET /repos/:owner/:repo/issues - 获取 Issues
3. GET /repos/:owner/:repo/pulls - 获取 PRs
4. GET /repos/:owner/:repo/contributors - 获取贡献者
```

### 3️⃣ Issue 和 PR 工作流
```
1. POST /repos/:owner/:repo/issues - 创建 Issue
2. PATCH /repos/:owner/:repo/issues/:number - 更新 Issue
3. POST /repos/:owner/:repo/issues/:number/comments - 添加评论
4. GET /repos/:owner/:repo/issues/:number/events - 获取事件
```

### 4️⃣ Pull Request 工作流
```
1. POST /repos/:owner/:repo/pulls - 创建 PR
2. GET /repos/:owner/:repo/pulls/:number/files - 获取修改文件
3. POST /repos/:owner/:repo/pulls/:number/reviews - 创建 Review
4. PUT /repos/:owner/:repo/pulls/:number/merge - 合并 PR
```

### 5️⃣ 搜索和发现
```
1. GET /search/repositories - 搜索仓库
2. GET /search/users - 搜索用户
3. GET /search/code - 搜索代码
4. GET /events - 获取最新事件
```

---

## 📚 相关资源

- **完整文档**: 参考 `GITHUB_API.md`
- **官方文档**: https://docs.github.com/en/rest
- **API 状态**: https://www.githubstatus.com/
- **更新日志**: https://developer.github.com/changes/

---

**Last Updated**: 2024-11-19  
**API Version**: GitHub REST API v3  
**Total Endpoints**: 170+
