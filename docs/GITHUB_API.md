# GitHub API 完整文档

本文档详尽列举了 GitHub 公开 API 的所有端点和功能，方便 GitPulse 项目开发者直接查阅。

**最后更新**: 2024年11月19日  
**API 版本**: GitHub REST API v3 (3.0.0)

---

## 目录

1. [认证与授权](#认证与授权)
2. [用户相关 API](#用户相关-api)
3. [仓库相关 API](#仓库相关-api)
4. [分支和标签 API](#分支和标签-api)
5. [提交 API](#提交-api)
6. [Pull Request API](#pull-request-api)
7. [Issue API](#issue-api)
8. [标签和里程碑 API](#标签和里程碑-api)
9. [评论 API](#评论-api)
10. [Reviews 和 Reactions](#reviews-和-reactions)
11. [搜索 API](#搜索-api)
12. [Webhooks 和事件](#webhooks-和事件)
13. [团队和协作](#团队和协作)
14. [权限范围说明](#权限范围说明)
15. [速率限制](#速率限制)
16. [官方参考资源](#官方参考资源)

---

## 认证与授权

### 1. OAuth 授权流程 - 发起授权

**端点**: `GET https://github.com/login/oauth/authorize`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `client_id` | string | ✅ | 应用的 GitHub App ID |
| `redirect_uri` | string | ✅ | 授权后的回调地址 |
| `scope` | string | ⚠️ | 请求的权限范围（逗号或空格分隔）|
| `state` | string | ✅ | 用于防止 CSRF 的状态值，授权后原样返回 |
| `allow_signup` | boolean | | 是否允许用户在登录时注册（默认: true）|

**返回值**: 重定向到 `redirect_uri`，携带 `code` 和 `state` 参数

**示例**:
```
https://github.com/login/oauth/authorize?client_id=xxx&redirect_uri=http://localhost:3000/callback&scope=user,repo&state=abc123
```

---

### 2. OAuth 授权流程 - 交换 Access Token

**端点**: `POST https://github.com/login/oauth/access_token`  
**方法**: POST  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `client_id` | string | ✅ | 应用的 GitHub App ID |
| `client_secret` | string | ✅ | 应用的密钥（需保密）|
| `code` | string | ✅ | 授权响应中获得的授权码 |
| `redirect_uri` | string | ✅ | 授权时使用的回调地址 |
| `state` | string | | 原始授权请求中使用的状态值 |

**返回**:
```json
{
  "access_token": "YOUR_GITHUB_ACCESS_TOKEN",
  "token_type": "bearer",
  "scope": "user,repo"
}
```

---

### 3. 获取当前用户信息 (Verify Token)

**端点**: `GET https://api.github.com/user`  
**方法**: GET  
**认证**: ✅ 需要 (Bearer Token)

**请求头**:
```
Authorization: Bearer <token>
Accept: application/vnd.github.v3+json
```

**返回**: 当前认证用户的完整信息
```json
{
  "login": "octocat",
  "id": 1,
  "node_id": "MDQ6VXNlcjE=",
  "avatar_url": "https://github.com/images/error/octocat_happy.gif",
  "gravatar_id": "",
  "url": "https://api.github.com/users/octocat",
  "html_url": "https://github.com/octocat",
  "followers_url": "https://api.github.com/users/octocat/followers",
  "following_url": "https://api.github.com/users/octocat/following{/other_user}",
  "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
  "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
  "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
  "organizations_url": "https://api.github.com/users/octocat/orgs",
  "repos_url": "https://api.github.com/users/octocat/repos",
  "events_url": "https://api.github.com/users/octocat/events{/privacy}",
  "received_events_url": "https://api.github.com/users/octocat/received_events",
  "type": "User",
  "site_admin": false,
  "name": "The Octocat",
  "company": "@github",
  "blog": "https://github.blog",
  "location": "San Francisco",
  "email": "octocat@github.com",
  "bio": "There once was...",
  "twitter_username": "monatheoctocat",
  "public_repos": 2,
  "public_gists": 1,
  "followers": 20,
  "following": 0,
  "created_at": "2011-01-26T19:01:12Z",
  "updated_at": "2011-01-26T19:14:43Z",
  "private_gists": 81,
  "total_private_repos": 100
}
```

---

### 4. 刷新 OAuth 令牌 (Token Refresh)

**端点**: `POST https://github.com/login/oauth/access_token`  
**方法**: POST  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `client_id` | string | ✅ | 应用的 GitHub App ID |
| `client_secret` | string | ✅ | 应用的密钥 |
| `grant_type` | string | ✅ | 固定值: `refresh_token` |
| `refresh_token` | string | ✅ | 刷新令牌 |

---

## 用户相关 API

### 5. 获取指定用户的公开信息

**端点**: `GET https://api.github.com/users/:username`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `:username` | string | ✅ | GitHub 用户名 |

**返回**: 用户信息对象

---

### 6. 获取用户的所有公开事件

**端点**: `GET https://api.github.com/users/:username/events`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `:username` | string | ✅ | GitHub 用户名 |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量（1-100，默认30）|

---

### 7. 获取用户的 Followers

**端点**: `GET https://api.github.com/users/:username/followers`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `:username` | string | ✅ | GitHub 用户名 |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量（1-100，默认30）|

---

### 8. 获取用户 Following（关注列表）

**端点**: `GET https://api.github.com/users/:username/following`  
**方法**: GET  
**认证**: 不需要

**返回**: 该用户关注的用户列表

---

### 9. 检查当前用户是否关注指定用户

**端点**: `GET https://api.github.com/user/following/:username`  
**方法**: GET  
**认证**: ✅ 需要

**返回**: 
- 状态码 204: 已关注
- 状态码 404: 未关注

---

### 10. 关注用户

**端点**: `PUT https://api.github.com/user/following/:username`  
**方法**: PUT  
**认证**: ✅ 需要

---

### 11. 取消关注用户

**端点**: `DELETE https://api.github.com/user/following/:username`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 12. 获取用户的所有仓库

**端点**: `GET https://api.github.com/users/:username/repos`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `:username` | string | ✅ | GitHub 用户名 |
| `type` | string | | 过滤类型: `all`, `owner`, `member` (默认: `owner`)|
| `sort` | string | | 排序: `created`, `updated`, `pushed`, `full_name` |
| `direction` | string | | 排序方向: `asc` 或 `desc` |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 13. 获取当前用户的仓库

**端点**: `GET https://api.github.com/user/repos`  
**方法**: GET  
**认证**: ✅ 需要

**参数**: 同上（#12）

---

### 14. 获取用户的 Gists

**端点**: `GET https://api.github.com/users/:username/gists`  
**方法**: GET  
**认证**: 不需要

---

### 15. 获取用户的 Organizations

**端点**: `GET https://api.github.com/users/:username/orgs`  
**方法**: GET  
**认证**: 不需要

---

### 16. 获取用户的 Starred 仓库列表

**端点**: `GET https://api.github.com/users/:username/starred`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `:username` | string | ✅ | GitHub 用户名 |
| `sort` | string | | 排序: `created`, `updated` (默认: `created`)|
| `direction` | string | | 排序方向: `asc` 或 `desc` |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 17. 获取当前用户的 Starred 仓库

**端点**: `GET https://api.github.com/user/starred`  
**方法**: GET  
**认证**: ✅ 需要

**参数**: 同上

---

### 18. 获取用户的订阅（Subscriptions）

**端点**: `GET https://api.github.com/users/:username/subscriptions`  
**方法**: GET  
**认证**: 不需要

---

### 19. 获取当前用户的用户档案设置

**端点**: `GET https://api.github.com/user`  
**方法**: GET  
**认证**: ✅ 需要

---

### 20. 更新当前用户的档案

**端点**: `PATCH https://api.github.com/user`  
**方法**: PATCH  
**认证**: ✅ 需要

**参数**:
```json
{
  "name": "The Octocat",
  "email": "octocat@github.com",
  "blog": "https://github.blog",
  "company": "@github",
  "location": "San Francisco",
  "bio": "There once was...",
  "twitter_username": "monatheoctocat"
}
```

---

### 21. 获取用户的所有公钥

**端点**: `GET https://api.github.com/users/:username/keys`  
**方法**: GET  
**认证**: 不需要

---

### 22. 获取当前用户的公钥

**端点**: `GET https://api.github.com/user/keys`  
**方法**: GET  
**认证**: ✅ 需要

---

### 23. 添加新的 SSH 公钥

**端点**: `POST https://api.github.com/user/keys`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "title": "My Key",
  "key": "ssh-rsa AAAAB3NzaC1yc2E..."
}
```

---

### 24. 删除 SSH 公钥

**端点**: `DELETE https://api.github.com/user/keys/:key_id`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 25. 获取用户的所有邮箱地址

**端点**: `GET https://api.github.com/user/emails`  
**方法**: GET  
**认证**: ✅ 需要（需要 `user:email` 权限）

---

### 26. 添加邮箱地址

**端点**: `POST https://api.github.com/user/emails`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "emails": ["octocat@github.com"]
}
```

---

### 27. 删除邮箱地址

**端点**: `DELETE https://api.github.com/user/emails`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 28. 设置主邮箱地址

**端点**: `PATCH https://api.github.com/user/emails`  
**方法**: PATCH  
**认证**: ✅ 需要

**参数**:
```json
{
  "email": "octocat@github.com",
  "primary": true,
  "verified": true
}
```

---

## 仓库相关 API

### 29. 获取单个仓库信息

**端点**: `GET https://api.github.com/repos/:owner/:repo`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `:owner` | string | ✅ | 仓库所有者 |
| `:repo` | string | ✅ | 仓库名称 |

**返回**: 完整的仓库对象

---

### 30. 获取仓库 README

**端点**: `GET https://api.github.com/repos/:owner/:repo/readme`  
**方法**: GET  
**认证**: 不需要

**返回**: README 文件内容（Markdown 格式）

---

### 31. 获取仓库文件内容

**端点**: `GET https://api.github.com/repos/:owner/:repo/contents/:path`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `:path` | string | ✅ | 文件路径 |
| `ref` | string | | 分支/标签/提交 SHA（默认: 默认分支）|

---

### 32. 创建或更新文件

**端点**: `PUT https://api.github.com/repos/:owner/:repo/contents/:path`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "message": "Create or update file",
  "content": "base64 encoded content",
  "branch": "main",
  "committer": {
    "name": "Monalisa Octocat",
    "email": "octocat@github.com"
  }
}
```

---

### 33. 删除文件

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/contents/:path`  
**方法**: DELETE  
**认证**: ✅ 需要

**参数**:
```json
{
  "message": "Delete file",
  "sha": "current file sha"
}
```

---

### 34. 获取仓库的许可证信息

**端点**: `GET https://api.github.com/repos/:owner/:repo/license`  
**方法**: GET  
**认证**: 不需要

---

### 35. 获取仓库的所有贡献者

**端点**: `GET https://api.github.com/repos/:owner/:repo/contributors`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `anon` | string | | 包含匿名贡献者: `true` 或 `1` |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 36. 获取仓库的语言统计

**端点**: `GET https://api.github.com/repos/:owner/:repo/languages`  
**方法**: GET  
**认证**: 不需要

**返回**:
```json
{
  "C": 561669,
  "Scheme": 859671
}
```

---

### 37. 获取仓库的 Commits 统计

**端点**: `GET https://api.github.com/repos/:owner/:repo/stats/contributors`  
**方法**: GET  
**认证**: 不需要

---

### 38. 获取仓库的代码频率

**端点**: `GET https://api.github.com/repos/:owner/:repo/stats/code_frequency`  
**方法**: GET  
**认证**: 不需要

**返回**: 时间戳与代码行数变化的数组

---

### 39. 获取仓库的提交活动

**端点**: `GET https://api.github.com/repos/:owner/:repo/stats/commit_activity`  
**方法**: GET  
**认证**: 不需要

---

### 40. 获取仓库的 Punch Card 数据

**端点**: `GET https://api.github.com/repos/:owner/:repo/stats/punch_card`  
**方法**: GET  
**认证**: 不需要

---

### 41. 获取仓库的所有 Watchers

**端点**: `GET https://api.github.com/repos/:owner/:repo/watchers`  
**方法**: GET  
**认证**: 不需要

---

### 42. 获取仓库的所有 Stargazers（Star 者）

**端点**: `GET https://api.github.com/repos/:owner/:repo/stargazers`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `starred_at` | string | | 包含 starred_at 时间戳 (true)|
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 43. 获取仓库的所有 Forks

**端点**: `GET https://api.github.com/repos/:owner/:repo/forks`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `sort` | string | | 排序: `newest`, `oldest`, `stargazers` |
| `direction` | string | | 排序方向: `asc` 或 `desc` |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 44. 创建 Fork

**端点**: `POST https://api.github.com/repos/:owner/:repo/forks`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "owner": "octocat",
  "name": "Hello-World",
  "description": "My first repository on GitHub!",
  "private": false
}
```

---

### 45. 获取仓库的通知

**端点**: `GET https://api.github.com/repos/:owner/:repo/notifications`  
**方法**: GET  
**认证**: ✅ 需要

---

### 46. 检查当前用户是否 Star 了仓库

**端点**: `GET https://api.github.com/user/starred/:owner/:repo`  
**方法**: GET  
**认证**: ✅ 需要

**返回**: 
- 状态码 204: 已 Star
- 状态码 404: 未 Star

---

### 47. Star 仓库

**端点**: `PUT https://api.github.com/user/starred/:owner/:repo`  
**方法**: PUT  
**认证**: ✅ 需要

---

### 48. 取消 Star 仓库

**端点**: `DELETE https://api.github.com/user/starred/:owner/:repo`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 49. 获取当前用户 Watching 的所有仓库

**端点**: `GET https://api.github.com/user/subscriptions`  
**方法**: GET  
**认证**: ✅ 需要

---

### 50. 检查当前用户是否 Watch 了仓库

**端点**: `GET https://api.github.com/user/subscriptions/:owner/:repo`  
**方法**: GET  
**认证**: ✅ 需要

---

### 51. Watch 仓库

**端点**: `PUT https://api.github.com/user/subscriptions/:owner/:repo`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "subscribed": true,
  "ignored": false
}
```

---

### 52. 取消 Watch 仓库

**端点**: `DELETE https://api.github.com/user/subscriptions/:owner/:repo`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 53. 创建新仓库

**端点**: `POST https://api.github.com/user/repos`  
**方法**: POST  
**认证**: ✅ 需要（需要 `repo` 权限）

**参数**:
```json
{
  "name": "Hello-World",
  "description": "My first repository on GitHub!",
  "private": false,
  "has_issues": true,
  "has_projects": true,
  "has_downloads": true,
  "has_wiki": true,
  "homepage": "https://github.example.com",
  "is_template": false
}
```

---

### 54. 为组织创建仓库

**端点**: `POST https://api.github.com/orgs/:org/repos`  
**方法**: POST  
**认证**: ✅ 需要

**参数**: 同上（#53）

---

### 55. 更新仓库

**端点**: `PATCH https://api.github.com/repos/:owner/:repo`  
**方法**: PATCH  
**认证**: ✅ 需要

**参数**:
```json
{
  "name": "Hello-World",
  "description": "Updated description",
  "private": true,
  "has_issues": true,
  "has_projects": true
}
```

---

### 56. 删除仓库

**端点**: `DELETE https://api.github.com/repos/:owner/:repo`  
**方法**: DELETE  
**认证**: ✅ 需要（需要 `delete_repo` 权限）

---

### 57. 转让仓库

**端点**: `PATCH https://api.github.com/repos/:owner/:repo`  
**方法**: PATCH  
**认证**: ✅ 需要

**参数**:
```json
{
  "owner": "new-owner"
}
```

---

### 58. 获取仓库 Topics

**端点**: `GET https://api.github.com/repos/:owner/:repo/topics`  
**方法**: GET  
**认证**: 不需要

---

### 59. 更新仓库 Topics

**端点**: `PUT https://api.github.com/repos/:owner/:repo/topics`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "names": ["octocat", "atom", "electron", "api"]
}
```

---

### 60. 获取仓库的 Webhooks

**端点**: `GET https://api.github.com/repos/:owner/:repo/hooks`  
**方法**: GET  
**认证**: ✅ 需要

---

### 61. 创建 Webhook

**端点**: `POST https://api.github.com/repos/:owner/:repo/hooks`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "name": "web",
  "active": true,
  "events": ["push", "pull_request"],
  "config": {
    "url": "https://example.com/webhook",
    "content_type": "json",
    "secret": "secret"
  }
}
```

---

### 62. 获取单个 Webhook

**端点**: `GET https://api.github.com/repos/:owner/:repo/hooks/:hook_id`  
**方法**: GET  
**认证**: ✅ 需要

---

### 63. 更新 Webhook

**端点**: `PATCH https://api.github.com/repos/:owner/:repo/hooks/:hook_id`  
**方法**: PATCH  
**认证**: ✅ 需要

---

### 64. 删除 Webhook

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/hooks/:hook_id`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 65. 获取仓库的部署

**端点**: `GET https://api.github.com/repos/:owner/:repo/deployments`  
**方法**: GET  
**认证**: ✅ 需要

---

### 66. 创建部署

**端点**: `POST https://api.github.com/repos/:owner/:repo/deployments`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "ref": "main",
  "environment": "production",
  "description": "Deploy to production"
}
```

---

### 67. 获取部署状态

**端点**: `GET https://api.github.com/repos/:owner/:repo/deployments/:deployment_id/statuses`  
**方法**: GET  
**认证**: ✅ 需要

---

### 68. 创建部署状态

**端点**: `POST https://api.github.com/repos/:owner/:repo/deployments/:deployment_id/statuses`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "state": "success",
  "description": "Deployment successful",
  "environment_url": "https://example.com"
}
```

---

## 分支和标签 API

### 69. 获取仓库的所有分支

**端点**: `GET https://api.github.com/repos/:owner/:repo/branches`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `protected` | boolean | | 过滤受保护的分支 |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 70. 获取单个分支

**端点**: `GET https://api.github.com/repos/:owner/:repo/branches/:branch`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `:branch` | string | ✅ | 分支名称 |

---

### 71. 创建分支

**端点**: `POST https://api.github.com/repos/:owner/:repo/git/refs`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "ref": "refs/heads/featureA",
  "sha": "aa218f56b14c9653891f9e74264a383fa43fefbd"
}
```

---

### 72. 删除分支

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/git/refs/heads/:branch`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 73. 重命名分支

**端点**: `POST https://api.github.com/repos/:owner/:repo/branches/:branch/rename`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "new_name": "new-branch-name"
}
```

---

### 74. 获取分支保护规则

**端点**: `GET https://api.github.com/repos/:owner/:repo/branches/:branch/protection`  
**方法**: GET  
**认证**: ✅ 需要

---

### 75. 创建分支保护规则

**端点**: `PUT https://api.github.com/repos/:owner/:repo/branches/:branch/protection`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["continuous-integration/travis-ci"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": {
    "users": ["octocat"],
    "teams": ["justice-league"]
  }
}
```

---

### 76. 删除分支保护规则

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/branches/:branch/protection`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 77. 获取仓库的所有标签

**端点**: `GET https://api.github.com/repos/:owner/:repo/tags`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 78. 获取单个标签

**端点**: `GET https://api.github.com/repos/:owner/:repo/releases/tags/:tag`  
**方法**: GET  
**认证**: 不需要

---

### 79. 获取仓库的 Releases

**端点**: `GET https://api.github.com/repos/:owner/:repo/releases`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 80. 获取单个 Release

**端点**: `GET https://api.github.com/repos/:owner/:repo/releases/:release_id`  
**方法**: GET  
**认证**: 不需要

---

### 81. 创建 Release

**端点**: `POST https://api.github.com/repos/:owner/:repo/releases`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "tag_name": "v1.0.0",
  "target_commitish": "main",
  "name": "v1.0.0",
  "body": "Description of the release",
  "draft": false,
  "prerelease": false
}
```

---

### 82. 更新 Release

**端点**: `PATCH https://api.github.com/repos/:owner/:repo/releases/:release_id`  
**方法**: PATCH  
**认证**: ✅ 需要

---

### 83. 删除 Release

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/releases/:release_id`  
**方法**: DELETE  
**认证**: ✅ 需要

---

## 提交 API

### 84. 获取提交列表

**端点**: `GET https://api.github.com/repos/:owner/:repo/commits`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `sha` | string | | 分支/标签/提交 SHA |
| `path` | string | | 过滤指定文件路径 |
| `author` | string | | 过滤作者 |
| `since` | string | | ISO 8601 格式起始时间 |
| `until` | string | | ISO 8601 格式结束时间 |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 85. 获取单个提交

**端点**: `GET https://api.github.com/repos/:owner/:repo/commits/:sha`  
**方法**: GET  
**认证**: 不需要

---

### 86. 获取提交的检查

**端点**: `GET https://api.github.com/repos/:owner/:repo/commits/:sha/check-suites`  
**方法**: GET  
**认证**: ✅ 需要

---

### 87. 获取提交的状态

**端点**: `GET https://api.github.com/repos/:owner/:repo/commits/:sha/status`  
**方法**: GET  
**认证**: 不需要

---

### 88. 获取提交的 Statuses

**端点**: `GET https://api.github.com/repos/:owner/:repo/commits/:sha/statuses`  
**方法**: GET  
**认证**: 不需要

---

### 89. 创建提交状态

**端点**: `POST https://api.github.com/repos/:owner/:repo/statuses/:sha`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "state": "success",
  "target_url": "https://example.com/build/status",
  "description": "Build has completed successfully",
  "context": "continuous-integration/my-ci"
}
```

---

### 90. 比较两个提交

**端点**: `GET https://api.github.com/repos/:owner/:repo/compare/:basehead`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `:basehead` | string | ✅ | 格式: `base...head` 或 `base..head` |

---

### 91. 获取提交的 Blames（代码行归属）

**端点**: `GET https://api.github.com/repos/:owner/:repo/blame/:path`  
**方法**: GET  
**认证**: 不需要

---

### 92. 获取仓库的所有提交

**端点**: `GET https://api.github.com/repos/:owner/:repo/git/commits/:commit_sha`  
**方法**: GET  
**认证**: 不需要

---

### 93. 创建提交（底层 API）

**端点**: `POST https://api.github.com/repos/:owner/:repo/git/commits`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "message": "My commit message",
  "tree": "827efc6d56897b048c772eb4087f854f46256132",
  "parents": [
    "7d1b31e74ee336d15cbd21741bc88a537ed063a0"
  ]
}
```

---

## Pull Request API

### 94. 获取 Pull Request 列表

**端点**: `GET https://api.github.com/repos/:owner/:repo/pulls`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `state` | string | | 状态过滤: `open`, `closed`, `all` (默认: `open`)|
| `head` | string | | 过滤 head 分支 |
| `base` | string | | 过滤 base 分支 |
| `sort` | string | | 排序: `created`, `updated`, `popularity`, `long-running` |
| `direction` | string | | 排序方向: `asc` 或 `desc` |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 95. 获取单个 Pull Request

**端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number`  
**方法**: GET  
**认证**: 不需要

---

### 96. 创建 Pull Request

**端点**: `POST https://api.github.com/repos/:owner/:repo/pulls`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "title": "Amazing new feature",
  "body": "Please pull these awesome changes in!",
  "head": "octocat:new-feature",
  "base": "main",
  "draft": false
}
```

---

### 97. 更新 Pull Request

**端点**: `PATCH https://api.github.com/repos/:owner/:repo/pulls/:pull_number`  
**方法**: PATCH  
**认证**: ✅ 需要

