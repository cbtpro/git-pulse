import { useTranslation } from "../i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Radio,
  Tag,
} from "@arco-design/web-react";
import {
  ArrowUpRight,
  CircleDot,
  GitPullRequest,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import {
  EmptyState,
  LoadingCards,
  RequestError,
  SignInState,
} from "../components/common/ResourceState";
import { ListPager } from "../components/common/ListPager";
import { useGitHubResource } from "../hooks/useGitHubResource";
import { useAuthStore } from "../stores/authStore";
import {
  github,
  notificationUrl,
  type Notification,
} from "../services/github/GitHubService";
import { formatDate } from "../utils/format";

const reasons: Record<string, string> = {
  assign: "分配给你",
  author: "你创建的",
  comment: "参与讨论",
  mention: "提及你",
  review_requested: "请求评审",
  team_mention: "提及团队",
  subscribed: "已订阅",
  state_change: "状态更新",
  security_alert: "安全提醒",
  ci_activity: "工作流",
  manual: "手动订阅",
};

function NotificationList({
  token,
  onShowLogin,
}: {
  token: string;
  onShowLogin: () => void;
}) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const [participating, setParticipating] = useState(false);
  const [page, setPage] = useState(1);
  const [read, setRead] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<{
    notification: Notification;
    error: Error;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const pending = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const markRead = async (notification: Notification) => {
    if (
      !notification.unread ||
      read[notification.id] === notification.updated_at ||
      pending.current.has(notification.id)
    )
      return;
    pending.current.add(notification.id);
    setFailure((current) =>
      current?.notification.id === notification.id ? null : current,
    );
    try {
      // Keep the write alive when opening GitHub or leaving this page.
      await github.markNotificationRead(
        notification.id,
        token,
        new AbortController().signal,
      );
      if (mounted.current) {
        setRead((current) => ({
          ...current,
          [notification.id]: notification.updated_at,
        }));
        setAnnouncement(t("通知已标记为已读"));
      }
    } catch (error) {
      if (mounted.current)
        setFailure({
          notification,
          error: error instanceof Error ? error : new Error("加载失败，请重试"),
        });
    } finally {
      pending.current.delete(notification.id);
    }
  };
  const resource = useGitHubResource(
    useCallback(
      (signal) => github.notifications(all, participating, page, token, signal),
      [all, participating, page, token],
    ),
  );
  const notifications =
    resource.data?.data
      .map((notification) => ({
        ...notification,
        unread:
          notification.unread &&
          read[notification.id] !== notification.updated_at,
      }))
      .filter((notification) => all || notification.unread) || [];
  return (
    <>
      <span className="gp-sr-only" role="status">
        {announcement}
      </span>
      <div className="gp-inbox-toolbar">
        <Radio.Group
          type="button"
          value={all ? "all" : "unread"}
          onChange={(value) => {
            setAll(value === "all");
            setPage(1);
          }}
          aria-label={t("通知范围")}
        >
          <Radio value="unread">{t("未读通知")}</Radio>
          <Radio value="all">{t("全部通知")}</Radio>
        </Radio.Group>
        <div className="gp-inline-actions">
          <Checkbox
            checked={participating}
            onChange={(checked) => {
              setParticipating(checked);
              setPage(1);
            }}
          >
            {t("只看我参与的")}
          </Checkbox>
          <Button
            aria-label={t("刷新通知")}
            icon={<RefreshCw size={16} />}
            onClick={resource.reload}
            loading={resource.loading}
          />
        </div>
      </div>
      {failure && (
        <Alert
          type="warning"
          title={t("未能标记为已读，请重试。")}
          content={
            <>
              {t(failure.error.message)}{" "}
              <Button
                size="small"
                onClick={() => void markRead(failure.notification)}
              >
                {t("重试")}
              </Button>
            </>
          }
        />
      )}
      {resource.loading ? (
        <LoadingCards />
      ) : resource.error ? (
        <RequestError
          error={resource.error}
          retry={resource.reload}
          onLogin={onShowLogin}
        />
      ) : notifications.length ? (
        <Card className="gp-notification-list">
          {notifications.map((notification) => {
            const Icon =
              notification.subject.type === "PullRequest"
                ? GitPullRequest
                : notification.subject.type === "Issue"
                  ? CircleDot
                  : MessageSquare;
            return (
              <a
                className={`gp-notification ${notification.unread ? "is-unread" : ""}`}
                key={notification.id}
                href={notificationUrl(notification)}
                target="_blank"
                rel="noreferrer"
                onClick={() => void markRead(notification)}
                onAuxClick={(event) => {
                  if (event.button === 1) void markRead(notification);
                }}
              >
                <span className="gp-notification-icon">
                  <Icon size={20} />
                </span>
                <div className="gp-notification-body">
                  <span className="gp-notification-repo">
                    {notification.repository.full_name}
                  </span>
                  <h3>{notification.subject.title}</h3>
                  <div className="gp-notification-meta">
                    <Tag size="small">
                      {t(reasons[notification.reason] || "仓库动态")}
                    </Tag>
                    <span>{formatDate(notification.updated_at)}</span>
                    {notification.unread && (
                      <span className="gp-unread-label">{t("未读")}</span>
                    )}
                  </div>
                </div>
                <ArrowUpRight size={17} className="gp-muted" />
              </a>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          title={all ? t("这里暂时没有通知") : t("目前没有未读通知")}
          description={
            participating
              ? t("当前没有需要你参与的通知，试试取消筛选。")
              : t("GitHub 的仓库讨论、评审请求和关注动态会出现在这里。")
          }
          inbox
        />
      )}
      {!resource.loading && !resource.error && (
        <ListPager
          page={page}
          hasNext={resource.data?.hasNext || false}
          onChange={setPage}
        />
      )}
      <p className="gp-section-note gp-inbox-note">
        {t("通知按最近更新时间排列。点击通知前往 GitHub，并自动标记为已读。")}
      </p>
    </>
  );
}

export function InboxPage({ onShowLogin }: { onShowLogin: () => void }) {
  const { t } = useTranslation();
  const { isLoggedIn, token } = useAuthStore();
  return (
    <div className="gp-page">
      <PageHeader
        eyebrow={t("INBOX")}
        title={t("让重要的消息被看见")}
        description={t("集中查看 GitHub 通知，跟上与你有关的讨论和协作。")}
      />
      {isLoggedIn && token ? (
        <NotificationList key={token} token={token} onShowLogin={onShowLogin} />
      ) : (
        <SignInState
          description={t("登录后查看你的 GitHub 通知、提及与评审请求。")}
          onLogin={onShowLogin}
        />
      )}
    </div>
  );
}
