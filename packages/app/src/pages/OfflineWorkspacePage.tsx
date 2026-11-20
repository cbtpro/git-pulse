import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  Popconfirm,
  Switch,
  Tag,
} from "@arco-design/web-react";
import { ArrowLeft, BookOpen, FilePenLine, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n";
import { useWorkspaceAccount } from "../hooks/useWorkspaceAccount";
import { useAccountWorkspace } from "../hooks/useAccountWorkspace";
import { useWorkspaceAction } from "../hooks/useWorkspaceAction";
import { useOnlineStatus } from "../hooks/useOfflineWorkspace";
import { TokenManager } from "../services/auth/TokenManager";
import { repoRoute } from "../services/github/RepositoryService";
import { workRoute } from "../services/github/CollaborationService";
import { MarkdownBody } from "../components/workspace/WorkShared";
import { CommentComposer } from "../components/workspace/CommentComposer";
import { PageHeader } from "../components/common/PageHeader";
import { SignInState } from "../components/common/ResourceState";
import "../styles/workspace.css";
export function OfflineWorkspacePage({
  onShowLogin,
}: {
  onShowLogin: () => void;
}) {
  const { t } = useTranslation(),
    account = useWorkspaceAccount();
  return (
    <div className="gp-page">
      <PageHeader
        eyebrow="OFFLINE"
        title={t("离线阅读与草稿")}
        description={t("离线副本和草稿仅在本机加密保存，按账号隔离。")}
        actions={
          <Link className="gp-quiet-link" to="/profile">
            <ArrowLeft size={16} />
            {t("我的")}
          </Link>
        }
      />
      {account.missing ? (
        <Alert type="error" content={t("来源账号已移除，请重新添加账号。")} />
      ) : account.id && account.token ? (
        <OfflineLibrary
          key={account.id}
          accountId={account.id}
          token={account.token}
        />
      ) : (
        <SignInState
          description={t("登录后使用离线阅读和草稿。")}
          onLogin={onShowLogin}
        />
      )}
    </div>
  );
}
function OfflineLibrary({
  accountId,
  token,
}: {
  accountId: string;
  token: string;
}) {
  const { t } = useTranslation(),
    workspace = useAccountWorkspace(accountId),
    action = useWorkspaceAction(),
    online = useOnlineStatus();
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const doc = selected ? workspace.documents[selected] : null;
  const documents = Object.values(workspace.documents)
    .sort((a, b) => b.savedAt - a.savedAt)
    .filter((item) =>
      [item.title, item.repository, item.body]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  const drafts = Object.values(workspace.drafts).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  const remove = (section: "documents" | "drafts", key: string) => {
    if (section === "drafts")
      window.dispatchEvent(
        new CustomEvent("gitpulse:discard-draft", {
          detail: `${accountId}:${key}`,
        }),
      );
    return action.run(() =>
      TokenManager.updateWorkspace(accountId, (current) => {
        const values = { ...current[section] };
        delete values[key];
        return { ...current, [section]: values };
      }),
    );
  };
  return (
    <>
      <div className="gp-work-toolbar">
        <Tag color={online ? "green" : "orange"}>
          {t(online ? "在线" : "离线")}
        </Tag>
        <label className="gp-inline-actions">
          <Switch
            checked={workspace.offlineEnabled !== false}
            aria-label={t("自动保存阅读副本")}
            disabled={action.busy}
            onChange={(enabled) =>
              void action.run(() =>
                TokenManager.updateWorkspace(accountId, (current) => ({
                  ...current,
                  offlineEnabled: enabled,
                })),
              )
            }
          />
          {t("自动保存阅读副本")}
        </label>
        <Popconfirm
          title={t("清空当前账号的离线副本？草稿会保留。")}
          onOk={() =>
            action.run(async () => {
              await TokenManager.updateWorkspace(accountId, (current) => ({
                ...current,
                documents: {},
              }));
              setSelected(null);
            })
          }
        >
          <Button
            icon={<Trash2 size={15} />}
            disabled={!documents.length}
            loading={action.busy}
          >
            {t("清空阅读缓存")}
          </Button>
        </Popconfirm>
      </div>
      <p className="gp-work-muted">
        {t(
          "最多保存 60 篇、合计 2 MB，较旧副本会自动清理。图片和附件需联网查看。",
        )}
      </p>
      {doc ? (
        <Card
          title={<span className="gp-work-break">{doc.title}</span>}
          className="gp-work-content"
        >
          <div className="gp-work-toolbar">
            <Button onClick={() => setSelected(null)}>{t("返回列表")}</Button>
            <a
              href={`#${doc.kind === "readme" ? repoRoute(doc.repository, accountId) + `&ref=${encodeURIComponent(doc.ref || "")}` : workRoute(doc.repository, doc.kind === "pull" ? "pulls" : "issues", doc.number!, accountId)}`}
            >
              {t("打开在线版本")}
            </a>
          </div>
          <Alert
            content={t("这是 {{time}} 保存的副本，可能不是最新内容。", {
              time: new Date(doc.savedAt).toLocaleString(),
            })}
          />
          <MarkdownBody body={doc.body} url={doc.url} />
          {doc.comments?.length ? (
            <section>
              <h3>{t("已缓存的讨论（前 20 条）")}</h3>
              {doc.comments.map((comment, index) => (
                <Card
                  key={index}
                  className="gp-work-content"
                  title={comment.author}
                >
                  <MarkdownBody body={comment.body} url={comment.url} />
                </Card>
              ))}
            </section>
          ) : null}
          {doc.kind !== "readme" && doc.number && (
            <CommentComposer
              key={doc.key}
              repository={doc.repository}
              kind={doc.kind}
              number={doc.number}
              accountId={accountId}
              token={token}
            />
          )}
        </Card>
      ) : (
        <>
          <Input
            aria-label={t("搜索离线副本")}
            placeholder={t("搜索离线副本")}
            value={query}
            onChange={setQuery}
            allowClear
          />
          <ul className="gp-work-list">
            {documents.map((item) => (
              <li key={item.key}>
                <button
                  className="gp-work-link-button"
                  onClick={() => setSelected(item.key)}
                >
                  <strong>
                    <BookOpen size={15} /> {item.title}
                  </strong>
                  <span>
                    {item.repository} ·{" "}
                    {new Date(item.savedAt).toLocaleString()}
                  </span>
                </button>
                <Button
                  size="small"
                  icon={<Trash2 size={14} />}
                  aria-label={`${t("删除副本")} ${item.title}`}
                  onClick={() => void remove("documents", item.key)}
                  loading={action.busy}
                />
              </li>
            ))}
          </ul>
          {!documents.length && (
            <p>{t("尚无离线副本，浏览 README 或讨论后会自动保存。")}</p>
          )}
        </>
      )}
      <h2>
        <FilePenLine size={18} /> {t("评论草稿")}
      </h2>
      {!drafts.length && <p className="gp-work-muted">{t("暂无评论草稿")}</p>}
      {drafts.map((draft) => (
        <details className="gp-work-diff" key={draft.key}>
          <summary>
            {draft.repository} #{draft.number} ·{" "}
            {new Date(draft.updatedAt).toLocaleString()}
          </summary>
          {selected !== draft.key && (
            <CommentComposer
              repository={draft.repository}
              kind={draft.kind}
              number={draft.number}
              accountId={accountId}
              token={token}
            />
          )}
          <div className="gp-work-toolbar">
            <a
              href={`#${workRoute(draft.repository, draft.kind === "pull" ? "pulls" : "issues", draft.number, accountId)}`}
            >
              {t("打开在线版本")}
            </a>
            <Popconfirm
              title={t("删除这份草稿？")}
              onOk={() => remove("drafts", draft.key)}
            >
              <Button status="danger" loading={action.busy}>
                {t("删除草稿")}
              </Button>
            </Popconfirm>
          </div>
        </details>
      ))}
    </>
  );
}
