# GitPulse 登录快速开始

登录入口已改为 **GitHub 浏览器授权**，同时保留 **Token 登录**。账号密码和双因素验证码只在 GitHub 官网输入。

1. 在 GitHub 创建 OAuth App，开启 **Enable Device Flow**。
2. 将公开 Client ID 配置在仓库根目录 `.env.local` 的 `VITE_GITHUB_CLIENT_ID` 中。
3. 启动 `pnpm dev:app`，在 GitPulse 点击「登录 → 使用 GitHub 登录」。
4. 点击「打开 GitHub 授权页面」，输入应用显示的一次性验证码并授权。
5. 回到 GitPulse，等待自动登录。

无需 Client Secret。关闭登录弹窗会取消等待。凭证失效后重新授权；也可选择 Token 登录。

注册表单填写方法、开发/部署差异和排错见 [完整登录指南](packages/app/LOGIN_GUIDE.md)。