**参数**:
```json
{
  "title": "Updated title",
  "body": "Updated body",
  "state": "open",
  "base": "main"
}
```

---

### 98. 获取 Pull Request 中的所有提交

**端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/commits`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 99. 获取 Pull Request 中修改的文件

**端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/files`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 100. 检查 Pull Request 是否可合并

**端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/merge`  
**方法**: GET  
**认证**: ✅ 需要

**返回**: 状态码 204（可合并）或 409（不可合并）

---

### 101. 合并 Pull Request

**端点**: `PUT https://api.github.com/repos/:owner/:repo/pulls/:pull_number/merge`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "commit_title": "Merge pull request",
  "commit_message": "Pull request description",
  "merge_method": "merge"
}
```

**merge_method 选项**: `merge`, `squash`, `rebase`

---

### 102. 解除 Pull Request 的合并

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/pulls/:pull_number/merge`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 103. 获取 Pull Request 的所有评论

**端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/comments`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `sort` | string | | 排序: `created`, `updated` |
| `direction` | string | | 排序方向: `asc` 或 `desc` |
| `since` | string | | ISO 8601 格式时间 |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 104. 在 Pull Request 中添加评论

**端点**: `POST https://api.github.com/repos/:owner/:repo/pulls/:pull_number/comments`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "body": "Great work!",
  "commit_id": "6dcb09b5b57875f3f0c3f8b6c8f8f8f8f8f8f8f8",
  "path": "docs/guides/quickstart.md",
  "position": 4,
  "in_reply_to": 1
}
```

---

### 105. 获取单个 Pull Request 评论

**端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/comments/:comment_id`  
**方法**: GET  
**认证**: 不需要

