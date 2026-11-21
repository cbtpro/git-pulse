import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Input,
  Select,
  Spin,
  Tag,
} from "@arco-design/web-react";
import { PageModal as Modal } from "../components/routing/PageModal";
import { FolderHeart, Pencil, Star } from "lucide-react";
import { useTranslation } from "../i18n";
import { useWorkspaceAccount } from "../hooks/useWorkspaceAccount";
import { useAccountWorkspace } from "../hooks/useAccountWorkspace";
import { useWorkspaceAction } from "../hooks/useWorkspaceAction";
import { useGitHubResource } from "../hooks/useGitHubResource";
import { TokenManager } from "../services/auth/TokenManager";
import {
  requestGitHub,
  invalidateGitHubQueryCache,
} from "../services/github/GitHubService";
import { repositories, repoRoute } from "../services/github/RepositoryService";
import type { Repository } from "../types/github";
import type { StarNote } from "../types/workspace";
import { PageHeader } from "../components/common/PageHeader";
import {
  EmptyState,
  RequestError,
  SignInState,
} from "../components/common/ResourceState";
import "../styles/workspace.css";
const statuses = {
  none: "未分类",
  later: "稍后阅读",
  read: "已阅读",
  using: "正在使用",
} as const;
const newNote = (): StarNote => ({
  group: "",
  tags: [],
  note: "",
  status: "none",
});
export function StarCollectionsPage({
  onShowLogin,
}: {
  onShowLogin: () => void;
}) {
  const { t } = useTranslation(),
    account = useWorkspaceAccount();
  return (
    <div className="gp-page">
      <PageHeader
        eyebrow="COLLECTIONS"
        title={t("Star 收藏管理")}
        description={t("为收藏添加分组、标签和私人笔记。")}
      />
      {account.missing ? (
        <Alert type="error" content={t("来源账号已移除，请重新添加账号。")} />
      ) : account.token && account.id ? (
        <Collections
          key={account.id}
          accountId={account.id}
          token={account.token}
        />
      ) : (
        <SignInState
          description={t("登录后整理你的 Star 收藏。")}
          onLogin={onShowLogin}
        />
      )}
    </div>
  );
}
function Collections({
  accountId,
  token,
}: {
  accountId: string;
  token: string;
}) {
  const { t } = useTranslation(),
    action = useWorkspaceAction(),
    workspace = useAccountWorkspace(accountId);
  const [page, setPage] = useState(1),
    [items, setItems] = useState<Repository[]>([]),
    [query, setQuery] = useState(""),
    [group, setGroup] = useState(""),
    [status, setStatus] = useState("");
  const [editing, setEditing] = useState<string | null>(null),
    [note, setNote] = useState<StarNote>(newNote()),
    [tags, setTags] = useState("");
  const resource = useGitHubResource(
    useCallback(
      (signal) =>
        requestGitHub<Repository[]>(
          `/user/starred?sort=created&direction=desc&per_page=100&page=${page}`,
          token,
          signal,
        ),
      [page, token],
    ),
  );
  useEffect(() => {
    if (resource.data)
      setItems((old) => {
        const map = new Map(
          (page === 1 ? [] : old).map((repo) => [repo.id, repo]),
        );
        for (const repo of resource.data!.data) map.set(repo.id, repo);
        return [...map.values()];
      });
  }, [resource.data, page]);
  const groups = [
    ...new Set(
      Object.values(workspace.stars)
        .map((n) => n.group)
        .filter(Boolean),
    ),
  ].sort();
  const filtered = items.filter((repo) => {
    const entry = workspace.stars[repo.full_name.toLowerCase()] || newNote();
    const text = [
      repo.full_name,
      repo.description,
      entry.group,
      entry.note,
      ...entry.tags,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!group || entry.group === group) &&
      (!status || entry.status === status) &&
      text.includes(query.toLowerCase())
    );
  });
  const edit = (repo: Repository) => {
    const entry = workspace.stars[repo.full_name.toLowerCase()] || newNote();
    setNote(entry);
    setTags(entry.tags.join(", "));
    setEditing(repo.full_name);
  };
  return (
    <>
      <div className="gp-work-toolbar">
        <Input
          aria-label={t("搜索收藏")}
          placeholder={t("搜索仓库、标签或笔记")}
          value={query}
          onChange={setQuery}
          allowClear
          style={{ flex: 1, minWidth: 180 }}
        />
        <Select
          aria-label={t("收藏分组")}
          value={group}
          onChange={setGroup}
          style={{ minWidth: 140 }}
          options={[
            { value: "", label: t("全部分组") },
            ...groups.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          aria-label={t("阅读状态")}
          value={status}
          onChange={setStatus}
          style={{ minWidth: 140 }}
          options={[
            { value: "", label: t("全部状态") },
            ...Object.entries(statuses).map(([value, label]) => ({
              value,
              label: t(label),
            })),
          ]}
        />
        <Button
          disabled={resource.loading}
          onClick={() => {
            invalidateGitHubQueryCache();
            setItems([]);
            setPage(1);
            resource.reload();
          }}
        >
          {t("刷新")}
        </Button>
      </div>
      <p className="gp-work-muted">
        {t("已加载 {{count}} 个收藏；搜索和筛选作用于已加载内容。", {
          count: items.length,
        })}
      </p>
      {resource.error && (
        <RequestError error={resource.error} retry={resource.reload} />
      )}
      {!filtered.length && !resource.loading ? (
        <EmptyState
          title={t("暂无匹配收藏")}
          description={
            resource.data?.hasNext ? t("可以继续加载更多收藏。") : ""
          }
        />
      ) : (
        <ul className="gp-work-list">
          {filtered.map((repo) => {
            const entry =
              workspace.stars[repo.full_name.toLowerCase()] || newNote();
            return (
              <li key={repo.id}>
                <a href={`#${repoRoute(repo.full_name, accountId)}`}>
                  <strong>{repo.full_name}</strong>
                  <span>{repo.description}</span>
                </a>
                <div className="gp-work-tags">
                  {entry.group && (
                    <Tag>
                      <FolderHeart size={13} /> {entry.group}
                    </Tag>
                  )}
                  {entry.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                  {entry.status !== "none" && (
                    <Tag>{t(statuses[entry.status])}</Tag>
                  )}
                </div>
                {entry.note && <p className="gp-work-note">{entry.note}</p>}
                <div className="gp-work-toolbar">
                  <Button
                    size="small"
                    icon={<Pencil size={14} />}
                    onClick={() => edit(repo)}
                  >
                    {t("整理收藏")}
                  </Button>
                  <Button
                    size="small"
                    icon={<Star size={14} />}
                    loading={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        await repositories.star(
                          repo.owner.login,
                          repo.name,
                          false,
                          token,
                        );
                        setItems([]);
                        setPage(1);
                        resource.reload();
                      })
                    }
                  >
                    {t("取消 Star")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {resource.loading && <Spin />}
      {resource.data?.hasNext && (
        <Button
          onClick={() => setPage((p) => p + 1)}
          disabled={resource.loading}
        >
          {t("加载更多收藏")}
        </Button>
      )}
      <p className="gp-work-muted">
        {t("分组和笔记只在本机加密保存，不会公开到 GitHub。")}
      </p>
      <Modal
        title={editing}
        visible={Boolean(editing)}
        onCancel={() => setEditing(null)}
        footer={null}
      >
        <form
          className="gp-work-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (editing)
              void action.run(async () => {
                const key = editing.toLowerCase();
                await TokenManager.updateWorkspace(accountId, (current) => ({
                  ...current,
                  stars: {
                    ...current.stars,
                    [key]: {
                      ...note,
                      tags: tags
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  },
                }));
                setEditing(null);
              });
          }}
        >
          <label>
            {t("分组")}
            <Input
              value={note.group}
              maxLength={80}
              onChange={(group) => setNote((old) => ({ ...old, group }))}
            />
          </label>
          <label>
            {t("标签（逗号分隔）")}
            <Input value={tags} onChange={setTags} maxLength={480} />
          </label>
          <label>
            {t("阅读状态")}
            <Select
              value={note.status}
              onChange={(status) => setNote((old) => ({ ...old, status }))}
              options={Object.entries(statuses).map(([value, label]) => ({
                value,
                label: t(label),
              }))}
            />
          </label>
          <label>
            {t("私人笔记")}
            <Input.TextArea
              value={note.note}
              onChange={(note) => setNote((old) => ({ ...old, note }))}
              maxLength={4000}
              autoSize={{ minRows: 4, maxRows: 12 }}
            />
          </label>
          <Button type="primary" htmlType="submit" loading={action.busy}>
            {t("保存修改")}
          </Button>
        </form>
      </Modal>
    </>
  );
}
