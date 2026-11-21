import { useCallback } from "react";
import { Button } from "@arco-design/web-react";
import {
  ArrowUpRight,
  Award,
  Building2,
  CodeXml,
  BadgeCheck,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useTranslation } from "../../i18n";
import { useGitHubResource } from "../../hooks/useGitHubResource";
import { GitHubRequestError } from "../../services/github/GitHubService";
import {
  profileBadges,
  profileOrganizations,
} from "../../services/github/ProfileIdentityService";
import "./profile-identity.css";

const icons = {
  star: Star,
  code: CodeXml,
  campus: GraduationCap,
  shield: ShieldCheck,
  github: BadgeCheck,
};

export function ProfileIdentity({
  login,
  token,
  onShowLogin,
}: {
  login: string;
  token: string;
  onShowLogin?: () => void;
}) {
  const { t } = useTranslation();
  const badges = useGitHubResource(
    useCallback((signal) => profileBadges(token, signal), [token]),
  );
  const organizations = useGitHubResource(
    useCallback(
      (signal) => profileOrganizations(login, token, signal),
      [login, token],
    ),
  );
  return (
    <div className="gp-profile-identity">
      <section aria-label={t("身份徽章")} aria-busy={badges.loading}>
        <div className="gp-profile-identity-heading">
          <h3>
            <Award size={15} aria-hidden="true" />
            {t("身份徽章")}
          </h3>
        </div>
        {badges.loading ? (
          <div className="gp-profile-identity-placeholder" role="status">
            {t("正在加载")}
          </div>
        ) : badges.error ? (
          <div className="gp-profile-identity-status" role="status">
            <span>{t("暂时无法加载身份徽章")}</span>
            {badges.error.message !== "暂时无法加载身份徽章" && (
              <p className="gp-profile-identity-explanation">
                {t(badges.error.message)}
              </p>
            )}
            <Button
              size="mini"
              type="text"
              aria-label={t("刷新身份徽章")}
              icon={<RefreshCw size={14} />}
              onClick={badges.reload}
            >
              {t("重试")}
            </Button>
            {onShowLogin &&
              badges.error instanceof GitHubRequestError &&
              (badges.error.status === 401 ||
                (badges.error.status === 403 && !badges.error.rateLimited)) && (
                <Button size="mini" type="text" onClick={onShowLogin}>
                  {t("重新登录")}
                </Button>
              )}
          </div>
        ) : badges.data?.length ? (
          <ul className="gp-profile-badges">
            {badges.data.map((badge) => {
              const Icon = icons[badge.icon];
              return (
                <li key={badge.field}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{t(badge.label)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="gp-profile-identity-status" role="status">
            <span>{t("暂无公开身份徽章")}</span>
            <p className="gp-profile-identity-explanation">
              {t(
                "身份徽章用于 GitHub Star、开发者计划等身份。YOLO、Pull Shark 等成就请在 GitHub 查看。",
              )}
            </p>
          </div>
        )}
        <div className="gp-profile-identity-footer">
          <a
            className="gp-profile-achievements"
            href={`https://github.com/${encodeURIComponent(login)}?tab=achievements`}
            target="_blank"
            rel="noreferrer"
          >
            {t("查看 GitHub 成就")}
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
      </section>
      <section aria-label={t("我的组织")} aria-busy={organizations.loading}>
        <div className="gp-profile-identity-heading">
          <h3>
            <Building2 size={15} aria-hidden="true" />
            {t("我的组织")}
            {organizations.data && (
              <span className="gp-profile-identity-count">
                {organizations.data.organizations.length}
              </span>
            )}
          </h3>
        </div>
        {organizations.loading ? (
          <div className="gp-profile-identity-placeholder" role="status">
            {t("正在加载")}
          </div>
        ) : organizations.error ? (
          <div className="gp-profile-identity-status" role="status">
            <span>{t("暂时无法加载组织")}</span>
            {organizations.error.message !== "暂时无法加载组织" && (
              <p className="gp-profile-identity-explanation">
                {t(organizations.error.message)}
              </p>
            )}
            <Button
              size="mini"
              type="text"
              aria-label={t("刷新组织")}
              icon={<RefreshCw size={14} />}
              onClick={organizations.reload}
            >
              {t("重试")}
            </Button>
            {onShowLogin &&
              organizations.error instanceof GitHubRequestError &&
              organizations.error.status === 401 && (
                <Button size="mini" type="text" onClick={onShowLogin}>
                  {t("重新登录")}
                </Button>
              )}
          </div>
        ) : organizations.data?.organizations.length ? (
          <ul className="gp-profile-organizations">
            {organizations.data.organizations.map((org) => (
              <li key={org.id}>
                <a
                  href={`https://github.com/${encodeURIComponent(org.login)}`}
                  target="_blank"
                  rel="noreferrer"
                  title={org.description || org.login}
                >
                  {org.avatar_url?.startsWith("https://") ? (
                    <img
                      src={org.avatar_url}
                      width={28}
                      height={28}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <Building2 size={24} aria-hidden="true" />
                  )}
                  <span>{org.login}</span>
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="gp-profile-identity-status">
            {organizations.data?.access === "public-only"
              ? t("暂无公开的组织成员身份")
              : t("当前授权下暂无可显示的组织")}
          </p>
        )}
        {!organizations.loading &&
          !organizations.error &&
          organizations.data && (
            <div className="gp-profile-identity-status gp-profile-identity-footer">
              <p className="gp-profile-identity-explanation">
                {organizations.data.access === "public-only"
                  ? t("当前授权无法读取非公开的组织成员身份，仅显示公开结果。")
                  : t("仅显示当前账号授权可见的组织。")}
              </p>
              {(organizations.data.access === "public-only" ||
                organizations.data.organizations.length === 0) &&
                onShowLogin && (
                  <Button size="mini" type="text" onClick={onShowLogin}>
                    {t("重新授权组织访问")}
                  </Button>
                )}
            </div>
          )}
      </section>
    </div>
  );
}
