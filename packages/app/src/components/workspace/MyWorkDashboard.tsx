import { useCallback, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Spin,
} from "@arco-design/web-react";
import {
  AtSign,
  CircleAlert,
  ClipboardList,
  GitPullRequest,
} from "lucide-react";
import { useTranslation } from "../../i18n";
import { useAuthStore } from "../../stores/authStore";
import { TokenManager } from "../../services/auth/TokenManager";
import { useGitHubResource } from "../../hooks/useGitHubResource";
import {
  loadDashboard,
  type WorkFilter,
} from "../../services/github/WorkDashboardService";
import { internalWorkUrl } from "../../services/github/CollaborationService";
import { invalidateGitHubQueryCache } from "../../services/github/GitHubService";
import { RequestError } from "../common/ResourceState";
import { WorkPager } from "./WorkShared";
import "../../styles/workspace.css";
const filters = [
  ["review", "待我评审", GitPullRequest],
  ["assigned", "分配给我", ClipboardList],
  ["mentioned", "提及我", AtSign],
  ["failed", "我的失败 PR", CircleAlert],
] as const;
export function MyWorkDashboard({ onShowLogin }: { onShowLogin: () => void }) {
  const { t } = useTranslation(),
    auth = useAuthStore();
  const [accountId, setAccountId] = useState(auth.activeAccountId),
    [filter, setFilter] = useState<WorkFilter>("review");
  const [repository, setRepository] = useState(""),
    [input, setInput] = useState(""),
    [page, setPage] = useState(1);
  const account = accountId ? TokenManager.getAccount(accountId) : null;
  const token =
    account?.token || (accountId === auth.activeAccountId ? auth.token : null);
  const username =
    account?.username ||
    (accountId === auth.activeAccountId ? auth.username : null) ||
    "";
  const data = useGitHubResource(
    useCallback(
      (signal) =>
        loadDashboard(filter, username, repository, page, token, signal),
      [filter, username, repository, page, token],
    ),
  );
  return (
    <Card
      className="gp-work-content"
      title={t("我的待办")}
      extra={
        <Button
          size="small"
          disabled={data.loading}
          onClick={() => {
            invalidateGitHubQueryCache();
            data.reload();
          }}
        >
          {t("刷新")}
        </Button>
      }
    >
      <div className="gp-work-toolbar">
        <Select
          aria-label={t("待办账号")}
          value={accountId || undefined}
          style={{ minWidth: 160 }}
          options={auth.accounts.map((a) => ({
            value: a.id,
            label: `@${a.username}`,
          }))}
          onChange={(id) => {
            setAccountId(id);
            setPage(1);
          }}
        />
        <form
          className="gp-work-search"
          onSubmit={(e) => {
            e.preventDefault();
            setRepository(input.trim());
            setPage(1);
          }}
        >
          <Input
            aria-label={t("筛选仓库")}
            placeholder={t("全部仓库，或输入 owner/repo")}
            value={input}
            onChange={setInput}
            allowClear
          />
          <Button htmlType="submit">{t("筛选")}</Button>
        </form>
      </div>
      <div className="gp-work-filters" role="group" aria-label={t("待办类型")}>
        {filters.map(([value, label, Icon]) => (
          <button
            key={value}
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
          >
            <Icon size={19} />
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
      {data.loading ? (
        <Spin />
      ) : data.error ? (
        <RequestError
          error={data.error}
          retry={data.reload}
          onLogin={onShowLogin}
        />
      ) : (
        <>
          {data.data?.incomplete && (
            <Alert
              type="warning"
              content={t("搜索结果暂不完整，请稍后刷新。")}
            />
          )}
          {data.data?.total === 0 ? (
            <p className="gp-work-muted">{t("当前没有需要处理的事项。")}</p>
          ) : (
            <ul className="gp-work-list">
              {data.data?.items.map((item) => (
                <li key={item.id}>
                  <a
                    href={
                      internalWorkUrl(item.html_url, accountId) || item.html_url
                    }
                  >
                    <strong>{item.title}</strong>
                    <span>
                      {item.repository_url?.split("/repos/")[1] ||
                        item.html_url.split("/").slice(3, 5).join("/")}{" "}
                      · #{item.number} · @{username}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <WorkPager
            page={page}
            hasNext={Boolean(data.data?.hasNext)}
            onChange={setPage}
          />
          {filter === "failed" && (
            <p className="gp-work-muted">
              {t("按 GitHub 搜索索引展示失败检查，状态更新可能稍有延迟。")}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
