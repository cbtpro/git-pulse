# 聚合搜索、Pages 和置顶定制

顶部搜索点击后展开输入框和面板。输入停顿 600 毫秒后查询；输入法合成期间不会提交。支持仓库、用户、组织、主题、代码、提交、Issues/PR 和当前账号的 GitHub Pages。方向键选择、Enter 查看、Esc 关闭并恢复焦点；也支持 Cmd/Ctrl+K。搜索结果数量会通知屏幕阅读器。

输入中的关键词及结果里的匹配文字会高亮，条件前缀保持普通样式。GitHub 高级查询原文直接传递给对应搜索接口；不支持的条件会在对应分类提示。代码搜索的 `symbol:` 和正则表达式提供 GitHub 官网入口。热门推荐来自高 Star 仓库；兴趣推荐来自当前账号收藏的语言和主题。兴趣推荐和最近搜索用标签排列，空间不足时换行。

选择结果后进入独立的“搜索”页，类型、搜索框和结果同步更新。该页面一次查询一种类型，每页 10 项，根据类型提供适用的语言和排序筛选；输入后按 Enter 或点击“搜索”提交。条件保存在地址中，支持返回与刷新恢复。用户、组织和主题分别转换为 `user:`、`org:`、`topic:`；仓库、文件、提交、Issue/PR 和 Pages 转换为所属仓库的 `repo:`，并保留原始结果链接。高级搜索条件可直接回车提交。

顶部默认聚合模式下，`user: cbtpro`、`org:`、`repo:`、`topic:`、`type:code` 等类型条件会隐藏不匹配的结果；手动选定代码等分类后，`repo:` 作为该分类的仓库范围使用。最近搜索也按相同类型过滤。

最近搜索最多保留 10 条，每条记录保存搜索类型；桌面端在文字右侧提供删除按钮，触屏长按 500 毫秒显示删除按钮，滑动时会取消长按。删除按钮支持键盘和读屏；指定类型时清空只影响当前类型。登录后随账号加密保存，账号间相互独立；未登录时只保留在当前运行内存中。搜索缓存也按账号隔离。

Pages 目录短暂缓存 2 分钟，按账号隔离，手动刷新可重新读取；改变聚合搜索关键词不会重新扫描所有仓库。

“我的 GitHub Pages”每页 5 项，可搜索仓库名称和站点域名；修改搜索内容会返回第一页。自定义域名按 GitHub Pages 接口返回的实际地址展示。

“我的置顶”右侧提供“定制你的 Pins”。弹窗读取 GitHub 的完整置顶候选列表，支持名称、所有者、简介搜索，Repo/Gists 筛选和复选框选择，最多 6 项。筛选不会丢失已选项目。保存成功后刷新展示；取消不保存，保存失败保留选择。

GitHub 公开 GraphQL 提供 `pinnedItems` 和 `pinnableItems` 查询，但当前公开 schema 未提供修改个人主页置顶的 mutation。因此此处自定义置顶仅在当前设备的 GitPulse 中生效，按账号加密保存，不会改动 GitHub 官网。弹窗中有明确说明及官网入口；“使用 GitHub 置顶”可清除本地定制并恢复 GitHub 的 Repo/Gist 置顶。

查询统一使用当前账号授权。普通查询、搜索、代码搜索和 GraphQL 的限流分别处理，遵守 `Retry-After`/`X-RateLimit-Reset`；不会因限流删除账号、降级匿名或反复重试。已登录账号的提示不再建议重新登录。重复搜索短暂缓存；开发环境 StrictMode 不会再发起一次随后立即取消的初始查询。若启动时 GitHub 临时限流，已保存完整资料的账号保留登录态；明确的 401 仍要求重新授权。

参考：[GitHub 置顶说明](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/pinning-items-to-your-profile)、[GraphQL 用户字段](https://docs.github.com/en/graphql/reference/users)、[公开 GraphQL schema](https://github.com/octokit/graphql-schema/blob/master/schema.graphql)、[API 限流处理](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)。
