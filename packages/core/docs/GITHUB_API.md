# GitHub API 文档

本文档列举了 GitPulse 项目中使用的 GitHub 公开 API 端点和功能。

## 认证相关

### 1. OAuth 授权流程
- **端点**: `POST https://github.com/login/oauth/authorize`
- **描述**: 发起 OAuth 授权请求，重定向用户到 GitHub 登录页面
- **参数**:
  - `client_id`: 应用的 GitHub App ID
  - `redirect_uri`: 授权后的回调地址
  - `scope`: 请求的权限范围（如 `repo`, `user`, `workflow`）
  - `state`: 用于防止 CSRF 的状态值

### 2. 获取访问令牌
- **端点**: `POST https://github.com/login/oauth/access_token`
- **描述**: 用授权码交换访问令牌
- **参数**:
  - `client_id`: 应用的 GitHub App ID
  - `client_secret`: 应用的密钥
  - `code`: 授权响应中获得的授权码
  - `redirect_uri`: 授权时使用的回调地址
- **返回**: `access_token`, `token_type`, `scope`

### 3. 验证用户身份
- **端点**: `GET https://api.github.com/user`
- **描述**: 获取当前认证用户的信息
- **认证**: 需要有效的 `Authorization: token <access_token>` 头
- **返回**: 用户对象，包含 `login`, `id`, `name` 等字段

### 4. 获取用户信息
- **端点**: `GET https://api.github.com/user/:username`
- **描述**: 获取指定用户的公开信息
- **参数**: `:username` - GitHub 用户名
- **返回**: 用户对象

---

## 仓库相关

### 5. 获取用户仓库列表
- **端点**: `GET https://api.github.com/user/repos`
- **描述**: 获取当前用户的所有仓库
- **参数**:
  - `type`: 仓库类型（`all`, `owner`, `member`）
  - `sort`: 排序方式（`created`, `updated`, `pushed`, `full_name`）
  - `page`: 分页页码
  - `per_page`: 每页数量（1-100）
- **返回**: 仓库对象数组

### 6. 获取单个仓库信息
- **端点**: `GET https://api.github.com/repos/:owner/:repo`
- **描述**: 获取指定仓库的详细信息
- **参数**:
  - `:owner` - 仓库所有者
  - `:repo` - 仓库名称
- **返回**: 仓库对象

### 7. 获取仓库统计信息
- **端点**: `GET https://api.github.com/repos/:owner/:repo/stats/contributors`
- **描述**: 获取仓库的贡献者统计信息
- **返回**: 贡献者对象数组，包含提交数等信息

### 8. 获取仓库提交历史
- **端点**: `GET https://api.github.com/repos/:owner/:repo/commits`
- **描述**: 获取仓库的提交列表
- **参数**:
  - `sha`: 分支或提交 SHA
  - `path`: 过滤特定文件路径
  - `author`: 过滤作者
  - `page`, `per_page`: 分页参数
- **返回**: 提交对象数组

---

## Pull Request 相关

### 9. 创建 Pull Request
- **端点**: `POST https://api.github.com/repos/:owner/:repo/pulls`
- **描述**: 创建新的 Pull Request
- **参数**:
  - `title`: PR 标题（必需）
  - `body`: PR 描述
  - `head`: 源分支名称（必需）
  - `base`: 目标分支名称（必需）
  - `draft`: 是否为草稿（布尔值）
- **返回**: Pull Request 对象

### 10. 获取 Pull Request 列表
- **端点**: `GET https://api.github.com/repos/:owner/:repo/pulls`
- **描述**: 获取仓库中的 Pull Request 列表
- **参数**:
  - `state`: 状态过滤（`open`, `closed`, `all`）
  - `sort`: 排序方式（`created`, `updated`, `popularity`, `long-running`）
  - `direction`: 排序方向（`asc`, `desc`）
  - `page`, `per_page`: 分页参数
- **返回**: Pull Request 对象数组