---

### 106. 更新 Pull Request 评论

**端点**: `PATCH https://api.github.com/repos/:owner/:repo/pulls/comments/:comment_id`  
**方法**: PATCH  
**认证**: ✅ 需要

**参数**:
```json
{
  "body": "Updated comment"
}
```

---

### 107. 删除 Pull Request 评论

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/pulls/comments/:comment_id`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 108. 获取 Pull Request 的所有 Review

**端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 109. 获取单个 Review

**端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews/:review_id`  
**方法**: GET  
**认证**: 不需要

---

### 110. 创建 Pull Request Review

**端点**: `POST https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "body": "This looks great!",
  "event": "APPROVE",
  "comments": [
    {
      "path": "index.html",
      "position": 10,
      "body": "This is a suggestion."
    }
  ]
}
```

**event 选项**: `APPROVE`, `REQUEST_CHANGES`, `COMMENT`, `PENDING`

---

### 111. 更新 Pull Request Review

**端点**: `PUT https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews/:review_id`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "body": "Updated review"
}
```

---

### 112. 删除 Pull Request Review

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews/:review_id`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 113. 提交 Pull Request Review

**端点**: `POST https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews/:review_id/events`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "body": "Review body",
  "event": "APPROVE"
}
```

---

### 114. 忽略 Pull Request Review

**端点**: `PUT https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews/:review_id/dismissals`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "message": "Stale review"
}
```

