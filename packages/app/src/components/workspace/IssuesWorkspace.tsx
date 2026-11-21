import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Spin,
  Tabs,
  Tag,
} from "@arco-design/web-react";
import { PageModal as Modal } from "../routing/PageModal";
import { ArrowLeft, ExternalLink, MessageSquare, Plus } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useGitHubResource } from "../../hooks/useGitHubResource";
import { useWorkspaceAction } from "../../hooks/useWorkspaceAction";
import {
  collaboration,
  workRoute,
  type WorkKind,
  type WorkItem,
  type Discussion,
} from "../../services/github/CollaborationService";
import { RequestError, EmptyState } from "../common/ResourceState";
import { useRepository } from "./RepositoryContext";
import { CommentComposer } from "./CommentComposer";
import { useOfflineSnapshot } from "../../hooks/useOfflineWorkspace";
import { documentKey } from "../../services/auth/OfflineWorkspace";
import { MarkdownBody, WorkPager } from "./WorkShared";

export function IssuesWorkspace({ kind }: { kind: WorkKind }) {
  const [params, setParams] = useSearchParams();
  const number = Number(params.get("number"));
  return number > 0 ? (
    <IssueDetail
      key={`${kind}/${number}`}
      kind={kind}
      number={number}
      back={() =>
        setParams((current) => {
          const next = new URLSearchParams(current);
          next.delete("number");
          return next;
        })
      }
    />
  ) : (
    <IssueList kind={kind} />
  );
}
function IssueList({ kind }: { kind: WorkKind }) {
  const { t } = useTranslation();
  const c = useRepository();
  const action = useWorkspaceAction();
  const [state, setState] = useState("open"),
    [query, setQuery] = useState(""),
    [input, setInput] = useState(""),
    [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false),
    [title, setTitle] = useState(""),
    [body, setBody] = useState("");
  const [, setParams] = useSearchParams();
  const list = useGitHubResource(
    useCallback(
      (signal) =>
        collaboration.list(
          c.owner,
          c.name,
          kind,
          state,
          query,
          page,
          c.token,
          signal,
        ),
      [c.owner, c.name, kind, state, query, page, c.token],
    ),
  );
  return (
    <>
      <div className="gp-work-toolbar">
        <Select
          aria-label={t("状态")}
          value={state}
          onChange={(value) => {
            setState(value);
            setPage(1);
          }}
          style={{ width: 140 }}
          options={["open", "closed", "all"].map((value) => ({
            value,
            label: t(
              value === "open"
                ? "进行中"
                : value === "closed"
                  ? "已关闭"
                  : "全部",
            ),
          }))}
        />
        <form
          className="gp-work-search"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(input.trim());
            setPage(1);
          }}
        >
          <Input
            aria-label={t("搜索讨论")}
            placeholder={t("搜索标题，支持 label:bug 等条件")}
            value={input}
            onChange={setInput}
          />
          <Button htmlType="submit">{t("搜索")}</Button>
        </form>
        {kind === "issues" && (
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => (c.token ? setCreating(true) : c.onShowLogin())}
          >
            {t("新建 Issue")}
          </Button>
        )}
        <Button onClick={list.reload} disabled={list.loading}>
          {t("刷新")}
        </Button>
      </div>
      {list.loading ? (
        <Spin />
      ) : list.error ? (
        <RequestError
          error={list.error}
          retry={list.reload}
          onLogin={c.onShowLogin}
        />
      ) : (
        <>
          {list.data?.incomplete && (
            <Alert
              type="warning"
              content={t("搜索结果暂不完整，请稍后刷新。")}
            />
          )}
          {list.data?.total && list.data.total > 1000 ? (
            <Alert content={t("最多展示前 1000 条，请缩小搜索范围。")} />
          ) : null}
          {!list.data?.data.length ? (
            <EmptyState title={t("暂无相关讨论")} description="" />
          ) : (
            <ul className="gp-work-list">
              {list.data.data.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${workRoute(c.repo.full_name, kind, item.number, c.accountId)}`}
                  >
                    <strong>{item.title}</strong>
                    <span>
                      #{item.number} · {item.user.login} ·{" "}
                      {new Date(item.updated_at).toLocaleDateString()}
                    </span>
                  </a>
                  <div className="gp-work-tags">
                    {item.labels?.map((label) => (
                      <Tag key={label.name}>{label.name}</Tag>
                    ))}
                    <span>
                      <MessageSquare size={13} /> {item.comments}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <WorkPager
            page={page}
            hasNext={Boolean(list.data?.hasNext)}
            busy={list.loading}
            onChange={setPage}
          />
        </>
      )}
      <Modal
        title={t("新建 Issue")}
        visible={creating}
        onCancel={() => setCreating(false)}
        footer={null}
        unmountOnExit={false}
      >
        <form
          className="gp-work-form"
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              const item = await collaboration.create(
                c.owner,
                c.name,
                title,
                body,
                c.token,
              );
              setCreating(false);
              setTitle("");
              setBody("");
              setParams((current) => {
                const next = new URLSearchParams(current);
                next.set("number", String(item.number));
                return next;
              });
            });
          }}
        >
          <label>
            {t("标题")}
            <Input value={title} onChange={setTitle} maxLength={256} />
          </label>
          <label>
            {t("描述")}
            <Input.TextArea
              value={body}
              onChange={setBody}
              autoSize={{ minRows: 5, maxRows: 14 }}
              maxLength={65536}
            />
          </label>
          <Button
            type="primary"
            htmlType="submit"
            disabled={!title.trim()}
            loading={action.busy}
          >
            {t("创建")}
          </Button>
        </form>
      </Modal>
    </>
  );
}
function IssueDetail({
  kind,
  number,
  back,
}: {
  kind: WorkKind;
  number: number;
  back: () => void;
}) {
  const c = useRepository(),
    { t } = useTranslation();
  const detail = useGitHubResource(
    useCallback(
      (signal) =>
        collaboration.get(c.owner, c.name, kind, number, c.token, signal),
      [c.owner, c.name, kind, number, c.token],
    ),
  );
  return (
    <>
      <div className="gp-work-toolbar">
        <Button icon={<ArrowLeft size={16} />} onClick={back}>
          {t("返回列表")}
        </Button>
        <Button onClick={detail.reload} disabled={detail.loading}>
          {t("刷新")}
        </Button>
      </div>
      {detail.loading ? (
        <Spin />
      ) : detail.error ? (
        <RequestError
          error={detail.error}
          retry={detail.reload}
          onLogin={c.onShowLogin}
        />
      ) : (
        detail.data && (
          <IssueBody item={detail.data} kind={kind} reload={detail.reload} />
        )
      )}
    </>
  );
}
function IssueBody({
  item,
  kind,
  reload,
}: {
  item: WorkItem;
  kind: WorkKind;
  reload: () => void;
}) {
  const c = useRepository(),
    { t } = useTranslation(),
    action = useWorkspaceAction();
  const [section, setSection] = useState("comments"),
    [revision, setRevision] = useState(0);
  const [cachedComments, setCachedComments] = useState<
    Discussion[] | undefined
  >();
  const cacheError = useOfflineSnapshot(c.accountId, {
    key: documentKey(
      c.repo.full_name,
      kind === "pulls" ? "pull" : "issue",
      item.number,
    ),
    repository: c.repo.full_name,
    kind: kind === "pulls" ? "pull" : "issue",
    number: item.number,
    title: item.title,
    body: item.body || "",
    url: item.html_url,
    comments: cachedComments?.map((comment) => ({
      author: comment.user?.login || "",
      body: comment.body,
      url: comment.html_url,
    })),
  });
  const [labels, setLabels] = useState(
      item.labels.map((l) => l.name).join(", "),
    ),
    [assignees, setAssignees] = useState(
      item.assignees.map((a) => a.login).join(", "),
    );
  const canManage = Boolean(
    c.repo.permissions?.push ||
    c.repo.permissions?.triage ||
    c.repo.permissions?.admin,
  );
  const canEdit =
    canManage || item.user.login.toLowerCase() === c.username?.toLowerCase();
  return (
    <article>
      <div className="gp-work-toolbar">
        <Tag
          color={
            item.merged ? "purple" : item.state === "open" ? "green" : "gray"
          }
        >
          {item.merged
            ? t("已合并")
            : t(item.state === "open" ? "进行中" : "已关闭")}
        </Tag>
        <span>
          #{item.number} · {item.user.login}
        </span>
        <a
          className="gp-quiet-link"
          href={item.html_url}
          target="_blank"
          rel="noreferrer"
        >
          GitHub <ExternalLink size={14} />
        </a>
      </div>
      <h2 className="gp-work-break">{item.title}</h2>
      {kind === "pulls" && (
        <p className="gp-work-break">
          {item.head?.ref} → {item.base?.ref}{" "}
          {item.draft && <Tag>{t("草稿")}</Tag>}
        </p>
      )}
      <Card className="gp-work-content">
        <MarkdownBody body={item.body} url={item.html_url} />
      </Card>
      <div className="gp-work-tags">
        {item.labels.map((l) => (
          <Tag key={l.name}>{l.name}</Tag>
        ))}
        {item.assignees.map((a) => (
          <Tag key={a.login}>@{a.login}</Tag>
        ))}
      </div>
      {canManage && (
        <details className="gp-work-content">
          <summary>{t("管理标签与负责人")}</summary>
          <form
            className="gp-work-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action.run(async () => {
                const parts = (value: string) => [
                  ...new Set(
                    value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  ),
                ];
                await collaboration.update(
                  c.owner,
                  c.name,
                  kind,
                  item.number,
                  { labels: parts(labels), assignees: parts(assignees) },
                  c.token,
                );
                reload();
              });
            }}
          >
            <label>
              {t("标签（逗号分隔）")}
              <Input value={labels} onChange={setLabels} />
            </label>
            <label>
              {t("负责人账号（逗号分隔）")}
              <Input value={assignees} onChange={setAssignees} />
            </label>
            <Button htmlType="submit" loading={action.busy}>
              {t("保存修改")}
            </Button>
          </form>
        </details>
      )}
      {canEdit && !item.merged && (
        <Popconfirm
          title={t(
            item.state === "open" ? "确认关闭此讨论？" : "确认重新打开此讨论？",
          )}
          onOk={() =>
            action.run(async () => {
              await collaboration.update(
                c.owner,
                c.name,
                kind,
                item.number,
                { state: item.state === "open" ? "closed" : "open" },
                c.token,
              );
              reload();
            })
          }
        >
          <Button loading={action.busy}>
            {t(item.state === "open" ? "关闭讨论" : "重新打开")}
          </Button>
        </Popconfirm>
      )}
      <Tabs
        activeTab={section}
        onChange={setSection}
        className="gp-work-content"
      >
        <Tabs.TabPane key="comments" title={t("讨论")}>
          <DiscussionList
            key={`comments/${revision}`}
            number={item.number}
            section="comments"
            onLoaded={setCachedComments}
          />
        </Tabs.TabPane>
        {kind === "pulls" && (
          <Tabs.TabPane key="reviews" title={t("评审记录")}>
            <DiscussionList
              key={`reviews/${revision}`}
              number={item.number}
              section="reviews"
            />
          </Tabs.TabPane>
        )}
        {kind === "pulls" && (
          <Tabs.TabPane key="review-comments" title={t("代码评论")}>
            <DiscussionList number={item.number} section="review-comments" />
          </Tabs.TabPane>
        )}
        {kind === "pulls" && (
          <Tabs.TabPane key="files" title={t("文件改动")}>
            <ChangedFiles number={item.number} />
          </Tabs.TabPane>
        )}
      </Tabs>
      {cacheError && <Alert type="warning" content={t(cacheError)} />}
      {c.token && !item.locked ? (
        <CommentComposer
          repository={c.repo.full_name}
          kind={kind === "pulls" ? "pull" : "issue"}
          number={item.number}
          accountId={c.accountId}
          token={c.token}
          onSent={() => setRevision((r) => r + 1)}
        />
      ) : !c.token ? (
        <Button onClick={c.onShowLogin}>{t("登录后参与讨论")}</Button>
      ) : (
        <Alert content={t("讨论已锁定")} />
      )}

      {kind === "pulls" && (
        <PullControls
          item={item}
          onUpdated={() => {
            setRevision((r) => r + 1);
            reload();
          }}
        />
      )}
    </article>
  );
}
function DiscussionList({
  number,
  section,
  onLoaded,
}: {
  number: number;
  section: "comments" | "reviews" | "review-comments";
  onLoaded?: (comments: Discussion[]) => void;
}) {
  const c = useRepository(),
    { t } = useTranslation();
  const [page, setPage] = useState(1);
  const resource = useGitHubResource(
    useCallback(
      (signal) =>
        collaboration.discussion(
          c.owner,
          c.name,
          number,
          section,
          page,
          c.token,
          signal,
        ),
      [c.owner, c.name, number, section, page, c.token],
    ),
  );
  useEffect(() => {
    if (page === 1 && resource.data) onLoaded?.(resource.data.data);
  }, [resource.data, page, onLoaded]);
  return resource.loading ? (
    <Spin />
  ) : resource.error ? (
    <RequestError error={resource.error} retry={resource.reload} />
  ) : (
    <>
      {!resource.data?.data.length && <p>{t("暂无讨论")}</p>}
      {resource.data?.data.map((comment) => (
        <Card
          key={comment.id}
          className="gp-work-content"
          title={
            <span className="gp-work-break">
              {comment.user?.login}{" "}
              {comment.state && <Tag>{comment.state}</Tag>}
            </span>
          }
          extra={
            <a href={comment.html_url} target="_blank" rel="noreferrer">
              {t("查看原文")}
            </a>
          }
        >
          {comment.path && (
            <p className="gp-work-break">
              {comment.path}:{comment.line}
            </p>
          )}
          <MarkdownBody body={comment.body} url={comment.html_url} />
        </Card>
      ))}
      <WorkPager
        page={page}
        hasNext={Boolean(resource.data?.hasNext)}
        onChange={setPage}
      />
    </>
  );
}
function ChangedFiles({ number }: { number: number }) {
  const c = useRepository(),
    { t } = useTranslation();
  const [page, setPage] = useState(1);
  const resource = useGitHubResource(
    useCallback(
      (signal) =>
        collaboration.files(c.owner, c.name, number, page, c.token, signal),
      [c.owner, c.name, number, page, c.token],
    ),
  );
  return resource.loading ? (
    <Spin />
  ) : resource.error ? (
    <RequestError error={resource.error} retry={resource.reload} />
  ) : (
    <>
      <Alert content={t("补丁可能被 GitHub 截断，完整改动请查看原文。")} />
      {resource.data?.data.map((file) => (
        <details key={file.filename} className="gp-work-diff" open>
          <summary>
            <span>{file.filename}</span>{" "}
            <b className="gp-diff-add">+{file.additions}</b>{" "}
            <b className="gp-diff-remove">−{file.deletions}</b>
          </summary>
          {file.patch ? (
            <pre className="gp-code" tabIndex={0}>
              {file.patch.split("\n").map((line, index) => (
                <span
                  className={
                    line.startsWith("+")
                      ? "gp-diff-add"
                      : line.startsWith("-")
                        ? "gp-diff-remove"
                        : ""
                  }
                  key={index}
                >
                  {line}
                  {"\n"}
                </span>
              ))}
            </pre>
          ) : (
            <p>{t("此文件暂不支持预览，请在 GitHub 查看。")}</p>
          )}
          <a href={file.blob_url} target="_blank" rel="noreferrer">
            {t("查看原文")}
          </a>
        </details>
      ))}
      <WorkPager
        page={page}
        hasNext={Boolean(resource.data?.hasNext)}
        onChange={setPage}
      />
    </>
  );
}
function PullControls({
  item,
  onUpdated,
}: {
  item: WorkItem;
  onUpdated: () => void;
}) {
  const c = useRepository(),
    { t } = useTranslation(),
    action = useWorkspaceAction();
  const [review, setReview] = useState(""),
    [event, setEvent] = useState<"COMMENT" | "APPROVE" | "REQUEST_CHANGES">(
      "COMMENT",
    );
  const methods = (["merge", "squash", "rebase"] as const).filter(
    (method) =>
      c.repo[
        method === "merge"
          ? "allow_merge_commit"
          : method === "squash"
            ? "allow_squash_merge"
            : "allow_rebase_merge"
      ] !== false,
  );
  const [method, setMethod] = useState<"merge" | "squash" | "rebase">(
    methods[0] || "merge",
  );
  if (item.state !== "open" || !c.token || !item.head) return null;
  const own = item.user.login.toLowerCase() === c.username?.toLowerCase();
  return (
    <Card title={t("评审与合并")} className="gp-work-content">
      <form
        className="gp-work-form"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await collaboration.review(
              c.owner,
              c.name,
              item.number,
              item.head!.sha,
              event,
              review,
              c.token,
            );
            setReview("");
            onUpdated();
          });
        }}
      >
        <Select
          aria-label={t("评审结论")}
          value={event}
          onChange={setEvent}
          options={[
            { value: "COMMENT", label: t("仅评论") },
            ...(!own
              ? [
                  { value: "APPROVE", label: t("批准") },
                  { value: "REQUEST_CHANGES", label: t("请求修改") },
                ]
              : []),
          ]}
        />
        <Input.TextArea
          aria-label={t("评审意见")}
          value={review}
          onChange={setReview}
          maxLength={65536}
          autoSize={{ minRows: 3, maxRows: 10 }}
        />
        <Button
          htmlType="submit"
          disabled={event !== "APPROVE" && !review.trim()}
          loading={action.busy}
        >
          {t("提交评审")}
        </Button>
      </form>
      {c.repo.permissions?.push && (
        <div className="gp-work-form gp-work-content">
          <p>
            {t("合并检查状态")}：{item.mergeable_state || t("检查中")} ·{" "}
            {item.head.sha.slice(0, 8)}
          </p>
          <Select
            aria-label={t("合并方式")}
            value={method}
            onChange={setMethod}
            options={methods.map((value) => ({ value, label: value }))}
          />
          <Popconfirm
            title={t("确认将此 PR 合并到目标分支？")}
            onOk={() =>
              action.run(async () => {
                await collaboration.merge(
                  c.owner,
                  c.name,
                  item.number,
                  item.head!.sha,
                  method,
                  c.token,
                );
                onUpdated();
              })
            }
          >
            <Button
              type="primary"
              status="success"
              disabled={
                item.mergeable !== true || item.draft || !methods.length
              }
              loading={action.busy}
            >
              {t("合并 PR")}
            </Button>
          </Popconfirm>
          <p className="gp-work-muted">
            {t(
              "合并前会核对提交版本，并遵守仓库保护规则。状态未就绪时请刷新。",
            )}
          </p>
        </div>
      )}
    </Card>
  );
}