### 11. 获取单个 Pull Request 详情
- **端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number`
- **描述**: 获取指定 Pull Request 的详细信息
- **返回**: Pull Request 对象

### 12. 更新 Pull Request
- **端点**: `PATCH https://api.github.com/repos/:owner/:repo/pulls/:pull_number`
- **描述**: 更新 Pull Request 的信息
- **参数**:
  - `title`: 新标题
  - `body`: 新描述
  - `state`: 状态（`open`, `closed`）
  - `base`: 目标分支（需要管理员权限）
- **返回**: 更新后的 Pull Request 对象

### 13. 获取 PR 提交列表
- **端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/commits`
- **描述**: 获取 Pull Request 中的所有提交
- **返回**: 提交对象数组

### 14. 获取 PR 文件更改
- **端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/files`
- **描述**: 获取 Pull Request 中修改的文件列表
- **返回**: 文件对象数组，包含 `filename`, `patch`, `status` 等

### 15. 获取 PR 评论
- **端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/comments`
- **描述**: 获取 Pull Request 中的评论
- **参数**: `page`, `per_page` 分页参数
- **返回**: 评论对象数组

### 16. 添加 PR 评论
- **端点**: `POST https://api.github.com/repos/:owner/:repo/pulls/:pull_number/comments`
- **描述**: 在 Pull Request 中添加评论
- **参数**:
  - `body`: 评论内容（必需）
  - `commit_id`: 提交 SHA（必需）
  - `path`: 文件路径（必需）
  - `position`: 注释位置（必需）
- **返回**: 评论对象

### 17. 获取 PR Review
- **端点**: `GET https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews`
- **描述**: 获取 Pull Request 的所有 Review
- **返回**: Review 对象数组

### 18. 创建 PR Review
- **端点**: `POST https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews`
- **描述**: 为 Pull Request 创建新的 Review
- **参数**:
  - `body`: Review 评论内容
  - `event`: Review 事件类型（`APPROVE`, `REQUEST_CHANGES`, `COMMENT`）
  - `comments`: 代码评论数组
- **返回**: Review 对象

### 19. 合并 Pull Request
- **端点**: `PUT https://api.github.com/repos/:owner/:repo/pulls/:pull_number/merge`
- **描述**: 合并一个 Pull Request
- **参数**:
  - `commit_title`: 合并提交的标题
  - `commit_message`: 合并提交的信息
  - `merge_method`: 合并方式（`merge`, `squash`, `rebase`）
- **返回**: 合并结果对象

---

## 分支相关

### 20. 获取分支列表
- **端点**: `GET https://api.github.com/repos/:owner/:repo/branches`
- **描述**: 获取仓库的所有分支
- **参数**: `page`, `per_page` 分页参数
- **返回**: 分支对象数组

### 21. 获取单个分支信息
- **端点**: `GET https://api.github.com/repos/:owner/:repo/branches/:branch`
- **描述**: 获取指定分支的详细信息
- **返回**: 分支对象

### 22. 创建分支
- **端点**: `POST https://api.github.com/repos/:owner/:repo/git/refs`
- **描述**: 创建新的分支
- **参数**:
  - `ref`: 引用名称（如 `refs/heads/feature-branch`）
  - `sha`: 新分支指向的提交 SHA
- **返回**: 引用对象

---

## Issue 相关

### 23. 获取 Issue 列表
- **端点**: `GET https://api.github.com/repos/:owner/:repo/issues`
- **描述**: 获取仓库中的 Issue 列表
- **参数**:
  - `state`: 状态过滤（`open`, `closed`, `all`）
  - `sort`: 排序方式（`created`, `updated`, `comments`）
  - `labels`: 标签过滤（逗号分隔）
  - `page`, `per_page`: 分页参数
- **返回**: Issue 对象数组

### 24. 获取单个 Issue
- **端点**: `GET https://api.github.com/repos/:owner/:repo/issues/:issue_number`
- **描述**: 获取指定 Issue 的详细信息
- **返回**: Issue 对象

### 25. 创建 Issue
- **端点**: `POST https://api.github.com/repos/:owner/:repo/issues`
- **描述**: 创建新的 Issue
- **参数**:
  - `title`: Issue 标题（必需）
  - `body`: Issue 描述
  - `labels`: 标签数组
  - `assignees`: 分配给的用户数组