---

### 115. 获取 Pull Request 的所有请求更改者

**端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/requested_reviewers`  
**方法**: GET  
**认证**: 不需要

---

### 116. 请求 Pull Request 评审者

**端点**: `POST https://api.github.com/repos/:owner/:repo/pulls/:pull_number/requested_reviewers`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "reviewers": ["octocat"],
  "team_reviewers": ["justice-league"]
}
```

---

### 117. 移除 Pull Request 评审者

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/pulls/:pull_number/requested_reviewers`  
**方法**: DELETE  
**认证**: ✅ 需要

**参数**:
```json
{
  "reviewers": ["octocat"]
}
```

---

## Issue API

### 118. 获取 Issue 列表

**端点**: `GET https://api.github.com/repos/:owner/:repo/issues`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `state` | string | | 状态过滤: `open`, `closed`, `all` (默认: `open`)|
| `labels` | string | | 标签过滤（逗号分隔）|
| `sort` | string | | 排序: `created`, `updated`, `comments` |
| `direction` | string | | 排序方向: `asc` 或 `desc` |
| `since` | string | | ISO 8601 格式时间 |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 119. 获取单个 Issue

**端点**: `GET https://api.github.com/repos/:owner/:repo/issues/:issue_number`  
**方法**: GET  
**认证**: 不需要

