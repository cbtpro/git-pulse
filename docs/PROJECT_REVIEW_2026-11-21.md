# GitPulse 项目审计报告

后续进展：五项发现的整改与当前验证见 [整改报告](PROJECT_REMEDIATION_2026-11-21.md)。下文保留原审计基线，不代表修复后的现状。

审计日期：2026-11-21。源码基线：`b56508719c150adce2d28e3426c153482c3692c1`。主控组织架构、后端与原生、独立代码审查三个子 Agent 并行检查，主控负责测试执行、证据核对与结论合并。

当前应用的常用流程和构建检查通过，但仍存在一个需要优先修复的会话一致性问题，以及页面数据一致性、下载协议兼容和工程检查缺口。建议在下一次面向测试人员交付前修复前两项。测试通过不能作为这些路径已经正确的证据。

本轮产出是审计报告与复现证据，业务代码未修改。工作区原有 `packages/app/src-tauri/widgets/ios/Extension/Info.plist` 修改保留，不纳入本报告提交。

## 架构判断

实际运行架构是 React 18、Arco Design、React Router 和 Zustand 构成的客户端，直接访问 GitHub REST/GraphQL；Tauri 2 的 Rust 层提供 OAuth、安全存储、下载、安全区、系统导航与小组件能力。仓库没有独立运行的业务服务端，`BackendProxyApi` 是客户端的未来代理占位实现。

当前分层中，统一请求鉴权、来源账号校验、账号边界下清空页面实例、OAuth 地址白名单和下载跳转不继承 Token 都是有效设计。Web/Android 使用 IndexedDB 与不可导出的 Web Crypto 密钥，原生支持平台使用系统 keyring 配合加密文件；不能把 Android 方案描述为已经采用硬件 Keystore。

最需要调整的边界是：页面缓存应负责输入、筛选、滚动等界面状态；账号凭证和服务器资源应分别拥有跨上下文一致性、跨页面失效机制。不能通过销毁页面来修复数据过期，否则会重新引入返回时的状态丢失。

## 按优先级列出的发现

### 1. P1 多标签页可把已移除账号重新写回存储

**已运行隔离复现。** 两个同源标签加载虚拟账号后，A 调用 UI 退出底层使用的 `TokenManager.removeAccount('998877')`，确认持久化存储已为空；B 再保存搜索记录，A 重新加载会话后恢复了 `audit-fixture`。这里验证了退出底层路径，未模拟点击退出按钮，也未证明 GitHub 服务端 Token 已被撤销后仍能访问。

原因是 `TokenManager.ts:71-78` 的 vault、revision 和队列仅属于当前 JavaScript 上下文；`TokenManager.ts:310-326` 用旧内存快照全量保存账号与搜索记录；`SecureStorage.ts:107-114` 写入时没有共享版本校验。因此“单标签串行写入”无法解决多标签竞争，账号删除与并发修改都可能被覆盖。

修复应同时加入跨上下文失效通知、持久化版本或删除标记，以及共享事务/锁内的版本检查与合并。只增加广播通知不足以阻止已经排队的旧写入。验收至少包含：退出或移除账号后，其他标签的搜索、草稿和延迟请求不能恢复凭证；两个标签同时编辑不会覆盖各自更新；重新打开页面仍保持退出状态。

证据：`review-artifacts/team-review/multi-tab-logout-reproduction.mjs` 与 `multi-tab-logout-result.json`。使用独立浏览器上下文和虚拟凭证，GitHub API 全部拦截。

### 2. P2 页面保留后，详情写操作没有使列表数据失效

**已运行 Chromium 界面复现。** 进入进行中的 Issues 列表，打开一项并成功关闭，再返回列表。模拟服务端已经记录关闭，但列表仍显示该 Issue，返回前后列表请求次数均为 1。

`RetainedRoutes.tsx:134` 将不同完整地址保留为独立实例；`IssuesWorkspace.tsx:423-433` 关闭讨论后只刷新当前详情；`useGitHubResource.ts:13-38` 仅根据 loader 和本实例 revision 重新请求。列表实例因此一直保留旧资源，直到手动刷新或被淘汰。

建议以账号、仓库和资源为键共享服务器数据，或在写入成功时发送定向失效通知，更新数据而保留表单、筛选与滚动。验收覆盖关闭/重开 Issue、修改标签、合并 PR 后返回列表的一致性。仓库不同 tab 的 Star 状态存在同类代码路径风险（`RepositoryPage.tsx:274`、`:320`），该扩展场景仅作静态推导，未单独复现。

证据：`review-artifacts/team-review/reproduce-stale-issue-list.mjs`、`stale-issue-list.log`、`stale-issue-list.png`。复现脚本目前断言“缺陷存在”；修复后应反转断言，不能将它的成功退出当作业务验收通过。

### 3. P2 原生 Release 附件下载拒绝合法 HTTP 200

