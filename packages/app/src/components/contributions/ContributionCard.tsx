import { publishContributionCalendar } from "../../services/widgets/WidgetService";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, Radio, Skeleton } from "@arco-design/web-react";
import { Boxes, Grid2X2, RefreshCw } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useGitHubResource } from "../../hooks/useGitHubResource";
import { github } from "../../services/github/GitHubService";
import { RequestError } from "../common/ResourceState";
import { ContributionCanvas } from "./ContributionCanvas";
import type { ChartMode } from "./geometry";
import "./contributions.css";

export function ContributionCard({
  token,
  onShowLogin,
}: {
  token: string;
  onShowLogin: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<ChartMode>("2d");
  const resource = useGitHubResource(
    useCallback((signal) => github.contributions(token, signal), [token]),
  );
  useEffect(() => {
    if (resource.data && !resource.loading && !resource.error)
      void publishContributionCalendar(resource.data, token);
  }, [resource.data, resource.loading, resource.error, token]);
  return (
    <Card className="gp-contribution-card">
      <div className="gp-contribution-heading">
        <div>
          <h2>{t("贡献活动")}</h2>
          <p>
            {resource.data
              ? t("过去一年共 {{total}} 次贡献", {
                  total: resource.data.totalContributions.toLocaleString(
                    i18n.language,
                  ),
                })
              : t("过去一年的 GitHub 贡献")}
          </p>
        </div>
        <div className="gp-inline-actions">
          <Button
            type="text"
            aria-label={t("刷新贡献图")}
            icon={<RefreshCw size={16} />}
            onClick={resource.reload}
            loading={resource.loading}
          />
          <Radio.Group
            className="gp-contribution-mode"
            type="button"
            value={mode}
            onChange={setMode}
            aria-label={t("贡献图模式")}
          >
            <Radio value="2d" title={t("二维贡献图")}>
              <Grid2X2 size={16} aria-hidden="true" />
              <span className="gp-sr-only">{t("二维贡献图")}</span>
            </Radio>
            <Radio value="3d" title={t("三维贡献图")}>
              <Boxes size={16} aria-hidden="true" />
              <span className="gp-sr-only">{t("三维贡献图")}</span>
            </Radio>
          </Radio.Group>
        </div>
      </div>
      {resource.loading ? (
        <Skeleton animation text={{ rows: 4 }} />
      ) : resource.error ? (
        <RequestError
          error={resource.error}
          retry={resource.reload}
          onLogin={onShowLogin}
        />
      ) : resource.data ? (
        <ContributionCanvas calendar={resource.data} mode={mode} />
      ) : null}
    </Card>
  );
}
