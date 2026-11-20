# GitPulse 登录指南

GitPulse 支持 GitHub 浏览器授权和 Personal Access Token 登录。GitHub 不再允许第三方应用通过账号密码调用 REST API，密码和双因素验证应只在 GitHub 官网输入。

## 使用 GitHub 登录

1. 在 GitPulse 点击「登录」，选择「使用 GitHub 登录」。
2. 应用显示一次性验证码，点击「打开 GitHub 授权页面」。
3. 在 GitHub 官网登录，输入 GitPulse 显示的验证码，核对应用名称和权限后授权。
4. 回到 GitPulse，应用会自动完成登录。

验证码到期、拒绝授权或取消后，可以重新开始。关闭登录弹窗会停止等待；已取消的请求不会在后台完成登录。Token 过期或撤销后需要重新登录。

## 首次配置 OAuth 应用

1. 打开 https://github.com/settings/applications/new ，创建 **OAuth App**。
2. Application name 填 `GitPulse`。
3. 本地开发的 Homepage URL 填 `http://localhost:1420`。
4. Authorization callback URL 填 `http://localhost:1420/callback`。设备授权不使用该回调，但注册表单要求填写。
5. 开启 **Enable Device Flow**，注册应用。
6. 将公开的 Client ID 写入仓库根目录 `.env.local`：

```dotenv
VITE_GITHUB_CLIENT_ID=你的ClientID
```

7. 重启开发服务，或重新构建发布版本。

不需要 Client Secret，禁止将 Client Secret 放进 `VITE_` 环境变量。Client ID 是公开标识。当前实现不自动刷新过期的 OAuth Token；可以保留 GitHub 的过期设置，失效后重新授权即可。

请求权限为 `repo read:user notifications`，用于仓库访问、个人资料和收件箱。授权前可在 GitHub 页面查看具体权限。

## 开发和构建

```bash
# 浏览器开发（使用同源 OAuth 代理）
pnpm -F @gitpulse/app vite-dev

# 原生桌面应用（使用 Rust 网络接口）
pnpm dev:app

# 前端、测试和类型检查
pnpm -F @gitpulse/app build:web
pnpm -F @gitpulse/app test
pnpm -F @gitpulse/app type-check

# 原生后端检查
cd packages/app/src-tauri
cargo test --lib
```

Vite 从仓库根目录读取环境文件。原生应用通过限定为 GitHub OAuth 地址的 Rust 接口发送授权请求，并通过系统浏览器打开固定的 `https://github.com/login/device` 地址。

浏览器开发和 Vite preview 使用 `/api/github/login/device/code` 与 `/api/github/login/oauth/access_token` 同源代理。单独发布静态 `dist` 时，托管服务器也必须提供这两个 POST 代理；仅有静态文件的部署无法进行 OAuth 授权，可使用 Token 登录。不要直接在浏览器中请求 GitHub OAuth 地址，否则会受跨域限制。

## Token 备用登录

在「Token 登录」中粘贴 Personal Access Token，按回车或点击按钮登录。创建入口：https://github.com/settings/tokens 。按功能需要授予权限，账号密码不能用作 Token。

## 凭证与登录状态

- 两种方式均先请求 GitHub `/user` 验证身份，再保存实际 Token 和账号资料。
- 当前沿用本地 `localStorage` 保存 Token；它不是加密的系统钥匙串。
- GitPulse 不收集或保存 GitHub 密码；启动时清除旧版本遗留的密码字段。
- 退出会清除 Token、用户名、登录方式和用户资料。
- 重启时重新验证凭证，网络失败或限流不会直接删除已保存的 Token。
- GitHub 返回 401 时清除失效凭证；旧版本仅保存密码的会话需要重新授权。

## 常见问题

- **GitHub 登录尚未配置**：检查根目录 `.env.local` 的 Client ID，重启服务或重新构建。
- **应用尚未开启设备授权**：在 GitHub OAuth App 设置中开启 Enable Device Flow。
- **验证码过期 / 已取消授权**：重新点击「使用 GitHub 登录」。
- **无法连接 GitHub**：检查网络和代理设置，稍后重试。
- **当前网页未提供 GitHub 授权服务**：使用原生应用、Vite 开发/预览服务，或为静态托管配置上述同源代理。

参考：[GitHub OAuth 设备授权](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)、[创建 OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)。

## 本次验证（2026-11-20）

- 34 项前端回归测试通过：授权轮询、限流退避、取消、过期、状态持久化、跨平台传输和登录表单。
- 应用类型检查、前端构建及 macOS 调试应用打包通过。
- 原生 OAuth 接口单元测试通过；真实 GitHub 授权后，macOS 应用已成功自动登录。
- 全仓类型检查仍受 core 包已有的类型导入路径与未使用变量错误影响；前端构建还会报告未改动的 `HomePage.css:105` 样式语法警告。
- 未实机验证 iOS、Android、Windows 或 Linux。
