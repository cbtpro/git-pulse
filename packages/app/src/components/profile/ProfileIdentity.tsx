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
}: {
  login: string;
  token: string;
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
          <a
            href={`https://github.com/${encodeURIComponent(login)}?tab=achievements`}
            target="_blank"
            rel="noreferrer"
          >
            {t("查看 GitHub 成就")}
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
        {badges.loading ? (
          <div className="gp-profile-identity-placeholder" role="status">
            {t("正在加载")}
          </div>
        ) : badges.error ? (
          <div className="gp-profile-identity-status" role="status">
            <span>{t("暂时无法加载身份徽章")}</span>
            <Button
              size="mini"
              type="text"
              aria-label={t("刷新身份徽章")}
              icon={<RefreshCw size={14} />}
              onClick={badges.reload}
            >
              {t("重试")}
            </Button>
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
          <p className="gp-profile-identity-status">{t("暂无公开身份徽章")}</p>
        )}
      </section>
      <section aria-label={t("公开组织")} aria-busy={organizations.loading}>
        <div className="gp-profile-identity-heading">
          <h3>
            <Building2 size={15} aria-hidden="true" />
            {t("公开组织")}
            {organizations.data && (
              <span className="gp-profile-identity-count">
                {organizations.data.length}
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
            <span>{t("暂时无法加载公开组织")}</span>
            <Button
              size="mini"
              type="text"
              aria-label={t("刷新公开组织")}
              icon={<RefreshCw size={14} />}
              onClick={organizations.reload}
            >
              {t("重试")}
            </Button>
          </div>
        ) : organizations.data?.length ? (
          <ul className="gp-profile-organizations">
            {organizations.data.map((org) => (
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
            {t("暂无公开的组织成员身份")}
          </p>
        )}
      </section>
    </div>
  );
}
