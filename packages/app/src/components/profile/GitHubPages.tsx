import { useCallback, useId, useState } from "react";
import { Button, Card, Input, Skeleton, Tag } from "@arco-design/web-react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Globe,
  RefreshCw,
  Search,
} from "lucide-react";
import { useTranslation } from "../../i18n";
import { useGitHubResource } from "../../hooks/useGitHubResource";
import { cachedGitHubPages, clearPagesCache } from "../../services/github/ProfileService";
import { RequestError } from "../common/ResourceState";
import "./profile-extras.css";

export function GitHubPages({
  token,
  onShowLogin,
}: {
  token: string;
  onShowLogin: () => void;
}) {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const pageSize = 5;
  const resource = useGitHubResource(
    useCallback((signal) => cachedGitHubPages(token, signal), [token]),
  );
  const statuses: Record<string, string> = {
    built: "已发布",
    building: "构建中",
    errored: "构建失败",
  };
  const needle = query.trim().toLowerCase();
  const sites =
    resource.data?.filter((site) =>
      `${site.repository} ${site.url || ""}`.toLowerCase().includes(needle),
    ) || [];
  const total = sites.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
  return (
    <section
      className="gp-profile-extra-section gp-pages-section"
      aria-labelledby={headingId}
    >
      <Card className="gp-pages-card">
        <div className="gp-pages-heading">
          <h2 id={headingId}>
            <Globe size={17} />
            <span>{t("我的 GitHub Pages")}</span>
            {!resource.loading && !resource.error && resource.data && (
              <span className="gp-pages-count">
                {resource.data.length.toLocaleString(i18n.language)}
              </span>
            )}
          </h2>
          <Button
            type="text"
            size="small"
            aria-label={t("刷新 Pages 列表")}
            onClick={() => { clearPagesCache(); resource.reload(); }}
            loading={resource.loading}
            icon={<RefreshCw size={15} />}
          />
        </div>
        <Input
          className="gp-pages-search"
          size="small"
          prefix={<Search size={14} />}
          allowClear
          aria-label={t("搜索 GitHub Pages")}
          placeholder={t("搜索仓库或站点地址")}
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <span className="gp-sr-only" role="status" aria-live="polite">
          {!resource.loading && !resource.error
            ? t("找到 {{count}} 个 Pages 站点", { count: total })
            : ""}
        </span>
        {resource.loading ? (
          <div
            className="gp-pages-loading"
            role="status"
            aria-label={t("正在加载")}
          >
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton
                key={index}
                animation
                text={{ rows: 2, width: ["46%", "72%"] }}
              />
            ))}
          </div>
        ) : resource.error ? (
          <RequestError
            error={resource.error}
            retry={resource.reload}
            onLogin={onShowLogin}
          />
        ) : total ? (
          <ul className="gp-pages-list">
            {sites
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map((site) => (
                <li className="gp-pages-site" key={site.repository}>
                  <div className="gp-pages-info">
                    <a
                      className="gp-pages-repository"
                      href={site.repositoryUrl}
                      title={`${t("查看仓库")} · ${site.repository}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {site.repository}
                    </a>
                    {site.url ? (
                      <a
                        className="gp-pages-url"
                        href={site.url}
                        title={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>
                          {site.url
                            .replace(/^https?:\/\//, "")
                            .replace(/\/$/, "")}
                        </span>
                        <ArrowUpRight size={13} />
                      </a>
                    ) : (
                      <p className="gp-pages-message">
                        {t(site.error || "站点地址暂不可用")}
                      </p>
                    )}
                  </div>
                  <Tag
                    size="small"
                    color={
                      site.error || site.status === "errored"
                        ? "orange"
                        : site.status === "built"
                          ? "green"
                          : undefined
                    }
                  >
                    {t(
                      site.error
                        ? "待检查"
                        : statuses[site.status || ""] || "已开启",
                    )}
                  </Tag>
                </li>
              ))}
          </ul>
        ) : (
          <div className="gp-pages-empty">
            <strong>
              {needle
                ? t("没有匹配的 Pages 站点")
                : t("还没有 GitHub Pages 站点")}
            </strong>
            <p>
              {needle
                ? t("试试仓库名称或域名。")
                : t("在仓库设置中启用 GitHub Pages 后，站点会显示在这里。")}
            </p>
          </div>
        )}
        {!resource.loading && !resource.error && total > pageSize && (
          <nav
            className="gp-pages-pagination"
            aria-label={t("GitHub Pages 分页")}
          >
            <span>{`${((currentPage - 1) * pageSize + 1).toLocaleString(i18n.language)}–${Math.min(currentPage * pageSize, total).toLocaleString(i18n.language)} / ${total.toLocaleString(i18n.language)}`}</span>
            <div className="gp-pages-page-controls">
              <Button
                size="small"
                type="text"
                aria-label={t("上一页")}
                disabled={currentPage === 1}
                icon={<ChevronLeft size={16} />}
                onClick={() => setPage(currentPage - 1)}
              />
              <span aria-live="polite">
                {currentPage} / {Math.ceil(total / pageSize)}
              </span>
              <Button
                size="small"
                type="text"
                aria-label={t("下一页")}
                disabled={currentPage === Math.ceil(total / pageSize)}
                icon={<ChevronRight size={16} />}
                onClick={() => setPage(currentPage + 1)}
              />
            </div>
          </nav>
        )}
      </Card>
    </section>
  );
}
