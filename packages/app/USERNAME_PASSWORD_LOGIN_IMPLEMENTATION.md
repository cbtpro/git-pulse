> 历史记录：本文的用户名密码实现已停用。当前使用 GitHub 浏览器授权和 Token 登录，配置与实现说明见 [登录指南](LOGIN_GUIDE.md)。

# 用户名和密码登录模式实现总结

## 实现概述

为 GitPulse 应用添加了用户名和密码登录模式，现在用户可以通过两种方式登录：
1. **Personal Access Token** (原有方式)
2. **用户名和密码** (新增方式)

## 修改文件清单

### 1. 认证服务层

#### `src/services/auth/TokenManager.ts`
**更新内容：**
- 添加了 `LoginMode` 类型定义 (`'token'` | `'username_password'`)
- 添加了密码存储相关方法：
  - `savePassword()` - 保存密码
  - `getPassword()` - 获取密码
  - `clearPassword()` - 清除密码
- 添加了登录模式管理方法：
  - `saveLoginMode()` - 保存登录模式
  - `getLoginMode()` - 获取登录模式
- 新增辅助方法：
  - `hasUsernamePassword()` - 检查是否有有效的用户名密码
  - `isLoggedIn()` - 检查是否已登录（Token 或用户名密码）

#### `src/services/auth/GitHubAuthService.ts` (新建)
**功能：**
- 统一的认证服务类，处理多种登录方式
- 实现方法：
  - `loginWithToken()` - Token 登录
  - `loginWithUsernamePassword()` - 用户名密码登录
  - `verifyCredentials()` - 验证已保存的凭证
  - `getAuthHeader()` - 获取认证 Header（用于 API 调用）
  - `logout()` - 登出

### 2. 页面层

#### `src/pages/LoginPage.tsx`
**更新内容：**
- 添加了登录模式标签页（Tab）切换
- 支持两种登录表单：
  - Token 登录表单
  - 用户名密码登录表单
- 集成 `GitHubAuthService` 处理认证
- 改进的用户交互反馈

### 3. 样式层

#### `src/styles/LoginPage.css`
**新增样式：**
- `.login-mode-tabs` - 登录模式标签页容器
- `.mode-tab` - 单个模式标签按钮
- `.mode-tab.active` - 活跃状态样式
- 改进了表单提示和链接样式

### 4. 文档

#### `LOGIN_GUIDE.md` (新建)
用户指南，包含：
- 登录方式详解
- Token 生成步骤
- 安全考虑和最佳实践
- 故障排除
- 常见问题

## 技术实现细节

### 认证流程

#### Token 认证：
```
用户输入 Token → 验证 Token → GitHub API (Authorization: token)
                    ↓
            验证成功 → 保存 Token → 登录成功
                    ↓
            验证失败 → 显示错误信息
```

#### 用户名密码认证：
```
用户输入用户名和密码 → 验证凭证 → GitHub API (Authorization: Basic)
                        ↓
            验证成功 → 保存用户名和密码 → 登录成功
                        ↓
            验证失败 → 显示错误信息
```

### 数据存储结构

```
localStorage:
├── github_token (Token 认证)
├── github_username (用户名)
├── github_password (密码 - 仅在用户名密码登录时使用)
└── github_login_mode ('token' 或 'username_password')
```

### API 认证 Header

**Token 方式：**
```javascript
{
  'Authorization': 'token YOUR_TOKEN',
  'Accept': 'application/vnd.github.v3+json'
}
```

**用户名密码方式：**
```javascript
{
  'Authorization': 'Basic ' + base64(username:password),
  'Accept': 'application/vnd.github.v3+json'
}
```

## 安全性考虑

1. **凭证存储**
   - 存储在浏览器 localStorage
   - 仅在本地，不上传到任何服务器
   - 应用卸载时会清除

2. **传输安全**
   - 所有 API 通信通过 HTTPS 加密
   - 凭证在 HTTP Header 中传输

3. **访问控制**
   - 用户可选择授予的 Token 权限范围
   - 建议使用只读权限

4. **凭证撤销**
   - 用户可随时在 GitHub Settings 中撤销 Token
   - 密码变更会自动失效用户名密码认证

## 使用场景

### 场景 1：没有 2FA 的用户
✅ 两种方式都可用
- 推荐使用 Token（更安全）
- 或使用用户名密码（方便快捷）

### 场景 2：启用 2FA 的用户
✅ 只能使用 Token
- 密码无法使用（会返回 2FA 错误）
- 必须使用 Personal Access Token

### 场景 3：公共设备
✅ 推荐使用限时 Token
- 使用只读权限的 Token
- 使用后立即登出和清除凭证

## 测试检查清单

- [x] TypeScript 类型检查通过
- [x] Token 登录功能正常
- [x] 用户名密码登录功能正常
- [x] 登录模式标签页切换正常
- [x] 凭证正确保存和读取
- [x] 2FA 账户错误处理正确
- [x] 表单验证和错误提示正常
- [x] 安全性检查完毕

## 后续改进建议

1. **生物识别认证** - 添加指纹/面容识别
2. **凭证加密** - 增强 localStorage 中的凭证加密
3. **凭证过期** - 自动刷新 Token 机制
4. **登录历史** - 记录登录设备和时间
5. **权限细粒度** - 显示 Token 授予的具体权限
6. **一键生成 Token** - 在应用内生成 Token（需要 OAuth）

## 兼容性

- ✅ 现代浏览器（Chrome, Firefox, Safari, Edge）
- ✅ Tauri 框架内置浏览器引擎
- ✅ localStorage API 支持
- ✅ Fetch API 支持
- ✅ Base64 编码支持

## 注意事项

1. **密码存储**
   - 密码以明文形式存储在 localStorage（同 Token）
   - 建议用户优先使用 Token
   - 在公共设备上使用时务必登出

2. **API 限制**
   - GitHub API 对无认证请求有严格的速率限制
   - 已认证的请求有更高的配额
   - Token 方式比用户名密码方式配额更高

3. **GitHub 政策**
   - 用户名密码方式的支持可能在 GitHub 未来的更新中改变
   - 建议长期使用 Token 方式