---

### 120. 创建 Issue

**端点**: `POST https://api.github.com/repos/:owner/:repo/issues`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "title": "Found a bug",
  "body": "I'm having a problem with this.",
  "assignees": ["octocat"],
  "milestone": 1,
  "labels": ["bug"]
}
```

---

### 121. 更新 Issue

**端点**: `PATCH https://api.github.com/repos/:owner/:repo/issues/:issue_number`  
**方法**: PATCH  
**认证**: ✅ 需要

**参数**:
```json
{
  "title": "Updated title",
  "body": "Updated body",
  "state": "closed",
  "assignees": ["octocat"],
  "labels": ["bug", "critical"]
}
```

---

### 122. 锁定 Issue

**端点**: `PUT https://api.github.com/repos/:owner/:repo/issues/:issue_number/lock`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "locked": true,
  "active_lock_reason": "too heated"
}
```

**active_lock_reason 选项**: `off-topic`, `too heated`, `resolved`, `spam`

---

### 123. 解锁 Issue

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/issues/:issue_number/lock`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 124. 获取 Issue 的所有评论

**端点**: `GET https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `sort` | string | | 排序: `created`, `updated` |
| `direction` | string | | 排序方向: `asc` 或 `desc` |
| `since` | string | | ISO 8601 格式时间 |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 125. 在 Issue 中添加评论

**端点**: `POST https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "body": "Me too"
}
```

---

### 126. 获取单个 Issue 评论

**端点**: `GET https://api.github.com/repos/:owner/:repo/issues/comments/:comment_id`  
**方法**: GET  
**认证**: 不需要

---

### 127. 更新 Issue 评论

**端点**: `PATCH https://api.github.com/repos/:owner/:repo/issues/comments/:comment_id`  
**方法**: PATCH  
**认证**: ✅ 需要

**参数**:
```json
{
  "body": "Updated comment"
}
```

---

### 128. 删除 Issue 评论

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/issues/comments/:comment_id`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 129. 获取 Issue 事件

**端点**: `GET https://api.github.com/repos/:owner/:repo/issues/:issue_number/events`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

## 标签和里程碑 API

### 130. 获取仓库的所有标签

**端点**: `GET https://api.github.com/repos/:owner/:repo/labels`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 131. 获取单个标签

**端点**: `GET https://api.github.com/repos/:owner/:repo/labels/:name`  
**方法**: GET  
**认证**: 不需要

---

### 132. 创建标签

**端点**: `POST https://api.github.com/repos/:owner/:repo/labels`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "name": "bug",
  "color": "f29513",
  "description": "Something isn't working"
}
```

---

### 133. 更新标签

**端点**: `PATCH https://api.github.com/repos/:owner/:repo/labels/:name`  
**方法**: PATCH  
**认证**: ✅ 需要

**参数**:
```json
{
  "new_name": "feature",
  "color": "0366d6",
  "description": "New feature"
}
```

---

### 134. 删除标签

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/labels/:name`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 135. 获取仓库的所有里程碑

**端点**: `GET https://api.github.com/repos/:owner/:repo/milestones`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `state` | string | | 状态过滤: `open`, `closed`, `all` |
| `sort` | string | | 排序: `due_date`, `completeness` |
| `direction` | string | | 排序方向: `asc` 或 `desc` |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 136. 获取单个里程碑

**端点**: `GET https://api.github.com/repos/:owner/:repo/milestones/:milestone_number`  
**方法**: GET  
**认证**: 不需要

---

### 137. 创建里程碑

**端点**: `POST https://api.github.com/repos/:owner/:repo/milestones`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "title": "v1.0",
  "state": "open",
  "description": "Tracking milestone for version 1.0",
  "due_on": "2012-10-09T23:39:01Z"
}
```

---

### 138. 更新里程碑

**端点**: `PATCH https://api.github.com/repos/:owner/:repo/milestones/:milestone_number`  
**方法**: PATCH  
**认证**: ✅ 需要

**参数**:
```json
{
  "title": "v2.0",
  "state": "closed"
}
```

---

### 139. 删除里程碑

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/milestones/:milestone_number`  
**方法**: DELETE  
**认证**: ✅ 需要

---

## 评论 API

### 140. 获取仓库的所有评论

**端点**: `GET https://api.github.com/repos/:owner/:repo/comments`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `sort` | string | | 排序: `created`, `updated` |
| `direction` | string | | 排序方向: `asc` 或 `desc` |
| `since` | string | | ISO 8601 格式时间 |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 141. 获取单个评论

**端点**: `GET https://api.github.com/repos/:owner/:repo/comments/:comment_id`  
**方法**: GET  
**认证**: 不需要

---

## Reviews 和 Reactions

### 142. 获取 Issue/PR 的 Reactions

