# Web 平台与 GitHub Pages

网页版由 React/Vite 构建，使用 HashRouter；路由写在 `#/...`，刷新详情页不要求服务器重写规则。图标、脚本和样式均使用构建时的基础路径。

## 本地开发与静态预览

只需 Node.js 22 和 pnpm 10.34.9，无需原生 SDK；先执行 `pnpm run doctor web` 检查环境。开发地址为 `http://localhost:1420`，可与原生开发复用同一服务。源码修改热更新，环境变量变化需要重启服务。

```bash
pnpm dev:web
# Pages 产物默认部署到 /git-pulse/
pnpm build:pages
pnpm preview:pages --host 127.0.0.1 --port 1433 --strictPort
# 另一个终端
pnpm test:pages
```

`build:pages` 与 `preview:pages` 均使用 Vite 的 `pages` 模式，输出目录为 `packages/app/dist`。可通过 `GITPULSE_WEB_BASE=/其他路径/` 覆盖基础路径；构建和预览必须使用同一基础路径。独立域名根目录使用 `/`。`build:web` 保留原生打包和已有 Web 服务器的生产模式，不会改变移动端资源路径。

`test:pages` 针对编译产物验证 390/1280 像素布局、子目录资源、manifest 图标、Token 登录、加密会话恢复及页面刷新。支持 `GITPULSE_TEST_URL` 和 `CHROME_PATH`；测试凭证与 API 响应均为隔离的模拟数据。

## GitHub Actions 发布

工作流为 `.github/workflows/pages.yml`，向 `main` 推送或在 Actions 手动运行 **Deploy web to GitHub Pages** 后执行：

1. 安装锁定依赖，执行类型检查、lint、应用及脚本测试。
2. `actions/configure-pages` 获取站点基础路径，执行 Pages 专用构建。
3. 对实际产物执行浏览器回归，验证子路径部署和登录恢复。
4. `actions/upload-pages-artifact` 上传产物，独立 deploy job 通过 `actions/deploy-pages` 部署。

仓库 Settings → Pages 的来源设为 **GitHub Actions**。部署任务使用 `github-pages` 环境，仅部署任务授予 `pages: write` 与 `id-token: write`；并发部署串行执行。无需手动上传文件或维护编译产物分支。

当前站点使用账号 Pages 的已有域名：`https://blog.chenbitao.com/git-pulse/`，GitHub 默认地址 `https://cbtpro.github.io/git-pulse/` 会跳转到该地址。开启 HTTPS，确保浏览器加密存储和剪贴板等功能处于安全上下文。

GitHub Free 的私有仓库不能启用 Pages，需使用公开仓库或支持私有 Pages 的套餐。仓库公开状态和付费方案由维护者决定，部署脚本不修改源码可见性。参见 [GitHub 自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) 与 [Vite 静态部署](https://vite.dev/guide/static-deploy)。

## 登录与平台能力

GitHub Pages 只提供静态托管，不运行开发服务器中的 OAuth 代理。Pages 构建提供游客浏览和 Personal Access Token 登录，不显示不能完成的 GitHub OAuth 入口，也不会请求不存在的 `/api/github/login/*`。Token 只在浏览器本地加密保存，用于直接请求 GitHub API；不把 Token 或 Client Secret 放进构建环境或 GitHub 仓库变量。

原生端继续使用 Rust OAuth 桥接；开发服务器继续提供同源代理。若将来为 Web 配置授权服务，应作为独立受控后端接入并补充跨域与生命周期验证，不能在静态站点中暴露 OAuth Secret。

GitHub API 权限和额度仍按当前账号生效；部分下载地址受到浏览器跨域规则约束，原生文件交付、小组件、系统钥匙串等能力不属于静态网页平台。

开发及自托管授权代理仅允许以下两个 POST 端点，转发表单并返回 JSON，不记录请求正文或 Token：

- `/api/github/login/device/code` → `https://github.com/login/device/code`
- `/api/github/login/oauth/access_token` → `https://github.com/login/oauth/access_token`

浏览器使用不可导出的 AES-GCM 密钥与 IndexedDB 保存加密账号库；必须使用 HTTPS 或 localhost。清除站点数据会删除本地账号、历史记录、pins 与工作区缓存。网页版不能替代原生钥匙串、状态栏和签名验证。