- **返回**: Issue 对象

### 26. 更新 Issue
- **端点**: `PATCH https://api.github.com/repos/:owner/:repo/issues/:issue_number`
- **描述**: 更新 Issue 信息
- **参数**:
  - `title`: 新标题
  - `body`: 新描述
  - `state`: 状态（`open`, `closed`）
  - `labels`: 新标签
- **返回**: 更新后的 Issue 对象

---

## 标签相关

### 27. 获取标签列表
- **端点**: `GET https://api.github.com/repos/:owner/:repo/labels`
- **描述**: 获取仓库中的所有标签
- **参数**: `page`, `per_page` 分页参数
- **返回**: 标签对象数组

### 28. 获取单个标签
- **端点**: `GET https://api.github.com/repos/:owner/:repo/labels/:name`
- **描述**: 获取指定标签的信息
- **返回**: 标签对象

### 29. 创建标签
- **端点**: `POST https://api.github.com/repos/:owner/:repo/labels`
- **描述**: 创建新的标签
- **参数**:
  - `name`: 标签名称（必需）
  - `color`: 标签颜色（必需，格式：RRGGBB）
  - `description`: 标签描述
- **返回**: 标签对象

---

## 其他功能

### 30. 获取仓库 Watchers
- **端点**: `GET https://api.github.com/repos/:owner/:repo/watchers`
- **描述**: 获取 Watch 该仓库的用户列表
- **返回**: 用户对象数组

### 31. 获取仓库 Stars
- **端点**: `GET https://api.github.com/repos/:owner/:repo/stargazers`
- **描述**: 获取 Star 该仓库的用户列表
- **返回**: 用户对象数组

### 32. 获取仓库 Forks
- **端点**: `GET https://api.github.com/repos/:owner/:repo/forks`
- **描述**: 获取该仓库的所有 Fork
- **返回**: 仓库对象数组

### 33. 搜索仓库
- **端点**: `GET https://api.github.com/search/repositories`
- **描述**: 搜索 GitHub 上的仓库
- **参数**:
  - `q`: 搜索查询（必需）
  - `sort`: 排序方式（`stars`, `forks`, `updated`）
  - `page`, `per_page`: 分页参数
- **返回**: 仓库对象数组

### 34. 搜索代码
- **端点**: `GET https://api.github.com/search/code`
- **描述**: 搜索 GitHub 上的代码
- **参数**:
  - `q`: 搜索查询（必需）
  - `sort`: 排序方式（`indexed`）
  - `page`, `per_page`: 分页参数
- **返回**: 代码匹配对象数组

### 35. 获取用户 Followers
- **端点**: `GET https://api.github.com/users/:username/followers`
- **描述**: 获取指定用户的 Followers
- **返回**: 用户对象数组

### 36. 获取用户 Following
- **端点**: `GET https://api.github.com/users/:username/following`
- **描述**: 获取指定用户关注的用户列表
- **返回**: 用户对象数组

---

## 授权权限范围 (Scopes)

创建 OAuth 应用时可以请求以下权限范围：

- `public_repo`: 访问公开仓库
- `repo`: 完整仓库访问权限
- `repo:status`: 访问提交状态
- `repo_deployment`: 访问部署状态
- `delete_repo`: 删除仓库权限
- `gist`: 访问 Gist
- `notifications`: 访问通知
- `user`: 访问用户信息
- `user:email`: 访问用户邮箱
- `user:follow`: 关注用户
- `workflow`: 访问工作流

---

## 常见注意事项

1. **认证**: 大多数 API 端点需要在请求头中包含 `Authorization: token <access_token>`
2. **速率限制**: 认证用户每小时 5000 请求，未认证用户 60 请求
3. **分页**: 默认每页 30 条记录，最多 100 条
4. **时间戳**: 均采用 ISO 8601 格式
5. **错误处理**: 请求失败时返回适当的 HTTP 状态码和错误信息

---

## 参考资源

- [GitHub API 官方文档](https://docs.github.com/en/rest)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [GitHub OAuth 文档](https://docs.github.com/en/developers/apps/building-oauth-apps)