**端点**: `GET https://api.github.com/repos/:owner/:repo/issues/:issue_number/reactions`  
**方法**: GET  
**认证**: 不需要

**返回**: Reaction 对象数组

---

### 143. 在 Issue/PR 上添加 Reaction

**端点**: `POST https://api.github.com/repos/:owner/:repo/issues/:issue_number/reactions`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "content": "+1"
}
```

**content 选项**: `+1`, `-1`, `laugh`, `confused`, `heart`, `hooray`, `rocket`, `eyes`

---

### 144. 删除 Reaction

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/issues/:issue_number/reactions/:reaction_id`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 145. 获取评论的 Reactions

**端点**: `GET https://api.github.com/repos/:owner/:repo/issues/comments/:comment_id/reactions`  
**方法**: GET  
**认证**: 不需要

---

### 146. 在评论上添加 Reaction

**端点**: `POST https://api.github.com/repos/:owner/:repo/issues/comments/:comment_id/reactions`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "content": "heart"
}
```

---

### 147. 删除评论 Reaction

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/issues/comments/:comment_id/reactions/:reaction_id`  
**方法**: DELETE  
**认证**: ✅ 需要

---

## 搜索 API

### 148. 搜索仓库

**端点**: `GET https://api.github.com/search/repositories`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `q` | string | ✅ | 搜索查询（支持高级查询语法）|
| `sort` | string | | 排序: `stars`, `forks`, `updated`, `help-wanted-issues` |
| `order` | string | | 排序方向: `asc` 或 `desc` (默认: `desc`)|
| `per_page` | integer | | 每页数量 |
| `page` | integer | | 分页页码 |

**搜索限定符**:
- `in:name` - 在仓库名中搜索
- `in:description` - 在描述中搜索
- `in:readme` - 在 README 中搜索
- `language:python` - 按编程语言过滤
- `stars:>1000` - 按星数过滤
- `fork:true/false` - 仓库是否为 fork
- `created:>2023-01-01` - 按创建日期过滤

---

### 149. 搜索代码

**端点**: `GET https://api.github.com/search/code`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `q` | string | ✅ | 搜索查询 |
| `sort` | string | | 排序: `indexed` |
| `order` | string | | 排序方向: `asc` 或 `desc` |
| `per_page` | integer | | 每页数量（最多100）|
| `page` | integer | | 分页页码 |

---

### 150. 搜索 Issue

**端点**: `GET https://api.github.com/search/issues`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `q` | string | ✅ | 搜索查询 |
| `sort` | string | | 排序: `created`, `updated`, `comments` |
| `order` | string | | 排序方向: `asc` 或 `desc` |
| `per_page` | integer | | 每页数量 |
| `page` | integer | | 分页页码 |

---

### 151. 搜索用户

**端点**: `GET https://api.github.com/search/users`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `q` | string | ✅ | 搜索查询 |
| `sort` | string | | 排序: `followers`, `repositories`, `joined` |
| `order` | string | | 排序方向: `asc` 或 `desc` |
| `per_page` | integer | | 每页数量 |
| `page` | integer | | 分页页码 |

---

## Webhooks 和事件

### 152. 获取全局事件

**端点**: `GET https://api.github.com/events`  
**方法**: GET  
**认证**: 不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量（最多300）|

---

### 153. 获取网络事件

**端点**: `GET https://api.github.com/networks/:owner/:repo/events`  
**方法**: GET  
**认证**: 不需要

---

### 154. 获取当前用户的接收事件

**端点**: `GET https://api.github.com/users/:username/received_events`  
**方法**: GET  
**认证**: 不需要

---

### 155. 获取当前用户的接收公开事件

**端点**: `GET https://api.github.com/users/:username/received_events/public`  
**方法**: GET  
**认证**: 不需要

---

## 团队和协作

### 156. 获取仓库的所有协作者

**端点**: `GET https://api.github.com/repos/:owner/:repo/collaborators`  
**方法**: GET  
**认证**: ✅ 需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `affiliation` | string | | 过滤: `all`, `direct`, `outside` |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 157. 获取单个协作者的权限

**端点**: `GET https://api.github.com/repos/:owner/:repo/collaborators/:username/permission`  
**方法**: GET  
**认证**: ✅ 需要

---

### 158. 添加仓库协作者

**端点**: `PUT https://api.github.com/repos/:owner/:repo/collaborators/:username`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "permission": "pull"
}
```

**permission 选项**: `pull`, `push`, `admin`, `maintain`, `triage`

---

### 159. 移除仓库协作者

**端点**: `DELETE https://api.github.com/repos/:owner/:repo/collaborators/:username`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 160. 获取组织的所有团队

**端点**: `GET https://api.github.com/orgs/:org/teams`  
**方法**: GET  
**认证**: ✅ 需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 161. 获取单个团队

**端点**: `GET https://api.github.com/teams/:team_id`  
**方法**: GET  
**认证**: ✅ 需要

---

### 162. 创建团队

**端点**: `POST https://api.github.com/orgs/:org/teams`  
**方法**: POST  
**认证**: ✅ 需要

**参数**:
```json
{
  "name": "Justice League",
  "description": "A great team",
  "privacy": "closed"
}
```

---

### 163. 更新团队

**端点**: `PATCH https://api.github.com/teams/:team_id`  
**方法**: PATCH  
**认证**: ✅ 需要

---

### 164. 删除团队

**端点**: `DELETE https://api.github.com/teams/:team_id`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 165. 获取团队的成员

**端点**: `GET https://api.github.com/teams/:team_id/members`  
**方法**: GET  
**认证**: ✅ 需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `role` | string | | 过滤: `all`, `member`, `maintainer` |
| `page` | integer | | 分页页码 |
| `per_page` | integer | | 每页数量 |

---

### 166. 添加团队成员

**端点**: `PUT https://api.github.com/teams/:team_id/memberships/:username`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "role": "member"
}
```

---

### 167. 移除团队成员

**端点**: `DELETE https://api.github.com/teams/:team_id/memberships/:username`  
**方法**: DELETE  
**认证**: ✅ 需要

---

### 168. 获取团队的仓库

**端点**: `GET https://api.github.com/teams/:team_id/repos`  
**方法**: GET  
**认证**: ✅ 需要

---

### 169. 添加仓库到团队

**端点**: `PUT https://api.github.com/teams/:team_id/repos/:owner/:repo`  
**方法**: PUT  
**认证**: ✅ 需要

**参数**:
```json
{
  "permission": "push"
}
```

---

### 170. 移除仓库从团队

**端点**: `DELETE https://api.github.com/teams/:team_id/repos/:owner/:repo`  
**方法**: DELETE  
**认证**: ✅ 需要

---

## 权限范围说明

