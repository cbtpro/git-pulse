import { useCallback, useState } from "react";
import { Alert, Button, Input, Spin, Tag } from "@arco-design/web-react";
import { ArrowLeft, Bell, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n";
import { useWorkspaceAccount } from "../hooks/useWorkspaceAccount";
import { useAccountWorkspace } from "../hooks/useAccountWorkspace";
import { useGitHubResource } from "../hooks/useGitHubResource";
import { useWorkspaceAction } from "../hooks/useWorkspaceAction";
import { TokenManager } from "../services/auth/TokenManager";
import { releaseFeed } from "../services/github/ReleaseService";
import { repositories } from "../services/github/RepositoryService";
import {
  ReleaseCard,
  ReleaseFilter,
  releaseVisible,
} from "../components/workspace/ReleasesWorkspace";
import { WorkPager } from "../components/workspace/WorkShared";
import { PageHeader } from "../components/common/PageHeader";
import {
  EmptyState,
  RequestError,
  SignInState,
} from "../components/common/ResourceState";
import "../styles/workspace.css";
export function ReleaseCenterPage({
  onShowLogin,
}: {
  onShowLogin: () => void;
}) {
  const { t } = useTranslation(),
    account = useWorkspaceAccount();
  return (
    <div className="gp-page">
      <PageHeader
        eyebrow="RELEASES"
        title={t("版本更新中心")}
        description={t("订阅常用项目，打开页面或刷新时查看最新发布。")}
        actions={
          <Link className="gp-quiet-link" to="/profile">
            <ArrowLeft size={16} />
            {t("我的")}
          </Link>
        }
      />
      {account.missing ? (
        <Alert type="error" content={t("来源账号已移除，请重新添加账号。")} />
      ) : account.token && account.id ? (
        <ReleaseFeed
          key={account.id}
          accountId={account.id}
          token={account.token}
        />
      ) : (
        <SignInState
          description={t("登录后订阅项目版本更新。")}
          onLogin={onShowLogin}
        />
      )}
    </div>
  );
}
function ReleaseFeed({
  accountId,
  token,
}: {
  accountId: string;
  token: string;
}) {
  const { t } = useTranslation(),
    action = useWorkspaceAction(),
    workspace = useAccountWorkspace(accountId);
  const [input, setInput] = useState(""),
    [filter, setFilter] = useState("stable"),
    [page, setPage] = useState(1);
  const subscriptions = workspace.subscriptions.join(",");
  const resource = useGitHubResource(
    useCallback(
      (signal) =>
        releaseFeed(
          subscriptions ? subscriptions.split(",") : [],
          token,
          signal,
        ),
      [subscriptions, token],
    ),
  );
  const items = (resource.data?.items || []).filter((item) =>
    releaseVisible(item.release, filter),
  );
  const add = () =>
    void action.run(async () => {
      const parts = input.trim().split("/");
      if (parts.length !== 2)
        throw new Error("请输入 owner/repo 格式的仓库名称");
      const repository = await repositories.get(
        parts[0],
        parts[1],
        token,
        new AbortController().signal,
      );
      await TokenManager.updateWorkspace(accountId, (current) => {
        const name = repository.full_name.toLowerCase();
        if (current.subscriptions.includes(name)) return current;
        if (current.subscriptions.length >= 30)
          throw new Error("最多订阅 30 个仓库，请先移除部分订阅。");
        return { ...current, subscriptions: [...current.subscriptions, name] };
      });
      setInput("");
      setPage(1);
    });
  return (
    <>
      <div className="gp-work-toolbar">
        <form
          className="gp-work-search"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input
            aria-label={t("订阅仓库")}
            placeholder="owner/repo"
            value={input}
            onChange={setInput}
          />
          <Button
            htmlType="submit"
            type="primary"
            icon={<Plus size={15} />}
            loading={action.busy}
            disabled={!input.trim()}
          >
            {t("添加订阅")}
          </Button>
        </form>
        <ReleaseFilter
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
        />
        <Button onClick={resource.reload} disabled={resource.loading}>
          {t("刷新")}
        </Button>
      </div>
      <div className="gp-work-tags">
        {workspace.subscriptions.map((name) => (
          <Tag
            key={name}
            visible
            closable
            onClose={() => {
              void action.run(async () => {
                await TokenManager.updateWorkspace(accountId, (current) => ({
                  ...current,
                  subscriptions: current.subscriptions.filter(
                    (value) => value !== name,
                  ),
                }));
                setPage(1);
              });
            }}
          >
            <Bell size={13} /> {name}
          </Tag>
        ))}
      </div>
      {resource.loading ? (
        <Spin />
      ) : resource.error ? (
        <RequestError error={resource.error} retry={resource.reload} />
      ) : (
        <>
          {resource.data?.errors.map((error) => (
            <Alert
              key={error.repository}
              type="warning"
              title={error.repository}
              content={t(error.message)}
              className="gp-work-content"
            />
          ))}
          {!items.length ? (
            <EmptyState
              title={t(
                workspace.subscriptions.length
                  ? "暂无符合条件的版本"
                  : "还没有版本订阅",
              )}
              description={t("可以添加 owner/repo，或在仓库版本页订阅。")}
            />
          ) : (
            items
              .slice((page - 1) * 10, page * 10)
              .map((item) => (
                <ReleaseCard
                  key={`${item.repository}/${item.release.id}`}
                  {...item}
                  token={token}
                  accountId={accountId}
                />
              ))
          )}
          <WorkPager
            page={page}
            hasNext={page * 10 < items.length}
            onChange={setPage}
          />
        </>
      )}
      <p className="gp-work-muted">
        {t("每个订阅汇总最近 5 个发布记录；完整历史可进入仓库版本页查看。")}
      </p>
    </>
  );
}
