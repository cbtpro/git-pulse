# Web 本地开发

只需 Node.js 22 和 pnpm 10.34.9，无需 Xcode、Rust 或 Android SDK。先完成 [依赖与 OAuth 配置](DEVELOPMENT.md)。

```bash
pnpm run doctor web
pnpm dev:web
```

打开 `http://localhost:1420`。原生端也使用这一前端服务，因此同时开发时会自动复用。修改 React、样式或语言文件后热更新；环境变量变更需要重启服务。

```bash
pnpm build:web
pnpm preview:web
```

静态产物在 `packages/app/dist`，预览地址以终端输出为准。预览构建使用 Vite preview，其授权代理继承项目的开发代理配置；生产静态托管不会自动带上代理。

## 浏览器授权的部署条件

浏览器登录将请求同源的两个 POST 端点：

- `/api/github/login/device/code` → `https://github.com/login/device/code`
- `/api/github/login/oauth/access_token` → `https://github.com/login/oauth/access_token`

开发环境由 Vite 代理；生产环境需自行部署限制到这两个端点的服务端代理，转发表单并返回 JSON，不记录请求正文或 Token。仅发布静态文件时可使用应用的 Token 登录。不能把 GitHub Client Secret 或个人 Token 注入 `VITE_*` 变量。

浏览器使用 Web Crypto 的非导出 AES-GCM 密钥和 IndexedDB 保存加密账号数据。应通过 HTTPS 或 localhost 安全上下文运行；清除站点数据会清除本地账号、历史记录和本地 pins 定制。Web 无法验证原生钥匙串、iOS 状态栏安全区与原生打包签名，这些需在对应应用测试。