OAuth 应用可以请求的权限范围（Scopes）：

### 仓库权限
- **`repo`** - 完整的私有仓库访问权限（包括代码、Issue、PR 等）
- **`public_repo`** - 仅访问公开仓库（不包括私有仓库）
- **`repo:status`** - 访问提交状态
- **`repo_deployment`** - 访问部署状态
- **`delete_repo`** - 删除仓库权限
- **`security_events`** - 访问安全事件

### 用户权限
- **`user`** - 访问用户档案数据
- **`user:email`** - 访问用户邮箱地址
- **`user:follow`** - 关注/取消关注用户

### Gist 权限
- **`gist`** - 访问 Gist（包括创建和修改）

### 通知权限
- **`notifications`** - 访问通知

### 其他权限
- **`workflow`** - 访问工作流（GitHub Actions）
- **`admin:repo_hook`** - 访问仓库 Webhooks
- **`admin:org_hook`** - 访问组织 Webhooks
- **`admin:gpg_key`** - 访问 GPG 密钥
- **`admin:public_key`** - 访问公钥
- **`admin:ssh_signing_key`** - 访问 SSH 签名密钥
- **`write:discussion`** - 创建和更新讨论
- **`read:discussion`** - 读取讨论

### 权限推荐

| 功能 | 推荐权限 |
|-----|--------|
| 查看公开仓库信息 | 无需认证 |
| 查看用户档案 | 无需认证 |
| 查看私有仓库 | `repo` |
| 创建/编辑仓库 | `repo` |
| 管理 Issue 和 PR | `repo` |
| 访问用户邮箱 | `user:email` |
| 获取所有权限信息 | `repo,user,gist,notifications,workflow` |

---

## 速率限制

### 认证用户限制
- **API 请求**: 5000 次/小时
- **搜索 API**: 30 次/分钟

### 未认证用户限制
- **API 请求**: 60 次/小时
- **搜索 API**: 10 次/分钟

### 检查速率限制

**端点**: `GET https://api.github.com/rate_limit`  
**方法**: GET  
**认证**: 不需要

**返回**:
```json
{
  "resources": {
    "core": {
      "limit": 5000,
      "remaining": 4999,
      "reset": 1372700873
    },
    "search": {
      "limit": 30,
      "remaining": 18,
      "reset": 1372697452
    }
  },
  "rate": {
    "limit": 5000,
    "remaining": 4999,
    "reset": 1372700873
  }
}
```

### 应对速率限制的建议

1. **使用条件请求**（ETag）避免无必要的 API 调用
2. **实现指数退避**（Exponential Backoff）重试机制
3. **检查 `X-RateLimit-Remaining` 响应头**了解剩余请求数
4. **缓存响应数据**，避免重复请求
5. **使用 GraphQL API**，它通常比 REST API 更高效
6. **获取更高的速率限制**（企业计划）

---

## HTTP 状态码

| 状态码 | 含义 |
|-------|------|
| **2xx** | |
| `200 OK` | 请求成功 |
| `201 Created` | 资源创建成功 |
| `202 Accepted` | 请求已接受，处理中 |
| `204 No Content` | 请求成功，无返回内容 |
| **3xx** | |
| `301 Moved Permanently` | 资源已永久移动 |
| `304 Not Modified` | 资源未修改（ETag 匹配）|
| `307 Temporary Redirect` | 临时重定向 |
| **4xx** | |
| `400 Bad Request` | 请求格式错误 |
| `401 Unauthorized` | 未授权或令牌无效 |
| `403 Forbidden` | 禁止访问 |
| `404 Not Found` | 资源不存在 |
| `422 Unprocessable Entity` | 请求验证失败 |
| **5xx** | |
| `500 Internal Server Error` | 服务器错误 |
| `502 Bad Gateway` | 网关错误 |
| `503 Service Unavailable` | 服务暂不可用 |

---

## 通用请求/响应特性

### 请求头

```
Authorization: Bearer <token>  // 或 token <token>
Accept: application/vnd.github.v3+json
Content-Type: application/json
X-GitHub-Media-Type: github.v3
```

### 响应头

```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1372700873
X-GitHub-Request-Id: E439:4581:105F3FE:1298573A:50980D50
Link: <https://api.github.com/repos/example/example/issues?page=2>; rel="next"
ETag: W/"82e4cd634d382e50c811db1674a29c30"
```

### 分页

大多数列出资源的端点支持分页：

```
GET /repos/:owner/:repo/issues?page=2&per_page=30
```

**响应头中的 Link 字段**:
```
Link: <https://api.github.com/repos/example/example/issues?page=2>; rel="next",
      <https://api.github.com/repos/example/example/issues?page=5>; rel="last",
      <https://api.github.com/repos/example/example/issues?page=1>; rel="first",
      <https://api.github.com/repos/example/example/issues>; rel="prev"
```

### 条件请求

使用 ETag 实现条件请求，减少带宽消耗：

```bash
# 首次请求获取 ETag
curl -i -H "Authorization: token <token>" https://api.github.com/user

# 再次请求时使用 If-None-Match
curl -i -H "Authorization: token <token>" \
     -H "If-None-Match: W/\"82e4cd634d382e50c811db1674a29c30\"" \
     https://api.github.com/user

# 返回 304 Not Modified（无变更）
```

---

## 常见使用场景

### 场景 1: 获取用户的所有仓库和统计信息

```
1. GET /user - 获取当前用户信息
2. GET /user/repos - 获取用户的所有仓库
3. GET /repos/:owner/:repo/stats/contributors - 获取各仓库贡献者统计
4. GET /repos/:owner/:repo/languages - 获取各仓库的语言统计
```

### 场景 2: 管理 Pull Request

```
1. GET /repos/:owner/:repo/pulls - 列出所有 PR
2. GET /repos/:owner/:repo/pulls/:pr_number - 获取单个 PR 详情
3. GET /repos/:owner/:repo/pulls/:pr_number/files - 获取 PR 修改的文件
4. POST /repos/:owner/:repo/pulls/:pr_number/reviews - 创建 Review
5. PUT /repos/:owner/:repo/pulls/:pr_number/merge - 合并 PR
```

### 场景 3: 实时监控仓库活动

```
1. GET /events - 获取全局事件（最新活动）
2. GET /repos/:owner/:repo/events - 获取仓库特定事件
3. 结合 Webhooks 实现实时推送
```

### 场景 4: 搜索和发现仓库

```
1. GET /search/repositories - 搜索仓库
2. GET /search/users - 搜索用户
3. GET /users/:username/repos - 获取用户的仓库
4. GET /repos/:owner/:repo/stargazers - 获取仓库的 Star 者
```

---