**已核对代码与官方接口契约，未执行真实附件下载。** `packages/app/src-tauri/src/github_downloads.rs:79-96` 拒绝所有非重定向响应，并要求 `Location`。GitHub Release asset API 在请求二进制内容时允许直接返回 `200` 或重定向 `302`，因此当前实现遇到直接数据流会报“GitHub 下载请求失败（200）”。参见 [GitHub Release assets 文档](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28#get-a-release-asset)。

建议分别处理直接流与签名跳转；直接流应通过受控临时文件交付，并维持 Token 仅发往 GitHub API 的边界。验收覆盖 200、302、401/403、缺失 Location、连接中断和大附件。现有 Rust 下载测试覆盖路径白名单，没有覆盖成功响应分支。

### 4. P2 core 包与实际应用脱节，全量检查已经失败

**类型检查与 lint 已实际执行并失败。** `pnpm type-check` 在 core 报出 3 个错误导入路径及 3 个未使用变量，共 6 个错误。涉及 `DirectGitHubApi.ts`、`BackendProxyApi.ts`、`GitHubApiClient.ts`；它们的 `../../types/github` 指向不存在的目录。`pnpm lint` 因 core 无可执行 ESLint 失败；单独运行 app lint 也因缺少 ESLint 配置失败。

app 声明依赖 core，但当前源码未使用该包；实际调用链是 app 自有服务层。core 仍公开旧 TokenManager，并在 `packages/core/src/services/auth/TokenManager.ts:15` 将 Token 写入 localStorage。这是过期公开契约带来的接入风险，**不是当前 app 已被证明明文存储 Token**。core 的 build 也仅输出成功文本，没有真实编译。

建议明确 core 的存续：保留则统一平台无关契约并注入存储/传输适配器，修复真实构建与检查；停用则移除无效依赖与过时公开入口。验收要求根目录全量类型检查、lint 和所有有效包构建可执行且结果可信。

### 5. P2 CI 未覆盖日常提交及完整工作区

**配置审查确认。** 唯一工作流 `.github/workflows/build.yml:3-16` 仅由手动或 `v*` tag 触发，没有 PR/普通分支推送检查。其 check job 的类型检查和应用测试也只覆盖 app，未执行 core 类型检查、lint、浏览器回归或 Rust 单元测试。

建议拆出轻量 PR/push 检查，覆盖有效工作区类型、lint、应用和脚本测试；加入原生单测及关键浏览器回归。平台打包继续由发布矩阵承担。修复门禁前，不能将现有 `pnpm check` 的成功解释为整个 monorepo 健康。

## 本轮测试结果

| 检查 | 本轮结果 | 覆盖范围 |
| --- | --- | --- |
| `pnpm check` | 通过 | app 类型检查，38 个测试文件、231 项测试；29 项脚本测试 |
| `pnpm build:web` | 通过 | 有大于 500 kB 的 chunk 提示，未导致失败 |
| `pnpm type-check` | 失败 | core 共 6 项 TypeScript 错误 |
| `pnpm lint` | 失败 | core 找不到 ESLint |
| `pnpm -F @gitpulse/app lint` | 失败 | app 无 ESLint 配置 |
| `cargo test --lib --locked` | 通过 | macOS 当前主机，6 项 Rust 测试；通过 cargo 的绝对路径执行 |
| 工作区 Chromium 回归 | 通过 | 390/1280 像素，8 个工作区、加密恢复、离线显式发送及来源账号回复 |
| 交互返回 Chromium 回归 | 通过 | 320/390/1024 像素，取消/完成/连续返回、实例和滚动保留、固定导航、逐帧交接 |
| WebKit 导航回归 | 通过 | 320/390/1280 像素，来源恢复、目录、直接进入、键盘菜单及英文布局 |

本轮合计通过 266 项应用、脚本与 Rust 单元测试，浏览器回归单独列出。测试使用本地前端 `http://127.0.0.1:1430` 与模拟 GitHub 响应。没有重跑完整 iOS/Android/Windows/Linux 打包、真机安装或真实 GitHub 授权/下载；本轮结论不代表这些平台均已完成验收。以前的模拟器验证不计入本轮测试结果。

日志与复现证据集中在 `review-artifacts/team-review/`，该目录被 Git 忽略，仅保留在当前工作区。可分别运行其中两个复现脚本；手势、工作区和 WebKit 导航使用仓库现有 `scripts/qa` 入口与 `GITPULSE_TEST_URL` 环境变量。

## 建议实施顺序

1. 后端与客户端状态负责人先修复跨标签账号删除和写入竞争，补充并发验收用例。
2. 架构与业务负责人建立资源定向失效机制，修复列表和详情一致性，同时保留页面状态。
3. 原生负责人补齐附件下载 200/302 双路径和协议测试。
4. 工程负责人收敛 core、修复类型检查及 lint，再将完整检查接入 PR/push 门禁。

每项应独立提交并附上回归证据。上述顺序是整改建议，本轮没有实施这些修复，也没有推送代码或发布新版本。
