import { useTranslation } from "../i18n";
import { lazy, Suspense, useCallback, useState } from "react";
import { Avatar, Button, Card, Tag } from "@arco-design/web-react";
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  RefreshCw,
  Settings2,
  FolderHeart,
  Bell,
  BookOpen,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { RepoCard } from "../components/common/RepoCard";
import {
  EmptyState,
  LoadingCards,
  RequestError,
  SignInState,
} from "../components/common/ResourceState";
import { ListPager } from "../components/common/ListPager";
import { useGitHubResource } from "../hooks/useGitHubResource";
import { useAuthStore } from "../stores/authStore";
import { github } from "../services/github/GitHubService";
import { formatNumber } from "../utils/format";
import { PROFILE_SETTINGS_PATH } from "../types/navigation";
import { ContributionCard } from "../components/contributions/ContributionCard";
import { PinnedRepositories } from "../components/profile/PinnedRepositories";
import { GitHubPages } from "../components/profile/GitHubPages";
import { usePreferencesStore } from "../stores/preferencesStore";
import { ProfileIdentity } from "../components/profile/ProfileIdentity";

const ProfileReadmeCard = lazy(
  () => import("../components/profile/ProfileReadmeCard"),
);

function MyRepositories({
  token,
  onShowLogin,
}: {
  token: string;
  onShowLogin: () => void;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const resource = useGitHubResource(
    useCallback(
      (signal) => github.repositories(page, token, signal),
      [page, token],
    ),
  );
  return (
    <section>
      <div className="gp-section-heading">
        <div>
          <h2>{t("我的仓库")}</h2>
          <p className="gp-section-note">{t("你拥有的仓库，按最近更新排序")}</p>
        </div>
        <Button
          aria-label={t("刷新我的仓库")}
          icon={<RefreshCw size={16} />}
          onClick={resource.reload}
          loading={resource.loading}
        />
      </div>
      {resource.loading ? (
        <LoadingCards />
      ) : resource.error ? (
        <RequestError
          error={resource.error}
          retry={resource.reload}
          onLogin={onShowLogin}
        />
      ) : resource.data?.data.length ? (
        <div className="gp-repo-grid">
          {resource.data.data.map((repo) => (
            <RepoCard repo={repo} key={repo.id} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("还没有可显示的仓库")}
          description={t(
            "创建你的第一个项目，或检查当前登录凭证的仓库访问权限。",
          )}
        />
      )}
      {!resource.loading && !resource.error && (
        <ListPager
          page={page}
          hasNext={resource.data?.hasNext || false}
          onChange={setPage}
        />
      )}
    </section>
  );
}

export function ProfilePage({ onShowLogin }: { onShowLogin: () => void }) {
  const { t } = useTranslation();
  const { userProfile: profile, isLoggedIn, token } = useAuthStore();
  const navigate = useNavigate();
  const { showProfileReadme, showPinnedRepositories, showGitHubPages } =
    usePreferencesStore();
  return (
    <div className="gp-page">
      <PageHeader
        eyebrow={t("MY SPACE")}
        title={t("你的开源空间")}
        description={t("收藏每一份投入，继续创造和连接。")}
        actions={
          <Button
            icon={<Settings2 size={16} />}
            onClick={() => navigate(PROFILE_SETTINGS_PATH)}
          >
            {t("账号与外观")}
          </Button>
        }
      />
      {!isLoggedIn || !profile || !token ? (
        <SignInState
          description={t("连接账号，查看你的个人资料和最近更新的仓库。")}
          onLogin={onShowLogin}
        />
      ) : (
        <>
          <Card className="gp-profile-card">
            <div className="gp-profile-main">
              <Avatar size={64}>
                <img
                  src={profile.avatar_url}
                  alt={t("{{name}} 的头像", { name: profile.login })}
                />
              </Avatar>
              <div className="gp-profile-info">
                <div className="gp-profile-name">
                  <h2>{profile.name || profile.login}</h2>
                  <Tag color="green">{t("已连接")}</Tag>
                </div>
                <p className="gp-profile-handle">@{profile.login}</p>
              </div>
              <p className="gp-profile-bio">
                {profile.bio || t("从一个想法开始，让代码连接更多可能。")}
              </p>
              <div className="gp-profile-details">
                {profile.location && (
                  <span>
                    <MapPin size={15} />
                    {profile.location}
                  </span>
                )}
                {profile.created_at && (
                  <span>
                    <CalendarDays size={15} />
                    {t("{{year}} 年加入 GitHub", {
                      year: new Date(profile.created_at).getFullYear(),
                    })}
                  </span>
                )}
              </div>
              <Button
                className="gp-profile-external"
                href={`https://github.com/${profile.login}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("GitHub 主页")}
                <ArrowUpRight size={16} />
              </Button>
            </div>
            <div className="gp-profile-stats">
              {[
                [t("公开仓库"), profile.public_repos],
                [t("关注者"), profile.followers],
                [t("正在关注"), profile.following],
                [t("公开 Gist"), profile.public_gists],
              ].map(([label, value]) => (
                <div key={label}>
                  <strong>{formatNumber(Number(value || 0))}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <ProfileIdentity
              key={token}
              login={profile.login}
              token={token}
              onShowLogin={onShowLogin}
            />
          </Card>
          {showProfileReadme && (
            <Suspense fallback={<LoadingCards />}>
              <ProfileReadmeCard
                login={profile.login}
                token={token}
                onShowLogin={onShowLogin}
              />
            </Suspense>
          )}
          <div className="gp-work-toolbar">
            <Button
              icon={<FolderHeart size={16} />}
              onClick={() => navigate("/profile/collections")}
            >
              {t("Star 收藏管理")}
            </Button>
            <Button
              icon={<Bell size={16} />}
              onClick={() => navigate("/profile/releases")}
            >
              {t("版本更新中心")}
            </Button>
            <Button
              icon={<BookOpen size={16} />}
              onClick={() => navigate("/profile/offline")}
            >
              {t("离线阅读与草稿")}
            </Button>
          </div>
          <ContributionCard token={token} onShowLogin={onShowLogin} />
          {showGitHubPages && (
            <GitHubPages token={token} onShowLogin={onShowLogin} />
          )}
          {showPinnedRepositories && (
            <PinnedRepositories token={token} onShowLogin={onShowLogin} />
          )}
          <div className="gp-profile-section-label">
            <UsersRound size={16} />
            <span>{t("属于你的项目与协作")}</span>
          </div>
          <MyRepositories token={token} onShowLogin={onShowLogin} />
        </>
      )}
    </div>
  );
}
