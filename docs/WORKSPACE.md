# GitPulse 业务工作区

主导航仍为概览、搜索、收件箱、我的。仓库相关操作集中在仓库详情页；私人整理工具放在“我的”。所有新增界面支持简体中文、繁体中文、英文和日语。

## 入口与操作

| 入口                           | 功能                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| 搜索结果、我的仓库中的仓库名称 | 应用内查看 README、分支、目录和文本文件，Star / 取消 Star                          |
| 仓库 → Issues / Pull requests  | 按状态、关键词和 GitHub 条件筛选；创建 Issue、评论、管理标签/负责人、关闭/重新打开 |
| PR 详情                        | 普通讨论、评审记录、代码评论、文件补丁、提交评审、合并                             |
| 登录后的概览                   | 待我评审、分配给我、提及我、我的失败 PR；账号和仓库筛选                            |
| 仓库 → Actions                 | 运行状态、分支筛选、任务步骤、日志预览、重跑、取消、产物下载                       |
| 我的 → Star 收藏管理           | 分组、标签、私人笔记、稍后阅读/已阅读/正在使用                                     |
| 我的 → 版本更新中心            | 添加 `owner/repo` 订阅、正式/预发布筛选、更新说明、系统安装包提示                  |
| 我的 → 离线阅读与草稿          | 查看缓存正文与讨论、编辑/删除草稿、清理缓存、开启/关闭自动保存                     |
| 收件箱                         | 多账号聚合、来源账号筛选、未读/参与筛选、应用内打开讨论并标记已读                  |

PR 的标签与负责人使用 Issues 接口修改。合并时提交已查看的 SHA，GitHub 仍会校验仓库权限、分支保护和检查结果；提交发生变化时不会静默合并新版本。维护类操作按仓库返回的权限显示。

## 账号与存储

- 统一收件箱与待办的链接携带来源账号。打开讨论、评论、标为已读时使用该账号的凭证；账号移除后提示重新添加，不回退到当前激活账号。
- 账号、收藏笔记、订阅、离线副本、评论草稿共用现有加密存储。账号摘要不携带凭证或工作区正文；移除账号同时移除其私人数据。
- 收藏笔记与分组保存在当前设备，不会发布到 GitHub，也不自动跨设备同步。
- 自动草稿保存有短暂去抖，离开页面时会尝试保存最后一次输入。页面显示保存失败时，请点击“保存草稿”重试。联网事件不会自动发评论。
- 离线阅读保存 README、Issue/PR 正文和已加载的前 20 条普通评论。副本显示保存时间；图片、附件、完整代码补丁和更多历史评论仍需联网。

## 容量和 API 边界

- 文本文件预览限制为约 1 MB；二进制或更大的文件提供 GitHub 入口。GitHub Contents API 的目录返回数量限制仍适用。
- Issues/PR 和待办搜索最多浏览 GitHub 搜索支持的前 1,000 条；可进一步增加仓库、标签、状态等条件。
- Star 每次加载 100 项。页面明确显示已加载数量，搜索/分组筛选作用于已加载内容；“加载更多收藏”继续获取下一批。
- 每个账号最多订阅 30 个仓库，更新中心汇总每个仓库最近 5 个发布记录，最多 3 个并发请求。打开页面或手动刷新时更新；完整版本历史在仓库的版本页分页查看。
- 离线副本最多 60 篇、约 2 MB，单篇最多 300 KB；较旧副本自动清理。评论草稿最多 100 份。工作区写入总量上限为 12 MiB，原生加密文件读取上限为 16 MiB。
- 日志显示前 2 MB。原生端先从 GitHub 获取临时 HTTPS 下载地址，再使用无凭证请求读取日志或交给系统浏览器下载文件。浏览器版下载受目标站 CORS 限制；页面始终保留 GitHub 原文入口。
- 安装包的系统提示根据文件名和当前系统识别，不推断 CPU 架构；下载前仍应核对文件名。

## 开发验证

```bash
pnpm check
pnpm build:web
pnpm dev:web
# 另一个终端；使用独立浏览器上下文、虚构账号、拦截所有 GitHub API
pnpm test:workspace:browser
```

浏览器验证默认使用 macOS 的 Google Chrome，可通过 `CHROME_PATH` 指定其他系统上的 Chrome/Chromium 可执行文件。截图保存到被 Git 忽略的 `review-artifacts/business/`。

浏览器流程覆盖 390 px / 1280 px、仓库文件、Issue 讨论、首页待办、Actions 日志、收藏加密恢复、版本订阅、离线草稿显式发送，以及切换激活账号后仍以来源账号处理通知。测试不会向真实仓库评论、合并或触发工作流。

原生构建使用项目统一入口：

```bash
pnpm build:ios:simulator --debug
pnpm build:android --debug --apk --target aarch64
pnpm build:macos --debug --no-bundle
```

本机验证不能代替 Windows/Linux 或真机上的端到端验证；平台要求和 CI 构建矩阵见 [PLATFORM_GUIDE.md](PLATFORM_GUIDE.md)。

## 接口依据

- [Repository contents](https://docs.github.com/en/rest/repos/contents)
- [Issues](https://docs.github.com/en/rest/issues/issues)、[Pull requests](https://docs.github.com/en/rest/pulls/pulls)、[Reviews](https://docs.github.com/en/rest/pulls/reviews)
- [GitHub Issue/PR 搜索条件](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests)
- [Workflow runs](https://docs.github.com/en/rest/actions/workflow-runs)、[Workflow jobs](https://docs.github.com/en/rest/actions/workflow-jobs)、[Artifacts](https://docs.github.com/en/rest/actions/artifacts)
- [Releases](https://docs.github.com/en/rest/releases/releases)
