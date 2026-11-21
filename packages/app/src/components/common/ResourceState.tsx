import { useEffect, useState } from "react";
import { useTranslation } from "../../i18n";
import { Alert, Button, Card, Empty, Skeleton } from "@arco-design/web-react";
import { Inbox, LockKeyhole, RefreshCw, SearchX } from "lucide-react";
import { GitHubRequestError } from "../../services/github/GitHubService";

export function LoadingCards() {
  const { t } = useTranslation();
  return (
    <div className="gp-repo-grid" role="status" aria-label={t("正在加载")}>
      <span className="gp-sr-only">{t("正在加载 GitHub 数据")}</span>
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="gp-repo-card">
          <Skeleton
            animation
            text={{ rows: 3, width: ["65%", "95%", "45%"] }}
          />
        </Card>
      ))}
    </div>
  );
}

export function RequestError({
  error,
  retry,
  onLogin,
}: {
  error: Error;
  retry: () => void;
  onLogin?: () => void;
}) {
  const { t } = useTranslation();
  const limited = error instanceof GitHubRequestError && error.rateLimited;
  const retryAt =
    error instanceof GitHubRequestError ? error.retryAt : undefined;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!retryAt || retryAt <= Date.now()) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= retryAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  return (
    <Alert
      className="gp-request-error"
      type="error"
      title={t("暂时无法加载")}
      content={
        <div>
          <p>{t(error.message)}</p>
          {retryAt && retryAt > now && (
            <p>
              {t("可在 {{time}} 后重试", {
                time: new Date(retryAt).toLocaleTimeString(),
              })}
            </p>
          )}
        </div>
      }
      action={
        <div className="gp-inline-actions">
          <Button
            onClick={retry}
            disabled={Boolean(retryAt && retryAt > now)}
            icon={<RefreshCw size={15} />}
          >
            {t("重试")}
          </Button>
          {onLogin &&
            error instanceof GitHubRequestError &&
            (error.status === 401 || (error.status === 403 && !limited)) && (
              <Button type="primary" onClick={onLogin}>
                {t("重新登录")}
              </Button>
            )}
        </div>
      }
    />
  );
}

export function EmptyState({
  title,
  description,
  inbox = false,
}: {
  title: string;
  description: string;
  inbox?: boolean;
}) {
  return (
    <Card className="gp-empty">
      <Empty
        icon={
          inbox ? (
            <Inbox size={38} strokeWidth={1.5} />
          ) : (
            <SearchX size={38} strokeWidth={1.5} />
          )
        }
        description={
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        }
      />
    </Card>
  );
}

export function SignInState({
  description,
  onLogin,
}: {
  description: string;
  onLogin: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="gp-sign-in">
      <div className="gp-state-icon">
        <LockKeyhole size={28} />
      </div>
      <h2>{t("连接你的 GitHub")}</h2>
      <p>{description}</p>
      <Button type="primary" size="large" onClick={onLogin}>
        {t("登录 GitHub")}
      </Button>
      <span>{t("在 GitHub 官网完成授权，登录后继续当前页面")}</span>
    </Card>
  );
}

/** A refresh failure must not replace retained content or destroy its scroll. */
export function ResourceRefreshNotice({
  resource,
}: {
  resource: { refreshError: Error | null; reload: () => void };
}) {
  const { t } = useTranslation();
  return resource.refreshError ? (
    <Alert
      type="warning"
      content={t(resource.refreshError.message)}
      action={<Button onClick={resource.reload}>{t("刷新")}</Button>}
    />
  ) : null;
}