## 错误处理示例

### 完整错误响应

```json
{
  "message": "Validation Failed",
  "errors": [
    {
      "message": "Missing field",
      "field": "title",
      "code": "missing"
    }
  ],
  "documentation_url": "https://docs.github.com/rest/reference/issues#create-an-issue"
}
```

### 常见错误代码

| 代码 | 含义 | 解决方案 |
|------|------|--------|
| `missing` | 缺少必需字段 | 检查请求参数 |
| `missing_field` | 字段值缺失 | 提供必需的字段值 |
| `invalid` | 字段值无效 | 检查字段格式 |
| `already_exists` | 资源已存在 | 使用不同的标识符 |
| `unprocessable_entity` | 实体无法处理 | 检查请求数据格式 |
| `validation_failed` | 验证失败 | 检查所有必需字段 |
| `forbidden` | 权限不足 | 检查 token 权限 |
| `not_found` | 资源不存在 | 检查资源标识符 |

---

## 认证方式对比

| 方式 | 场景 | 限制 | 优点 |
|------|------|------|------|
| **无认证** | 公开数据查询 | 60 请求/小时 | 无需配置 |
| **Token 认证** | 应用后端 | 5000 请求/小时 | 简单直接 |
| **OAuth** | 用户授权应用 | 5000 请求/小时 | 安全, 用户控制 |
| **GitHub App** | 仓库集成 | 10,000 请求/小时 | 高级功能, 高可靠性 |

---

## 官方参考资源

### 官方文档

- **REST API 官方文档**: https://docs.github.com/en/rest
- **REST API 参考**: https://docs.github.com/en/rest/reference
- **GraphQL API 文档**: https://docs.github.com/en/graphql
- **GitHub CLI 文档**: https://cli.github.com/manual
- **GitHub Developer 文档**: https://docs.github.com/en/developers

### API 端点列表

- **API 根地址**: https://api.github.com
- **API 版本**: v3（当前稳定版本）
- **API 状态**: https://www.githubstatus.com/

### OAuth 和认证

- **创建 OAuth App**: https://github.com/settings/developers
- **OAuth 授权流程**: https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps
- **GitHub App 官方指南**: https://docs.github.com/en/developers/apps/getting-started-with-apps

### 常用工具

- **GitHub REST API 资源管理器**: https://docs.github.com/en/rest/overview/resources-in-the-rest-api
- **GitHub API v3 Changelog**: https://developer.github.com/changes/
- **Postman Collection**: https://www.postman.com/githubapi/workspace/github-api

### 更新日志和发布说明

- **GitHub Blog**: https://github.blog
- **API Changelog**: https://developer.github.com/changes
- **Breaking Changes**: https://docs.github.com/en/rest/overview/api-versions

### 社区资源

- **Stack Overflow**: https://stackoverflow.com/questions/tagged/github-api
- **GitHub Discussions**: https://github.com/github/docs/discussions
- **GitHub Issues**: https://github.com/github/docs/issues

---

## 文档版本信息

| 项目 | 信息 |
|------|------|
| **GitPulse** | GitHub 管理工具 |
| **文档最后更新** | 2024年11月19日 |
| **API 版本** | GitHub REST API v3 |
| **支持的操作** | 170+ 个端点 |
| **覆盖范围** | 认证、仓库、分支、提交、PR、Issue、标签、搜索、团队 |

---

## 快速参考表

### 核心操作速查表

| 操作 | HTTP 方法 | 端点示例 |
|------|----------|--------|
| **查看用户信息** | GET | `/users/:username` |
| **查看用户仓库** | GET | `/users/:username/repos` |
| **获取仓库信息** | GET | `/repos/:owner/:repo` |
| **创建仓库** | POST | `/user/repos` |
| **获取 Issue 列表** | GET | `/repos/:owner/:repo/issues` |
| **创建 Issue** | POST | `/repos/:owner/:repo/issues` |
| **获取 PR 列表** | GET | `/repos/:owner/:repo/pulls` |
| **创建 PR** | POST | `/repos/:owner/:repo/pulls` |
| **合并 PR** | PUT | `/repos/:owner/:repo/pulls/:pr_number/merge` |
| **创建评论** | POST | `/repos/:owner/:repo/issues/:issue_number/comments` |
| **搜索仓库** | GET | `/search/repositories?q=...` |
| **搜索用户** | GET | `/search/users?q=...` |
| **Star 仓库** | PUT | `/user/starred/:owner/:repo` |
| **取消 Star** | DELETE | `/user/starred/:owner/:repo` |
| **Follow 用户** | PUT | `/user/following/:username` |
| **Unfollow 用户** | DELETE | `/user/following/:username` |

---

## 相关数据模型

### User 对象

```json
{
  "login": "octocat",
  "id": 1,
  "node_id": "MDQ6VXNlcjE=",
  "avatar_url": "https://github.com/images/error/octocat_happy.gif",
  "type": "User",
  "followers": 20,
  "following": 0,
  "public_repos": 2
}
```

### Repository 对象

```json
{
  "id": 1296269,
  "name": "Hello-World",
  "full_name": "octocat/Hello-World",
  "owner": {...},
  "private": false,
  "description": "My first repository on GitHub!",
  "fork": false,
  "created_at": "2011-01-26T19:01:12Z",
  "updated_at": "2011-01-26T19:14:43Z",
  "pushed_at": "2011-01-26T19:06:43Z",
  "homepage": "https://github.example.com",
  "size": 180,
  "stargazers_count": 80,
  "watchers_count": 80,
  "language": "C",
  "forks_count": 9,
  "open_issues_count": 0
}
```

### Issue 对象

```json
{
  "id": 1,
  "number": 1347,
  "title": "Found a bug",
  "user": {...},
  "state": "open",
  "body": "I'm having a problem with this.",
  "created_at": "2011-04-22T13:33:48Z",
  "updated_at": "2011-04-23T13:34:48Z",
  "closed_at": null,
  "labels": [...],
  "assignees": [...]
}
```

### Pull Request 对象

```json
{
  "id": 1,
  "number": 1347,
  "state": "open",
  "title": "Amazing new feature",
  "user": {...},
  "body": "Please pull these awesome changes in!",
  "head": {...},
  "base": {...},
  "commits": 3,
  "additions": 100,
  "deletions": 3,
  "changed_files": 5,
  "created_at": "2011-01-26T19:01:12Z",
  "updated_at": "2011-01-26T19:14:43Z",
  "closed_at": null,
  "merged_at": null
}
```

---

**文档维护说明**: 本文档包含 GitHub REST API 的 170+ 个公开端点，已按功能分类。如需更新或查证，请参考上述官方参考资源。
