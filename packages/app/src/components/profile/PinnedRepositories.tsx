import { ResourceRefreshNotice } from "../common/ResourceState";
import { useCallback, useId, useState } from "react";
import { Button, Card, Tag } from "@arco-design/web-react";
import { Code2, Pin, RefreshCw, Settings2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useGitHubResource } from "../../hooks/useGitHubResource";
import { pinnedItems } from "../../services/github/PinService";
import { TokenManager } from "../../services/auth/TokenManager";
import { useAuthStore } from "../../stores/authStore";
import {
  EmptyState,
  LoadingCards,
  RequestError,
} from "../common/ResourceState";
import { RepoCard } from "../common/RepoCard";
import { CustomizePins } from "./CustomizePins";
import "./profile-extras.css";

export function PinnedRepositories({
  token,
  onShowLogin,
}: {
  token: string;
  onShowLogin: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const accountId = useAuthStore((state) => state.activeAccountId);
  const [customPins, setCustomPins] = useState(() =>
    accountId ? TokenManager.getCustomPins(accountId) : undefined,
  );
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const resource = useGitHubResource(
    useCallback(
      (signal) => pinnedItems(token, signal, customPins),
      [token, customPins],
    ),
  );
  const close = () => {
    setEditing(false);
    requestAnimationFrame(() => document.getElementById(`${id}-edit`)?.focus());
  };
  return (
    <section
      className="gp-profile-extra-section"
      aria-labelledby={`${id}-heading`}
    >
      <div className="gp-section-heading gp-pins-heading">
        <h2 id={`${id}-heading`}>
          <Pin size={18} aria-hidden="true" /> {t("我的置顶")}
        </h2>
        <div>
          <Button
            id={`${id}-edit`}
            type="text"
            size="small"
            icon={<Settings2 size={15} aria-hidden="true" />}
            disabled={!accountId || resource.loading || Boolean(resource.error)}
            onClick={() => {
              setSaved(false);
              setEditing(true);
            }}
          >
            {t("定制你的 Pins")}
          </Button>
          <Button
            type="text"
            size="small"
            aria-label={t("刷新置顶仓库")}
            onClick={resource.reload}
            loading={resource.loading}
            icon={<RefreshCw size={16} />}
          />
        </div>
      </div>
      <span className="gp-sr-only" role="status">
        {saved ? t("置顶已保存") : ""}
      </span>
      <ResourceRefreshNotice resource={resource} />
      {resource.loading ? (
        <LoadingCards />
      ) : resource.error ? (
        <RequestError
          error={resource.error}
          retry={resource.reload}
          onLogin={onShowLogin}
        />
      ) : resource.data?.length ? (
        <div className="gp-repo-grid">
          {resource.data.map((item) =>
            item.repository ? (
              <RepoCard repo={item.repository} key={item.id} />
            ) : (
              <Card key={item.id} className="gp-repo-card gp-gist-card">
                <div className="gp-repo-heading">
                  <Code2 size={18} aria-hidden="true" />
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <strong>{item.title}</strong>
                  </a>
                  <Tag>Gist</Tag>
                </div>
                <p className="gp-repo-description">
                  {item.description || t("这个项目还没有填写简介。")}
                </p>
              </Card>
            ),
          )}
        </div>
      ) : (
        <EmptyState
          title={t("还没有置顶项目")}
          description={t("点击“定制你的 Pins”，选择想展示的 Repo 和 Gist。")}
        />
      )}
      {editing && accountId && (
        <CustomizePins
          token={token}
          accountId={accountId}
          initial={resource.data || []}
          onClose={close}
          onSaved={(pins) => {
            setCustomPins(pins);
            resource.reload();
            setSaved(true);
            close();
          }}
        />
      )}
    </section>
  );
}
